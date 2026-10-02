import { z } from "zod";

export const OnboardingTourIdSchema = z.enum(["technician", "warehouse", "admin", "ceo"]);
export type OnboardingTourId = z.infer<typeof OnboardingTourIdSchema>;

export const OnboardingTourStatusSchema = z.enum(["pending", "completed", "skipped"]);
export type OnboardingTourStatus = z.infer<typeof OnboardingTourStatusSchema>;

export const OnboardingTourRecordSchema = z.object({
  status: OnboardingTourStatusSchema,
  updatedAt: z.string().datetime(),
});

export type OnboardingTourRecord = z.infer<typeof OnboardingTourRecordSchema>;

/** Partial map — each user only stores tours they have seen. */
export const OnboardingUserRecordSchema = z.record(z.string(), OnboardingTourRecordSchema);

export const OnboardingStoreV1Schema = z.object({
  version: z.literal(1),
  users: z.record(z.string(), OnboardingUserRecordSchema),
});

export type OnboardingStoreV1 = z.infer<typeof OnboardingStoreV1Schema>;

export const EMPTY_ONBOARDING_STORE: OnboardingStoreV1 = {
  version: 1,
  users: {},
};
