// Central error handler — must be the LAST app.use() in server.js.
// Any route that calls next(err) lands here.
export function errorHandler(err, req, res, next) {
  console.error(err)
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  })
}
