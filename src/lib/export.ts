/**
 * Export data to CSV and trigger browser download.
 *
 * @param filename - Name of the file (without .csv extension)
 * @param headers  - Array of column header strings
 * @param rows     - 2D array of cell values (each row = array of values)
 */
export function exportToCSV(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
): void {
  const escapeCSV = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return ''
    const str = String(val)
    // If value contains comma, quote, or newline, wrap in double-quotes
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...rows.map((row) => row.map(escapeCSV).join(',')),
  ].join('\n')

  // Add UTF-8 BOM for Excel compatibility
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', `${filename}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}