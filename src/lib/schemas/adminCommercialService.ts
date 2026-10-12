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

export const AdminPersonMoradaSchema = z.object({
  addressStreet1: z.string().trim().min(1, "Indique a morada."),
  addressStreet2: z.string().trim().optional(),
  addressCity: z.string().trim().min(1, "Indique a localidade."),
  addressState: z.string().trim().optional(),
  addressPostcode: z.string().trim().optional(),
  addressCountry: z.string().trim().min(1).default("Portugal"),
  addressLat: z.number().nullable().optional(),
  addressLng: z.number().nullable().optional(),
});

export const AdminClientTypeEnum = z.enum(["PARTICULAR", "EMPRESA"]);

export const CreateAdminClientSchema = z
  .object({
    clientType: AdminClientTypeEnum,
    firstName: z.string().trim().min(1, "Indique o nome."),
    lastName: z.string().trim().max(80).optional(),
    nif: z
      .string()
      .trim()
      .regex(/^\d{9}$/, "O NIF deve ter exatamente 9 dígitos."),
    email: z.string().trim().optional(),
    phoneCountryCode: z.string().trim().min(2).max(2).default("PT"),
    phoneNational: z.string().trim().min(1, "Indique o telemóvel."),
    morada: AdminPersonMoradaSchema,
  })
  .superRefine((data, ctx) => {
    const email = data.email?.trim() || undefined;
    if (email) {
      const emailCheck = z.string().email().safeParse(email);
      if (!emailCheck.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "E-mail inválido.",
          path: ["email"],
        });
      }
    }
    const phoneDigits = data.phoneNational.replace(/\D/g, "");
    if (phoneDigits.length < 9) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Indique um telemóvel válido (mínimo 9 dígitos).",
        path: ["phoneNational"],
      });
    }
  });

export type AdminPersonMorada = z.infer<typeof AdminPersonMoradaSchema>;
export type AdminClientType = z.infer<typeof AdminClientTypeEnum>;
export type CreateAdminClientInput = z.infer<typeof CreateAdminClientSchema>;
