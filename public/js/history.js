(async function () {
  const main = $('#main');
  let user, list;
  try {
    [{ user }, { attempts: list }] = await Promise.all([api('/api/auth/me'), api('/api/attempts')]);
  } catch (e) { main.innerHTML = errorState(e.message); return; }
  mountSidebar('history', user);

  const row = (a) => `<div class="glass row">
    <div class="t"><b>${esc(a.title)}</b><span>${esc(a.category)}${a.autoSubmitted ? ', auto-submitted' : ''}</span></div>
    <div class="c"><b>${esc(fmtDate(a.submittedAt))}</b><small>Attempted</small></div>
    <div class="c"><b>${a.score} / ${a.totalMarks}</b><small>${a.percentage}%</small></div>
    <div class="c"><span class="badge ${a.passed ? 'pass' : 'fail'}">${a.passed ? 'Passed' : 'Failed'}</span></div>
    <a class="btn btn-ghost btn-sm" href="/results/${esc(a.attemptId)}">View results</a></div>`;

  main.innerHTML = `
    <div class="page-head"><h1>Quiz history</h1><p>Every quiz you have completed, newest first.</p></div>
    ${list.length ? `<div class="rows">${list.map(row).join('')}</div>`
      : `<div class="glass empty"><h3>You haven't completed a quiz yet</h3><p>Finish a quiz and it will show up here with your score.</p><a class="btn btn-primary" href="/dashboard">Browse quizzes</a></div>`}`;
})();
