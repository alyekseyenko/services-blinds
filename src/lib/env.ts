import { z } from 'zod';

const envSchema = z.object({
  TWENTY_API_URL: z.string().url(),
  TWENTY_API_KEY: z.string().min(10),
  TWENTY_METADATA_URL: z.string().url().optional(),
  TWENTY_AUTH_ORIGIN: z.string().url().optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(16, 'NEXTAUTH_SECRET must be at least 16 characters'),
  N8N_WEBHOOK_URL: z.string().url().optional().or(z.literal('')),
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  VAPID_PUBLIC_KEY: z.string().min(10).optional(),
  VAPID_PRIVATE_KEY: z.string().min(10).optional(),
  PUBLIC_LINK_SECRET: z.string().min(16).optional(),
  PUBLIC_LINK_TTL_DAYS: z.coerce.number().int().positive().optional(),
});

const isServer = typeof window === 'undefined';

export const env = envSchema.parse({
  TWENTY_API_URL: isServer ? process.env.TWENTY_API_URL : 'https://api.twenty.com', // Placeholder for client
  TWENTY_API_KEY: isServer ? process.env.TWENTY_API_KEY : 'client-side-placeholder-key', // Placeholder for client
  TWENTY_METADATA_URL: isServer ? process.env.TWENTY_METADATA_URL : undefined,
  TWENTY_AUTH_ORIGIN: isServer ? process.env.TWENTY_AUTH_ORIGIN : undefined,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  NEXTAUTH_SECRET: isServer ? process.env.NEXTAUTH_SECRET : 'client-side-not-used',
  N8N_WEBHOOK_URL: process.env.N8N_WEBHOOK_URL,
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
  PUBLIC_LINK_SECRET: process.env.PUBLIC_LINK_SECRET,
  PUBLIC_LINK_TTL_DAYS: process.env.PUBLIC_LINK_TTL_DAYS,
});

export type Env = z.infer<typeof envSchema>;

