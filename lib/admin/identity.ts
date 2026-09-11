export const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "")
  .split(",")
  .map((email) => email.toLowerCase().trim())
  .filter(Boolean);

export function isAdmin(email?: string): boolean {
  return Boolean(email && ADMIN_EMAILS.includes(email.toLowerCase().trim()));
}
