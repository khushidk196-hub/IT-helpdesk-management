var express = require('express');
var store = require('./db');
var auth = require('./auth');

var router = express.Router();
var db = store.db;
var staffRoles = ['Agent', 'Manager', 'Admin'];
var allRoles = store.roles;
var activeStatuses = ['Open', 'In Progress'];

router.use(auth.attachSession);

function sendError(res, status, message) {
  return res.status(status).json({ error: message });
}

function auditTicket(ticketId, actor, action, details) {
  db.prepare(`
    INSERT INTO audit_events (ticket_id, actor_id, actor_role, action, details_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(ticketId, actor ? actor.id : null, actor ? actor.role : 'System', action, JSON.stringify(details || {}), store.utcNow());
}

function auditSystem(actor, entityType, entityId, action, details) {
  db.prepare(`
    INSERT INTO system_audit_events (actor_id, actor_role, entity_type, entity_id, action, details_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(actor ? actor.id : null, actor ? actor.role : 'System', entityType, String(entityId), action, JSON.stringify(details || {}), store.utcNow());
}

function createNotification(userId, ticketId, eventKey, title, message) {
  if (!userId) return;
  db.prepare(`
    INSERT OR IGNORE INTO notifications (user_id, ticket_id, event_key, title, message, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(userId, ticketId || null, eventKey, title, message, store.utcNow());
}

function ticketRow(ticketId) {
  return db.prepare(`
    SELECT t.*, requester.name AS requester_name, requester.email AS requester_email,
      assignee.name AS assignee_name, assignee.email AS assignee_email
    FROM tickets t
    JOIN users requester ON requester.id = t.requester_id
    LEFT JOIN users assignee ON assignee.id = t.assignee_id
    WHERE t.id = ? AND t.deleted_at IS NULL
  `).get(ticketId);
}

function canAccessTicket(user, ticket) {
  if (!ticket || !user) return false;
  if (user.role === 'Admin' || user.role === 'Manager') return true;
  if (user.role === 'Agent') return ticket.assignee_id === null || ticket.assignee_id === user.id;
  return user.role === 'Requester' && ticket.requester_id === user.id;
}

function getAccessibleTicket(ticketId, user) {
  var ticket = ticketRow(ticketId);
  return canAccessTicket(user, ticket) ? ticket : null;
}

function scopeSql(user, alias) {
  if (user.role === 'Admin' || user.role === 'Manager') return { sql: '1 = 1', params: [] };
  if (user.role === 'Agent') {
    return { sql: '(' + alias + '.assignee_id = ? OR ' + alias + '.assignee_id IS NULL)', params: [user.id] };
  }
  return { sql: alias + '.requester_id = ?', params: [user.id] };
}

function slaFor(ticket) {
  var policy = db.prepare('SELECT * FROM sla_policies WHERE priority = ? AND active = 1').get(ticket.priority);
  if (!policy) return { response: null, resolution: null };

  var now = Date.now();
  function clock(startValue, targetHours, completedAt, stopped) {
    if (!startValue) return null;
    var due = new Date(new Date(startValue).getTime() + targetHours * 60 * 60 * 1000);
    var completed = completedAt ? new Date(completedAt) : null;
    var remaining = due.getTime() - now;
    var state;
    if (completed) state = completed.getTime() <= due.getTime() ? 'met' : 'breached';
    else if (stopped) state = 'stopped';
    else if (remaining <= 0) state = 'breached';
    else if (remaining <= targetHours * 60 * 60 * 1000 * 0.25) state = 'at-risk';
    else state = 'on-track';
    return { state: state, dueAt: due.toISOString(), remainingMs: Math.max(0, remaining) };
  }

  var stopped = ticket.status === 'Resolved' || ticket.status === 'Closed';
  return {
    response: clock(ticket.created_at, policy.response_hours, ticket.first_response_at, stopped),
    resolution: clock(ticket.resolution_started_at || ticket.created_at, policy.resolution_hours, ticket.resolved_at, stopped),
  };
}

function evaluateSla(ticketId) {
  var ticket = ticketRow(ticketId);
  if (!ticket) return;
  var policy = db.prepare('SELECT * FROM sla_policies WHERE priority = ? AND active = 1').get(ticket.priority);
  if (!policy || ticket.deleted_at || !activeStatuses.includes(ticket.status)) return;

  var now = Date.now();
  var deadlines = [
    { type: 'response', start: ticket.created_at, completed: ticket.first_response_at, hours: policy.response_hours },
    { type: 'resolution', start: ticket.resolution_started_at || ticket.created_at, completed: ticket.resolved_at, hours: policy.resolution_hours },
  ];
  var managers = db.prepare("SELECT id FROM users WHERE active = 1 AND role IN ('Manager', 'Admin') AND notify_sla = 1").all();

  db.transaction(function() {
    deadlines.forEach(function(deadline) {
      if (deadline.completed || !deadline.start) return;
      var dueAt = new Date(new Date(deadline.start).getTime() + deadline.hours * 60 * 60 * 1000).toISOString();
      var warningAt = new Date(new Date(deadline.start).getTime() + deadline.hours * 60 * 60 * 1000 * 0.75).getTime();
      var events = [];
      if (now >= warningAt) events.push(deadline.type + '_warning');
      if (now >= new Date(dueAt).getTime()) events.push(deadline.type + '_breach');
      events.forEach(function(eventType) {
        var result = db.prepare(`
          INSERT OR IGNORE INTO sla_events (ticket_id, event_type, due_at, created_at)
          VALUES (?, ?, ?, ?)
        `).run(ticket.id, eventType, dueAt, store.utcNow());
        if (!result.changes) return;
        auditTicket(ticket.id, null, 'sla_' + eventType, { dueAt: dueAt });
        var title = eventType.indexOf('breach') !== -1 ? 'SLA breached' : 'SLA at risk';
        var message = ticket.id + ' has a ' + deadline.type + ' SLA ' + (eventType.indexOf('breach') !== -1 ? 'breach.' : 'warning.');
        if (ticket.assignee_id) {
          var assignee = db.prepare('SELECT id FROM users WHERE id = ? AND notify_sla = 1').get(ticket.assignee_id);
          if (assignee) createNotification(assignee.id, ticket.id, 'sla:' + eventType + ':' + dueAt + ':' + assignee.id, title, message);
        } else {
          managers.forEach(function(manager) {
            createNotification(manager.id, ticket.id, 'sla:' + eventType + ':' + dueAt + ':' + manager.id, title, message);
          });
        }
        managers.forEach(function(manager) {
          createNotification(manager.id, ticket.id, 'sla:' + eventType + ':' + dueAt + ':' + manager.id, title, message);
        });
      });
    });
  })();
}

function serializeTicket(ticket) {
  evaluateSla(ticket.id);
  var current = ticketRow(ticket.id) || ticket;
  return {
    id: current.id,
    subject: current.subject,
    description: current.description,
    category: current.category,
    priority: current.priority,
    status: current.status,
    requesterId: current.requester_id,
    requester: current.requester_name,
    requesterEmail: current.requester_email,
    assigneeId: current.assignee_id,
    assignee: current.assignee_name,
    assigneeEmail: current.assignee_email,
    createdAt: current.created_at,
    lastUpdated: current.updated_at.slice(0, 16).replace('T', ' '),
    firstResponseAt: current.first_response_at,
    resolvedAt: current.resolved_at,
    sla: slaFor(current),
  };
}

function activeStaff() {
  return db.prepare("SELECT id, name, email, employee_id, role FROM users WHERE active = 1 AND role = 'Agent' ORDER BY name").all();
}

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validText(value, maximum) {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maximum;
}

function validateWrite(req, res, next) {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return auth.requireCsrf(req, res, next);
  next();
}

router.post('/auth/login', function(req, res) {
  var payload = req.body || {};
  var email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  var user = db.prepare('SELECT * FROM users WHERE email = ? AND active = 1').get(email);
  if (!user || !store.verifyPassword(payload.password, user.password_hash)) {
    return sendError(res, 401, 'Email or password is incorrect');
  }

  var session = auth.createSession(user.id);
  res.cookie(auth.SESSION_COOKIE, session.token, auth.sessionCookieOptions());
  return res.json({ user: store.safeUser(user), csrfToken: session.csrfToken });
});

router.use(auth.requireAuth);
router.use(validateWrite);

router.get('/auth/me', function(req, res) {
  return res.json({ user: req.user, csrfToken: req.authSession.csrfToken });
});

router.post('/auth/logout', function(req, res) {
  auth.revokeSession(req.authSession.token);
  res.clearCookie(auth.SESSION_COOKIE, auth.sessionCookieOptions());
  return res.json({ success: true });
});

router.get('/categories', function(req, res) {
  return res.json({ categories: db.prepare('SELECT name FROM categories WHERE active = 1 ORDER BY name').all().map(function(row) { return row.name; }) });
});

router.get('/agents', auth.requireRole('Agent', 'Manager', 'Admin'), function(req, res) {
  return res.json({ agents: activeStaff() });
});

router.get('/tickets', function(req, res) {
  var scope = scopeSql(req.user, 't');
  var filters = ['t.deleted_at IS NULL', scope.sql];
  var params = scope.params.slice();
  ['status', 'priority', 'category'].forEach(function(field) {
    if (typeof req.query[field] === 'string' && req.query[field].trim()) {
      filters.push('t.' + field + ' = ?');
      params.push(req.query[field].trim());
    }
  });
  var statement = db.prepare(`
    SELECT t.*, requester.name AS requester_name, requester.email AS requester_email,
      assignee.name AS assignee_name, assignee.email AS assignee_email
    FROM tickets t
    JOIN users requester ON requester.id = t.requester_id
    LEFT JOIN users assignee ON assignee.id = t.assignee_id
    WHERE ${filters.join(' AND ')}
    ORDER BY t.updated_at DESC
  `);
  var rows = statement.all.apply(statement, params);
  return res.json({ tickets: rows.map(serializeTicket) });
});

router.post('/tickets', function(req, res) {
  var payload = req.body || {};
  var subject = typeof payload.subject === 'string' ? payload.subject.trim() : '';
  var category = typeof payload.category === 'string' ? payload.category.trim() : '';
  var priority = payload.priority;
  var description = typeof payload.description === 'string' ? payload.description.trim() : '';
  if (!validText(subject, 200) || !validText(category, 80) || !store.priorities.includes(priority) || description.length > 10000) {
    return sendError(res, 400, 'Provide a subject (1-200 characters), active category, valid priority, and description up to 10,000 characters');
  }
  if (!db.prepare('SELECT 1 FROM categories WHERE name = ? AND active = 1').get(category)) {
    return sendError(res, 400, 'Category is not active');
  }

  var now = store.utcNow();
  var id = store.makeTicketId();
  var created = db.transaction(function() {
    db.prepare(`
      INSERT INTO tickets (id, requester_id, subject, description, category, priority, status, created_at, updated_at, resolution_started_at)
      VALUES (?, ?, ?, ?, ?, ?, 'Open', ?, ?, ?)
    `).run(id, req.user.id, subject, description, category, priority, now, now, now);
    auditTicket(id, req.user, 'ticket_created', { subject: subject, category: category, priority: priority });
  });
  created();
  evaluateSla(id);
  return res.status(201).json({ ticket: serializeTicket(ticketRow(id)) });
});

router.get('/tickets/:id', function(req, res) {
  var ticket = getAccessibleTicket(req.params.id, req.user);
  if (!ticket) return sendError(res, 404, 'Ticket not found');
  return res.json({ ticket: serializeTicket(ticket) });
});

router.put('/tickets/:id', function(req, res) {
  var ticket = getAccessibleTicket(req.params.id, req.user);
  if (!ticket) return sendError(res, 404, 'Ticket not found');
  if (!staffRoles.includes(req.user.role)) return sendError(res, 403, 'Only support staff can edit ticket details');
  if (req.user.role === 'Agent' && ticket.assignee_id !== null && ticket.assignee_id !== req.user.id) {
    return sendError(res, 403, 'Agents can edit only assigned or unassigned queue tickets');
  }

  var payload = req.body || {};
  var updates = {};
  if (payload.subject !== undefined) {
    if (!validText(payload.subject, 200)) return sendError(res, 400, 'Subject must be 1-200 characters');
    updates.subject = payload.subject.trim();
  }
  if (payload.description !== undefined) {
    if (typeof payload.description !== 'string' || payload.description.trim().length > 10000) return sendError(res, 400, 'Description must be 10,000 characters or fewer');
    updates.description = payload.description.trim();
  }
  if (payload.category !== undefined) {
    if (!db.prepare('SELECT 1 FROM categories WHERE name = ? AND active = 1').get(payload.category)) return sendError(res, 400, 'Category is not active');
    updates.category = payload.category;
  }
  if (payload.priority !== undefined) {
    if (!store.priorities.includes(payload.priority)) return sendError(res, 400, 'Priority is invalid');
    updates.priority = payload.priority;
  }
  if (!Object.keys(updates).length) return sendError(res, 400, 'No editable fields provided');

  var changes = {};
  Object.keys(updates).forEach(function(key) {
    var dbKey = key === 'description' ? 'description' : key;
    if (ticket[dbKey] !== updates[key]) changes[key] = { before: ticket[dbKey], after: updates[key] };
  });
  if (!Object.keys(changes).length) return res.json({ ticket: serializeTicket(ticket) });
  var transaction = db.transaction(function() {
    var setClause = Object.keys(updates).map(function(key) { return key + ' = @' + key; }).join(', ');
    db.prepare('UPDATE tickets SET ' + setClause + ', updated_at = @updatedAt WHERE id = @id').run(Object.assign({}, updates, { updatedAt: store.utcNow(), id: ticket.id }));
    auditTicket(ticket.id, req.user, 'ticket_updated', changes);
  });
  transaction();
  return res.json({ ticket: serializeTicket(ticketRow(ticket.id)) });
});

router.patch('/tickets/:id/status', function(req, res) {
  var ticket = getAccessibleTicket(req.params.id, req.user);
  if (!ticket) return sendError(res, 404, 'Ticket not found');
  if (!staffRoles.includes(req.user.role)) return sendError(res, 403, 'Only support staff can change ticket status');
  if (req.user.role === 'Agent' && ticket.assignee_id !== null && ticket.assignee_id !== req.user.id) {
    return sendError(res, 403, 'Agents can update only assigned or unassigned queue tickets');
  }
  var status = req.body && req.body.status;
  if (!['Open', 'In Progress', 'Resolved', 'Closed'].includes(status)) return sendError(res, 400, 'Status is invalid');
  if (status === ticket.status) return res.json({ ticket: serializeTicket(ticket) });

  var now = store.utcNow();
  var previousStatus = ticket.status;
  var transaction = db.transaction(function() {
    var resolutionStartedAt = ticket.resolved_at && activeStatuses.includes(status) ? now : ticket.resolution_started_at;
    var resolvedAt = status === 'Resolved' || status === 'Closed' ? now : null;
    db.prepare('UPDATE tickets SET status = ?, updated_at = ?, resolution_started_at = ?, resolved_at = ? WHERE id = ?')
      .run(status, now, resolutionStartedAt, resolvedAt, ticket.id);
    auditTicket(ticket.id, req.user, 'status_changed', { before: previousStatus, after: status });
    if (resolvedAt) {
      var requester = db.prepare('SELECT id, notify_comments FROM users WHERE id = ?').get(ticket.requester_id);
      if (requester && requester.notify_comments) createNotification(requester.id, ticket.id, 'resolved:' + ticket.id + ':' + now, 'Ticket resolved', ticket.id + ' was marked ' + status + '.');
    }
  });
  transaction();
  return res.json({ ticket: serializeTicket(ticketRow(ticket.id)) });
});

router.delete('/tickets/:id', auth.requireRole('Admin'), function(req, res) {
  var ticket = getAccessibleTicket(req.params.id, req.user);
  if (!ticket) return sendError(res, 404, 'Ticket not found');
  var now = store.utcNow();
  db.transaction(function() {
    db.prepare('UPDATE tickets SET deleted_at = ?, updated_at = ? WHERE id = ?').run(now, now, ticket.id);
    auditTicket(ticket.id, req.user, 'ticket_deleted', { softDeleted: true });
  })();
  return res.json({ success: true, deletedId: ticket.id });
});

router.put('/tickets/:id/assignment', function(req, res) {
  var ticket = getAccessibleTicket(req.params.id, req.user);
  if (!ticket) return sendError(res, 404, 'Ticket not found');
  if (!activeStatuses.includes(ticket.status)) return sendError(res, 409, 'Resolved or Closed tickets cannot be assigned');
  var assigneeId = req.body && req.body.assigneeId;
  if (assigneeId !== null && assigneeId !== undefined) {
    assigneeId = Number(assigneeId);
    if (!Number.isSafeInteger(assigneeId) || assigneeId <= 0) return sendError(res, 400, 'Assignee ID is invalid');
  }
  if (assigneeId === null && (req.user.role === 'Manager' || req.user.role === 'Admin')) {
    if (ticket.assignee_id === null) return res.json({ ticket: serializeTicket(ticket) });
  } else if (req.user.role === 'Agent' && ticket.assignee_id === null && Number(assigneeId) === req.user.id) {
    assigneeId = req.user.id;
  } else if (req.user.role !== 'Manager' && req.user.role !== 'Admin') {
    return sendError(res, 403, 'Only Managers/Admins can assign an Agent; Agents can claim unassigned tickets');
  }

  if (assigneeId !== null) {
    var assignee = db.prepare("SELECT id, name FROM users WHERE id = ? AND active = 1 AND role = 'Agent'").get(Number(assigneeId));
    if (!assignee) return sendError(res, 400, 'Assignee must be an active Agent');
    assigneeId = assignee.id;
  }
  if (ticket.assignee_id === assigneeId) return res.json({ ticket: serializeTicket(ticket) });

  var previousAssigneeId = ticket.assignee_id;
  var now = store.utcNow();
  db.transaction(function() {
    db.prepare('UPDATE tickets SET assignee_id = ?, updated_at = ? WHERE id = ?').run(assigneeId, now, ticket.id);
    auditTicket(ticket.id, req.user, 'assignment_changed', { before: previousAssigneeId, after: assigneeId });
    if (assigneeId) {
      var recipient = db.prepare('SELECT id, notify_assignments FROM users WHERE id = ?').get(assigneeId);
      if (recipient && recipient.notify_assignments) createNotification(recipient.id, ticket.id, 'assignment:' + ticket.id + ':' + now, 'Ticket assigned', ticket.id + ' was assigned to you.');
    }
  })();
  return res.json({ ticket: serializeTicket(ticketRow(ticket.id)) });
});

router.get('/tickets/:id/comments', function(req, res) {
  var ticket = getAccessibleTicket(req.params.id, req.user);
  if (!ticket) return sendError(res, 404, 'Ticket not found');
  var comments = db.prepare(`
    SELECT c.id, c.ticket_id AS ticketId, c.author_id AS authorId, u.name AS author,
      c.visibility, c.body, c.created_at AS createdAt
    FROM comments c JOIN users u ON u.id = c.author_id
    WHERE c.ticket_id = ? AND (? = 1 OR c.visibility = 'public')
    ORDER BY c.created_at, c.id
  `).all(ticket.id, staffRoles.includes(req.user.role) ? 1 : 0);
  return res.json({ comments: comments });
});

router.post('/tickets/:id/comments', function(req, res) {
  var ticket = getAccessibleTicket(req.params.id, req.user);
  if (!ticket) return sendError(res, 404, 'Ticket not found');
  var payload = req.body || {};
  var body = typeof payload.body === 'string' ? payload.body.trim() : '';
  var visibility = payload.visibility || 'public';
  if (!validText(body, 10000)) return sendError(res, 400, 'Comment must be 1-10,000 characters');
  if (!['public', 'internal'].includes(visibility)) return sendError(res, 400, 'Comment visibility is invalid');
  if (visibility === 'internal' && !staffRoles.includes(req.user.role)) return sendError(res, 403, 'Only support staff can add internal notes');
  if (visibility === 'public' && !staffRoles.includes(req.user.role) && ticket.requester_id !== req.user.id) return sendError(res, 403, 'You cannot comment on this ticket');

  var now = store.utcNow();
  var result = db.transaction(function() {
    var comment = db.prepare('INSERT INTO comments (ticket_id, author_id, visibility, body, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(ticket.id, req.user.id, visibility, body, now);
    db.prepare('UPDATE tickets SET updated_at = ?, first_response_at = CASE WHEN first_response_at IS NULL AND ? = 1 THEN ? ELSE first_response_at END WHERE id = ?')
      .run(now, visibility === 'public' && staffRoles.includes(req.user.role) ? 1 : 0, now, ticket.id);
    auditTicket(ticket.id, req.user, 'comment_added', { commentId: comment.lastInsertRowid, visibility: visibility });
    if (visibility === 'public') {
      if (staffRoles.includes(req.user.role)) {
        var requester = db.prepare('SELECT id, notify_comments FROM users WHERE id = ?').get(ticket.requester_id);
        if (requester && requester.id !== req.user.id && requester.notify_comments) createNotification(requester.id, ticket.id, 'comment:' + comment.lastInsertRowid + ':' + requester.id, 'New ticket reply', ticket.id + ' has a new public reply.');
      } else if (ticket.assignee_id) {
        var assignee = db.prepare('SELECT id, notify_comments FROM users WHERE id = ?').get(ticket.assignee_id);
        if (assignee && assignee.notify_comments) createNotification(assignee.id, ticket.id, 'comment:' + comment.lastInsertRowid + ':' + assignee.id, 'New ticket reply', ticket.id + ' has a new public reply.');
      }
    } else {
      db.prepare("SELECT id FROM users WHERE active = 1 AND role IN ('Agent', 'Manager', 'Admin') AND id != ? AND notify_comments = 1").all(req.user.id)
        .forEach(function(user) { createNotification(user.id, ticket.id, 'internal-comment:' + comment.lastInsertRowid + ':' + user.id, 'Internal note added', ticket.id + ' has a new internal note.'); });
    }
    return comment.lastInsertRowid;
  });
  var commentId = result();
  var commentRow = db.prepare(`
    SELECT c.id, c.ticket_id AS ticketId, c.author_id AS authorId, u.name AS author,
      c.visibility, c.body, c.created_at AS createdAt
    FROM comments c JOIN users u ON u.id = c.author_id WHERE c.id = ?
  `).get(commentId);
  return res.status(201).json({ comment: commentRow });
});

router.get('/tickets/:id/audit', auth.requireRole('Agent', 'Manager', 'Admin'), function(req, res) {
  var ticket = getAccessibleTicket(req.params.id, req.user);
  if (!ticket) return sendError(res, 404, 'Ticket not found');
  var events = db.prepare(`
    SELECT a.id, a.ticket_id AS ticketId, a.actor_id AS actorId, COALESCE(u.name, 'System') AS actor,
      a.actor_role AS actorRole, a.action, a.details_json AS detailsJson, a.created_at AS createdAt
    FROM audit_events a LEFT JOIN users u ON u.id = a.actor_id
    WHERE a.ticket_id = ? ORDER BY a.created_at DESC, a.id DESC
  `).all(ticket.id).map(function(event) {
    event.details = JSON.parse(event.detailsJson);
    delete event.detailsJson;
    return event;
  });
  return res.json({ events: events });
});

router.get('/notifications', function(req, res) {
  var limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);
  var notifications = db.prepare(`
    SELECT id, ticket_id AS ticketId, event_key AS eventKey, title, message, read_at AS readAt, created_at AS createdAt
    FROM notifications WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ?
  `).all(req.user.id, limit);
  return res.json({ notifications: notifications });
});

router.patch('/notifications/read-all', function(req, res) {
  db.prepare('UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL').run(store.utcNow(), req.user.id);
  return res.json({ success: true });
});

router.patch('/notifications/:id/read', function(req, res) {
  var result = db.prepare('UPDATE notifications SET read_at = ? WHERE id = ? AND user_id = ? AND read_at IS NULL')
    .run(store.utcNow(), req.params.id, req.user.id);
  if (!result.changes) return sendError(res, 404, 'Notification not found');
  return res.json({ success: true });
});

router.get('/admin/users', auth.requireRole('Admin'), function(req, res) {
  var users = db.prepare(`
    SELECT id, email, name, employee_id AS employeeId, role, active,
      notify_assignments AS notifyAssignments, notify_comments AS notifyComments,
      notify_sla AS notifySla, created_at AS createdAt
    FROM users ORDER BY name
  `).all().map(function(user) {
    user.active = Boolean(user.active);
    user.notifyAssignments = Boolean(user.notifyAssignments);
    user.notifyComments = Boolean(user.notifyComments);
    user.notifySla = Boolean(user.notifySla);
    return user;
  });
  return res.json({ users: users });
});

router.post('/admin/users', auth.requireRole('Admin'), function(req, res) {
  var payload = req.body || {};
  if (!validText(payload.name, 120) || !isValidEmail(payload.email) || !allRoles.includes(payload.role) || typeof payload.password !== 'string' || payload.password.length < 12) {
    return sendError(res, 400, 'Provide a name, valid email, supported role, and password of at least 12 characters');
  }
  try {
    var user = store.addUser({
      email: payload.email,
      name: payload.name,
      employeeId: payload.employeeId || null,
      role: payload.role,
      password: payload.password,
    });
    auditSystem(req.user, 'user', user.id, 'user_created', { email: user.email, role: user.role });
    return res.status(201).json({ user: store.safeUser(user) });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') return sendError(res, 409, 'Email or employee ID already exists');
    throw error;
  }
});

router.patch('/admin/users/:id', auth.requireRole('Admin'), function(req, res) {
  var user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return sendError(res, 404, 'User not found');
  var payload = req.body || {};
  var updates = {};
  if (payload.role !== undefined) {
    if (!allRoles.includes(payload.role)) return sendError(res, 400, 'Role is invalid');
    updates.role = payload.role;
  }
  if (payload.active !== undefined) {
    if (typeof payload.active !== 'boolean') return sendError(res, 400, 'Active must be a boolean');
    updates.active = payload.active ? 1 : 0;
  }
  if (payload.name !== undefined) {
    if (!validText(payload.name, 120)) return sendError(res, 400, 'Name must be 1-120 characters');
    updates.name = payload.name.trim();
  }
  ['notifyAssignments', 'notifyComments', 'notifySla'].forEach(function(field) {
    if (payload[field] !== undefined) {
      if (typeof payload[field] !== 'boolean') updates.invalidPreference = true;
      else updates[field === 'notifyAssignments' ? 'notify_assignments' : field === 'notifyComments' ? 'notify_comments' : 'notify_sla'] = payload[field] ? 1 : 0;
    }
  });
  if (updates.invalidPreference) return sendError(res, 400, 'Notification preferences must be booleans');
  if (typeof payload.password === 'string') {
    if (payload.password.length < 12) return sendError(res, 400, 'Password must be at least 12 characters');
    updates.password_hash = store.hashPassword(payload.password);
  }
  delete updates.invalidPreference;
  if (!Object.keys(updates).length) return sendError(res, 400, 'No user changes provided');
  if (user.role === 'Admin' && (updates.role && updates.role !== 'Admin' || updates.active === 0)) {
    var adminCount = db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'Admin' AND active = 1").get().count;
    if (adminCount <= 1) return sendError(res, 409, 'The last active Admin cannot be demoted or deactivated');
  }
  var detail = {};
  Object.keys(updates).forEach(function(key) {
    if (key === 'password_hash') detail.passwordReset = true;
    else detail[key] = { before: user[key], after: updates[key] };
  });
  var revokeSessions = updates.role !== undefined || updates.active !== undefined || updates.password_hash !== undefined || updates.name !== undefined;
  var setClause = Object.keys(updates).map(function(key) { return key + ' = @' + key; }).join(', ');
  db.prepare('UPDATE users SET ' + setClause + ' WHERE id = @id').run(Object.assign({ id: user.id }, updates));
  if (revokeSessions) db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
  auditSystem(req.user, 'user', user.id, 'user_updated', detail);
  return res.json({ user: store.safeUser(db.prepare('SELECT * FROM users WHERE id = ?').get(user.id)) });
});

router.get('/admin/categories', auth.requireRole('Admin'), function(req, res) {
  return res.json({ categories: db.prepare('SELECT name, active, created_at AS createdAt FROM categories ORDER BY name').all().map(function(row) { row.active = Boolean(row.active); return row; }) });
});

router.post('/admin/categories', auth.requireRole('Admin'), function(req, res) {
  var name = req.body && typeof req.body.name === 'string' ? req.body.name.trim() : '';
  if (!validText(name, 80)) return sendError(res, 400, 'Category name must be 1-80 characters');
  try {
    db.prepare('INSERT INTO categories (name, created_at) VALUES (?, ?)').run(name, store.utcNow());
    auditSystem(req.user, 'category', name, 'category_created', {});
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY' || error.code === 'SQLITE_CONSTRAINT_UNIQUE') return sendError(res, 409, 'Category already exists');
    throw error;
  }
  return res.status(201).json({ category: { name: name, active: true } });
});

router.patch('/admin/categories/:name', auth.requireRole('Admin'), function(req, res) {
  var category = db.prepare('SELECT name, active FROM categories WHERE name = ?').get(req.params.name);
  if (!category) return sendError(res, 404, 'Category not found');
  if (typeof (req.body && req.body.active) !== 'boolean') return sendError(res, 400, 'Active must be a boolean');
  if (!req.body.active && db.prepare('SELECT 1 FROM categories WHERE active = 1').all().length <= 1) return sendError(res, 409, 'At least one category must remain active');
  db.prepare('UPDATE categories SET active = ? WHERE name = ?').run(req.body.active ? 1 : 0, category.name);
  auditSystem(req.user, 'category', category.name, 'category_updated', { before: Boolean(category.active), after: req.body.active });
  return res.json({ category: { name: category.name, active: req.body.active } });
});

router.get('/admin/sla-policies', auth.requireRole('Admin'), function(req, res) {
  return res.json({ policies: db.prepare('SELECT priority, response_hours AS responseHours, resolution_hours AS resolutionHours, active FROM sla_policies ORDER BY CASE priority WHEN \'Critical\' THEN 1 WHEN \'High\' THEN 2 WHEN \'Medium\' THEN 3 ELSE 4 END').all().map(function(row) { row.active = Boolean(row.active); return row; }) });
});

router.put('/admin/sla-policies/:priority', auth.requireRole('Admin'), function(req, res) {
  var priority = req.params.priority;
  var payload = req.body || {};
  var responseHours = Number(payload.responseHours);
  var resolutionHours = Number(payload.resolutionHours);
  if (!store.priorities.includes(priority) || !Number.isFinite(responseHours) || !Number.isFinite(resolutionHours) || responseHours <= 0 || resolutionHours <= 0 || responseHours > 8760 || resolutionHours > 8760) {
    return sendError(res, 400, 'Provide positive response and resolution targets up to 8,760 hours');
  }
  var old = db.prepare('SELECT response_hours, resolution_hours FROM sla_policies WHERE priority = ?').get(priority);
  db.prepare('UPDATE sla_policies SET response_hours = ?, resolution_hours = ?, updated_at = ? WHERE priority = ?')
    .run(responseHours, resolutionHours, store.utcNow(), priority);
  auditSystem(req.user, 'sla_policy', priority, 'sla_policy_updated', { before: old, after: { responseHours: responseHours, resolutionHours: resolutionHours } });
  return res.json({ policy: { priority: priority, responseHours: responseHours, resolutionHours: resolutionHours } });
});

router.get('/admin/system-audit', auth.requireRole('Admin'), function(req, res) {
  var events = db.prepare(`
    SELECT a.id, a.actor_id AS actorId, COALESCE(u.name, 'System') AS actor,
      a.actor_role AS actorRole, a.entity_type AS entityType, a.entity_id AS entityId,
      a.action, a.details_json AS detailsJson, a.created_at AS createdAt
    FROM system_audit_events a LEFT JOIN users u ON u.id = a.actor_id
    ORDER BY a.created_at DESC, a.id DESC LIMIT 100
  `).all().map(function(event) { event.details = JSON.parse(event.detailsJson); delete event.detailsJson; return event; });
  return res.json({ events: events });
});

function reportRows(user, from, to) {
  var scope = scopeSql(user, 't');
  var statement = db.prepare(`
    SELECT t.*, requester.name AS requester_name, assignee.name AS assignee_name
    FROM tickets t JOIN users requester ON requester.id = t.requester_id
    LEFT JOIN users assignee ON assignee.id = t.assignee_id
    WHERE t.deleted_at IS NULL AND ${scope.sql} AND t.created_at >= ? AND t.created_at < ?
    ORDER BY t.created_at DESC
  `);
  return statement.all.apply(statement, scope.params.concat([from, to]));
}

function reportRange(req) {
  var to = typeof req.query.to === 'string' ? req.query.to : new Date().toISOString().slice(0, 10);
  var from = typeof req.query.from === 'string' ? req.query.from : new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || Number.isNaN(Date.parse(from)) || Number.isNaN(Date.parse(to)) || from > to) return null;
  return { from: from + 'T00:00:00.000Z', to: new Date(new Date(to + 'T00:00:00.000Z').getTime() + 24 * 60 * 60 * 1000).toISOString(), fromDate: from, toDate: to };
}

router.get('/reports/overview', auth.requireRole('Agent', 'Manager', 'Admin'), function(req, res) {
  var range = reportRange(req);
  if (!range) return sendError(res, 400, 'Date range must use YYYY-MM-DD and start no later than end');
  var rows = reportRows(req.user, range.from, range.to);
  var countBy = function(key) {
    var totals = {};
    rows.forEach(function(row) { totals[row[key]] = (totals[row[key]] || 0) + 1; });
    return Object.keys(totals).sort().map(function(name) { return { name: name, count: totals[name] }; });
  };
  var workload = {};
  var trend = {};
  var resolutionHours = [];
  rows.forEach(function(row) {
    var assignee = row.assignee_name || 'Unassigned';
    if (activeStatuses.includes(row.status)) workload[assignee] = (workload[assignee] || 0) + 1;
    var day = row.created_at.slice(0, 10);
    trend[day] = (trend[day] || 0) + 1;
    if (row.resolved_at) resolutionHours.push((new Date(row.resolved_at).getTime() - new Date(row.created_at).getTime()) / 3600000);
  });
  var ids = rows.map(function(row) { return row.id; });
  var slaEvents = [];
  if (ids.length) {
    var slaStatement = db.prepare(`
      SELECT event_type, COUNT(*) AS count FROM sla_events
      WHERE ticket_id IN (${ids.map(function() { return '?'; }).join(',')}) AND created_at >= ? AND created_at < ?
      GROUP BY event_type
    `);
    slaEvents = slaStatement.all.apply(slaStatement, ids.concat([range.from, range.to]));
  }
  var onTime = resolutionHours.length;
  var breached = slaEvents.filter(function(event) { return event.event_type.indexOf('breach') !== -1; }).reduce(function(sum, event) { return sum + event.count; }, 0);
  return res.json({
    range: { from: range.fromDate, to: range.toDate },
    totals: { tickets: rows.length, open: rows.filter(function(row) { return activeStatuses.includes(row.status); }).length, resolved: rows.filter(function(row) { return row.status === 'Resolved' || row.status === 'Closed'; }).length, averageResolutionHours: onTime ? Math.round(resolutionHours.reduce(function(a, b) { return a + b; }, 0) / onTime * 10) / 10 : null, slaBreaches: breached },
    byStatus: countBy('status'),
    byPriority: countBy('priority'),
    byCategory: countBy('category'),
    agentWorkload: Object.keys(workload).sort().map(function(name) { return { name: name, count: workload[name] }; }),
    volumeTrend: Object.keys(trend).sort().map(function(date) { return { date: date, count: trend[date] }; }),
    slaEvents: slaEvents,
  });
});

router.get('/reports/export.csv', auth.requireRole('Agent', 'Manager', 'Admin'), function(req, res) {
  var range = reportRange(req);
  if (!range) return sendError(res, 400, 'Date range must use YYYY-MM-DD and start no later than end');
  var rows = reportRows(req.user, range.from, range.to);
  function csv(value) {
    var text = value === null || value === undefined ? '' : String(value);
    return '"' + text.replace(/"/g, '""') + '"';
  }
  var lines = [['Ticket ID', 'Subject', 'Requester', 'Assignee', 'Category', 'Priority', 'Status', 'Created At', 'Resolved At'].map(csv).join(',')];
  rows.forEach(function(row) {
    lines.push([row.id, row.subject, row.requester_name, row.assignee_name || 'Unassigned', row.category, row.priority, row.status, row.created_at, row.resolved_at].map(csv).join(','));
  });
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', 'attachment; filename="helpdesk-report-' + range.fromDate + '-to-' + range.toDate + '.csv"');
  return res.send('\uFEFF' + lines.join('\r\n'));
});

router.use(function(error, req, res, next) {
  console.error(error);
  if (res.headersSent) return next(error);
  return res.status(500).json({ error: 'An unexpected server error occurred' });
});

var slaPoller = setInterval(function() {
  try {
    db.prepare("SELECT id FROM tickets WHERE deleted_at IS NULL AND status IN ('Open', 'In Progress')").all()
      .forEach(function(ticket) { evaluateSla(ticket.id); });
  } catch (error) {
    console.error('SLA evaluation failed', error);
  }
}, 60 * 1000);
if (typeof slaPoller.unref === 'function') slaPoller.unref();

module.exports = router;