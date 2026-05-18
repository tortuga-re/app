import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { triggerHaptic } from "@/lib/haptics";

export interface ProfileEditorProps {
  isRegistering: boolean;
  contactError: string;
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
}

export function ProfileEditor({
  isRegistering,
  contactError,
  contactMessage,
  contactForm,
  setContactForm,
  handlePhoneBlur,
  saveContact,
  savingContact,
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
            label="Nome"
            value={contactForm.firstName}
            onChange={(event) =>
              setContactForm((current) => ({
                ...current,
                firstName: event.target.value,
              }))
            }
          />
          <Input
            label="Cognome"
            value={contactForm.lastName}
            onChange={(event) =>
              setContactForm((current) => ({
                ...current,
                lastName: event.target.value,
              }))
            }
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Email"
            type="email"
            value={contactForm.email}
            onChange={(event) =>
              setContactForm((current) => ({
                ...current,
                email: event.target.value,
              }))
            }
          />
          <div className="flex w-full flex-col gap-2">
            <label className="eyebrow ml-3">Telefono</label>
            <div className="relative flex items-center">
              <span className="absolute left-4 text-sm font-semibold text-[var(--accent-strong)]">
                +39
              </span>
              <input
                className="field pl-14"
                type="tel"
                value={contactForm.phone.replace(/^\+39/, "")}
                onChange={(event) =>
                  setContactForm((current) => ({
                    ...current,
                    phone: "+39" + event.target.value.replace(/\D/g, ""),
                  }))
                }
                onBlur={handlePhoneBlur}
              />
            </div>
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
