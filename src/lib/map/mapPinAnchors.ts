"use client";

import {
  MAP_PIN_HEAD_CX,
  MAP_PIN_HEAD_CY,
  MAP_PIN_TIP_X,
  MAP_PIN_TIP_Y,
  MAP_PIN_VIEW_HEIGHT,
  MAP_PIN_VIEW_WIDTH,
} from "@/lib/map/serviceMarkerArt";

export function teardropAnchor(width: number, height: number) {
  return new window.google.maps.Point(
    (MAP_PIN_TIP_X / MAP_PIN_VIEW_WIDTH) * width,
    (MAP_PIN_TIP_Y / MAP_PIN_VIEW_HEIGHT) * height
  );
}

export function routeStopLabelOrigin(width: number, height: number) {
  return new window.google.maps.Point(
    (MAP_PIN_HEAD_CX / MAP_PIN_VIEW_WIDTH) * width,
    (MAP_PIN_HEAD_CY / MAP_PIN_VIEW_HEIGHT) * height
  );
}