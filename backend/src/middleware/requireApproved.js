// Blocks users who are not approved yet (pending) or suspended.
// Use AFTER requireAuth.
export function requireApproved(req, res, next) {
  if (!req.user || req.user.status !== 'approved') {
    return res.status(403).json({ error: 'Your account is not approved' })
  }
  next()
}
