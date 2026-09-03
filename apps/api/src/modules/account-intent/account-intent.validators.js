import { z } from 'zod';

export const saveDraftSchema = z.object({
  intentType: z.enum(['client', 'freelancer', 'agency', 'recruiter', 'business']).optional(),
  draft: z.record(z.string(), z.any()).optional(),
  step: z.number().int().min(1).max(10).optional(),
});
