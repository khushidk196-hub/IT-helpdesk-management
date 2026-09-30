var assert = require('node:assert/strict');
var fs = require('node:fs');
var http = require('node:http');
var os = require('node:os');
var path = require('node:path');
var test = require('node:test');
var Database = require('better-sqlite3');

var databaseDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'helpdesk-api-test-'));
var databasePath = path.join(databaseDirectory, 'helpdesk.sqlite');
process.env.NODE_ENV = 'test';
process.env.HELPDESK_DB_PATH = databasePath;

var store = require('../db');
var app = require('../app');
var server;
var baseUrl;

test.before(async function() {
  server = http.createServer(app);
  await new Promise(function(resolve) {
    server.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = 'http://127.0.0.1:' + server.address().port;
});

test.after(async function() {
  await new Promise(function(resolve, reject) {
    server.close(function(error) {
      if (error) reject(error);
      else resolve();
    });
  });
  store.db.close();
  var persisted = new Database(databasePath);
  assert.ok(persisted.prepare('SELECT COUNT(*) AS count FROM tickets').get().count >= 6);
  assert.ok(persisted.prepare('SELECT COUNT(*) AS count FROM audit_events').get().count >= 3);
  persisted.close();
  fs.rmSync(databaseDirectory, { recursive: true, force: true });
});

async function login(email, password) {
  var response = await fetch(baseUrl + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email, password: password }),
  });
  var data = await response.json();
  var cookie = (response.headers.get('set-cookie') || '').split(';')[0];
  return { response: response, data: data, cookie: cookie, csrfToken: data.csrfToken };
}

async function request(session, route, options) {
  options = options || {};
  var headers = Object.assign({}, options.headers || {});
  if (session && session.cookie) headers.Cookie = session.cookie;
  if (session && session.csrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method)) {
    headers['X-CSRF-Token'] = session.csrfToken;
  }
  if (options.body && typeof options.body !== 'string') {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }
  options.headers = headers;
  return fetch(baseUrl + route, options);
}

test('requires a session and enforces CSRF for ticket writes', async function() {
  var unauthenticated = await request(null, '/api/tickets');
  assert.equal(unauthenticated.status, 401);
  assert.match(unauthenticated.headers.get('cache-control'), /no-store/);

  var requester = await login('requester@helpdesk.local', 'Requester123!');
  assert.equal(requester.response.status, 200);
  assert.equal(requester.data.user.role, 'Requester');

  var noCsrf = await fetch(baseUrl + '/api/tickets', {
    method: 'POST',
    headers: { Cookie: requester.cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ subject: 'Missing CSRF check', category: 'Network', priority: 'Low' }),
  });
  assert.equal(noCsrf.status, 403);
});

test('supports tickets, assignment, public/internal comments, audit, and reports', async function() {
  var requester = await login('requester@helpdesk.local', 'Requester123!');
  var createResponse = await request(requester, '/api/tickets', {
    method: 'POST',
    body: { subject: 'API workflow verification', description: 'Test ticket', category: 'Network', priority: 'Medium' },
  });
  assert.equal(createResponse.status, 201);
  var created = (await createResponse.json()).ticket;
  var staleStart = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString();
  store.db.prepare('UPDATE tickets SET created_at = ?, resolution_started_at = ? WHERE id = ?').run(staleStart, staleStart, created.id);

  var commentResponse = await request(requester, '/api/tickets/' + created.id + '/comments', {
    method: 'POST',
    body: { body: 'Public requester reply' },
  });
  assert.equal(commentResponse.status, 201);

  var internalDenied = await request(requester, '/api/tickets/' + created.id + '/comments', {
    method: 'POST',
    body: { body: 'Should be denied', visibility: 'internal' },
  });
  assert.equal(internalDenied.status, 403);

  var auditDenied = await request(requester, '/api/tickets/' + created.id + '/audit');
  assert.equal(auditDenied.status, 403);

  var agent = await login('agent@helpdesk.local', 'Agent123!');
  var assignResponse = await request(agent, '/api/tickets/' + created.id + '/assignment', {
    method: 'PUT',
    body: { assigneeId: agent.data.user.id },
  });
  assert.equal(assignResponse.status, 200);
  assert.equal((await assignResponse.json()).ticket.assigneeId, agent.data.user.id);
  var agentChoices = await request(agent, '/api/agents');
  assert.deepEqual((await agentChoices.json()).agents.map(function(user) { return user.role; }), ['Agent']);
  var notificationResponse = await request(agent, '/api/notifications');
  var assignmentNotification = (await notificationResponse.json()).notifications.find(function(notification) {
    return notification.ticketId === created.id && notification.title === 'Ticket assigned';
  });
  assert.ok(assignmentNotification);
  var markRead = await request(agent, '/api/notifications/' + assignmentNotification.id + '/read', {
    method: 'PATCH',
    body: {},
  });
  assert.equal(markRead.status, 200);

  var internalComment = await request(agent, '/api/tickets/' + created.id + '/comments', {
    method: 'POST',
    body: { body: 'Staff-only note', visibility: 'internal' },
  });
  assert.equal(internalComment.status, 201);

  var requesterComments = await request(requester, '/api/tickets/' + created.id + '/comments');
  var visibleComments = (await requesterComments.json()).comments;
  assert.equal(visibleComments.length, 1);
  assert.equal(visibleComments[0].visibility, 'public');

  var eventsResponse = await request(agent, '/api/tickets/' + created.id + '/audit');
  var events = (await eventsResponse.json()).events;
  assert.ok(events.some(function(event) { return event.action === 'ticket_created'; }));
  assert.ok(events.some(function(event) { return event.action === 'assignment_changed'; }));
  assert.ok(events.some(function(event) { return event.action === 'comment_added'; }));
  assert.ok(events.some(function(event) { return event.action === 'sla_response_breach'; }));
  assert.ok(events.some(function(event) { return event.action === 'sla_resolution_warning'; }));

  var admin = await login('admin@helpdesk.local', 'Admin123!');
  var adminUsers = await request(admin, '/api/admin/users');
  assert.equal(adminUsers.status, 200);
  var report = await request(admin, '/api/reports/overview');
  assert.equal(report.status, 200);
  assert.ok((await report.json()).totals.tickets >= 1);

  var csv = await request(admin, '/api/reports/export.csv');
  assert.equal(csv.status, 200);
  assert.match(csv.headers.get('content-type'), /text\/csv/);
  assert.match(await csv.text(), /"Ticket ID","Subject"/);
});

