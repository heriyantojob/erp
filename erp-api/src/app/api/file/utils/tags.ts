export function normalizeAndValidateTags(input: unknown): string[] {
  if (input == null) return [];
  if (!Array.isArray(input))
    throw new Error("Invalid tags: must be an array of strings");

  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of input) {
    if (typeof raw !== "string")
      throw new Error("Invalid tags: must be an array of strings");
    const tag = raw
      .replace(/[\t\n\r\v\f]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
    if (!tag) continue;
    if (/[\u0000-\u001F\u007F]/.test(tag))
      throw new Error("Invalid tag: contains control characters");
    if (!/^[a-z0-9]+(?:[ _-][a-z0-9]+)*$/.test(tag)) {
      throw new Error(
        "Invalid tag: only letters/numbers, dash, underscore, single spaces allowed",
      );
    }
    if (!seen.has(tag)) {
      seen.add(tag);
      result.push(tag);
    }
  }
  return result;
}
