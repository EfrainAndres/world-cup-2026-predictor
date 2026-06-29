// Accepts YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS[.mmm]Z
export function isValidIsoTimestamp(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?Z)?$/.test(value) &&
    !Number.isNaN(Date.parse(value));
}

export function normalizeToIsoTimestamp(value: string): string {
  if (value.includes("T")) return value;
  return `${value}T00:00:00.000Z`;
}
