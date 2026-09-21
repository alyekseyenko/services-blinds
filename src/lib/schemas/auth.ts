import { z } from "zod";

export const AppRoleSchema = z.enum(["admin", "member", "technician", "warehouse", "ceo"]);
export type AppRole = z.infer<typeof AppRoleSchema>;

export const AuthenticatedAppUserSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  role: AppRoleSchema,
  twentyRoleLabel: z.string(),
});

export type AuthenticatedAppUser = z.infer<typeof AuthenticatedAppUserSchema>;

export const TwentyWorkspaceMemberSchema = z.object({
  id: z.string().uuid(),
  userEmail: z.string().email().nullable().optional(),
  name: z
    .object({
      firstName: z.string().nullable().optional(),
      lastName: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
});

export const TwentyRoleSchema = z.object({
  id: z.string().uuid(),
  label: z.string(),
  workspaceMembers: z.array(TwentyWorkspaceMemberSchema).default([]),
});

export type TwentyRole = z.infer<typeof TwentyRoleSchema>;
