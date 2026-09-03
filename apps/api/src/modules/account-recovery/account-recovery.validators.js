import { z } from 'zod';

export const startSchema = z.object({
  email: z.string().email(),
});

export const challengeSchema = z.object({
  method: z.enum(['backup_code', 'trusted_device', 'recovery_email', 'passkey', 'support']),
});

export const verifySchema = z.object({
  challengeId: z.string().uuid(),
  code: z.string().min(1).max(64),
});

export const completeSchema = z.object({
  newPassword: z
    .string()
    .min(12)
    .regex(/[a-z]/)
    .regex(/[A-Z]/)
    .regex(/[0-9]/)
    .regex(/[^a-zA-Z0-9]/),
});
