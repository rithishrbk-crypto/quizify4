const router = require('express').Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../lib/db');
const { HttpError, wrap } = require('../lib/http');

const ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 10;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DUMMY_HASH = bcrypt.hashSync('quizify-timing-dummy', ROUNDS); // equalises timing for unknown emails

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email });
const str = (v) => (typeof v === 'string' ? v : '');

function validateRegistration(body) {
  const errors = {};
  const name = str(body.name).trim().replace(/\s+/g, ' ');
  const email = str(body.email).trim().toLowerCase();
  const password = str(body.password);
  const confirmPassword = str(body.confirmPassword);
  if (name.length < 2 || name.length > 60) errors.name = 'Enter your full name (2 to 60 characters).';
  if (!EMAIL_RE.test(email) || email.length > 120) errors.email = 'Enter a valid email address.';
  if (password.length < 8 || password.length > 72 || !/[A-Za-z]/.test(password) || !/\d/.test(password))
    errors.password = 'Use 8 to 72 characters with at least one letter and one number.';
  if (!confirmPassword) errors.confirmPassword = 'Confirm your password.';
  else if (confirmPassword !== password) errors.confirmPassword = 'Passwords do not match.';
  return { errors, clean: { name, email, password } };
}

const startSession = (req, user) =>
  new Promise((resolve, reject) =>
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.userId = user.id; // fresh session id on login prevents session fixation
      req.session.save((e) => (e ? reject(e) : resolve()));
    })
  );

// Minimal brute-force guard: 10 failed logins per 15 minutes per IP + email.
const fails = new Map();
const WINDOW = 15 * 60 * 1000;
const blocked = (k) => { const e = fails.get(k); return Boolean(e && e.reset > Date.now() && e.count >= 10); };
const fail = (k) => {
  const e = fails.get(k);
  if (!e || e.reset < Date.now()) fails.set(k, { count: 1, reset: Date.now() + WINDOW });
  else e.count++;
};

router.post('/register', wrap(async (req, res) => {
  const { errors, clean } = validateRegistration(req.body || {});
  if (Object.keys(errors).length) throw new HttpError(400, 'Please fix the highlighted fields.', { errors });
  const passwordHash = await bcrypt.hash(clean.password, ROUNDS);
  const user = await db.update('users', (users) => {
    if (users.some((u) => u.email === clean.email))
      throw new HttpError(409, 'An account with this email already exists.', { errors: { email: 'This email is already registered.' } });
    const u = { id: crypto.randomUUID(), name: clean.name, email: clean.email, passwordHash, createdAt: new Date().toISOString() };
    users.push(u);
    return u;
  });
  await startSession(req, user);
  res.status(201).json({ user: publicUser(user) });
}));

router.post('/login', wrap(async (req, res) => {
  const email = str((req.body || {}).email).trim().toLowerCase();
  const password = str((req.body || {}).password);
  if (!email || !password) throw new HttpError(400, 'Enter your email and password.');
  const key = `${req.ip}|${email}`;
  if (blocked(key)) throw new HttpError(429, 'Too many failed attempts. Try again in a few minutes.');
  const user = (await db.read('users')).find((u) => u.email === email);
  const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
  if (!user || !ok) {
    fail(key);
    throw new HttpError(401, 'Incorrect email or password.');
  }
  fails.delete(key);
  await startSession(req, user);
  res.json({ user: publicUser(user) });
}));

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('quizify.sid');
    res.json({ ok: true });
  });
});

router.get('/me', wrap(async (req, res) => {
  if (!req.session.userId) throw new HttpError(401, 'Please log in to continue.');
  const user = (await db.read('users')).find((u) => u.id === req.session.userId);
  if (!user) throw new HttpError(401, 'Please log in to continue.');
  res.json({ user: publicUser(user) });
}));

module.exports = router;
