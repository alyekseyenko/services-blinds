import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

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

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    files: ["src/components/**/*.{ts,tsx}", "src/app/**/*.{ts,tsx}", "src/hooks/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", restrictedCrmImports],
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/text-\\[(8|9|10|11)(\\.5)?px\\]/]",
          message: "Tipografia mínima text-xs (12px). Ver DESIGN_SYSTEM.md §2.",
        },
        {
          selector: "Literal[value=/#(06080f|121620|121622|0b0f17)/]",
          message: "Use tokens em src/styles/design-system.css.",
        },
        {
          selector: "Literal[value=/\\bfont-mono\\b/]",
          message: "Use ds-num (Inter + tabular-nums) em vez de font-mono.",
        },
        {
          selector:
            "Literal[value=/font-display[^\"']*font-(black|bold|extrabold)|font-(black|bold|extrabold)[^\"']*font-display/]",
          message: "Michroma (ds-title) não combina com negrito — use ds-title sozinho.",
        },
        {
          selector: "Literal[value=/uppercase[^\"']*italic|italic[^\"']*uppercase/]",
          message: "Títulos sem itálico — use ds-title.",
        },
      ],
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: [
      "src/lib/map/serviceMarkerArt.ts",
      "src/lib/map/mapClusterRenderer.ts",
      "src/lib/design/cssVar.ts",
      "src/lib/designTokens/wcagContrast.ts",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "Literal[value=/\\b(bg|text|border|ring|from|to|via|fill|stroke)-(red|amber|blue|emerald|green|purple|rose|orange|sky|slate|gray|zinc|neutral|white|black|lime|yellow|pink|indigo|violet|fuchsia|cyan|teal)-/]",
          message:
            "Paleta crua proibida — use tokens (success/danger/warning/info/neutral) de src/styles/design-system.css.",
        },
        {
          selector: "Literal[value=/\\bbg-white\\b/]",
          message: "Use bg-card ou bg-background.",
        },
        {
          selector: "Literal[value=/\\b(bg|text|border|ring)-\\[#/]",
          message: "Hex em classes proibido — use tokens do design-system.css.",
        },
        {
          selector: "Literal[value=/rgba?\\(/]",
          message: "rgba/rgb em classes proibido — use tokens CSS.",
        },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
