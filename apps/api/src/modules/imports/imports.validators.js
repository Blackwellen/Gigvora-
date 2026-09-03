import { z } from 'zod';

export const createImportSchema = z.object({
  importType: z.enum(['cv', 'profile', 'company', 'contacts']),
});

export const uploadUrlSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1).max(255).optional(),
  sizeBytes: z.number().int().positive(),
});

export const updateMappingsSchema = z.object({
  mappings: z
    .array(
      z.object({
        id: z.string().uuid(),
        targetField: z.string().nullable(),
      })
    )
    .min(1),
});

export const dedupeDecisionSchema = z.object({
  decision: z.enum(['merge', 'link', 'create_new', 'ignore']),
});
