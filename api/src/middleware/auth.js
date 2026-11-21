const { verifyToken, isConfigured } = require('../auth/token');

// Protects a route. Expects "Authorization: Bearer <token>" and puts the user id on req.userId.
function requireAuth(req, res, next) {
  if (!isConfigured()) {
    return res.status(503).json({ status: 'error', message: 'Login is not configured' });
  }

  const [scheme, token] = (req.get('Authorization') || '').split(' ');
  const userId = scheme === 'Bearer' && token ? verifyToken(token) : null;
  if (!userId) {
    return res.status(401).json({ status: 'error', message: 'Sign in required' });
  }

  req.userId = userId;
  return next();
}

module.exports = { requireAuth };
