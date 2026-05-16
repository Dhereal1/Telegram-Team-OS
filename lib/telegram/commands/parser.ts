export function parseCommand(text: string): { command: string; args: string[] } | null {
  const raw = text.trim();
  if (!raw.startsWith("/")) return null;

  const tokens = raw.split(/\s+/).filter(Boolean);
  const head = tokens[0];
  if (!head || !head.startsWith("/")) return null;

  const withoutSlash = head.slice(1);
  const name = withoutSlash.split("@")[0]?.trim();
  if (!name) return null;

  return { command: name.toLowerCase(), args: tokens.slice(1) };
}

