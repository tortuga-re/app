import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { triggerHaptic } from "@/lib/haptics";

export interface ProfileLoginProps {
  loginMode: "lookup" | "confirm" | "otp";
  setLoginMode: (mode: "lookup" | "confirm" | "otp") => void;
  lookupEmail: string;
  setLookupEmail: (val: string) => void;
  handleLookupSubmit: () => void;
  loading: boolean;
  startLongPress: () => void;
  cancelLongPress: () => void;
  startRegistration: () => void;
  requestLoginOtp: () => void;
  loginRequest: {
    requestId: string;
    email: string;
    expiresAt: string;
    resendAvailableAt: string;
    attemptsRemaining: number;
  } | null;
  loginExpiresAtLabel: string;
  loginCode: string;
  setLoginCode: (val: string) => void;
  verifyLoginCode: () => void;
  verifyingLogin: boolean;
  resendLoginCode: () => void;
  resendingLogin: boolean;
  loginCanResend: boolean;
  loginResendSeconds: number;
  lookupEmailError: string;
  loginCodeError: string;
  clearLoginFieldErrors: (...fields: Array<"lookupEmail" | "loginCode">) => void;
  setFieldRef: (
    field: "lookupEmail" | "loginCode",
  ) => (element: HTMLElement | null) => void;
}

export function ProfileLogin({
  loginMode,
  setLoginMode,
  lookupEmail,
  setLookupEmail,
  handleLookupSubmit,
  loading,
  startLongPress,
  cancelLongPress,
  startRegistration,
  requestLoginOtp,
  loginRequest,
  loginExpiresAtLabel,
  loginCode,
  setLoginCode,
  verifyLoginCode,
  verifyingLogin,
  resendLoginCode,
  resendingLogin,
  loginCanResend,
  loginResendSeconds,
  lookupEmailError,
  loginCodeError,
  clearLoginFieldErrors,
  setFieldRef,
}: ProfileLoginProps) {
  return (
    <div id="riconoscimento" className="panel hash-scroll-target rounded-[2rem] p-5">
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="eyebrow">Riconoscimento ciurma</p>
          <h2 className="text-xl font-semibold text-white">Rientra a bordo con la tua email.</h2>
          <p className="text-sm leading-6 text-[var(--text-muted)]">
            Recupera subito bottino, coupon e prenotazioni già legate al tuo profilo.
          </p>
        </div>

        {loginMode === "lookup" ? (
          <div className="space-y-3">
            <Input
              ref={setFieldRef("lookupEmail")}
              type="email"
              placeholder="cliente@email.it"
              error={lookupEmailError}
              value={lookupEmail}
              onChange={(event) => {
                clearLoginFieldErrors("lookupEmail");
                setLookupEmail(event.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleLookupSubmit();
              }}
            />
            <Button
              className="w-full"
              onClick={() => {
                triggerHaptic();
                handleLookupSubmit();
              }}
              onTouchStart={startLongPress}
              onTouchEnd={cancelLongPress}
              onMouseDown={startLongPress}
              onMouseUp={cancelLongPress}
              onMouseLeave={cancelLongPress}
              isLoading={loading}
            >
              {loading ? "Recupero la ciurma..." : "Entra nella tua area"}
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => {
                triggerHaptic();
                startRegistration();
              }}
            >
              Registrati
            </Button>
          </div>
        ) : loginMode === "confirm" ? (
          <div className="space-y-4">
            <div className="rounded-[1.4rem] border border-[rgba(216,176,106,0.14)] bg-[rgba(216,176,106,0.08)] px-4 py-3 text-sm leading-6 text-[var(--accent-strong)]">
              Ti invieremo un codice OTP all&apos;email <strong>{lookupEmail}</strong>, verifica la correttezza.
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => {
                  triggerHaptic();
                  setLoginMode("lookup");
                }}
                disabled={loading}
              >
                Modifica
              </Button>
              <Button
                className="w-full"
                onClick={() => {
                  triggerHaptic();
                  void requestLoginOtp();
                }}
                isLoading={loading}
              >
                {loading ? "Invio..." : "Conferma"}
              </Button>
            </div>
          </div>
        ) : loginMode === "otp" && loginRequest ? (
          <div className="space-y-4">
            <div className="rounded-[1.4rem] border border-[rgba(216,176,106,0.14)] bg-[rgba(216,176,106,0.08)] px-4 py-3 text-sm leading-6 text-[var(--accent-strong)]">
              <p>Abbiamo inviato un codice a <strong>{loginRequest.email}</strong>.</p>
              <p className="mt-1 text-xs">Scade alle {loginExpiresAtLabel}.</p>
            </div>
            <Input
              ref={setFieldRef("loginCode")}
              className="text-center text-lg font-semibold tracking-[0.35em]"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="000000"
              error={loginCodeError}
              value={loginCode}
              onChange={(event) => {
                clearLoginFieldErrors("loginCode");
                setLoginCode(event.target.value.replace(/\D/g, "").slice(0, 6));
              }}
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                className="w-full text-xs min-h-[44px]"
                onClick={() => {
                  triggerHaptic();
                  void verifyLoginCode();
                }}
                disabled={verifyingLogin || loginCode.trim().length !== 6}
                isLoading={verifyingLogin}
              >
                {verifyingLogin ? "Verifico..." : "Entra"}
              </Button>
              <Button
                variant="secondary"
                className="w-full text-xs min-h-[44px]"
                onClick={() => {
                  triggerHaptic();
                  void resendLoginCode();
                }}
                disabled={resendingLogin || !loginCanResend}
                isLoading={resendingLogin}
              >
                {resendingLogin
                  ? "Invio..."
                  : loginCanResend
                    ? "Reinvia codice"
                    : `Reinvia tra ${loginResendSeconds}s`}
              </Button>
            </div>
            <p className="text-xs text-center leading-5 text-[var(--text-muted)]">
              Tentativi rimasti: {loginRequest.attemptsRemaining}.
            </p>
            <button
              type="button"
              className="text-xs text-center w-full mt-2 underline text-[var(--text-muted)] hover:text-white"
              onClick={() => {
                setLoginMode("lookup");
              }}
            >
              Cambia email
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
