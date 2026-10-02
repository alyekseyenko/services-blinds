import type { AppRole } from "@/lib/schemas/auth";
import type { OnboardingTourId } from "@/lib/schemas/onboarding";
import { APP_ROLE_HOME } from "@/lib/crm/contract";

export function getTourIdForAppRole(role: AppRole | undefined): OnboardingTourId | null {
  if (!role) return null;
  switch (role) {
    case "technician":
      return "technician";
    case "warehouse":
      return "warehouse";
    case "admin":
    case "member":
      return "admin";
    case "ceo":
      return "ceo";
    default:
      return null;
  }
}

/** Tour activo na rota actual (CEO em /admin usa guia operacional). */
export function getTourIdForSession(
  role: AppRole | undefined,
  pathname: string
): OnboardingTourId | null {
  if (!role) return null;
  if (role === "ceo" && pathname.startsWith(APP_ROLE_HOME.admin)) {
    return "admin";
  }
  return getTourIdForAppRole(role);
}

export function canAccessTourId(role: AppRole | undefined, tourId: OnboardingTourId): boolean {
  if (!role) return false;
  switch (tourId) {
    case "technician":
      return role === "technician";
    case "warehouse":
      return role === "warehouse";
    case "admin":
      return role === "admin" || role === "member" || role === "ceo";
    case "ceo":
      return role === "ceo" || role === "admin";
    default:
      return false;
  }
}

export function getHomePathForTourId(tourId: OnboardingTourId): string {
  switch (tourId) {
    case "technician":
      return APP_ROLE_HOME.technician;
    case "warehouse":
      return APP_ROLE_HOME.warehouse;
    case "admin":
      return APP_ROLE_HOME.admin;
    case "ceo":
      return APP_ROLE_HOME.ceo;
  }
}

export function isOnboardingAutostartEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ONBOARDING_AUTOSTART !== "false";
}

