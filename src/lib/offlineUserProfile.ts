const STORAGE_KEY = "fieldops_cached_technician_profile_v1";

export type CachedTechnicianProfile = {
  id: string;
  userId: string;
  name: string;
  role: "technician";
  savedAt: number;
};

export function cacheTechnicianProfile(profile: Omit<CachedTechnicianProfile, "savedAt" | "role">): void {
  if (typeof window === "undefined") return;
  const payload: CachedTechnicianProfile = {
    ...profile,
    role: "technician",
    savedAt: Date.now(),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    localStorage.setItem("userId", profile.id || profile.userId);
  } catch {
    // ignore quota errors
  }
}

export function getCachedTechnicianProfile(): CachedTechnicianProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedTechnicianProfile;
    if (parsed?.role !== "technician" || !parsed.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearCachedTechnicianProfile(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
