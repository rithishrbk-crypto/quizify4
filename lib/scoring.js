// All scoring happens here, on the server.
function cleanAnswers(quiz, raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const q of quiz.questions) {
    const v = raw[q.id];
    if (Number.isInteger(v) && v >= 0 && v < q.options.length) out[q.id] = v;
  }
  return out;
}

function score(quiz, answers, passPercentage) {
  let correct = 0, incorrect = 0, unanswered = 0, marks = 0, totalMarks = 0;
  for (const q of quiz.questions) {
    const m = q.marks || 1;
    totalMarks += m;
    const a = answers[q.id];
    if (a === undefined) unanswered++;
    else if (a === q.correctIndex) { correct++; marks += m; }
    else incorrect++;
  }
  const percentage = totalMarks ? Math.round((marks / totalMarks) * 1000) / 10 : 0;
  return { correct, incorrect, unanswered, score: marks, totalMarks, percentage, passed: percentage >= passPercentage };
}
module.exports = { cleanAnswers, score };
