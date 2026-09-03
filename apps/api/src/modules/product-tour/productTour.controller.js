import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as service from './productTour.service.js';

export const getTourHandler = asyncHandler(async (req, res) => {
  const result = await service.getTour(req.user.sub, req.params.tourKey);
  res.json({ data: result });
});

export const startTourHandler = asyncHandler(async (req, res) => {
  const result = await service.startTour(req.user.sub, req.params.tourKey);
  res.json({ data: result });
});

export const stepTourHandler = asyncHandler(async (req, res) => {
  const result = await service.recordStep(req.user.sub, req.params.tourKey, Number(req.body.stepIndex));
  res.json({ data: result });
});

export const completeTourHandler = asyncHandler(async (req, res) => {
  const result = await service.completeTour(req.user.sub, req.params.tourKey);
  res.json({ data: result });
});

export const dismissTourHandler = asyncHandler(async (req, res) => {
  const result = await service.dismissTour(req.user.sub, req.params.tourKey);
  res.json({ data: result });
});
