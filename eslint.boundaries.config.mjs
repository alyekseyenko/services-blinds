import { defineConfig, globalIgnores } from "eslint/config";
import tsParser from "@typescript-eslint/parser";

/** Fitness function: UI/hooks/pages must not import CRM server modules (API routes excluded). */
const restrictedCrmImports = {
  paths: [
    {
      name: "@/lib/crm/client",
      message: "GraphQL client é server-only — use Server Actions.",
    },
    {
      name: "@/lib/crm/opportunities",
      message: "Mutações CRM pertencem a actions/ e lib/crm (server).",
    },
    {
      name: "@/lib/crm/tasks",
      message: "Mutações CRM pertencem a actions/ e lib/crm (server).",
    },
    {
      name: "@/lib/crm/notes",
      message: "Use @/lib/crm/appTypes para tipos client-safe.",
    },
    {
      name: "@/lib/outboxQueue",
      message: "Outbox é infraestrutura server-only.",
    },
    {
      name: "@/lib/notificationAction",
      message: "Notificações via actions/ ou lib/crm/notifications.",
    },
  ],
};

export default defineConfig([
  globalIgnores([".next/**", "out/**", "build/**", "node_modules/**"]),
  {
    files: [
      "src/components/**/*.{ts,tsx}",
      "src/hooks/**/*.{ts,tsx}",
      "src/app/**/*.{ts,tsx}",
    ],
    ignores: ["src/app/api/**"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      "no-restricted-imports": ["error", restrictedCrmImports],
    },
  },
]);
