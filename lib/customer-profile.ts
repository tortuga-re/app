import type {
  CoopertoContact,
  CoopertoCoupon,
  ProfileResponse,
  UpcomingReservation,
} from "@/lib/cooperto/types";
import type { FidelityRewardProgress } from "@/lib/fidelity-rewards";

const DAY_MS = 1000 * 60 * 60 * 24;

const parseDate = (value?: string) => {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : new Date(timestamp);
};

export const toDateInputValue = (value?: string) => {
  if (!value) {
    return "";
  }

  const directMatch = value.match(/^\d{4}-\d{2}-\d{2}/);
  if (directMatch) {
    return directMatch[0];
  }

  const parsed = parseDate(value);
  return parsed ? parsed.toISOString().slice(0, 10) : "";
};

export const formatBirthDateLabel = (value?: string) => {
  const dateValue = toDateInputValue(value);
  if (!dateValue) {
    return "Non disponibile";
  }

  const [year, month, day] = dateValue.split("-");
  return `${day}/${month}/${year}`;
};

export const formatCouponExpiry = (value?: string) => {
  const parsed = parseDate(value);
  if (!parsed) {
    return "Scadenza non disponibile";
  }

  return new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsed);
};

export const getCouponDisplayCode = (coupon: CoopertoCoupon) =>
  coupon.CodiceCoupon?.trim() ||
  coupon.CodiceCouponContatto?.trim() ||
  "Coupon Tortuga";

export const getCouponQrValue = (coupon: CoopertoCoupon) =>
  coupon.CodiceCouponContatto?.trim() || coupon.CodiceCoupon?.trim() || "";

export const isCouponExpired = (coupon: CoopertoCoupon, now = Date.now()) => {
  if (coupon.Utilizzato || coupon.DataUtilizzo) {
    return true;
  }

  if (!coupon.DataScadenza) {
    return false;
  }

  const expiresAt = Date.parse(coupon.DataScadenza);
  return !Number.isNaN(expiresAt) && expiresAt < now;
};

export const sortActiveCoupons = (coupons: CoopertoCoupon[]) =>
  [...coupons]
    .filter((coupon) => !isCouponExpired(coupon))
    .sort((left, right) => {
      const leftTime = Date.parse(left.DataScadenza ?? "");
      const rightTime = Date.parse(right.DataScadenza ?? "");

      if (Number.isNaN(leftTime) && Number.isNaN(rightTime)) {
        return getCouponDisplayCode(left).localeCompare(getCouponDisplayCode(right));
      }

      if (Number.isNaN(leftTime)) {
        return 1;
      }

      if (Number.isNaN(rightTime)) {
        return -1;
      }

      return leftTime - rightTime;
    });

export const sortExpiredCoupons = (coupons: CoopertoCoupon[]) =>
  [...coupons]
    .filter((coupon) => isCouponExpired(coupon))
    .sort((left, right) => {
      const leftTime = Date.parse(left.DataScadenza ?? left.DataUtilizzo ?? "");
      const rightTime = Date.parse(right.DataScadenza ?? right.DataUtilizzo ?? "");

      if (Number.isNaN(leftTime) && Number.isNaN(rightTime)) {
        return getCouponDisplayCode(left).localeCompare(getCouponDisplayCode(right));
      }

      if (Number.isNaN(leftTime)) {
        return 1;
      }

      if (Number.isNaN(rightTime)) {
        return -1;
      }

      return rightTime - leftTime;
    });

export const getProfilePoints = (profile: ProfileResponse | null) =>
  profile?.points ?? profile?.contact?.SaldoPuntiCard ?? 0;

const normalizeReservationEmail = (value?: string) => value?.trim().toLowerCase() ?? "";

export const getSortedUpcomingReservations = (
  reservations: UpcomingReservation[],
) =>
  [...reservations].sort(
    (left, right) => Date.parse(left.dateTime) - Date.parse(right.dateTime),
  );

export const filterUpcomingReservationsForEmail = (
  reservations: UpcomingReservation[],
  currentUserEmail?: string,
) => {
  const normalizedEmail = normalizeReservationEmail(currentUserEmail);

  if (!normalizedEmail) {
    return [];
  }

  return getSortedUpcomingReservations(
    reservations.filter(
      (reservation) => normalizeReservationEmail(reservation.email) === normalizedEmail,
    ),
  );
};

export const getProfileUpcomingReservations = (
  profile: ProfileResponse | null,
  currentUserEmail?: string,
) =>
  filterUpcomingReservationsForEmail(
    profile?.upcomingReservations ?? [],
    currentUserEmail,
  );

export const getPrimaryUpcomingReservation = (
  profile: ProfileResponse | null,
  currentUserEmail?: string,
) => getProfileUpcomingReservations(profile, currentUserEmail)[0] ?? null;

export type BirthdayInsight = {
  date: Date;
  daysUntil: number;
  label: string;
  isToday: boolean;
};

export const getBirthdayInsight = (
  birthDate?: string,
  windowDays = 30,
  now = new Date(),
): BirthdayInsight | null => {
  const dateValue = toDateInputValue(birthDate);
  if (!dateValue) {
    return null;
  }

  const [, month, day] = dateValue.split("-").map(Number);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const nextBirthday = new Date(today.getFullYear(), month - 1, day);
  nextBirthday.setHours(0, 0, 0, 0);

  if (nextBirthday < today) {
    nextBirthday.setFullYear(today.getFullYear() + 1);
  }

  const daysUntil = Math.round((nextBirthday.getTime() - today.getTime()) / DAY_MS);

  if (daysUntil > windowDays) {
    return null;
  }

  return {
    date: nextBirthday,
    daysUntil,
    label: new Intl.DateTimeFormat("it-IT", {
      day: "numeric",
      month: "long",
    }).format(nextBirthday),
    isToday: daysUntil === 0,
  };
};

export type CustomerRecencyInsight = {
  status: "recent" | "cold" | "vip-inactive";
  label: string;
  description: string;
  daysSinceLastVisit: number;
};

export const getCustomerRecencyInsight = (
  contact: CoopertoContact | null | undefined,
  rewardProgress: FidelityRewardProgress,
  now = new Date(),
): CustomerRecencyInsight | null => {
  const lastVisit = parseDate(contact?.DataUltimaVisita);
  if (!lastVisit) {
    return null;
  }

  const daysSinceLastVisit = Math.max(
    0,
    Math.floor((now.getTime() - lastVisit.getTime()) / DAY_MS),
  );

  if (rewardProgress.isVip && daysSinceLastVisit >= 60) {
    return {
      status: "vip-inactive",
      label: "Cliente VIP inattivo",
      description: "Profilo VIP da riattivare con una nuova serata Tortuga.",
      daysSinceLastVisit,
    };
  }

  if (daysSinceLastVisit <= 30) {
    return {
      status: "recent",
      label: "Cliente attivo recente",
      description: "Ultimo passaggio registrato di recente.",
      daysSinceLastVisit,
    };
  }

  if (daysSinceLastVisit >= 90) {
    return {
      status: "cold",
      label: "Cliente freddo",
      description: "Non risultano visite recenti nel profilo Cooperto.",
      daysSinceLastVisit,
    };
  }

  return null;
};
