export function normalizeCompanyName(value: string) {
  return value.trim().toLocaleLowerCase("en").replace(/\s+/g, " ");
}
