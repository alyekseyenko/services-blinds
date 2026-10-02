import { getServiceTypeColor } from "@/lib/techniciansConfig";

type ServiceTypeBadgeProps = {
  serviceType?: string | string[] | null;
  className?: string;
};

export function ServiceTypeBadge({ serviceType, className = "" }: ServiceTypeBadgeProps) {
  const key = Array.isArray(serviceType) ? serviceType[0] : serviceType;
  const colors = getServiceTypeColor(key || "GERAL");

  return (
    <span
      className={`inline-flex min-h-6 items-center rounded-md border-l-4 px-2 py-0.5 text-xs font-bold ${className}`}
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        borderLeftColor: colors.pin,
      }}
    >
      {key || "Geral"}
    </span>
  );
}
