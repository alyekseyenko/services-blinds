import { z } from "zod";

export const VisitServiceFileKindSchema = z.enum(["image", "file"]);

export const VisitServiceFileListItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  extension: z.string(),
  createdAt: z.string(),
  kind: VisitServiceFileKindSchema,
});

export const VisitServiceFilesListResponseSchema = z.object({
  files: z.array(VisitServiceFileListItemSchema),
});

export type VisitServiceFileKind = z.infer<typeof VisitServiceFileKindSchema>;
export type VisitServiceFileListItem = z.infer<typeof VisitServiceFileListItemSchema>;
export type VisitServiceFilesListResponse = z.infer<typeof VisitServiceFilesListResponseSchema>;