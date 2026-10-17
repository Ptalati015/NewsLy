// Who may sign in during the beta. Empty or missing means nobody: the check
// fails closed.

export function parseAllowList(raw: string | undefined): ReadonlySet<string> {
  return new Set(
    (raw ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email.length > 0),
  );
}

export function isAllowedEmail(
  email: string | null | undefined,
  allowList: ReadonlySet<string>,
): boolean {
  if (!email) return false;
  return allowList.has(email.trim().toLowerCase());
}

export function getAllowList(env = process.env): ReadonlySet<string> {
  return parseAllowList(env.ALLOWED_EMAILS);
}
