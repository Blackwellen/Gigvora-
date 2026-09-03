import { AppError } from '../errors/AppError.js';

export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(new AppError('Validation failed', 422, result.error.flatten()));
    }
    req.body = result.data;
    return next();
  };
}
