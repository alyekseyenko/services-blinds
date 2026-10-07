import { z } from "zod";

export const AdminCommercialServiceTypeEnum = z.enum([
  "TIRAR_MEDIDAS",
  "REMEDICAO",
  "MANUTENCAO",
  "REPARACAO",
  "INSTALACAO",
]);

export const AdminServiceAddressSchema = z.object({
  addressStreet1: z.string().trim().min(1, "Indique a morada do serviço."),
  addressStreet2: z.string().trim().optional(),
  addressCity: z.string().trim().min(1, "Indique a localidade."),
  addressState: z.string().trim().optional(),
  addressPostcode: z.string().trim().optional(),
  addressCountry: z.string().trim().min(1).default("Portugal"),
  addressLat: z.number().nullable().optional(),
  addressLng: z.number().nullable().optional(),
});

export const CreateAdminCommercialServiceSchema = z.object({
  clientRequestId: z.string().uuid(),
  personId: z.string().uuid(),
  serviceType: AdminCommercialServiceTypeEnum,
  /** When omitted, Twenty assigns the next NSI automatically. */
  nsi: z
    .number()
    .int("O NSI deve ser um número inteiro.")
    .positive("O NSI deve ser maior que zero.")
    .optional(),
  titleSuffix: z.string().trim().max(120).optional(),
  address: AdminServiceAddressSchema,
  notes: z.string().trim().max(4000).optional(),
});

export type AdminCommercialServiceType = z.infer<typeof AdminCommercialServiceTypeEnum>;
export type AdminServiceAddress = z.infer<typeof AdminServiceAddressSchema>;
export type CreateAdminCommercialServiceInput = z.infer<
  typeof CreateAdminCommercialServiceSchema
>;

export type AdminClientSearchHit = {
  id: string;
  displayName: string;
  email?: string;
  phone?: string;
};
