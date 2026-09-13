import { useCallback } from "react";
import { useCustomerIdentity } from "@/lib/customer-identity";
import { rememberPendingVisit } from "@/lib/pending-visit";

const VISIT_REGISTERED_KEY = "tortuga_visit_registered_session";
let activeVisitRegistration: Promise<boolean> | null = null;

export function useVisitRegistration() {
  const { identity, hasIdentity } = useCustomerIdentity();

  const registerVisit = useCallback(async (contactCodeOverride?: string) => {
    // Se l'utente non è autenticato / non ha effettuato il login nell'app,
    // salva la visita nella memoria del telefono (localStorage) per un login futuro
    // senza effettuare chiamate di rete.
    if (!hasIdentity && !contactCodeOverride) {
      if (typeof window !== "undefined") {
        rememberPendingVisit(Date.now() + 7 * 24 * 60 * 60 * 1000);
      }
      return false;
    }

    // Check if already registered in this browser session
    if (typeof window !== "undefined") {
      if (sessionStorage.getItem(VISIT_REGISTERED_KEY)) return true;

      const lastVisitAt = localStorage.getItem("tortuga.last-visit-at");
      if (lastVisitAt) {
        const diff = Date.now() - parseInt(lastVisitAt, 10);
        // Se è stata registrata una visita meno di 4 ore fa, non ripetere
        if (diff < 1000 * 60 * 60 * 4) return true;
      }
    }

    const contactCode = contactCodeOverride || identity.email; // Fallback to email if code not available
    if (!contactCode) return false;

    if (activeVisitRegistration) return activeVisitRegistration;

    activeVisitRegistration = (async () => {
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
          return true;
        } else {
          // In caso di contatto non trovato o errore 404/400, segna la sessione per evitare retry continui
          if (typeof window !== "undefined") {
            sessionStorage.setItem(VISIT_REGISTERED_KEY, "true");
          }
          console.warn("[Visit Registration] Failed to register visit for", contactCode);
          return false;
        }
      } catch (error) {
        console.error("[Visit Registration] Network error:", error);
        return false;
      } finally {
        activeVisitRegistration = null;
      }
    })();

    return activeVisitRegistration;
  }, [identity.email, hasIdentity]);

  return { registerVisit };
}
