export const ADMIN_EMAILS = ["kinderland.re@gmail.com"];

export function isAdmin(email?: string): boolean {
  return Boolean(email && ADMIN_EMAILS.includes(email.toLowerCase().trim()));
}
