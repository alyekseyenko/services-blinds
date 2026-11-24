import React from "react";
import { Document, Font, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { MeasurementSheet } from "@/lib/schemas/measurementSheet";
import { measurementExportByline } from "@/lib/measurementsExport/exportByline";
import {
  chunkMeasurementGroupDetailEntries,
  getMeasurementGroupDetailEntries,
  partitionMeasurementGroupDetailEntries,
  measurementLineColumnPlan,
  measurementLineColumnValue,
} from "@/lib/measurementSheetDisplay";
import { formatMeasurementPdfPageLabel } from "@/lib/measurementsExport/pdfPageFooter";
import { measurementClientDetailRows } from "@/lib/measurements/clientContactDisplay";
import type { MeasurementLineColumnKey } from "@/lib/measurements/sheetDisplay";

/** Não parte palavras ao meio — o texto desce de linha dentro da célula. */
Font.registerHyphenationCallback((word) => [word]);

export type MeasurementPdfLayout = "landscape" | "portrait";

const styles = StyleSheet.create({
  page: {
    padding: 32,
    paddingBottom: 52,
    fontSize: 9,
    fontFamily: "Helvetica",
  },
  pagePortrait: {
    padding: 16,
    paddingBottom: 36,
    fontSize: 8,
    fontFamily: "Helvetica",
  },
  pageFooter: {
    position: "absolute",
    bottom: 18,
    left: 32,
    right: 32,
    fontSize: 8,
    textAlign: "center",
    color: "#555",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  headerBand: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  headerStack: {
    marginBottom: 6,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 4,
  },
  titlePortrait: {
    fontSize: 13,
    fontWeight: "bold",
  },
  clientGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 6,
    backgroundColor: "#f7f7f7",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  clientCell: {
    width: "50%",
    flexDirection: "row",
    marginBottom: 2,
    paddingRight: 8,
    fontSize: 7,
  },
  clientCellFull: {
    width: "100%",
  },
  headerLeft: {
    width: "34%",
    paddingRight: 12,
  },
  byline: {
    fontSize: 11,
    color: "#333",
    marginTop: 4,
    fontWeight: "bold",
  },
  metaRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  metaLabel: {
    width: 90,
    fontWeight: "bold",
    color: "#333",
  },
  metaValue: {
    flex: 1,
  },
  groupTitle: {
    marginTop: 12,
    marginBottom: 6,
    fontSize: 11,
    fontWeight: "bold",
    backgroundColor: "#f0f0f0",
    padding: 6,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#e8e8e8",
    borderWidth: 1,
    borderColor: "#ccc",
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#ccc",
  },
  cell: {
    padding: 4,
    borderRightWidth: 1,
    borderColor: "#ccc",
  },
  detailsBox: {
    marginBottom: 6,
    padding: 6,
    backgroundColor: "#f7f7f7",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  detailsRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  detailsCell: {
    width: "50%",
    paddingRight: 8,
    fontSize: 8,
  },
  detailsObservations: {
    marginTop: 2,
    fontSize: 8,
    width: "100%",
  },
  detailLabel: {
    fontWeight: "bold",
  },
  clientSection: {
    flex: 1,
    padding: 8,
    backgroundColor: "#f7f7f7",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  clientSectionTitle: {
    fontSize: 9,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#444",
    textTransform: "uppercase",
  },
  clientRow: {
    flexDirection: "row",
    marginBottom: 3,
    fontSize: 8,
  },
  clientRowLast: {
    marginBottom: 0,
  },
  clientLabel: {
    width: 54,
    fontWeight: "bold",
    color: "#333",
  },
  clientValue: {
    flex: 1,
  },
  serviceBand: {
    marginBottom: 8,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
  },
  serviceSectionTitle: {
    fontSize: 9,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#444",
    textTransform: "uppercase",
  },
  serviceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 3,
    fontSize: 8,
  },
  servicePair: {
    flexDirection: "row",
    marginRight: 18,
    marginBottom: 2,
  },
  serviceLabel: {
    fontWeight: "bold",
    color: "#333",
    marginRight: 4,
  },
  footer: {
    marginTop: 16,
    fontWeight: "bold",
  },
});

function formatVisitDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

const PDF_DETAIL_COLUMNS = 2;

function GroupProductDetailsPdf({ entries }: { entries: ReturnType<typeof getMeasurementGroupDetailEntries> }) {
  const { gridEntries, observations } = partitionMeasurementGroupDetailEntries(entries);
  const rows = chunkMeasurementGroupDetailEntries(gridEntries, PDF_DETAIL_COLUMNS);
  if (rows.length === 0 && !observations) return null;

  return (
    <View style={styles.detailsBox}>
      {rows.map((row, rowIdx) => (
        <View key={`row-${rowIdx}`} style={styles.detailsRow}>
          {row.map((detail) => (
            <View key={detail.label} style={styles.detailsCell}>
              <Text>
                <Text style={styles.detailLabel}>{detail.label}: </Text>
                {detail.value}
              </Text>
            </View>
          ))}
          {row.length === 1 ? <View style={styles.detailsCell} /> : null}
        </View>
      ))}
      {observations ? (
        <View style={styles.detailsObservations}>
          <Text>
            <Text style={styles.detailLabel}>{observations.label}: </Text>
            {observations.value}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function columnFlex(key: MeasurementLineColumnKey, portrait: boolean): number {
  if (!portrait) return 1;
  switch (key) {
    case "index":
    case "qty":
      return 0.42;
    case "primaryHeight":
    case "primaryWidth":
    case "openingHeight":
    case "openingWidth":
    case "exteriorHeight":
    case "exteriorWidth":
    case "depth":
    case "price":
      return 0.72;
    case "division":
    case "notes":
    case "channel":
    case "openingSummary":
      return 1.35;
    default:
      return 0.85;
  }
}

export function MeasurementPdfDocument({
  sheet,
  layout = "landscape",
}: {
  sheet: MeasurementSheet;
  layout?: MeasurementPdfLayout;
}) {
  const portrait = layout === "portrait";
  const totalUnits = sheet.groups.reduce(
    (acc, g) => acc + g.rows.reduce((s, r) => s + r.qty, 0),
    0
  );
  const exportByline = measurementExportByline(sheet.technicianName);
  const clientRows = measurementClientDetailRows(sheet);

  return (
    <Document>
      <Page
        size="A4"
        orientation={portrait ? "portrait" : "landscape"}
        style={portrait ? styles.pagePortrait : styles.page}
        wrap
      >
        {portrait ? (
          <View style={styles.headerStack}>
            <View style={styles.titleRow}>
              <Text style={styles.titlePortrait}>Ficha Técnica de Medição</Text>
              {exportByline ? <Text style={styles.byline}>{exportByline}</Text> : null}
            </View>
            <View style={styles.clientGrid}>
              {clientRows.map((row) => (
                <View
                  key={row.label}
                  style={row.label === "Morada" ? [styles.clientCell, styles.clientCellFull] : styles.clientCell}
                >
                  <Text style={styles.clientLabel}>{row.label}</Text>
                  <Text style={styles.clientValue}>{row.value}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.headerBand}>
            <View style={styles.headerLeft}>
              <Text style={styles.title}>Ficha Técnica de Medição</Text>
              {exportByline ? <Text style={styles.byline}>{exportByline}</Text> : null}
            </View>
            <View style={styles.clientSection}>
              <Text style={styles.clientSectionTitle}>Dados do cliente</Text>
              {clientRows.map((row, idx) => (
                <View
                  key={row.label}
                  style={idx === clientRows.length - 1 ? [styles.clientRow, styles.clientRowLast] : styles.clientRow}
                >
                  <Text style={styles.clientLabel}>{row.label}</Text>
                  <Text style={styles.clientValue}>{row.value}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.serviceBand}>
          <Text style={styles.serviceSectionTitle}>Serviço e ficha</Text>
          <View style={styles.serviceRow}>
            <View style={styles.servicePair}>
              <Text style={styles.serviceLabel}>N.º serviço:</Text>
              <Text>{sheet.serviceNumber || "—"}</Text>
            </View>
            <View style={styles.servicePair}>
              <Text style={styles.serviceLabel}>NSI:</Text>
              <Text>{sheet.nsi || "—"}</Text>
            </View>
            <View style={styles.servicePair}>
              <Text style={styles.serviceLabel}>Serviço:</Text>
              <Text>{sheet.serviceLabel || "—"}</Text>
            </View>
            <View style={styles.servicePair}>
              <Text style={styles.serviceLabel}>Técnico:</Text>
              <Text>{sheet.technicianName || "—"}</Text>
            </View>
            <View style={styles.servicePair}>
              <Text style={styles.serviceLabel}>Data:</Text>
              <Text>{formatVisitDate(sheet.visitDateIso)}</Text>
            </View>
            {sheet.remeasureLabel?.trim() ? (
              <View style={styles.servicePair}>
                <Text style={styles.serviceLabel}>Medidas retificadas:</Text>
                <Text>{sheet.remeasureLabel}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {sheet.groups.map((group, gi) => {
          const plan = measurementLineColumnPlan(group, { includePrice: true });
          const fontSize = portrait ? 6.5 : 7;
          return (
            <View key={`g-${gi}`}>
              <Text style={portrait ? [styles.groupTitle, { marginTop: 8, fontSize: 9, padding: 4 }] : styles.groupTitle}>
                {group.productLabel}
              </Text>
              <GroupProductDetailsPdf entries={getMeasurementGroupDetailEntries(group)} />
              <View style={styles.tableHeader} wrap={false}>
                {plan.columns.map((col) => (
                  <View
                    key={col.key}
                    style={[styles.cell, { flexGrow: columnFlex(col.key, portrait), flexBasis: 0, flexShrink: 1 }]}
                  >
                    <Text style={{ fontSize }}>{col.header}</Text>
                  </View>
                ))}
              </View>
              {group.rows.map((row) => (
                <View key={`r-${gi}-${row.index}`} style={styles.tableRow} wrap={false}>
                  {plan.columns.map((col) => (
                    <View
                      key={col.key}
                      style={[styles.cell, { flexGrow: columnFlex(col.key, portrait), flexBasis: 0, flexShrink: 1 }]}
                    >
                      <Text style={{ fontSize }}>
                        {measurementLineColumnValue(row, col.key, plan.openingIsPrimary) || " "}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          );
        })}

        <Text style={styles.footer}>Total unidades: {totalUnits}</Text>

        <Text
          style={styles.pageFooter}
          fixed
          render={({ pageNumber, totalPages }) =>
            formatMeasurementPdfPageLabel(pageNumber, totalPages)
          }
        />
      </Page>
    </Document>
  );
}