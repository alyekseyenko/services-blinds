import "server-only";

import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import type { MeasurementSheet } from "@/lib/schemas/measurementSheet";
import { MeasurementPdfDocument } from "./MeasurementPdfDocument";

export async function buildMeasurementsPdf(sheet: MeasurementSheet): Promise<Buffer> {
  const element = React.createElement(MeasurementPdfDocument, { sheet });
  // MeasurementPdfDocument renders the root <Document>; react-pdf types expect DocumentProps at the call site.
  const buffer = await renderToBuffer(
    element as Parameters<typeof renderToBuffer>[0]
  );
  return Buffer.from(buffer);
}
