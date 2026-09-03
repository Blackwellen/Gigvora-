import { z } from 'zod';

export const renameDeviceSchema = z.object({
  displayName: z.string().min(1).max(120),
});

export const resolveAlertSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const escalateAlertSchema = z.object({
  note: z.string().max(1000).optional(),
});

export const addAlertNoteSchema = z.object({
  body: z.string().min(1).max(2000),
});
