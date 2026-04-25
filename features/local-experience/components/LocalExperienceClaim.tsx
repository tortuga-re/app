"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { StatusBlock } from "@/components/status-block";
import { requestJson } from "@/lib/client";
import { localExperiencePublicConfig, storageKeys } from "@/lib/config";
import {
  isValidCustomerEmail,
  normalizeCustomerEmail,
  useCustomerIdentity,
} from "@/lib/customer-identity";
import type {
  LocalExperienceClaimResponse,
  LocalExperienceClaimStatus,
} from "@/lib/local-experience/types";

type ClaimPhase = "idle" | "claiming" | "ready";

const getRomeDateKey = () => {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = Object.fromEntries(
    formatter
      .formatToParts(new Date())
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${parts.year}-${parts.month}-${parts.day}`;
};

const getClaimKey = (email: string, token: string) =>
  `${getRomeDateKey()}|${normalizeCustomerEmail(email)}|${token.trim()}`;

const readClaimedKeys = () => {
  if (typeof window === "undefined") {
    return new Set<string>();
  }

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(storageKeys.localExperienceClaims) ?? "[]",
    ) as string[];

    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set<string>();
  }
};

const rememberClaim = (email: string, token: string) => {
  if (typeof window === "undefined") {
    return;
  }

  const keys = readClaimedKeys();
  keys.add(getClaimKey(email, token));
  window.localStorage.setItem(
    storageKeys.localExperienceClaims,
    JSON.stringify(Array.from(keys).slice(-40)),
  );
};

const hasLocalClaimToday = (email: string, token: string) =>
  readClaimedKeys().has(getClaimKey(email, token));

function PromoCard({
  response,
}: {
  response: LocalExperienceClaimResponse;
}) {
  const promo = response.promo;

  if (!promo) {
    return null;
  }

  const title =
    response.status === "already_registered"
      ? localExperiencePublicConfig.promo.alreadyClaimed
      : promo.title;
  const microcopy =
    response.status === "cooperto_error"
      ? localExperiencePublicConfig.promo.coopertoError
      : response.status === "already_registered"
        ? `${promo.benefit} valido oggi.`
        : promo.microcopy;

  return (
    <div className="panel rounded-[2rem] border-[rgba(216,176,106,0.28)] p-5">
      <p className="eyebrow">Esperienza sbloccata</p>
      <h1 className="mt-3 text-3xl font-semibold leading-tight text-white">
        {title}
      </h1>
      <div className="mt-5 rounded-[1.5rem] border border-[rgba(255,216,156,0.16)] bg-[rgba(216,176,106,0.08)] px-4 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--accent-strong)]">
          Promo locale
        </p>
        <p className="mt-2 text-3xl font-semibold text-white">{promo.benefit}</p>
        <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
          {promo.instructions}
        </p>
      </div>
      <p className="mt-4 text-sm leading-6 text-[var(--accent-strong)]">
        {microcopy}
      </p>

      <div className="mt-5 grid gap-3">
        <Link
          href="/game/sfida-capitano"
          className="button-primary inline-flex min-h-12 items-center justify-center px-5 text-sm"
        >
          Apri Sfida il Capitano
        </Link>
        <Link
          href="/ciurma"
          className="button-secondary inline-flex min-h-12 items-center justify-center px-5 text-sm"
        >
          Torna alla Ciurma
        </Link>
      </div>
    </div>
  );
}

function TokenMissingBlock() {
  return (
    <StatusBlock
      variant="info"
      title="Scansiona il QR a bordo"
      description="Questa esperienza si apre dal QR interno Tortuga: senza quel passaggio non si sblocca nessuna promo."
      action={
        <Link
          href="/ciurma"
          className="button-secondary inline-flex min-h-11 items-center justify-center px-5 text-sm"
        >
          Torna alla Ciurma
        </Link>
      }
    />
  );
}

function LoginRequiredBlock() {
  return (
    <StatusBlock
      variant="info"
      title="Prima arruolati nella ciurma"
      description="Prima arruolati nella ciurma: accedi con la tua email per sbloccare le esperienze a bordo."
      action={
        <Link
          href="/ciurma"
          className="button-primary inline-flex min-h-11 items-center justify-center px-5 text-sm"
        >
          Accedi / Cambia profilo
        </Link>
      }
    />
  );
}

function InvalidTokenBlock() {
  return (
    <StatusBlock
      variant="empty"
      title="Questo passaggio non apre nessuna rotta."
      description="La promo locale resta chiusa: serve il QR interno Tortuga corretto."
      action={
        <Link
          href="/ciurma"
          className="button-secondary inline-flex min-h-11 items-center justify-center px-5 text-sm"
        >
          Torna alla Ciurma
        </Link>
      }
    />
  );
}

export function LocalExperienceClaim({ token = "" }: { token?: string }) {
  const { identity } = useCustomerIdentity();
  const email = normalizeCustomerEmail(identity.email);
  const hasToken = Boolean(token.trim());
  const isLoggedIn = isValidCustomerEmail(email);
  const [phase, setPhase] = useState<ClaimPhase>("idle");
  const [response, setResponse] = useState<LocalExperienceClaimResponse | null>(
    null,
  );

  const canClaim = hasToken && isLoggedIn;
  const title = useMemo(
    () =>
      response?.status === "claimed" || response?.status === "already_registered"
        ? "Bottino locale"
        : "Esperienze solo in locale",
    [response?.status],
  );

  useEffect(() => {
    if (!canClaim || phase !== "idle") {
      return;
    }

    let cancelled = false;
    const locallyClaimed = hasLocalClaimToday(email, token);

    const claim = async () => {
      setPhase("claiming");

      try {
        const result = await requestJson<LocalExperienceClaimResponse>(
          "/api/local-experience/claim",
          {
            method: "POST",
            body: JSON.stringify({
              token,
              email,
            }),
          },
        );

        if (cancelled) {
          return;
        }

        const status: LocalExperienceClaimStatus =
          result.status === "claimed" && locallyClaimed
            ? "already_registered"
            : result.status;

        if (result.status === "claimed") {
          rememberClaim(email, token);
        }

        setResponse({
          ...result,
          status,
        });
      } catch {
        if (!cancelled) {
          setResponse({
            status: "cooperto_error",
            promo: null,
          });
        }
      } finally {
        if (!cancelled) {
          setPhase("ready");
        }
      }
    };

    void claim();

    return () => {
      cancelled = true;
    };
  }, [canClaim, email, phase, token]);

  return (
    <section className="space-y-5">
      <div className="panel rounded-[2rem] p-5">
        <p className="eyebrow">Tortuga Bay</p>
        <h1 className="mt-3 text-3xl font-semibold uppercase leading-tight tracking-[0.08em] text-white">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
          {localExperiencePublicConfig.description}
        </p>
      </div>

      {!hasToken ? <TokenMissingBlock /> : null}
      {hasToken && !isLoggedIn ? <LoginRequiredBlock /> : null}

      {canClaim && phase === "claiming" ? (
        <StatusBlock
          variant="loading"
          title="Controllo il QR di bordo"
          description="Verifico il passaggio e registro la visita sulla tua ciurma."
        />
      ) : null}

      {response?.status === "invalid_token" ? <InvalidTokenBlock /> : null}

      {response?.status === "not_identified" ? <LoginRequiredBlock /> : null}

      {response?.status === "cooperto_error" && !response.promo ? (
        <StatusBlock
          variant="error"
          title="Passaggio non completato"
          description={localExperiencePublicConfig.promo.coopertoError}
          action={
            <Link
              href="/ciurma"
              className="button-secondary inline-flex min-h-11 items-center justify-center px-5 text-sm"
            >
              Torna alla Ciurma
            </Link>
          }
        />
      ) : null}

      {response?.promo ? <PromoCard response={response} /> : null}
    </section>
  );
}
