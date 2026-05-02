import { useCallback } from "react";
import { useCustomerIdentity } from "@/lib/customer-identity";

const VISIT_REGISTERED_KEY = "tortuga_visit_registered_session";

export function useVisitRegistration() {
  const { identity, hasIdentity } = useCustomerIdentity();

  const registerVisit = useCallback(async (contactCodeOverride?: string) => {
    if (!hasIdentity && !contactCodeOverride) return;

    // Check if already registered in this browser session
    if (typeof window !== "undefined" && sessionStorage.getItem(VISIT_REGISTERED_KEY)) {
      return;
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
