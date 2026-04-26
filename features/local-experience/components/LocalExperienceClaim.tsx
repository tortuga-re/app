"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";

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
import { useOnPremiseAccess } from "@/lib/on-premise-access";

type ClaimPhase = "idle" | "claiming" | "ready";
type ScannerPhase = "idle" | "requesting" | "scanning" | "unsupported";
type ScannerEngine = "native" | "html5" | null;
type DetectedBarcode = { rawValue?: string };
type BarcodeDetectorInstance = {
  detect: (source: HTMLVideoElement) => Promise<DetectedBarcode[]>;
};
type BarcodeDetectorConstructor = new (options?: {
  formats?: string[];
}) => BarcodeDetectorInstance;
type Html5QrcodeInstance = {
  start: (
    cameraConfig: { facingMode: string },
    scannerConfig: { fps: number; qrbox: { width: number; height: number } },
    onSuccess: (decodedText: string) => void,
    onError?: () => void,
  ) => Promise<unknown>;
  stop: () => Promise<void>;
  clear: () => void;
};
type Html5QrcodeConstructor = new (
  elementId: string,
  config?: boolean,
) => Html5QrcodeInstance;

const unsupportedCameraMessage =
  "Non riesco ad aprire la fotocamera da questo browser. Apri questa pagina da Safari/Chrome e consenti l'accesso alla fotocamera.";

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

const getBarcodeDetector = () =>
  (window as Window & { BarcodeDetector?: BarcodeDetectorConstructor })
    .BarcodeDetector;

const extractQrToken = (value: string) => {
  const rawValue = value.trim();

  if (!rawValue) {
    return "";
  }

  try {
    const url = new URL(rawValue);
    return (
      url.searchParams.get("token")?.trim() ||
      url.pathname.split("/").filter(Boolean).at(-1)?.trim() ||
      ""
    );
  } catch {
    return rawValue.replace(/^\/+|\/+$/g, "");
  }
};

const isValidQrValue = (value: string) =>
  value.trim() === localExperiencePublicConfig.qrSourceUrl ||
  extractQrToken(value) === localExperiencePublicConfig.qrToken;

const buildPromo = (): NonNullable<LocalExperienceClaimResponse["promo"]> => ({
  title: localExperiencePublicConfig.promo.title,
  benefit: localExperiencePublicConfig.promo.benefit,
  instructions: localExperiencePublicConfig.promo.instructions,
  microcopy: localExperiencePublicConfig.promo.microcopy,
});

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
          href="/ciurma#esperienze-locale"
          className="button-secondary inline-flex min-h-12 items-center justify-center px-5 text-sm"
        >
          Torna alla Ciurma
        </Link>
      </div>
    </div>
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
          href="/ciurma#riconoscimento"
          className="button-primary inline-flex min-h-11 items-center justify-center px-5 text-sm"
        >
          Accedi / Cambia profilo
        </Link>
      }
    />
  );
}

function InvalidQrBlock({ message }: { message: string }) {
  return (
    <StatusBlock
      variant="empty"
      title="Questo QR non apre nessuna rotta."
      description={message}
    />
  );
}

function OnPremiseRequiredBlock() {
  return (
    <StatusBlock
      variant="info"
      title="Esperienza disponibile solo a bordo"
      description="Questa rotta si apre quando entri nell'app dal link Tortuga del locale."
      action={
        <Link
          href="/"
          className="button-primary inline-flex min-h-11 items-center justify-center px-5 text-sm"
        >
          Torna alla Home
        </Link>
      }
    />
  );
}

