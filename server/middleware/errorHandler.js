const notFound = (req, res, next) => {
  const err = new Error(`Route not found: ${req.originalUrl}`);
  err.status = 404;
  next(err);
};

const errorHandler = (err, req, res, next) => {
  const statusCode = err.status || err.statusCode || 500;
  const isDev = process.env.NODE_ENV !== 'production';

  console.error(`[Error] ${statusCode} - ${err.message}`);
  if (isDev) console.error(err.stack);

  res.status(statusCode).json({
    code: statusCode,
    message: err.message || '服务器内部错误',
    ...(isDev && { stack: err.stack }),
  });
};

module.exports = { notFound, errorHandler };
