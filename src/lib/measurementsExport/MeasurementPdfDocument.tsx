import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { MeasurementSheet } from "@/lib/schemas/measurementSheet";
import { COMPANY_LABEL } from "@/lib/branding";
import {
  chunkMeasurementGroupDetailEntries,
  getMeasurementGroupDetailEntries,
  partitionMeasurementGroupDetailEntries,
  measurementLineColumnPlan,
  measurementLineColumnValue,
} from "@/lib/measurementSheetDisplay";

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 9,
    fontFamily: "Helvetica",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: "#444",
    marginBottom: 16,
    textTransform: "uppercase",
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
  colIdx: { width: "5%" },
  colDiv: { width: "16%" },
  colQty: { width: "6%" },
  colW: { width: "11%" },
  colH: { width: "11%" },
  colFix: { width: "12%" },
  colCmd: { width: "11%" },
  colNotes: { width: "14%" },
  colOpeningLxA: { width: "10%" },
  colOpeningSummary: { width: "18%" },
  colPrice: { width: "8%" },
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

export function MeasurementPdfDocument({ sheet }: { sheet: MeasurementSheet }) {
  const totalUnits = sheet.groups.reduce(
    (acc, g) => acc + g.rows.reduce((s, r) => s + r.qty, 0),
    0
  );

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.title}>Ficha Técnica de Medição</Text>
        <Text style={styles.subtitle}>{COMPANY_LABEL}</Text>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Cliente</Text>
          <Text style={styles.metaValue}>{sheet.clientName}</Text>
          <Text style={styles.metaLabel}>NSI</Text>
          <Text style={styles.metaValue}>{sheet.nsi || "—"}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Morada</Text>
          <Text style={styles.metaValue}>{sheet.address}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Serviço</Text>
          <Text style={styles.metaValue}>{sheet.serviceLabel || "—"}</Text>
          <Text style={styles.metaLabel}>Técnico</Text>
          <Text style={styles.metaValue}>{sheet.technicianName || "—"}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Data</Text>
          <Text style={styles.metaValue}>{formatVisitDate(sheet.visitDateIso)}</Text>
        </View>
        {sheet.remeasureLabel?.trim() ? (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Retificação</Text>
            <Text style={styles.metaValue}>{sheet.remeasureLabel}</Text>
          </View>
        ) : null}

        {sheet.groups.map((group, gi) => {
          const plan = measurementLineColumnPlan(group);
          const cellStyle = { flexGrow: 1, flexBasis: 0, fontSize: 7 };
          return (
          <View key={`g-${gi}`}>
            <Text style={styles.groupTitle}>{group.productLabel}</Text>
            <GroupProductDetailsPdf entries={getMeasurementGroupDetailEntries(group)} />
            <View style={styles.tableHeader}>
              {plan.columns.map((col) => (
                <Text key={col.key} style={[styles.cell, cellStyle]}>
                  {col.header}
                </Text>
              ))}
            </View>
            {group.rows.map((row) => (
              <View key={`r-${gi}-${row.index}`} style={styles.tableRow}>
                {plan.columns.map((col) => (
                  <Text key={col.key} style={[styles.cell, cellStyle]}>
                    {measurementLineColumnValue(row, col.key, plan.openingIsPrimary)}
                  </Text>
                ))}
              </View>
            ))}
          </View>
          );
        })}

        <Text style={styles.footer}>Total unidades: {totalUnits}</Text>
      </Page>
    </Document>
  );
}