export function LocalExperienceClaim() {
  const { identity } = useCustomerIdentity();
  const { hasAccess: hasOnPremiseAccess } = useOnPremiseAccess();
  const email = normalizeCustomerEmail(identity.email);
  const isLoggedIn = isValidCustomerEmail(email);
  const scannerReactId = useId();
  const html5ScannerElementId = `local-experience-scanner-${scannerReactId.replace(
    /[^a-zA-Z0-9_-]/g,
    "",
  )}`;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanFrameRef = useRef<number | null>(null);
  const html5QrCodeRef = useRef<Html5QrcodeInstance | null>(null);
  const scanResolvedRef = useRef(false);
  const [claimPhase, setClaimPhase] = useState<ClaimPhase>("idle");
  const [scannerPhase, setScannerPhase] = useState<ScannerPhase>("idle");
  const [scannerEngine, setScannerEngine] = useState<ScannerEngine>(null);
  const [scanError, setScanError] = useState("");
  const [response, setResponse] = useState<LocalExperienceClaimResponse | null>(
    null,
  );

  const stopScanner = useCallback(() => {
    if (scanFrameRef.current !== null) {
      window.cancelAnimationFrame(scanFrameRef.current);
      scanFrameRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    const html5QrCode = html5QrCodeRef.current;
    html5QrCodeRef.current = null;

    if (html5QrCode) {
      void html5QrCode
        .stop()
        .catch(() => undefined)
        .finally(() => {
          try {
            html5QrCode.clear();
          } catch {
            // The scanner may already be cleared by the library.
          }
        });
    }

    setScannerEngine(null);
    setScannerPhase((current) => (current === "scanning" ? "idle" : current));
  }, []);

  const claimScannedQr = useCallback(
    async (rawQrValue: string) => {
      if (!isLoggedIn) {
        return;
      }

      setClaimPhase("claiming");
      setScanError("");
      setResponse(null);

      const claimToken = localExperiencePublicConfig.qrToken;

      if (hasLocalClaimToday(email, claimToken)) {
        setResponse({
          status: "already_registered",
          promo: buildPromo(),
        });
        setClaimPhase("ready");
        return;
      }

      try {
        const result = await requestJson<LocalExperienceClaimResponse>(
          "/api/local-experience/claim",
          {
            method: "POST",
            body: JSON.stringify({
              token: rawQrValue,
              email,
            }),
          },
        );

        const status: LocalExperienceClaimStatus = result.status;

        if (result.status === "claimed") {
          rememberClaim(email, claimToken);
        }

        setResponse({
          ...result,
          status,
        });
      } catch {
        setResponse({
          status: "cooperto_error",
          promo: null,
        });
      } finally {
        setClaimPhase("ready");
      }
    },
    [email, isLoggedIn],
  );

  const handleScannedValue = useCallback(
    (rawValue: string) => {
      if (scanResolvedRef.current) {
        return;
      }

      scanResolvedRef.current = true;
      stopScanner();

      if (!isValidQrValue(rawValue)) {
        setScanError("Questo QR non apre nessuna rotta.");
        setResponse(null);
        return;
      }

      void claimScannedQr(rawValue);
    },
    [claimScannedQr, stopScanner],
  );

  const startNativeScanner = useCallback(
    async (BarcodeDetector: BarcodeDetectorConstructor) => {
      setScannerEngine("native");
      setScannerPhase("requesting");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const detector = new BarcodeDetector({ formats: ["qr_code"] });
      setScannerPhase("scanning");

      const scan = async () => {
        if (!videoRef.current || !streamRef.current || scanResolvedRef.current) {
          return;
        }

        try {
          const barcodes = await detector.detect(videoRef.current);
          const rawValue = barcodes.find((barcode) => barcode.rawValue)?.rawValue;

          if (rawValue) {
            handleScannedValue(rawValue);
            return;
          }
        } catch {
          // A single failed frame should not close the scanner.
        }

        scanFrameRef.current = window.requestAnimationFrame(() => {
          void scan();
        });
      };

      scanFrameRef.current = window.requestAnimationFrame(() => {
        void scan();
      });
    },
    [handleScannedValue],
  );

  const startHtml5Scanner = useCallback(async () => {
    setScannerEngine("html5");
    setScannerPhase("requesting");

    await new Promise((resolve) => {
      window.requestAnimationFrame(resolve);
    });

    const { Html5Qrcode } = (await import("html5-qrcode")) as {
      Html5Qrcode: Html5QrcodeConstructor;
    };
    const html5QrCode = new Html5Qrcode(html5ScannerElementId, false);

    html5QrCodeRef.current = html5QrCode;

    await html5QrCode.start(
      { facingMode: "environment" },
      {
        fps: 10,
        qrbox: { width: 240, height: 240 },
      },
      (decodedText) => {
        handleScannedValue(decodedText);
      },
      () => undefined,
    );

    setScannerPhase("scanning");
  }, [handleScannedValue, html5ScannerElementId]);

  const startScanner = useCallback(async () => {
    setScanError("");
    setResponse(null);
    scanResolvedRef.current = false;

    if (!isLoggedIn) {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setScannerPhase("unsupported");
      setScanError(unsupportedCameraMessage);
      return;
    }

    try {
      const BarcodeDetector = getBarcodeDetector();

      if (BarcodeDetector) {
        await startNativeScanner(BarcodeDetector);
        return;
      }

      await startHtml5Scanner();
    } catch {
      stopScanner();
      setScannerPhase("unsupported");
      setScanError(unsupportedCameraMessage);
    }
  }, [isLoggedIn, startHtml5Scanner, startNativeScanner, stopScanner]);

  useEffect(() => stopScanner, [stopScanner]);

  return (
    <section className="space-y-5">
      <div className="panel rounded-[2rem] p-5">
        <p className="eyebrow">{localExperiencePublicConfig.eyebrow}</p>
        <h1 className="mt-3 text-3xl font-semibold uppercase leading-tight tracking-[0.08em] text-white">
          {localExperiencePublicConfig.title}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
          {localExperiencePublicConfig.description}
        </p>
      </div>

      {!hasOnPremiseAccess ? <OnPremiseRequiredBlock /> : null}

      {hasOnPremiseAccess && !isLoggedIn ? <LoginRequiredBlock /> : null}

      {hasOnPremiseAccess && isLoggedIn && !response?.promo ? (
        <div className="panel rounded-[2rem] p-5">
          <div className="space-y-2">
            <p className="eyebrow">QR Tortuga</p>
            <h2 className="text-xl font-semibold text-white">
              Scansiona QR del locale
            </h2>
            <p className="text-sm leading-6 text-[var(--text-muted)]">
              Punta la fotocamera sul QR Tortuga.
            </p>
          </div>

          <div
            className={
              scannerEngine === "native" &&
              (scannerPhase === "scanning" || scannerPhase === "requesting")
                ? "mt-4 overflow-hidden rounded-[1.5rem] border border-[rgba(255,216,156,0.14)] bg-black"
                : "hidden"
            }
          >
            <video
              ref={videoRef}
              className="aspect-[3/4] w-full object-cover"
              muted
              playsInline
            />
          </div>

          <div
            id={html5ScannerElementId}
            className={
              scannerEngine === "html5" &&
              (scannerPhase === "scanning" || scannerPhase === "requesting")
                ? "mt-4 overflow-hidden rounded-[1.5rem] border border-[rgba(255,216,156,0.14)] bg-black text-white"
                : "hidden"
            }
          />

          <div className="mt-4 grid gap-3">
            {scannerPhase !== "scanning" ? (
              <button
                type="button"
                className="button-primary inline-flex min-h-12 items-center justify-center px-5 text-sm"
                onClick={() => {
                  void startScanner();
                }}
                disabled={claimPhase === "claiming" || scannerPhase === "requesting"}
              >
                {scannerPhase === "requesting"
                  ? "Apro la fotocamera..."
                  : "Scansiona QR del locale"}
              </button>
            ) : (
              <button
                type="button"
                className="button-secondary inline-flex min-h-12 items-center justify-center px-5 text-sm"
                onClick={stopScanner}
              >
                Chiudi fotocamera
              </button>
            )}
          </div>
        </div>
      ) : null}

      {hasOnPremiseAccess && claimPhase === "claiming" ? (
        <StatusBlock
          variant="loading"
          title="Controllo il QR di bordo"
          description="Verifico il passaggio e registro la visita sulla tua ciurma."
        />
      ) : null}

      {hasOnPremiseAccess && scanError ? (
        <InvalidQrBlock message={scanError} />
      ) : null}

      {hasOnPremiseAccess && response?.status === "invalid_token" ? (
        <InvalidQrBlock message="Questo QR non apre nessuna rotta." />
      ) : null}

      {hasOnPremiseAccess && response?.status === "not_identified" ? (
        <LoginRequiredBlock />
      ) : null}

      {hasOnPremiseAccess && response?.status === "cooperto_error" && !response.promo ? (
        <StatusBlock
          variant="error"
          title="Passaggio non completato"
          description={localExperiencePublicConfig.promo.coopertoError}
          action={
            <Link
              href="/ciurma#esperienze-locale"
              className="button-secondary inline-flex min-h-11 items-center justify-center px-5 text-sm"
            >
              Torna alla Ciurma
            </Link>
          }
        />
      ) : null}

      {hasOnPremiseAccess && response?.promo ? (
        <PromoCard response={response} />
      ) : null}
    </section>
  );
}
