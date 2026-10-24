/**
 * © 2024–2026 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 *
 * Save generated data (CSV text, an .xlsx workbook…) as a file in the browser.
 */
export const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
export const CSV_TYPE = 'text/csv;charset=utf-8';

export function downloadBlob(data, filename, type = 'application/octet-stream') {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the browser a moment to start the download before freeing the data.
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** "navgrow-products-2026-10-24.xlsx" */
export const datedName = (base, ext) => `${base}-${new Date().toISOString().slice(0, 10)}.${ext}`;
