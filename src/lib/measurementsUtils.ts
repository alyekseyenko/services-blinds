import type { MeasurementsPayload } from "@/lib/schemas";

const JSON_MEASUREMENTS_REGEX = /<!--\s*\[JSON_MEASUREMENTS\](.*?)\s*-->/;

export function parseMeasurementsFromReport(report?: string | null): MeasurementsPayload | null {
  if (!report) return null;

  const commentMatch = report.match(JSON_MEASUREMENTS_REGEX);
  if (commentMatch?.[1]) {
    try {
      const data = JSON.parse(commentMatch[1]);
      if (Array.isArray(data?.groups)) return data as MeasurementsPayload;
    } catch {
      // fall through
    }
  }

  if (report.includes("[MEASUREMENTS]")) {
    try {
      const jsonPart = report.split("[MEASUREMENTS]")[1];
      const data = JSON.parse(jsonPart);
      if (Array.isArray(data?.groups)) return data as MeasurementsPayload;
    } catch {
      // ignore legacy format
    }
  }

  return null;
}

export function hasValidMeasurements(
  report?: string | null,
  draftJson?: string | null
): boolean {
  const fromReport = parseMeasurementsFromReport(report);
  if (fromReport?.groups?.some((g) => g.measurements?.some((m) => m.width && m.height))) {
    return true;
  }

  if (draftJson) {
    try {
      const draft = JSON.parse(draftJson);
      if (draft?.groups?.some((g: { measurements?: Array<{ width?: string; height?: string }> }) =>
        g.measurements?.some((m) => m.width && m.height)
      )) {
        return true;
      }
    } catch {
      // ignore
    }
  }

  return false;
}

export function formatMeasurementsReport(data: MeasurementsPayload): string {
  return `<!-- [JSON_MEASUREMENTS]${JSON.stringify(data)} -->`;
}

export function getMeasurementsDraftKey(taskId: string): string {
  return `measurements_draft_${taskId}`;
}
