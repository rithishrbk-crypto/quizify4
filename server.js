const { app, ready, PORT } = require('./app');

ready()
  .then(() => app.listen(PORT, () => console.log(`Quizify is running at http://localhost:${PORT}`)))
  .catch((err) => { console.error('Failed to start:', err); process.exit(1); });
