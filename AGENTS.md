<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Habitarmos WebApp Architecture & Quality Guidelines

This project strictly follows **Spec-Driven Development** and **Domain-Driven Design**. All AI agents and developers MUST adhere to the following rules:

## 1. Single Source of Truth for Models
- Use `zod` for all data schemas. Any business entity (Task, Opportunity, ServiceItem) MUST have a schema defined.
- TypeScript types must be inferred from Zod schemas (`z.infer<typeof Schema>`).
- Always validate incoming API/CRM data and outgoing form data with Zod.

## 2. Clean Architecture & Layer Separation
- **Presentation Layer:** `src/app/` and `src/components/` (UI and local state only). No direct database or CRM calls.
- **Use Case Layer:** `src/actions/` (Next.js Server Actions). The UI calls these to mutate data.
- **Infrastructure Layer:** `src/lib/crm/` (The ONLY place where CRM fetching/GraphQL queries occur).

## 3. Failsafe Mutations
- Never crash the UI with unhandled exceptions.
- All Server Actions must return a standardized object: `{ success: boolean, data?: any, error?: string }`.
- Catch all errors in the Server Action and return a graceful error message to the UI.

## 4. Strict Styling Standard
- Use Tailwind CSS exclusively. No inline styles.
- Follow the predefined design tokens in [DESIGN_SYSTEM.md](file:///c:/Users/habit/Desktop/app-tecnicos/DESIGN_SYSTEM.md) (vibrant neon lime `#a3e635` primary brand color, slate dark base, and iDraft glassmorphism).
- Reusable UI elements should be isolated in `src/components/ui/` or `src/components/dashboard/`.

## 5. Type Safety & QA
- No `any` types allowed. Resolve TS errors before deployment.
- Complex logic must be covered by unit tests (Vitest).
- Critical user flows must be verifiable via Playwright e2e tests or automated API QA endpoints.
