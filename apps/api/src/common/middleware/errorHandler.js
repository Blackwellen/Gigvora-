import { AppError } from '../errors/AppError.js';

export function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Not found' });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message, details: err.details });
  }

  req.log?.error({ err }, 'Unhandled error');
  const statusCode = err.statusCode || 500;
  return res.status(statusCode).json({ error: statusCode === 500 ? 'Internal server error' : err.message });
}
