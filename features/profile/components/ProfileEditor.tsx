import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { triggerHaptic } from "@/lib/haptics";

export interface ProfileEditorProps {
  isRegistering: boolean;
  contactError: string;
  contactFieldErrors: Partial<
    Record<"firstName" | "lastName" | "email" | "phone", string>
  >;
  contactMessage: string;
  contactForm: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    birthDate: string;
    marketingConsent: boolean;
  };
  setContactForm: React.Dispatch<React.SetStateAction<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    birthDate: string;
    marketingConsent: boolean;
  }>>;
  handlePhoneBlur: () => void;
  saveContact: () => void;
  savingContact: boolean;
  clearContactFieldErrors: (
    ...fields: Array<"firstName" | "lastName" | "email" | "phone">
  ) => void;
  setFieldRef: (
    field: "firstName" | "lastName" | "email" | "phone",
  ) => (element: HTMLElement | null) => void;
}

export function ProfileEditor({
  isRegistering,
  contactError,
  contactFieldErrors,
  contactMessage,
  contactForm,
  setContactForm,
  handlePhoneBlur,
  saveContact,
  savingContact,
  clearContactFieldErrors,
  setFieldRef,
}: ProfileEditorProps) {
  return (
    <div id={isRegistering ? "registrazione" : "modifica"} className="panel hash-scroll-target rounded-[2rem] p-5">
      <div className="space-y-2">
        <p className="eyebrow">{isRegistering ? "Registrazione ciurma" : "Modifica profilo"}</p>
        <h2 className="text-xl font-semibold text-white">
          {isRegistering ? "Crea il tuo profilo Tortuga." : "Aggiorna i tuoi dati."}
        </h2>
        <p className="text-sm leading-6 text-[var(--text-muted)]">
          Inserisci i dati principali: useremo la tua email per riconoscerti
          quando torni a bordo.
        </p>
      </div>

      {contactError ? (
        <div className="mt-4 rounded-[1.4rem] border border-[rgba(240,139,117,0.22)] bg-[rgba(240,139,117,0.08)] px-4 py-3 text-sm leading-6 text-[var(--danger)]">
          {contactError}
        </div>
      ) : null}

      {contactMessage ? (
        <div className="mt-4 rounded-[1.4rem] border border-[rgba(216,176,106,0.14)] bg-[rgba(216,176,106,0.08)] px-4 py-3 text-sm leading-6 text-[var(--accent-strong)]">
          {contactMessage}
        </div>
      ) : null}

      <div className="mt-6 grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            ref={setFieldRef("firstName")}
            label="Nome"
            error={contactFieldErrors.firstName}
            value={contactForm.firstName}
            onChange={(event) => {
              clearContactFieldErrors("firstName");
              setContactForm((current) => ({
                ...current,
                firstName: event.target.value,
              }));
            }}
          />
          <Input
            ref={setFieldRef("lastName")}
            label="Cognome"
            error={contactFieldErrors.lastName}
            value={contactForm.lastName}
            onChange={(event) => {
              clearContactFieldErrors("lastName");
              setContactForm((current) => ({
                ...current,
                lastName: event.target.value,
              }));
            }}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            ref={setFieldRef("email")}
            label="Email"
            type="email"
            error={contactFieldErrors.email}
            value={contactForm.email}
            onChange={(event) => {
              clearContactFieldErrors("email");
              setContactForm((current) => ({
                ...current,
                email: event.target.value,
              }));
            }}
          />
          <div className="flex w-full flex-col gap-2">
            <label className="eyebrow ml-3">Telefono</label>
            <div className="relative flex items-center">
              <span className="absolute left-4 text-sm font-semibold text-[var(--accent-strong)]">
                +39
              </span>
              <input
                ref={setFieldRef("phone")}
                className={`field pl-14 ${contactFieldErrors.phone ? "border-red-500 focus:border-red-500" : ""}`}
                type="tel"
                value={contactForm.phone}
                onChange={(event) => {
                  clearContactFieldErrors("phone");
                  const nationalNumber = event.target.value.replace(/\D/g, "");
                  setContactForm((current) => ({
                    ...current,
                    phone: nationalNumber,
                  }));
                }}
                onBlur={handlePhoneBlur}
              />
            </div>
            {contactFieldErrors.phone ? (
              <span className="pl-4 text-xs font-semibold text-red-400">
                {contactFieldErrors.phone}
              </span>
            ) : null}
          </div>
        </div>

        <Input
          label="Data di nascita"
          type="date"
          value={contactForm.birthDate}
          onChange={(event) =>
            setContactForm((current) => ({
              ...current,
              birthDate: event.target.value,
            }))
          }
        />

        <label className="flex items-start gap-3 rounded-[1.4rem] border border-[rgba(171,128,63,0.16)] bg-white/4 px-4 py-3 text-sm text-[var(--text-muted)] mt-2">
          <input
            type="checkbox"
            checked={contactForm.marketingConsent}
            onChange={(event) =>
              setContactForm((current) => ({
                ...current,
                marketingConsent: event.target.checked,
              }))
            }
          />
          <span>Accetto comunicazioni marketing future di Tortuga.</span>
        </label>

        <Button
          className="w-full mt-2"
          onClick={() => {
            triggerHaptic();
            void saveContact();
          }}
          isLoading={savingContact}
        >
          {savingContact ? "Salvataggio..." : isRegistering ? "Completa registrazione" : "Salva modifiche"}
        </Button>
      </div>
    </div>
  );
}
