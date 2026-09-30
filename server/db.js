var crypto = require('crypto');
var fs = require('fs');
var path = require('path');
var Database = require('better-sqlite3');

var configuredPath = process.env.HELPDESK_DB_PATH || path.join(__dirname, 'data', 'helpdesk.sqlite');
if (configuredPath !== ':memory:') {
  fs.mkdirSync(path.dirname(configuredPath), { recursive: true });
}

var db = new Database(configuredPath);
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    name TEXT NOT NULL,
    employee_id TEXT UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('Requester', 'Agent', 'Manager', 'Admin')),
    password_hash TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    notify_assignments INTEGER NOT NULL DEFAULT 1 CHECK (notify_assignments IN (0, 1)),
    notify_comments INTEGER NOT NULL DEFAULT 1 CHECK (notify_comments IN (0, 1)),
    notify_sla INTEGER NOT NULL DEFAULT 1 CHECK (notify_sla IN (0, 1)),
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    csrf_token TEXT NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS categories (
    name TEXT PRIMARY KEY COLLATE NOCASE,
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tickets (
    id TEXT PRIMARY KEY,
    requester_id INTEGER NOT NULL REFERENCES users(id),
    subject TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL,
    priority TEXT NOT NULL CHECK (priority IN ('Critical', 'High', 'Medium', 'Low')),
    status TEXT NOT NULL CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Closed')),
    assignee_id INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    first_response_at TEXT,
    resolution_started_at TEXT NOT NULL,
    resolved_at TEXT,
    deleted_at TEXT
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id TEXT NOT NULL REFERENCES tickets(id),
    author_id INTEGER NOT NULL REFERENCES users(id),
    visibility TEXT NOT NULL CHECK (visibility IN ('public', 'internal')),
    body TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS audit_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id TEXT NOT NULL REFERENCES tickets(id),
    actor_id INTEGER REFERENCES users(id),
    actor_role TEXT NOT NULL,
    action TEXT NOT NULL,
    details_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sla_policies (
    priority TEXT PRIMARY KEY CHECK (priority IN ('Critical', 'High', 'Medium', 'Low')),
    response_hours REAL NOT NULL CHECK (response_hours > 0),
    resolution_hours REAL NOT NULL CHECK (resolution_hours > 0),
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sla_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id TEXT NOT NULL REFERENCES tickets(id),
    event_type TEXT NOT NULL CHECK (event_type IN ('response_warning', 'response_breach', 'resolution_warning', 'resolution_breach')),
    due_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE (ticket_id, event_type, due_at)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ticket_id TEXT REFERENCES tickets(id),
    event_key TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read_at TEXT,
    created_at TEXT NOT NULL,
    UNIQUE (user_id, event_key)
  );

  CREATE TABLE IF NOT EXISTS system_audit_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_id INTEGER REFERENCES users(id),
    actor_role TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,
    details_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_tickets_requester ON tickets(requester_id, deleted_at, created_at);
  CREATE INDEX IF NOT EXISTS idx_tickets_assignee ON tickets(assignee_id, deleted_at, status);
  CREATE INDEX IF NOT EXISTS idx_comments_ticket ON comments(ticket_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_audit_ticket ON audit_events(ticket_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read_at, created_at);
`);

function utcNow() {
  return new Date().toISOString();
}

function hashPassword(password) {
  var salt = crypto.randomBytes(16).toString('hex');
  var hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return salt + ':' + hash;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || typeof password !== 'string') return false;
  var parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  var actual = crypto.scryptSync(password, parts[0], 64);
  var expected = Buffer.from(parts[1], 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function safeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    employeeId: user.employee_id,
    role: user.role,
    active: Boolean(user.active),
  };
}

function addUser(user) {
  var result = db.prepare(`
    INSERT INTO users (email, name, employee_id, role, password_hash, created_at)
    VALUES (@email, @name, @employeeId, @role, @passwordHash, @createdAt)
  `).run({
    email: user.email.trim().toLowerCase(),
    name: user.name.trim(),
    employeeId: user.employeeId || null,
    role: user.role,
    passwordHash: hashPassword(user.password),
    createdAt: utcNow(),
  });
  return db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
}

var roles = ['Requester', 'Agent', 'Manager', 'Admin'];
var priorities = ['Critical', 'High', 'Medium', 'Low'];
var defaultCategories = ['Network', 'Storage', 'Hardware', 'Email', 'Security', 'Applications', 'Devices'];

function seedDefaults() {
  var insertCategory = db.prepare('INSERT OR IGNORE INTO categories (name, created_at) VALUES (?, ?)');
  defaultCategories.forEach(function(category) {
    insertCategory.run(category, utcNow());
  });

  var policies = [
    ['Critical', 1, 4],
    ['High', 4, 8],
    ['Medium', 8, 24],
    ['Low', 24, 72],
  ];
  var insertPolicy = db.prepare(`
    INSERT OR IGNORE INTO sla_policies (priority, response_hours, resolution_hours, updated_at)
    VALUES (?, ?, ?, ?)
  `);
  policies.forEach(function(policy) {
    insertPolicy.run(policy[0], policy[1], policy[2], utcNow());
  });

  var allowDemoData = process.env.NODE_ENV !== 'production' && process.env.HELPDESK_SEED_DEMO_USERS !== 'false';
  if (allowDemoData) {
    var demoUsers = [
      { email: 'requester@helpdesk.local', name: 'Jordan Lee', employeeId: 'EMP-1001', role: 'Requester', password: 'Requester123!' },
      { email: 'agent@helpdesk.local', name: 'Avery Morgan', employeeId: 'EMP-2001', role: 'Agent', password: 'Agent123!' },
      { email: 'manager@helpdesk.local', name: 'Riley Chen', employeeId: 'EMP-3001', role: 'Manager', password: 'Manager123!' },
      { email: 'admin@helpdesk.local', name: 'Taylor Brooks', employeeId: 'EMP-4001', role: 'Admin', password: 'Admin123!' },
    ];
    var insertUser = db.prepare(`
      INSERT OR IGNORE INTO users (email, name, employee_id, role, password_hash, created_at)
      VALUES (@email, @name, @employeeId, @role, @passwordHash, @createdAt)
    `);
    demoUsers.forEach(function(user) {
      insertUser.run({
        email: user.email,
        name: user.name,
        employeeId: user.employeeId,
        role: user.role,
        passwordHash: hashPassword(user.password),
        createdAt: utcNow(),
      });
    });
  }

  if (process.env.BOOTSTRAP_ADMIN_EMAIL && process.env.BOOTSTRAP_ADMIN_PASSWORD) {
    var email = process.env.BOOTSTRAP_ADMIN_EMAIL.trim().toLowerCase();
    var existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (!existingAdmin) {
      addUser({
        email: email,
        name: process.env.BOOTSTRAP_ADMIN_NAME || 'System Administrator',
        employeeId: null,
        role: 'Admin',
        password: process.env.BOOTSTRAP_ADMIN_PASSWORD,
      });
    }
  }

  var requester = db.prepare("SELECT id FROM users WHERE role = 'Requester' ORDER BY id LIMIT 1").get();
  var agent = db.prepare("SELECT id FROM users WHERE role = 'Agent' ORDER BY id LIMIT 1").get();
  var ticketCount = db.prepare('SELECT COUNT(*) AS count FROM tickets').get().count;
  if (ticketCount === 0 && requester && agent && allowDemoData && process.env.HELPDESK_SEED_DEMO_TICKETS !== 'false') {
    var now = Date.now();
    var seedTickets = [
      ['TCK-2048', 'VPN not connecting from home network', 'Network', 'High', 'In Progress', agent.id, 2],
      ['TCK-2055', 'Unable to access shared drive S:Finance', 'Storage', 'Critical', 'Open', null, 1],
      ['TCK-1981', 'Software license request for Adobe Acrobat Pro', 'Applications', 'Low', 'Resolved', agent.id, 4],
      ['TCK-2051', 'Laptop keyboard key stuck (spacebar)', 'Hardware', 'Medium', 'Open', null, 3],
      ['TCK-2091', 'Printer queue stuck on finance office device', 'Devices', 'Medium', 'In Progress', agent.id, 5],
    ];
    var insertTicket = db.prepare(`
      INSERT INTO tickets (id, requester_id, subject, description, category, priority, status, assignee_id, created_at, updated_at, first_response_at, resolution_started_at, resolved_at)
      VALUES (?, ?, ?, '', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    seedTickets.forEach(function(ticket) {
      var createdAt = new Date(now - ticket[6] * 60 * 60 * 1000).toISOString();
      var responseAt = ticket[4] === 'Open' ? null : new Date(now - (ticket[6] - 0.5) * 60 * 60 * 1000).toISOString();
      var resolvedAt = ticket[4] === 'Resolved' ? new Date(now - 60 * 60 * 1000).toISOString() : null;
      insertTicket.run(ticket[0], requester.id, ticket[1], ticket[2], ticket[3], ticket[4], ticket[5], createdAt, utcNow(), responseAt, createdAt, resolvedAt);
    });
  }
}

seedDefaults();

function makeTicketId() {
  var id;
  do {
    id = 'TCK-' + String(1000 + crypto.randomInt(9000));
  } while (db.prepare('SELECT 1 FROM tickets WHERE id = ?').get(id));
  return id;
}

module.exports = {
  db: db,
  roles: roles,
  priorities: priorities,
  defaultCategories: defaultCategories,
  utcNow: utcNow,
  hashPassword: hashPassword,
  verifyPassword: verifyPassword,
  safeUser: safeUser,
  addUser: addUser,
  makeTicketId: makeTicketId,
};