const router = require('express').Router();
const crypto = require('crypto');
const db = require('../lib/db');
const { HttpError, wrap } = require('../lib/http');
const { score, cleanAnswers } = require('../lib/scoring');
const { requireAuth } = require('../middleware/auth');

const PASS = Number(process.env.PASS_PERCENTAGE) || 50;
const GRACE_MS = 15000; // tolerance for network delay on the final submit
router.use(requireAuth);

// What the client may see about a quiz: never the questions' answers or explanations.
const meta = (q) => ({
  id: q.id, title: q.title, description: q.description, category: q.category,
  difficulty: q.difficulty, durationMinutes: q.durationMinutes, questionCount: q.questions.length,
});
const withStatus = (q, mine) => {
  const a = mine.find((x) => x.quizId === q.id);
  return { ...meta(q), status: !a ? 'new' : a.status === 'completed' ? 'completed' : 'in_progress', attemptId: a ? a.id : null };
};
const historyItem = (a, quizzes) => {
  const q = quizzes.find((x) => x.id === a.quizId);
  return {
    attemptId: a.id, quizId: a.quizId, title: q ? q.title : 'Removed quiz', category: q ? q.category : '',
    difficulty: q ? q.difficulty : '', submittedAt: a.submittedAt, autoSubmitted: Boolean(a.autoSubmitted),
    score: a.result.score, totalMarks: a.result.totalMarks, percentage: a.result.percentage, passed: a.result.passed,
  };
};

function finalize(attempt, quiz, answers, auto) {
  attempt.answers = cleanAnswers(quiz, answers);
  attempt.status = 'completed';
  attempt.autoSubmitted = auto;
  attempt.submittedAt = Math.min(Date.now(), attempt.deadline);
  attempt.result = score(quiz, attempt.answers, PASS);
}

// Attempts whose timer ran out (e.g. the tab was closed) are scored from their saved answers.
async function settleExpired(userId) {
  const expired = (a) => a.userId === userId && a.status === 'in_progress' && Date.now() > a.deadline + GRACE_MS;
  if (!(await db.read('attempts')).some(expired)) return;
  const quizzes = await db.read('quizzes');
  await db.update('attempts', (list) => {
    for (const a of list) {
      const quiz = quizzes.find((q) => q.id === a.quizId);
      if (expired(a) && quiz) finalize(a, quiz, a.answers, true);
    }
  });
}

router.get('/dashboard', wrap(async (req, res) => {
  const uid = req.session.userId;
  const user = (await db.read('users')).find((u) => u.id === uid);
  if (!user) return req.session.destroy(() => res.status(401).json({ error: 'Please log in to continue.' }));
  await settleExpired(uid);
  const [quizzes, attempts] = await Promise.all([db.read('quizzes'), db.read('attempts')]);
  const mine = attempts.filter((a) => a.userId === uid);
  const done = mine.filter((a) => a.status === 'completed').sort((a, b) => b.submittedAt - a.submittedAt);
  const avg = done.length ? Math.round((done.reduce((s, a) => s + a.result.percentage, 0) / done.length) * 10) / 10 : null;
  res.json({
    user: { id: user.id, name: user.name, email: user.email },
    stats: { totalQuizzes: quizzes.length, completed: done.length, averageScore: avg },
    recent: done.slice(0, 5).map((a) => historyItem(a, quizzes)),
    quizzes: quizzes.map((q) => withStatus(q, mine)),
  });
}));

router.get('/quizzes', wrap(async (req, res) => {
  await settleExpired(req.session.userId);
  const [quizzes, attempts] = await Promise.all([db.read('quizzes'), db.read('attempts')]);
  const mine = attempts.filter((a) => a.userId === req.session.userId);
  res.json({ quizzes: quizzes.map((q) => withStatus(q, mine)) });
}));

