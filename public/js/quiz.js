(async function () {
  const root = $('#quiz');
  const quizId = decodeURIComponent(location.pathname.split('/').pop());
  const KEYS = ['A', 'B', 'C', 'D', 'E', 'F'];

  let s;
  try {
    s = await api(`/api/quizzes/${encodeURIComponent(quizId)}/start`, { method: 'POST' });
  } catch (e) {
    if (e.status === 409 && e.data && e.data.attemptId) { location.replace('/results/' + e.data.attemptId); return; }
    root.innerHTML = errorState(e.message);
    return;
  }

  const { attemptId, quiz, questions } = s;
  const answers = { ...s.answers }; // questionId -> option index
  const total = questions.length;
  let idx = Math.max(0, questions.findIndex((q) => answers[q.id] === undefined));
  let submitting = false;
  let timerId = null;
  let saveTimer = null;
  const endAt = performance.now() + s.remainingSeconds * 1000;

  document.title = `${quiz.title} | Quizify`;
  root.innerHTML = `
    <header class="glass quiz-top">
      <div><div class="tags"><span class="tag">${esc(quiz.category)}</span><span class="tag ${esc(quiz.difficulty)}">${esc(quiz.difficulty)}</span></div><h1>${esc(quiz.title)}</h1></div>
      <div class="timer" id="timer" role="timer" aria-live="off">${icon('clock', 20)}<span id="time">--:--</span></div>
    </header>
    <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" id="progress"><span id="bar"></span></div>
    <div class="quiz-layout">
      <section class="glass q-card" aria-live="polite">
        <div class="q-count"><span id="qcount"></span><span id="acount"></span></div>
        <h2 class="q-text" id="qtext"></h2>
        <div class="options" id="options" role="radiogroup" aria-labelledby="qtext"></div>
        <div class="q-nav">
          <button class="btn btn-ghost" id="prev">${icon('left', 18)}Previous</button>
          <button class="btn btn-primary" id="next">Next${icon('right', 18)}</button>
        </div>
      </section>
      <aside class="glass palette">
        <h2>Questions</h2>
        <div class="pal-grid" id="pal"></div>
        <div class="legend"><span><i class="a"></i>Answered</span><span><i></i>Unanswered</span></div>
        <button class="btn btn-primary" id="finish">Submit quiz</button>
        <a class="btn btn-ghost btn-sm" style="width:100%;margin-top:10px" href="/dashboard">Leave and resume later</a>
        <p class="muted" style="font-size:12.5px;margin-top:10px">The timer keeps running if you leave.</p>
      </aside>
    </div>`;

  const el = { time: $('#time'), timer: $('#timer'), bar: $('#bar'), progress: $('#progress'), qcount: $('#qcount'), acount: $('#acount'), qtext: $('#qtext'), options: $('#options'), prev: $('#prev'), next: $('#next'), pal: $('#pal'), finish: $('#finish') };
  const answeredCount = () => Object.keys(answers).length;

  function renderPalette() {
    el.pal.innerHTML = questions.map((q, i) =>
      `<button class="pal ${answers[q.id] !== undefined ? 'answered' : ''} ${i === idx ? 'current' : ''}" data-i="${i}" aria-label="Question ${i + 1}, ${answers[q.id] !== undefined ? 'answered' : 'unanswered'}" ${i === idx ? 'aria-current="true"' : ''}>${i + 1}</button>`).join('');
  }
  function renderProgress() {
    const n = answeredCount();
    el.bar.style.width = (n / total) * 100 + '%';
    el.progress.setAttribute('aria-valuenow', n);
    el.acount.textContent = `${n} of ${total} answered`;
  }
  function renderQuestion(animate = true) {
    const q = questions[idx];
    el.qcount.textContent = `Question ${idx + 1} of ${total}`;
    el.qtext.textContent = q.text;
    if (animate) { el.qtext.style.animation = 'none'; void el.qtext.offsetWidth; el.qtext.style.animation = ''; }
    el.options.innerHTML = q.options.map((o, i) =>
      `<button class="option ${answers[q.id] === i ? 'selected' : ''}" role="radio" aria-checked="${answers[q.id] === i}" data-i="${i}"><span class="key">${KEYS[i]}</span><span>${esc(o)}</span></button>`).join('');
    el.prev.disabled = idx === 0;
    el.next.innerHTML = idx === total - 1 ? `Review and submit` : `Next${icon('right', 18)}`;
    renderPalette();
    renderProgress();
  }

  function queueSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      if (!submitting) api(`/api/attempts/${attemptId}/answers`, { method: 'PUT', body: { answers }, noRedirect: true }).catch(() => {});
    }, 250);
  }
  function select(i) {
    if (submitting) return;
    answers[questions[idx].id] = i;
    queueSave();
    renderQuestion(false);
  }
  const go = (i) => { if (i >= 0 && i < total && i !== idx) { idx = i; renderQuestion(); } };

  el.options.addEventListener('click', (e) => { const b = e.target.closest('.option'); if (b) select(Number(b.dataset.i)); });
  el.pal.addEventListener('click', (e) => { const b = e.target.closest('.pal'); if (b) go(Number(b.dataset.i)); });
  el.prev.addEventListener('click', () => go(idx - 1));
  el.next.addEventListener('click', () => (idx === total - 1 ? confirmSubmit() : go(idx + 1)));
  el.finish.addEventListener('click', confirmSubmit);
  document.addEventListener('keydown', (e) => {
    if (submitting || document.querySelector('.modal-back') || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'ArrowRight') go(idx + 1);
    else if (e.key === 'ArrowLeft') go(idx - 1);
    else {
      const n = '1234'.indexOf(e.key), l = 'abcd'.indexOf(e.key.toLowerCase());
      const i = n >= 0 ? n : l;
      if (i >= 0 && i < questions[idx].options.length) select(i);
    }
  });

  function confirmSubmit() {
    if (submitting || document.querySelector('.modal-back')) return;
    const un = total - answeredCount();
    const back = document.createElement('div');
    back.className = 'modal-back';
    back.innerHTML = `<div class="glass modal" role="dialog" aria-modal="true" aria-labelledby="mt">
      <h2 id="mt">Submit your quiz?</h2>
      <p>You have answered ${answeredCount()} of ${total} questions.</p>
      ${un ? `<p class="warn">${un} ${un === 1 ? 'question is' : 'questions are'} unanswered and will score zero.</p>` : ''}
      <p>You can't change your answers after submitting.</p>
      <div class="acts"><button class="btn btn-ghost" id="cancel">Keep working</button><button class="btn btn-primary" id="confirm">Submit quiz</button></div></div>`;
    document.body.appendChild(back);
    const close = () => { back.remove(); document.removeEventListener('keydown', onEsc); el.finish.focus(); };
    const onEsc = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onEsc);
    $('#cancel', back).addEventListener('click', close);
    back.addEventListener('click', (e) => { if (e.target === back) close(); });
    $('#confirm', back).addEventListener('click', () => { back.remove(); document.removeEventListener('keydown', onEsc); submit(false); });
    $('#cancel', back).focus();
  }

  async function submit(auto) {
    if (submitting) return; // blocks duplicate submissions
    submitting = true;
    clearInterval(timerId);
    clearTimeout(saveTimer);
    window.onbeforeunload = null;
    document.querySelectorAll('button').forEach((b) => (b.disabled = true));
    if (auto) toast("Time is up. Submitting your answers...");
    try {
      const r = await api(`/api/attempts/${attemptId}/submit`, { method: 'POST', body: { answers, auto } });
      location.replace('/results/' + r.attemptId);
    } catch (e) {
      if (e.status === 409 && e.data && e.data.attemptId) { location.replace('/results/' + e.data.attemptId); return; }
      toast(e.message, 'error');
      if (auto) { setTimeout(() => { submitting = false; submit(true); }, 2000); return; }
      submitting = false;
      document.querySelectorAll('button').forEach((b) => (b.disabled = false));
      el.prev.disabled = idx === 0;
      startTimer();
    }
  }

  function tick() {
    const left = Math.max(0, Math.ceil((endAt - performance.now()) / 1000));
    el.time.textContent = `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;
    el.timer.classList.toggle('low', left <= 60);
    if (left === 0) submit(true);
  }
  function startTimer() { clearInterval(timerId); tick(); timerId = setInterval(tick, 250); }

  window.onbeforeunload = () => (submitting ? undefined : true);
  renderQuestion(false);
  startTimer();
})();
