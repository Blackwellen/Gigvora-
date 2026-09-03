import { z } from 'zod';

export const authOptionsSchema = z.object({
  email: z.string().email().optional(),
});

export const registrationVerifySchema = z.object({
  response: z.record(z.string(), z.any()),
  label: z.string().max(120).optional(),
});

export const authenticationVerifySchema = z.object({
  response: z.record(z.string(), z.any()),
});

export const renameSchema = z.object({
  label: z.string().min(1).max(120),
});
