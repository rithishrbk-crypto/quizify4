(async function () {
  const main = $('#main');
  let data;
  try { data = await api('/api/dashboard'); } catch (e) { main.innerHTML = errorState(e.message); return; }
  const { user, stats, recent, quizzes } = data;
  mountSidebar('dashboard', user);

  const first = user.name.split(' ')[0];
  const statCard = (ico, val, lbl) => `<div class="glass stat"><div class="ico">${icon(ico, 22)}</div><div><div class="val">${val}</div><div class="lbl">${lbl}</div></div></div>`;

  const quizCard = (q) => {
    let action;
    if (q.status === 'completed') action = `<a class="btn btn-ghost btn-sm" href="/results/${esc(q.attemptId)}">View results</a>`;
    else if (q.status === 'in_progress') action = `<a class="btn btn-primary btn-sm" href="/quiz/${esc(q.id)}">Resume quiz</a>`;
    else action = `<a class="btn btn-primary btn-sm" href="/quiz/${esc(q.id)}">Start quiz</a>`;
    const note = q.status === 'completed' ? '<span class="score-chip">Completed</span>' : q.status === 'in_progress' ? '<span class="score-chip">In progress</span>' : '<span></span>';
    return `<article class="glass qcard glow-hover">
      <div class="tags"><span class="tag">${esc(q.category)}</span><span class="tag ${esc(q.difficulty)}">${esc(q.difficulty)}</span></div>
      <h3>${esc(q.title)}</h3><p>${esc(q.description)}</p>
      <div class="qmeta"><span>${icon('list', 16)}${q.questionCount} questions</span><span>${icon('clock', 16)}${q.durationMinutes} min</span></div>
      <div class="foot">${note}${action}</div></article>`;
  };

  const recentRow = (a) => `<div class="glass row">
    <div class="t"><b>${esc(a.title)}</b><span>${esc(fmtDate(a.submittedAt))}</span></div>
    <div class="c"><b>${a.score} / ${a.totalMarks}</b><small>Score</small></div>
    <div class="c"><b>${a.percentage}%</b><small>Percentage</small></div>
    <div class="c"><span class="badge ${a.passed ? 'pass' : 'fail'}">${a.passed ? 'Passed' : 'Failed'}</span></div>
    <a class="btn btn-ghost btn-sm" href="/results/${esc(a.attemptId)}">View results</a></div>`;

  main.innerHTML = `
    <div class="page-head"><h1>Welcome back, ${esc(first)}</h1><p>Pick a quiz to continue your practice.</p></div>
    <div class="stats">
      ${statCard('book', stats.totalQuizzes, 'Available quizzes')}
      ${statCard('check', stats.completed, 'Quizzes completed')}
      ${statCard('target', stats.averageScore === null ? 'None yet' : stats.averageScore + '%', 'Average score')}
    </div>
    <section class="section"><h2 class="h2">Available quizzes</h2><div class="quiz-grid-cards">${quizzes.map(quizCard).join('')}</div></section>
    <section class="section"><h2 class="h2">Recent attempts ${recent.length ? '<a href="/history">View all</a>' : ''}</h2>
      ${recent.length ? `<div class="rows">${recent.map(recentRow).join('')}</div>`
        : `<div class="glass empty"><h3>No attempts yet</h3><p>Your scores will appear here after your first quiz.</p></div>`}
    </section>`;
})();