test('limits administration to Admin and preserves active role-specific records', async function() {
  var agent = await login('agent@helpdesk.local', 'Agent123!');
  var denied = await request(agent, '/api/admin/users');
  assert.equal(denied.status, 403);

  var requester = await login('requester@helpdesk.local', 'Requester123!');
  var tickets = await request(requester, '/api/tickets');
  assert.equal(tickets.status, 200);
  assert.equal(tickets.headers.get('etag'), null);
  var repeatedTickets = await request(requester, '/api/tickets');
  assert.equal(repeatedTickets.status, 200);
  var data = await tickets.json();
  assert.ok(data.tickets.every(function(ticket) { return ticket.requesterId === requester.data.user.id; }));
  var reportDenied = await request(requester, '/api/reports/overview');
  assert.equal(reportDenied.status, 403);
});

test('Admin manages accounts, categories, SLA policies, and ticket archival', async function() {
  var admin = await login('admin@helpdesk.local', 'Admin123!');
  var createdUserResponse = await request(admin, '/api/admin/users', {
    method: 'POST',
    body: {
      name: 'Casey Tester',
      email: 'casey.tester@example.test',
      employeeId: 'QA-9001',
      role: 'Agent',
      password: 'TemporaryPass123!',
    },
  });
  assert.equal(createdUserResponse.status, 201);
  var createdUser = (await createdUserResponse.json()).user;

  var agentSession = await login('casey.tester@example.test', 'TemporaryPass123!');
  assert.equal(agentSession.data.user.role, 'Agent');
  var promoteResponse = await request(admin, '/api/admin/users/' + createdUser.id, {
    method: 'PATCH',
    body: { role: 'Manager' },
  });
  assert.equal(promoteResponse.status, 200);
  var staleSession = await request(agentSession, '/api/tickets');
  assert.equal(staleSession.status, 401);

  var resetResponse = await request(admin, '/api/admin/users/' + createdUser.id, {
    method: 'PATCH',
    body: { password: 'ReplacementPass123!' },
  });
  assert.equal(resetResponse.status, 200);
  var replacementLogin = await login('casey.tester@example.test', 'ReplacementPass123!');
  assert.equal(replacementLogin.response.status, 200);
  assert.equal(replacementLogin.data.user.role, 'Manager');

  var categoryResponse = await request(admin, '/api/admin/categories', {
    method: 'POST',
    body: { name: 'QA Workflow Category' },
  });
  assert.equal(categoryResponse.status, 201);
  var deactivateResponse = await request(admin, '/api/admin/categories/QA%20Workflow%20Category', {
    method: 'PATCH',
    body: { active: false },
  });
  assert.equal(deactivateResponse.status, 200);
  var categoryList = await request(admin, '/api/categories');
  assert.ok(!(await categoryList.json()).categories.includes('QA Workflow Category'));

  var policyResponse = await request(admin, '/api/admin/sla-policies/High', {
    method: 'PUT',
    body: { responseHours: 5, resolutionHours: 10 },
  });
  assert.equal(policyResponse.status, 200);
  assert.equal((await policyResponse.json()).policy.responseHours, 5);

  var requester = await login('requester@helpdesk.local', 'Requester123!');
  var createTicket = await request(requester, '/api/tickets', {
    method: 'POST',
    body: { subject: 'Admin archive authorization test', category: 'Network', priority: 'Low' },
  });
  var ticket = (await createTicket.json()).ticket;
  var agent = await login('agent@helpdesk.local', 'Agent123!');
  var deniedArchive = await request(agent, '/api/tickets/' + ticket.id, { method: 'DELETE' });
  assert.equal(deniedArchive.status, 403);
  var archived = await request(admin, '/api/tickets/' + ticket.id, { method: 'DELETE' });
  assert.equal(archived.status, 200);
  assert.equal(store.db.prepare("SELECT COUNT(*) AS count FROM audit_events WHERE ticket_id = ? AND action = 'ticket_deleted'").get(ticket.id).count, 1);

  var systemEvents = await request(admin, '/api/admin/system-audit');
  var actions = (await systemEvents.json()).events.map(function(event) { return event.action; });
  assert.ok(actions.includes('user_created'));
  assert.ok(actions.includes('user_updated'));
  assert.ok(actions.includes('category_created'));
  assert.ok(actions.includes('category_updated'));
  assert.ok(actions.includes('sla_policy_updated'));
});