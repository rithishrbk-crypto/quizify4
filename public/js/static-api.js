// Static (no-server) mode: replaces the fetch-based api() from common.js with the same
// routes implemented in the browser. Data lives in localStorage. Used for Netlify hosting.
(function () {
  const PASS = 50, GRACE = 15000, SESSION_MS = 2 * 3600 * 1000;
  const quizzes = window.QUIZIFY_QUIZZES || [];
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem('quizify.' + k)); return v == null ? d : v; } catch (e) { return d; } };
  const save = (k, v) => localStorage.setItem('quizify.' + k, JSON.stringify(v));
  const fail = (status, message, extra = {}) => { throw Object.assign(new Error(message), { status, data: { error: message, ...extra } }); };
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
  const hex = (buf) => Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  async function hash(password, salt) {
    return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + ':' + password)));
  }

  function currentUser() {
    const s = load('session', null);
    if (!s || s.expires < Date.now()) return null;
    const u = load('users', []).find((x) => x.id === s.userId);
    if (!u) return null;
    save('session', { userId: s.userId, expires: Date.now() + SESSION_MS });
    return u;
  }
  const needUser = () => currentUser() || fail(401, 'Please log in to continue.');
  const pub = (u) => ({ id: u.id, name: u.name, email: u.email });

  const meta = (q) => ({ id: q.id, title: q.title, description: q.description, category: q.category, difficulty: q.difficulty, durationMinutes: q.durationMinutes, questionCount: q.questions.length });
  function clean(quiz, raw) {
    const out = {};
    if (!raw || typeof raw !== 'object') return out;
    quiz.questions.forEach((q) => { const v = raw[q.id]; if (Number.isInteger(v) && v >= 0 && v < q.options.length) out[q.id] = v; });
    return out;
  }
  function score(quiz, answers) {
    let correct = 0, incorrect = 0, unanswered = 0, marks = 0, total = 0;
    quiz.questions.forEach((q) => {
      const m = q.marks || 1; total += m;
      const a = answers[q.id];
      if (a === undefined) unanswered++; else if (a === q.correctIndex) { correct++; marks += m; } else incorrect++;
    });
    const percentage = total ? Math.round((marks / total) * 1000) / 10 : 0;
    return { correct, incorrect, unanswered, score: marks, totalMarks: total, percentage, passed: percentage >= PASS };
  }
  function finalize(a, quiz, answers, auto) {
    a.answers = clean(quiz, answers); a.status = 'completed'; a.autoSubmitted = auto;
    a.submittedAt = Math.min(Date.now(), a.deadline); a.result = score(quiz, a.answers);
  }
  function settle(uid) {
    const list = load('attempts', []); let changed = false;
    list.forEach((a) => {
      const quiz = quizzes.find((q) => q.id === a.quizId);
      if (a.userId === uid && a.status === 'in_progress' && quiz && Date.now() > a.deadline + GRACE) { finalize(a, quiz, a.answers, true); changed = true; }
    });
    if (changed) save('attempts', list);
  }
  const item = (a) => {
    const q = quizzes.find((x) => x.id === a.quizId) || {};
    return { attemptId: a.id, quizId: a.quizId, title: q.title || 'Removed quiz', category: q.category || '', difficulty: q.difficulty || '', submittedAt: a.submittedAt, autoSubmitted: Boolean(a.autoSubmitted), score: a.result.score, totalMarks: a.result.totalMarks, percentage: a.result.percentage, passed: a.result.passed };
  };
  const withStatus = (q, mine) => {
    const a = mine.find((x) => x.quizId === q.id);
    return { ...meta(q), status: !a ? 'new' : a.status === 'completed' ? 'completed' : 'in_progress', attemptId: a ? a.id : null };
  };

  async function register(b) {
    const name = String(b.name || '').trim().replace(/\s+/g, ' '), email = String(b.email || '').trim().toLowerCase();
    const password = String(b.password || ''), confirm = String(b.confirmPassword || '');
    const errors = {};
    if (name.length < 2 || name.length > 60) errors.name = 'Enter your full name (2 to 60 characters).';
    if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email address.';
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) errors.password = 'Use at least 8 characters with a letter and a number.';
    if (!confirm) errors.confirmPassword = 'Confirm your password.'; else if (confirm !== password) errors.confirmPassword = 'Passwords do not match.';
    if (Object.keys(errors).length) fail(400, 'Please fix the highlighted fields.', { errors });
    const users = load('users', []);
    if (users.some((u) => u.email === email)) fail(409, 'An account with this email already exists.', { errors: { email: 'This email is already registered.' } });
    const salt = uuid();
    const user = { id: uuid(), name, email, salt, passwordHash: await hash(password, salt), createdAt: new Date().toISOString() };
    users.push(user); save('users', users);
    save('session', { userId: user.id, expires: Date.now() + SESSION_MS });
    return { user: pub(user) };
  }
  async function login(b) {
    const email = String(b.email || '').trim().toLowerCase(), password = String(b.password || '');
    if (!email || !password) fail(400, 'Enter your email and password.');
    const user = load('users', []).find((u) => u.email === email);
    if (!user || (await hash(password, user.salt)) !== user.passwordHash) fail(401, 'Incorrect email or password.');
    save('session', { userId: user.id, expires: Date.now() + SESSION_MS });
    return { user: pub(user) };
  }

  async function route(method, path, body) {
    let m;
    if (path === '/api/auth/register' && method === 'POST') return register(body);
    if (path === '/api/auth/login' && method === 'POST') return login(body);
    if (path === '/api/auth/logout' && method === 'POST') { localStorage.removeItem('quizify.session'); return { ok: true }; }
    if (path === '/api/auth/me') return { user: pub(needUser()) };

    const user = needUser(), uid = user.id;
    settle(uid);
    const attempts = load('attempts', []);
    const mine = attempts.filter((a) => a.userId === uid);
    const done = mine.filter((a) => a.status === 'completed').sort((a, b) => b.submittedAt - a.submittedAt);

    if (path === '/api/dashboard') {
      const avg = done.length ? Math.round((done.reduce((s, a) => s + a.result.percentage, 0) / done.length) * 10) / 10 : null;
      return { user: pub(user), stats: { totalQuizzes: quizzes.length, completed: done.length, averageScore: avg }, recent: done.slice(0, 5).map(item), quizzes: quizzes.map((q) => withStatus(q, mine)) };
    }
    if (path === '/api/attempts' && method === 'GET') return { attempts: done.map(item) };

    if ((m = path.match(/^\/api\/quizzes\/([^/]+)\/start$/)) && method === 'POST') {
      const quiz = quizzes.find((q) => q.id === decodeURIComponent(m[1]));
      if (!quiz) fail(404, 'Quiz not found.');
      let a = mine.find((x) => x.quizId === quiz.id);
      if (a && a.status === 'completed') fail(409, 'You have already completed this quiz.', { attemptId: a.id });
      if (!a) {
        const now = Date.now();
        a = { id: uuid(), userId: uid, quizId: quiz.id, status: 'in_progress', startedAt: now, deadline: now + quiz.durationMinutes * 60000, answers: {} };
        attempts.push(a); save('attempts', attempts);
      }
      return { attemptId: a.id, quiz: meta(quiz), questions: quiz.questions.map((q) => ({ id: q.id, text: q.text, options: q.options })), answers: a.answers, remainingSeconds: Math.max(0, Math.round((a.deadline - Date.now()) / 1000)) };
    }

    if ((m = path.match(/^\/api\/attempts\/([^/]+)(\/answers|\/submit)?$/))) {
      const a = mine.find((x) => x.id === m[1]);
      if (!a) fail(404, 'Attempt not found.');
      const quiz = quizzes.find((q) => q.id === a.quizId);
      if (m[2] === '/answers' && method === 'PUT') {
        if (a.status !== 'in_progress') fail(409, 'This quiz has already been submitted.', { attemptId: a.id });
        a.answers = clean(quiz, body.answers); save('attempts', attempts); return { ok: true };
      }
      if (m[2] === '/submit' && method === 'POST') {
        if (a.status === 'completed') fail(409, 'This quiz has already been submitted.', { attemptId: a.id });
        const onTime = Date.now() <= a.deadline + GRACE;
        finalize(a, quiz, onTime && body.answers ? body.answers : a.answers, body.auto === true || Date.now() > a.deadline);
        save('attempts', attempts); return { attemptId: a.id };
      }
      if (!m[2] && method === 'GET') {
        if (a.status !== 'completed') fail(403, 'Submit the quiz to see its results.');
        const review = quiz.questions.map((q, i) => {
          const sel = a.answers[q.id];
          return { number: i + 1, text: q.text, options: q.options, selectedIndex: sel === undefined ? null : sel, correctIndex: q.correctIndex, status: sel === undefined ? 'unanswered' : sel === q.correctIndex ? 'correct' : 'incorrect', explanation: q.explanation };
        });
        return { attempt: item(a), result: a.result, review };
      }
    }
    fail(404, 'Not found.');
  }

  window.api = async function (url, opts = {}) {
    try {
      return await route(opts.method || 'GET', url.split('?')[0], opts.body || {});
    } catch (e) {
      if (e.status === 401 && !opts.noRedirect) location.href = '/login';
      if (!e.status) { console.error(e); e.status = 500; e.message = 'Something went wrong. Please try again.'; e.data = {}; }
      throw e;
    }
  };
})();
