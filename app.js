require('dotenv').config({ quiet: true });
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const session = require('express-session');
const db = require('./lib/db');
const { HttpError } = require('./lib/http');
const { requireAuthPage, guestOnlyPage } = require('./middleware/auth');

const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';
const SESSION_HOURS = Number(process.env.SESSION_HOURS) || 2;

let secret = process.env.SESSION_SECRET;
const weak = !secret || secret.length < 16 || secret.startsWith('replace-this');
if (weak) {
  secret = crypto.randomBytes(32).toString('hex');
  console.warn('[security] SESSION_SECRET is missing or weak in .env. Using a temporary secret; sessions reset on every restart.');
}

const app = express();
app.disable('x-powered-by');
if (isProd) app.set('trust proxy', 1);

// Storage is opened on the first request, not at load time: on Netlify the Blobs
// credentials only exist once a request (and its event) has arrived.
let readyPromise = null;
const ready = () => {
  if (!readyPromise) readyPromise = db.init().catch((err) => { readyPromise = null; throw err; });
  return readyPromise;
};
app.use((req, res, next) => ready().then(() => next(), next));

app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'same-origin',
    'Content-Security-Policy':
      "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; script-src 'self'; frame-ancestors 'none'",
  });
  next();
});
app.use(express.json({ limit: '100kb' }));
app.use(session({
  name: 'quizify.sid',
  secret,
  resave: false,
  saveUninitialized: false,
  rolling: true, // session expires after SESSION_HOURS of inactivity
  cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.COOKIE_SECURE === 'true', maxAge: SESSION_HOURS * 3600 * 1000 },
}));

const noStore = (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); };
const page = (name) => (req, res) => res.sendFile(path.join(__dirname, 'views', `${name}.html`));

app.use(express.static(path.join(__dirname, 'public')));
app.get('/', page('index'));
app.get('/login', guestOnlyPage, noStore, page('login'));
app.get('/register', guestOnlyPage, noStore, page('register'));
app.get('/dashboard', requireAuthPage, noStore, page('dashboard'));
app.get('/history', requireAuthPage, noStore, page('history'));
app.get('/quiz/:id', requireAuthPage, noStore, page('quiz'));
app.get('/results/:id', requireAuthPage, noStore, page('results'));

app.use('/api', noStore);
app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/quiz'));
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));
app.use((req, res) => res.status(404).type('html').send(
  '<!doctype html><meta charset="utf-8"><title>Not found</title><body style="font-family:system-ui;background:#05070f;color:#eef0ff;display:grid;place-items:center;min-height:100vh;margin:0"><p>Page not found. <a style="color:#a78bfa" href="/">Go to Quizify</a></p>'
));

app.use((err, req, res, next) => {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message, ...err.extra });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid request body.' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request too large.' });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
});

module.exports = { app, ready, PORT };
