export const ADMIN_EMAILS = [
  "casta9269@gmail.com",
  "kinderland.re@gmail.com",
  "tortuga.reggioemilia@gmail.com",
];

export function isAdmin(email?: string): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase().trim());
}
