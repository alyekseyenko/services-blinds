import { z } from "zod";

export const PublicTokenPurposeSchema = z.enum(["evaluation", "cancellation"]);

export const PublicTokenPayloadSchema = z.object({
  purpose: PublicTokenPurposeSchema,
  opportunityId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
  exp: z.number().int().positive(),
});

export type PublicTokenPayload = z.infer<typeof PublicTokenPayloadSchema>;

export const PublicEvaluationInputSchema = z.object({
  opportunityId: z.string().uuid(),
  token: z.string().min(10),
  rating: z.number().int().min(1).max(5),
  feedback: z.string().max(2000).optional().default(""),
});

export const PublicCancellationInputSchema = z.object({
  taskId: z.string().uuid(),
  token: z.string().min(10),
  reason: z.string().trim().min(10).max(500),
});

export type PublicEvaluationInput = z.infer<typeof PublicEvaluationInputSchema>;
export type PublicCancellationInput = z.infer<typeof PublicCancellationInputSchema>;
