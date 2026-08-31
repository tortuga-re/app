import { requestJson } from "@/lib/client";
import { toDateInputValue } from "@/lib/customer-profile";
import { normalizeCustomerEmail } from "@/lib/customer-identity";
import type { ProfileResponse } from "@/lib/cooperto/types";
import { normalizeItalianPhone } from "@/lib/validation/phone";

export type ContactFormState = { firstName: string; lastName: string; phone: string; email: string; birthDate: string; marketingConsent: boolean };
export type ProfileFieldName = "lookupEmail" | "loginCode" | "firstName" | "lastName" | "email" | "phone";
export const emptyContactForm: ContactFormState = { firstName: "", lastName: "", phone: "", email: "", birthDate: "", marketingConsent: false };

export const loadProfileData = async (email: string) => {
  const params = new URLSearchParams({ mode: "email", query: normalizeCustomerEmail(email) });
  return requestJson<ProfileResponse>(`/api/profile?${params.toString()}`);
};

export const buildContactForm = (contact: ProfileResponse["contact"] | undefined): ContactFormState => ({
  firstName: contact?.Nome?.trim() ?? "",
  lastName: contact?.Cognome?.trim() ?? "",
  phone: normalizeItalianPhone(contact?.Telefono?.trim() ?? "")?.nationalNumber ?? "",
  email: normalizeCustomerEmail(contact?.Email),
  birthDate: toDateInputValue(contact?.DataDiNascita),
  marketingConsent: contact?.ConsensoMarketing === 1,
});
