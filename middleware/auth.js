const loggedIn = (req) => Boolean(req.session && req.session.userId);
exports.requireAuth = (req, res, next) =>
  loggedIn(req) ? next() : res.status(401).json({ error: 'Please log in to continue.' });
exports.requireAuthPage = (req, res, next) => (loggedIn(req) ? next() : res.redirect('/login'));
exports.guestOnlyPage = (req, res, next) => (loggedIn(req) ? res.redirect('/dashboard') : next());
