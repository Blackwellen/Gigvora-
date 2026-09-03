import { AppError } from '../../common/errors/AppError.js';

// Lightweight shape validation before the service layer does the real
// (authorization + sanitization) work — mirrors the inline validation style
// already used throughout posts.service.js, just pulled into its own file
// since this module has two write endpoints (create + update) sharing the
// same body shape.
export function assertValidArticlePayload(body, { partial = false } = {}) {
  if (!body || typeof body !== 'object') throw new AppError('Invalid request body', 422);
  if (!partial || body.title !== undefined) {
    if (typeof body.title !== 'string' || !body.title.trim()) throw new AppError('Article title is required', 422);
  }
  if (body.contentJson !== undefined && !Array.isArray(body.contentJson)) {
    throw new AppError('contentJson must be an array of blocks', 422);
  }
  if (body.topics !== undefined && !Array.isArray(body.topics)) {
    throw new AppError('topics must be an array', 422);
  }
}
