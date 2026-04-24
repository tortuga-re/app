"use client";

import { siteConfig } from "@/lib/config";

const localReferralHostnames = new Set(["0.0.0.0", "localhost", "127.0.0.1", "::1"]);

const getShareableReferralUrl = (referralUrl: string) => {
  try {
    const url = new URL(referralUrl, siteConfig.productionUrl);

    if (localReferralHostnames.has(url.hostname)) {
      const publicUrl = new URL(siteConfig.productionUrl);
      url.protocol = publicUrl.protocol;
      url.host = publicUrl.host;
    }

    return url.toString();
  } catch {
    return referralUrl;
  }
};

const buildWhatsappHref = (referralUrl: string) => {
  const message = [
    "Ti sfido alla Sfida del Capitano",
    "Apri il link, prova i tuoi riflessi e vediamo chi e piu veloce:",
    referralUrl,
  ].join("\n");

  return `https://wa.me/?text=${encodeURIComponent(message)}`;
};

export function ReferralLifeCard({
  referralUrl,
  referralLoading,
  onCreateReferral,
  variant = "life",
}: {
  referralUrl: string;
  referralLoading: boolean;
  onCreateReferral: () => void;
  variant?: "life" | "challenge";
}) {
  const isChallenge = variant === "challenge";
  const shareableReferralUrl = getShareableReferralUrl(referralUrl);

  return (
    <div className="rounded-[1.6rem] border border-[rgba(255,216,156,0.14)] bg-[rgba(255,255,255,0.04)] px-4 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--accent-strong)]">
        {isChallenge ? "Sfida un amico" : "Vuoi un'altra vita?"}
      </p>
      <h3 className="mt-2 text-xl font-semibold text-white">
        {isChallenge ? "Arruola un pirata." : "Arruola un pirata."}
      </h3>
      <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
        Manda il link a un amico. Quando apre la sfida, ti torna una vita.
      </p>

      {referralUrl ? (
        <div className="mt-4 space-y-3">
          <a
            href={buildWhatsappHref(shareableReferralUrl)}
            target="_blank"
            rel="noreferrer"
            className="button-primary inline-flex min-h-12 w-full items-center justify-center px-5 text-sm"
          >
            Condividi su WhatsApp
          </a>
          <p className="break-all rounded-[1.2rem] border border-[rgba(255,216,156,0.1)] bg-black/15 px-3 py-3 text-xs leading-5 text-[var(--text-muted)]">
            {shareableReferralUrl}
          </p>
        </div>
      ) : (
        <button
          type="button"
          className="button-primary mt-4 inline-flex min-h-12 w-full items-center justify-center px-5 text-sm"
          onClick={onCreateReferral}
          disabled={referralLoading}
        >
          {referralLoading ? "Preparo il link..." : "Arruola un pirata"}
        </button>
      )}
    </div>
  );
}
