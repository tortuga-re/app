import { useCallback } from "react";
import { useCustomerIdentity } from "@/lib/customer-identity";

const VISIT_REGISTERED_KEY = "tortuga_visit_registered_session";

export function useVisitRegistration() {
  const { identity, hasIdentity } = useCustomerIdentity();

  const registerVisit = useCallback(async (contactCodeOverride?: string) => {
    if (!hasIdentity && !contactCodeOverride) return;

    // Check if already registered in this browser session
    if (typeof window !== "undefined") {
      if (sessionStorage.getItem(VISIT_REGISTERED_KEY)) return;

      const lastVisitAt = localStorage.getItem("tortuga.last-visit-at");
      if (lastVisitAt) {
        const diff = Date.now() - parseInt(lastVisitAt, 10);
        // Se è stata registrata una visita meno di 4 ore fa, non ripetere
        if (diff < 1000 * 60 * 60 * 4) return;
      }
    }

    const contactCode = contactCodeOverride || identity.email; // Fallback to email if code not available
    if (!contactCode) return;

    try {
      const response = await fetch("/api/profile/visit/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactCode }),
      });

      if (response.ok) {
        if (typeof window !== "undefined") {
          sessionStorage.setItem(VISIT_REGISTERED_KEY, "true");
          localStorage.setItem("tortuga.last-visit-at", Date.now().toString());
        }
        console.info("[Visit Registration] Registered successfully for", contactCode);
      } else {
        console.warn("[Visit Registration] Failed to register visit");
      }
    } catch (error) {
      console.error("[Visit Registration] Network error:", error);
    }
  }, [identity.email, hasIdentity]);

  return { registerVisit };
}
