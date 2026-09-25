import type { Renderer } from "@googlemaps/markerclusterer";

/** Light cluster bubbles — distinct from teardrop service pins. */
export function createMapClusterRenderer(): Renderer {
  return {
    render: ({ count, position, markers }) => {
      const size = count < 10 ? 44 : count < 25 ? 52 : 60;
      const fontSize = count < 100 ? 14 : 12;

      const hasLate =
        markers?.some((m) => {
          const marker = m as google.maps.Marker;
          return typeof marker.get === "function" && marker.get("mapHasLate") === true;
        }) ?? false;
      const lateDot = hasLate
        ? `<circle cx="${size - 8}" cy="8" r="5" fill="#dc2626" stroke="#ffffff" stroke-width="1.5"/>`
        : "";

      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="#ffffff" stroke="#84cc16" stroke-width="3"/>
        <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" fill="#0f172a" font-family="Inter, system-ui, sans-serif" font-size="${fontSize}" font-weight="800">${count}</text>
        ${lateDot}
      </svg>`;

      return new google.maps.Marker({
        position,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
          scaledSize: new google.maps.Size(size, size),
          anchor: new google.maps.Point(size / 2, size / 2),
        },
        zIndex: Number(google.maps.Marker.MAX_ZINDEX) + count,
      });
    },
  };
}