// Starts (or resumes) the single allowed attempt. The timer is tracked on the server.
router.post('/quizzes/:id/start', wrap(async (req, res) => {
  const uid = req.session.userId;
  await settleExpired(uid);
  const quiz = (await db.read('quizzes')).find((q) => q.id === req.params.id);
  if (!quiz) throw new HttpError(404, 'Quiz not found.');
  const attempt = await db.update('attempts', (list) => {
    const existing = list.find((a) => a.userId === uid && a.quizId === quiz.id);
    if (existing) {
      if (existing.status === 'completed')
        throw new HttpError(409, 'You have already completed this quiz.', { attemptId: existing.id });
      return existing;
    }
    const now = Date.now();
    const a = { id: crypto.randomUUID(), userId: uid, quizId: quiz.id, status: 'in_progress', startedAt: now, deadline: now + quiz.durationMinutes * 60000, answers: {} };
    list.push(a);
    return a;
  });
  res.json({
    attemptId: attempt.id,
    quiz: meta(quiz),
    questions: quiz.questions.map((q) => ({ id: q.id, text: q.text, options: q.options })),
    answers: attempt.answers,
    remainingSeconds: Math.max(0, Math.round((attempt.deadline - Date.now()) / 1000)),
  });
}));

// Progress save so answers survive a refresh or closed tab.
router.put('/attempts/:id/answers', wrap(async (req, res) => {
  const quizzes = await db.read('quizzes');
  await db.update('attempts', (list) => {
    const a = list.find((x) => x.id === req.params.id && x.userId === req.session.userId);
    if (!a) throw new HttpError(404, 'Attempt not found.');
    if (a.status !== 'in_progress') throw new HttpError(409, 'This quiz has already been submitted.', { attemptId: a.id });
    if (Date.now() > a.deadline + GRACE_MS) throw new HttpError(409, 'Time is up for this quiz.', { attemptId: a.id });
    const quiz = quizzes.find((q) => q.id === a.quizId);
    a.answers = cleanAnswers(quiz, (req.body || {}).answers);
  });
  res.json({ ok: true });
}));

router.post('/attempts/:id/submit', wrap(async (req, res) => {
  const quizzes = await db.read('quizzes');
  const attemptId = await db.update('attempts', (list) => {
    const a = list.find((x) => x.id === req.params.id && x.userId === req.session.userId);
    if (!a) throw new HttpError(404, 'Attempt not found.');
    if (a.status === 'completed') throw new HttpError(409, 'This quiz has already been submitted.', { attemptId: a.id });
    const quiz = quizzes.find((q) => q.id === a.quizId);
    if (!quiz) throw new HttpError(404, 'Quiz not found.');
    const body = req.body || {};
    const onTime = Date.now() <= a.deadline + GRACE_MS;
    finalize(a, quiz, onTime && body.answers ? body.answers : a.answers, body.auto === true || Date.now() > a.deadline);
    return a.id;
  });
  res.json({ attemptId });
}));

router.get('/attempts', wrap(async (req, res) => {
  const uid = req.session.userId;
  await settleExpired(uid);
  const [quizzes, attempts] = await Promise.all([db.read('quizzes'), db.read('attempts')]);
  const items = attempts
    .filter((a) => a.userId === uid && a.status === 'completed')
    .sort((a, b) => b.submittedAt - a.submittedAt)
    .map((a) => historyItem(a, quizzes));
  res.json({ attempts: items });
}));

router.get('/attempts/:id', wrap(async (req, res) => {
  const uid = req.session.userId;
  await settleExpired(uid);
  const [quizzes, attempts] = await Promise.all([db.read('quizzes'), db.read('attempts')]);
  // Another student's attempt looks exactly like a missing one.
  const a = attempts.find((x) => x.id === req.params.id && x.userId === uid);
  if (!a) throw new HttpError(404, 'Result not found.');
  if (a.status !== 'completed') throw new HttpError(403, 'Submit the quiz to see its results.');
  const quiz = quizzes.find((q) => q.id === a.quizId);
  if (!quiz) throw new HttpError(404, 'This quiz is no longer available.');
  const review = quiz.questions.map((q, i) => {
    const sel = a.answers[q.id];
    return {
      number: i + 1, text: q.text, options: q.options,
      selectedIndex: sel === undefined ? null : sel, correctIndex: q.correctIndex,
      status: sel === undefined ? 'unanswered' : sel === q.correctIndex ? 'correct' : 'incorrect',
      explanation: q.explanation,
    };
  });
  res.json({ attempt: historyItem(a, quizzes), result: a.result, review });
}));

module.exports = router;
