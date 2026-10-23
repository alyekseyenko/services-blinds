/** Rodapé de paginação nas exportações PDF (pt-PT). */
export function formatMeasurementPdfPageLabel(pageNumber: number, totalPages: number): string {
  return `Pág. ${pageNumber} de ${totalPages}`;
}
