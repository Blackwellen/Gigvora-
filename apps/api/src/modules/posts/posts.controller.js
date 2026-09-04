import { randomUUID } from 'crypto';
import { fileTypeFromBuffer } from 'file-type';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { AppError } from '../../common/errors/AppError.js';
import { uploadObject } from '../../storage/s3.js';
import { scanBuffer } from '../../security/malwareScanner.js';
import { fetchLinkPreview } from '../../common/linkPreview.js';
import { suggestTopics } from '../../common/ml/moderationClient.js';
import { logMlInference } from '../../common/ml/mlInferenceLog.js';
import * as service from './posts.service.js';
import * as recommendationsService from './recommendations.service.js';
import * as analyticsService from './postAnalytics.service.js';
import * as gifsService from './gifs.service.js';

export const feedRecommendationsHandler = asyncHandler(async (req, res) => {
  const [people, gigs, projects, podcasts, webinars] = await Promise.all([
    recommendationsService.getPeopleSuggestions(req.user.sub),
    recommendationsService.getGigSuggestions(req.user.sub),
    recommendationsService.getProjectSuggestions(req.user.sub),
    recommendationsService.getPodcastSuggestions(req.user.sub),
    recommendationsService.getWebinarSuggestions(req.user.sub),
  ]);
  res.json({ data: { people, gigs, projects, podcasts, webinars } });
});

export const followingFeedSummaryHandler = asyncHandler(async (req, res) => {
  const data = await service.getFollowingFeedSummary(req.user.sub);
  res.json({ data });
});

export const networkFeedSummaryHandler = asyncHandler(async (req, res) => {
  const data = await service.getNetworkFeedSummary(req.user.sub);
  res.json({ data });
});

export const listFeedHandler = asyncHandler(async (req, res) => {
  const { tab, cursor, limit } = req.query;
  const data = await service.listFeed(req.user.sub, { tab, cursor, limit });
  res.json(data);
});

export const getPostHandler = asyncHandler(async (req, res) => {
  const data = await service.getPostById(req.user.sub, req.params.id);
  res.json({ data });
});

export const createPostHandler = asyncHandler(async (req, res) => {
  const data = await service.createPost(req.user.sub, req.body);
  res.status(201).json({ data });
});

export const updatePostHandler = asyncHandler(async (req, res) => {
  const data = await service.updatePost(req.user.sub, req.params.id, req.body);
  res.json({ data });
});

export const deletePostHandler = asyncHandler(async (req, res) => {
  await service.deletePost(req.user.sub, req.params.id);
  res.status(204).send();
});

export const reactHandler = asyncHandler(async (req, res) => {
  const data = await service.reactToPost(req.user.sub, req.params.id, req.body.reactionType);
  res.json({ data });
});

export const unreactHandler = asyncHandler(async (req, res) => {
  await service.removeReaction(req.user.sub, req.params.id);
  res.status(204).send();
});

export const listCommentsHandler = asyncHandler(async (req, res) => {
  const { parentCommentId, limit, offset } = req.query;
  const data = await service.listComments(req.params.id, {
    parentCommentId: parentCommentId || null,
    limit: Number(limit) || undefined,
    offset: Number(offset) || undefined,
    viewerId: req.user.sub,
  });
  res.json({ data });
});

export const createCommentHandler = asyncHandler(async (req, res) => {
  const data = await service.createComment(req.user.sub, req.params.id, req.body);
  // A held comment is still created (parity with posts/articles), just not
  // visible to other viewers yet — tell the author clearly why they don't
  // see it in the thread instead of it looking like posting silently failed.
  if (data.status === 'under_review') {
    return res.status(201).json({
      data,
      message: 'Your comment was posted and is pending review before other people can see it.',
    });
  }
  res.status(201).json({ data });
});

export const updateCommentHandler = asyncHandler(async (req, res) => {
  const data = await service.updateComment(req.user.sub, req.params.commentId, req.body.body);
  res.json({ data });
});

export const deleteCommentHandler = asyncHandler(async (req, res) => {
  await service.deleteComment(req.user.sub, req.params.commentId);
  res.status(204).send();
});

export const sharePostHandler = asyncHandler(async (req, res) => {
  const data = await service.sharePost(req.user.sub, req.params.id, req.body);
  res.status(201).json({ data });
});

export const reactToCommentHandler = asyncHandler(async (req, res) => {
  const data = await service.reactToComment(req.user.sub, req.params.commentId, req.body.reactionType);
  res.json({ data });
});

export const unreactToCommentHandler = asyncHandler(async (req, res) => {
  const data = await service.removeCommentReaction(req.user.sub, req.params.commentId);
  res.json({ data });
});

export const shareCommentHandler = asyncHandler(async (req, res) => {
  const data = await service.shareComment(req.user.sub, req.params.commentId, req.body);
  res.status(201).json({ data });
});

export const searchGifsHandler = asyncHandler(async (req, res) => {
  const data = await gifsService.searchGifs(req.query.q);
  res.json({ data });
});

export const savePostHandler = asyncHandler(async (req, res) => {
  await service.savePost(req.user.sub, req.params.id);
  res.status(204).send();
});

export const unsavePostHandler = asyncHandler(async (req, res) => {
  await service.unsavePost(req.user.sub, req.params.id);
  res.status(204).send();
});

export const votePollHandler = asyncHandler(async (req, res) => {
  await service.votePoll(req.user.sub, req.params.pollId, req.body.optionIds || []);
  res.status(204).send();
});

export const getPollHandler = asyncHandler(async (req, res) => {
  const data = await service.getPollDetail(req.user.sub, req.params.pollId);
  res.json({ data });
});

