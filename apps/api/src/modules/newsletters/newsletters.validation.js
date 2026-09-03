import { AppError } from '../../common/errors/AppError.js';

export function assertValidNewsletterPayload(body) {
  if (!body || typeof body !== 'object') throw new AppError('Invalid request body', 422);
  if (typeof body.title !== 'string' || !body.title.trim()) throw new AppError('Newsletter title is required', 422);
  if (body.publisherType !== undefined && !['profile', 'company'].includes(body.publisherType)) {
    throw new AppError('publisherType must be "profile" or "company"', 422);
  }
}

export function assertValidIssuePayload(body) {
  if (!body || typeof body !== 'object') throw new AppError('Invalid request body', 422);
  if (typeof body.subject !== 'string' || !body.subject.trim()) throw new AppError('Issue subject is required', 422);
  if (body.contentJson !== undefined && !Array.isArray(body.contentJson)) {
    throw new AppError('contentJson must be an array of blocks', 422);
  }
}
