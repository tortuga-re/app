import "server-only";

import { coopertoConfig } from "@/lib/config";

const coopertoFetchRaw = async <T>(
  path: string,
  init?: RequestInit & { query?: Record<string, string | number | undefined> },
): Promise<T> => {
  const url = new URL(path, coopertoConfig.apiBaseUrl);
  if (init?.query) {
    for (const [key, value] of Object.entries(init.query)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const response = await fetch(url.toString(), {
    ...init,
    headers: {
      Authorization: `Bearer ${coopertoConfig.apiKey}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Cooperto ${response.status}`);
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
};

export type CouponVerifyResult =
  | { status: "valid"; coupon: CoopertoRawCoupon; contactName: string | null }
  | { status: "already_used"; usedAt: string | null }
  | { status: "expired"; expiredAt: string | null }
  | { status: "not_found" }
  | { status: "error"; message: string };

export interface CoopertoRawCoupon {
  CodiceContatto?: string;
  CodiceCouponContatto?: string;
  CodiceCoupon?: string;
  DataCreazione?: string;
  DataScadenza?: string;
  DataUtilizzo?: string;
  Utilizzato?: boolean;
  NomeContatto?: string;
  CognomeContatto?: string;
  NomeCoupon?: string;
  DescrizioneCoupon?: string;
}

/**
 * Verifica un coupon tramite il suo CodiceCouponContatto (dal QR) e lo marca come utilizzato.
 */
export const verifyAndUseCoupon = async (
  codiceCouponContatto: string,
): Promise<CouponVerifyResult> => {
  try {
    // Recupera il dettaglio del coupon
    const coupon = await coopertoFetchRaw<CoopertoRawCoupon>(
      "/api/Contatti/DettaglioCouponContatto",
      { query: { codiceCouponContatto } },
    ).catch(() => null);

    if (!coupon) {
      return { status: "not_found" };
    }

    // Già utilizzato
    if (coupon.Utilizzato || coupon.DataUtilizzo) {
      return { status: "already_used", usedAt: coupon.DataUtilizzo ?? null };
    }

    // Scaduto
    if (coupon.DataScadenza) {
      const exp = Date.parse(coupon.DataScadenza);
      if (!Number.isNaN(exp) && exp < Date.now()) {
        return { status: "expired", expiredAt: coupon.DataScadenza };
      }
    }

    // Marca come utilizzato
    await coopertoFetchRaw<unknown>("/api/Contatti/UsaCoupon", {
      method: "POST",
      body: JSON.stringify({ codiceCouponContatto }),
    });

    const contactName =
      [coupon.NomeContatto, coupon.CognomeContatto].filter(Boolean).join(" ") || null;

    return { status: "valid", coupon, contactName };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Errore verifica coupon.",
    };
  }
};
