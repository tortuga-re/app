import "server-only";

import { coopertoConfig } from "@/lib/config";

const coopertoGet = async <T>(
  path: string,
  query: Record<string, string>,
): Promise<T | null> => {
  const url = new URL(path, coopertoConfig.apiBaseUrl);
  for (const [k, v] of Object.entries(query)) {
    if (v) url.searchParams.set(k, v);
  }

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${coopertoConfig.apiKey}` },
    cache: "no-store",
  });

  if (response.status === 404) return null;

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(body || `Cooperto ${response.status} su ${path}`);
  }

  const text = await response.text();
  return text ? (JSON.parse(text) as T) : null;
};

const coopertoPost = async <T>(path: string, body: unknown): Promise<T> => {
  const url = new URL(path, coopertoConfig.apiBaseUrl);

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${coopertoConfig.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Cooperto ${response.status} su ${path}`);
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
};

export type CouponVerifyResult =
  | { status: "valid"; couponName: string | null; contactName: string | null; couponCode: string }
  | { status: "already_used"; usedAt: string | null; couponCode: string }
  | { status: "expired"; expiredAt: string | null; couponCode: string }
  | { status: "not_found"; couponCode: string }
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
  Descrizione?: string;
  Nome?: string;
}

/**
 * Estrae il CodiceCouponContatto dal testo scansionato.
 * Gestisce sia codici puri che URL contenenti il codice come query param o path segment.
 */
const extractCouponCode = (scanned: string): string => {
  const trimmed = scanned.trim();

  // Prova a interpretarlo come URL
  try {
    const url = new URL(trimmed);
    // Cerca nei query params: ?codiceCouponContatto=... o ?codice=... o ?code=...
    for (const key of ["codiceCouponContatto", "codice", "code", "coupon", "c"]) {
      const val = url.searchParams.get(key);
      if (val?.trim()) return val.trim();
    }
    // Ultimo segmento del path
    const segments = url.pathname.split("/").filter(Boolean);
    const last = segments[segments.length - 1];
    if (last && last.length > 4) return last;
  } catch {
    // Non è un URL, usa il testo as-is
  }

  return trimmed;
};

/**
 * Verifica un coupon e lo marca come utilizzato se valido.
 */
export const verifyAndUseCoupon = async (
  rawCode: string,
): Promise<CouponVerifyResult> => {
  const code = extractCouponCode(rawCode);

  if (!code) {
    return { status: "not_found", couponCode: rawCode };
  }

  try {
    // Recupera dettaglio coupon
    const coupon = await coopertoGet<CoopertoRawCoupon>(
      "/api/Contatti/VerificaCouponContatto",
      { codiceCouponContatto: code },
    );

    if (!coupon) {
      return { status: "not_found", couponCode: code };
    }

    // Già utilizzato
    if (coupon.Utilizzato || coupon.DataUtilizzo) {
      return { status: "already_used", usedAt: coupon.DataUtilizzo ?? null, couponCode: code };
    }

    // Scaduto
    if (coupon.DataScadenza) {
      const exp = Date.parse(coupon.DataScadenza);
      if (!Number.isNaN(exp) && exp < Date.now()) {
        return { status: "expired", expiredAt: coupon.DataScadenza, couponCode: code };
      }
    }

    // Marca come utilizzato
    await coopertoPost<unknown>("/api/Contatti/UtilizzaCouponContatto", {
      CodiceCouponContatto: code,
      CodiceSede: coopertoConfig.sedeCode,
    });

    const couponName =
      coupon.NomeCoupon ??
      coupon.DescrizioneCoupon ??
      coupon.Descrizione ??
      coupon.Nome ??
      null;

    const contactName =
      [coupon.NomeContatto, coupon.CognomeContatto].filter(Boolean).join(" ").trim() || null;

    return { status: "valid", coupon: coupon as CoopertoRawCoupon, contactName, couponCode: code } as CouponVerifyResult & { coupon: CoopertoRawCoupon };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore verifica coupon.";
    console.error("[verifyAndUseCoupon] Errore:", { code, message });
    return { status: "error", message };
  }
};
