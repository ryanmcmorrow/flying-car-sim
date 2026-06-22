export async function parseJSON(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  try { return JSON.parse(text) as Record<string, unknown>; } catch { throw new Error(`Server error (${res.status}) — ${text.slice(0, 100)}`); }
}
