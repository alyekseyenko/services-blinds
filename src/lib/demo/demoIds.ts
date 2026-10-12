/** Client-only demo entity IDs — never synced to CRM (legacy tour / formação). */

export const ONBOARDING_DEMO_TASK_ID = "onboarding-demo-map-pin";
export const ONBOARDING_DEMO_OPP_ID = "onboarding-demo-opportunity";

const ONBOARDING_DEMO_ID_PREFIX = "onboarding-demo";

export function isOnboardingDemoId(id: string | null | undefined): boolean {
  if (!id) return false;
  if (id === ONBOARDING_DEMO_TASK_ID || id === ONBOARDING_DEMO_OPP_ID) return true;
  return id.startsWith(`${ONBOARDING_DEMO_ID_PREFIX}-`) || id.startsWith(ONBOARDING_DEMO_ID_PREFIX);
}

export function isOnboardingDemoEntity(
  entity: { id?: string; opportunityId?: string } | null | undefined
): boolean {
  if (!entity) return false;
  return isOnboardingDemoId(entity.id) || isOnboardingDemoId(entity.opportunityId);
}
