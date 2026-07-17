/**
 * Format a date string to DD.MM.YYYY
 * Handles various input formats: ISO, Russian locale, etc.
 */
export function formatDate(dateStr: string): string {
  if (!dateStr || dateStr === '—') return '—';

  // Try parsing as ISO date (YYYY-MM-DD)
  const isoMatch = dateStr.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoMatch) {
    const day = isoMatch[3].padStart(2, '0');
    const month = isoMatch[2].padStart(2, '0');
    const year = isoMatch[1];
    return `${day}.${month}.${year}`;
  }

  // Try parsing as Russian date (DD.MM.YYYY or DD-MM-YYYY)
  const ruMatch = dateStr.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (ruMatch) {
    const day = ruMatch[1].padStart(2, '0');
    const month = ruMatch[2].padStart(2, '0');
    const year = ruMatch[3];
    return `${day}.${month}.${year}`;
  }

  // If it looks like a date string with time, try Date object
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  }

  // Return as-is if we can't parse
  return dateStr;
}
