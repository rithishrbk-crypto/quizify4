(async function () {
  const main = $('#main');
  const id = location.pathname.split('/').pop();
  let user, data;
  try {
    [{ user }, data] = await Promise.all([api('/api/auth/me'), api(`/api/attempts/${encodeURIComponent(id)}`)]);
  } catch (e) { main.innerHTML = errorState(e.message); return; }
  mountSidebar('history', user);

  const { attempt: at, result: r, review } = data;
  const total = review.length;
  const C = 2 * Math.PI * 54;
  const pct = (n) => (total ? (n / total) * 100 : 0);
  const color = r.passed ? '#34d399' : '#fb7185';
  const KEYS = ['A', 'B', 'C', 'D', 'E', 'F'];

  const optRow = (text, i, q) => {
    const isSel = q.selectedIndex === i, isRight = q.correctIndex === i;
    const cls = isRight ? 'right' : isSel ? 'wrong' : '';
    const flag = isSel ? 'Your answer' : isRight ? 'Correct answer' : '';
    return `<div class="opt-row ${cls}"><span class="key">${KEYS[i]}</span><span class="txt">${esc(text)}</span><span class="flag">${flag}</span></div>`;
  };
  const statusBadge = (s) =>
    s === 'correct' ? `<span class="badge pass">${icon('check', 14)}Correct</span>`
    : s === 'incorrect' ? `<span class="badge fail">${icon('x', 14)}Incorrect</span>`
    : `<span class="badge skip">${icon('minus', 14)}Unanswered</span>`;
  const rv = (q) => `<article class="glass rv">
    <div class="rv-head"><span>Question ${q.number} of ${total}</span>${statusBadge(q.status)}</div>
    <h3>${esc(q.text)}</h3>${q.options.map((o, i) => optRow(o, i, q)).join('')}
    ${q.selectedIndex === null ? '<p class="muted" style="font-size:14px;margin-top:4px">You did not answer this question.</p>' : ''}
    <div class="expl"><b>Explanation.</b> ${esc(q.explanation)}</div></article>`;

  document.title = `${at.title} results | Quizify`;
  main.innerHTML = `
    <section class="glass result-hero">
      <div class="ring" role="img" aria-label="Score ${r.percentage} percent">
        <svg width="170" height="170" viewBox="0 0 128 128"><circle cx="64" cy="64" r="54" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="10"/>
          <circle cx="64" cy="64" r="54" fill="none" stroke="${color}" stroke-width="10" stroke-linecap="round" stroke-dasharray="${(r.percentage / 100) * C} ${C}"/></svg>
        <div class="num"><div><b>${r.percentage}%</b><br><span>${r.score} / ${r.totalMarks} marks</span></div></div>
      </div>
      <div>
        <div class="tags"><span class="tag">${esc(at.category)}</span><span class="tag ${esc(at.difficulty)}">${esc(at.difficulty)}</span></div>
        <h1>${esc(at.title)}</h1>
        <p class="meta"><span class="badge ${r.passed ? 'pass' : 'fail'}">${r.passed ? 'Passed' : 'Failed'}</span>
          &nbsp;Submitted ${esc(fmtDate(at.submittedAt))}${at.autoSubmitted ? ', automatically when time ran out' : ''}</p>
        <div class="acts"><a class="btn btn-primary" href="/dashboard">Back to dashboard</a><a class="btn btn-ghost" href="/history">View quiz history</a></div>
      </div>
    </section>
    <div class="r-stats">
      <div class="glass r-stat"><b>${r.score} / ${r.totalMarks}</b><span>Total marks</span></div>
      <div class="glass r-stat ok"><b>${r.correct}</b><span>Correct</span></div>
      <div class="glass r-stat bad"><b>${r.incorrect}</b><span>Incorrect</span></div>
      <div class="glass r-stat skip"><b>${r.unanswered}</b><span>Unanswered</span></div>
    </div>
    <div class="split" role="img" aria-label="${r.correct} correct, ${r.incorrect} incorrect, ${r.unanswered} unanswered">
      <i class="c" style="width:${pct(r.correct)}%"></i><i class="w" style="width:${pct(r.incorrect)}%"></i><i class="u" style="width:${pct(r.unanswered)}%"></i></div>
    <h2 class="h2">Answer review</h2>
    <div class="review">${review.map(rv).join('')}</div>`;
})();
