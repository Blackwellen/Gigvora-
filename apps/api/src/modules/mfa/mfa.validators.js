import { z } from 'zod';

export const beginTotpSchema = z.object({
  label: z.string().max(120).optional(),
});

export const verifyTotpSchema = z.object({
  methodId: z.string().uuid(),
  code: z.string().min(6).max(6),
  deviceLabel: z.string().max(120).optional(),
});

export const regenerateSchema = z.object({
  currentPassword: z.string().min(1),
});

export const removeMethodSchema = z.object({
  currentPassword: z.string().min(1),
});
