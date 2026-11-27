/** Same van art as live GPS pins on the map (MapEntityMarkers). */
export function buildTechnicianVanSvg(size: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="18" fill="#090d16" stroke="#84cc16" stroke-width="3"/>
            <circle cx="20" cy="20" r="13" fill="#0284c7" fill-opacity="0.25"/>
            <path d="M11 23h18l-2.5-7h-13z" fill="#84cc16"/>
            <circle cx="15" cy="24" r="2.2" fill="#ffffff"/>
            <circle cx="25" cy="24" r="2.2" fill="#ffffff"/>
            <rect x="17" y="18" width="4" height="2.5" fill="#090d16"/>
          </svg>`;
}

export function technicianVanDataUrl(size: number): string {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(buildTechnicianVanSvg(size))}`;
}
