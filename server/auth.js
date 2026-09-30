var crypto = require('crypto');
var store = require('./db');

var SESSION_COOKIE = 'helpdesk_session';
var SESSION_DURATION_MS = 12 * 60 * 60 * 1000;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_DURATION_MS,
  };
}

function createSession(userId) {
  var token = crypto.randomBytes(32).toString('base64url');
  var csrfToken = crypto.randomBytes(32).toString('base64url');
  var createdAt = store.utcNow();
  var expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
  store.db.prepare(`
    INSERT INTO sessions (token_hash, csrf_token, user_id, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(hashToken(token), csrfToken, userId, expiresAt, createdAt);
  return { token: token, csrfToken: csrfToken, expiresAt: expiresAt };
}

function revokeSession(token) {
  if (!token) return;
  store.db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
}

function attachSession(req, res, next) {
  var token = req.cookies && req.cookies[SESSION_COOKIE];
  if (token) {
    var session = store.db.prepare(`
      SELECT s.token_hash, s.csrf_token, s.expires_at, u.*
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.expires_at > ? AND u.active = 1
    `).get(hashToken(token), store.utcNow());

    if (session) {
      req.authSession = {
        token: token,
        tokenHash: session.token_hash,
        csrfToken: session.csrf_token,
        expiresAt: session.expires_at,
      };
      req.user = store.safeUser(session);
    }
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

function requireCsrf(req, res, next) {
  var supplied = req.get('x-csrf-token') || '';
  var expected = req.authSession && req.authSession.csrfToken;
  if (!expected || supplied.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) {
    return res.status(403).json({ error: 'Invalid or missing CSRF token' });
  }
  next();
}

function requireRole() {
  var permittedRoles = Array.prototype.slice.call(arguments);
  return function(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (permittedRoles.indexOf(req.user.role) === -1) {
      return res.status(403).json({ error: 'You do not have permission to perform this action' });
    }
    next();
  };
}

module.exports = {
  SESSION_COOKIE: SESSION_COOKIE,
  sessionCookieOptions: sessionCookieOptions,
  createSession: createSession,
  revokeSession: revokeSession,
  attachSession: attachSession,
  requireAuth: requireAuth,
  requireCsrf: requireCsrf,
  requireRole: requireRole,
};