export const closePollHandler = asyncHandler(async (req, res) => {
  await service.closePoll(req.user.sub, req.params.pollId);
  res.status(204).send();
});

const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  // Voice notes (comment composer's MediaRecorder capture) — webm/opus is
  // what every evergreen Chromium/Firefox browser records by default; mp3/
  // wav/ogg covered too since MediaRecorder support varies by browser/OS.
  'audio/webm',
  'audio/ogg',
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
]);
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

function attachmentTypeFor(mime) {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  return 'document';
}

// GIF/DOC (legacy binary) magic-byte signatures aren't always resolved by
// file-type for every sample; when file-type can't identify a signature at
// all for a type we still expect to detect (i.e. not doc/text), fail closed.
// audio/webm is also frequently unresolved by file-type (it's a generic
// Matroska/EBML container with no stable magic bytes across encoders) — same
// fail-open treatment as application/msword rather than blocking every
// legitimate browser-recorded voice note.
const SIGNATURE_OPTIONAL_MIME = new Set(['application/msword', 'audio/webm']);

export const uploadAttachmentHandler = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('No file provided', 422);
  if (!ALLOWED_MIME.has(req.file.mimetype)) throw new AppError('Unsupported file type', 422);
  if (req.file.size > MAX_UPLOAD_BYTES) throw new AppError('File exceeds 25MB limit', 422);

  // Never trust the client-declared MIME type alone: verify the magic-byte
  // signature agrees, then run the shared malware/heuristic scanner before
  // anything is written to object storage — same security pipeline used by
  // the imports upload flow (fileValidation.js / malwareScanner.js).
  const detected = await fileTypeFromBuffer(req.file.buffer);
  if (detected) {
    if (!ALLOWED_MIME.has(detected.mime)) {
      throw new AppError('Detected file signature does not match an allowed type', 422, { code: 'SIGNATURE_NOT_ALLOWED' });
    }
    if (detected.mime !== req.file.mimetype) {
      throw new AppError('Declared content type does not match the file signature', 422, { code: 'MIME_SIGNATURE_MISMATCH' });
    }
  } else if (!SIGNATURE_OPTIONAL_MIME.has(req.file.mimetype)) {
    throw new AppError('Could not verify file signature', 422, { code: 'SIGNATURE_UNKNOWN' });
  }

  const scanResult = await scanBuffer(req.file.buffer, { declaredAsDocument: req.file.mimetype !== 'application/pdf' });
  if (scanResult.result !== 'clean') {
    throw new AppError('This file failed a security scan and cannot be uploaded', 422, {
      code: 'MALWARE_SCAN_FAILED',
      scanResult: scanResult.result,
    });
  }

  const key = `feed/${req.user.sub}/${randomUUID()}-${req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const url = await uploadObject({ key, body: req.file.buffer, contentType: req.file.mimetype });

  res.status(201).json({
    data: {
      type: attachmentTypeFor(req.file.mimetype),
      url,
      fileName: req.file.originalname,
      fileSize: req.file.size,
    },
  });
});

// Optional, non-blocking topic suggestions for Create Post/Create Article
// (topic-classifier_service.py, keyword-overlap against the real `topics`
// table — never auto-applied, the composer only shows these as suggestion
// chips the author can tap to add). A null/degraded ML response just yields
// an empty suggestion list rather than an error.
export const suggestTopicsHandler = asyncHandler(async (req, res) => {
  const text = String(req.body?.text || '').slice(0, 20000);
  const result = text.trim() ? await suggestTopics(text) : null;
  // objectId is null here — this fires while the author is still typing a
  // draft, before any post/article row exists yet.
  if (result) {
    logMlInference({ objectType: 'draft', objectId: null, modelName: 'topic-classify', modelVersion: result.model_version, actorId: req.user.sub, output: result }).catch(() => {});
  }
  res.json({ data: result?.suggestions || [] });
});

export const linkPreviewHandler = asyncHandler(async (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') throw new AppError('url is required', 422);
  const preview = await fetchLinkPreview(url);
  res.json({ data: preview });
});

export const getOwnedPostHandler = asyncHandler(async (req, res) => {
  const data = await service.getOwnedPostById(req.user.sub, req.params.id);
  res.json({ data });
});

export const notInterestedHandler = asyncHandler(async (req, res) => {
  await service.recordNotInterested(req.user.sub, req.body.postId);
  res.status(204).send();
});

export const hideAuthorHandler = asyncHandler(async (req, res) => {
  await service.recordHideAuthor(req.user.sub, req.body.authorId);
  res.status(204).send();
});

export const hideTopicHandler = asyncHandler(async (req, res) => {
  await service.recordHideTopic(req.user.sub, req.body.topic);
  res.status(204).send();
});

export const listHiddenPreferencesHandler = asyncHandler(async (req, res) => {
  const data = await service.listHiddenPreferences(req.user.sub);
  res.json({ data });
});

export const recordImpressionsHandler = asyncHandler(async (req, res) => {
  const postIds = Array.isArray(req.body.postIds) ? req.body.postIds : req.params.id ? [req.params.id] : [];
  await analyticsService.recordImpressions(req.user.sub, postIds);
  res.status(204).send();
});

export const getPostAnalyticsHandler = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const data = await analyticsService.getPostAnalytics(req.user.sub, req.params.id, { startDate, endDate });
  res.json({ data });
});

export const exportPostAnalyticsHandler = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const csv = await analyticsService.exportPostAnalyticsCsv(req.user.sub, req.params.id, { startDate, endDate });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="post-${req.params.id}-analytics.csv"`);
  res.send(csv);
});
