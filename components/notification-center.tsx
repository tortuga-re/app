"use client";

import Link from "next/link";
import { Award, Bell, CalendarDays, ChevronRight, Gamepad2, Gift, Shield, Trophy, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useCurrentCustomerStatus } from "@/components/customer-status-context";
import { useDemoScenario } from "@/components/demo-scenario-provider";
import { sortActiveCoupons } from "@/lib/customer-profile";
import type { LiveGameState } from "@/lib/live-game";
import { getActiveRank, tortugaRanks } from "@/lib/loyalty-ranks";
import { missions } from "@/lib/missions";

type Notice = { id: string; title: string; description: string; href: string; Icon: typeof Bell };
type ReadNoticesByOwner = Record<string, string[]>;

const readStoredNotices = (): ReadNoticesByOwner => {
  if (typeof window === "undefined") return {};

  try {
    const stored = JSON.parse(localStorage.getItem("tortuga:read-notices") ?? "{}");
    if (!stored || typeof stored !== "object" || Array.isArray(stored)) return {};
    return Object.fromEntries(
      Object.entries(stored).flatMap(([owner, ids]) =>
        Array.isArray(ids)
          ? [[owner, ids.filter((id): id is string => typeof id === "string")]]
          : [],
      ),
    );
  } catch {
    return {};
  }
};

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [game, setGame] = useState<LiveGameState | null>(null);
  const [readNoticesByOwner, setReadNoticesByOwner] = useState<ReadNoticesByOwner>(readStoredNotices);
  const customer = useCurrentCustomerStatus();
  const { scenario } = useDemoScenario();
  const notificationOwner = scenario.enabled
    ? "demo"
    : customer.profile?.contact?.CodiceContatto ?? customer.profile?.query ?? "guest";
  const dismissedNoticeIds = readNoticesByOwner[notificationOwner] ?? [];

  const refreshLiveGame = useCallback(() => {
    return fetch("/api/live-game")
      .then((response) => response.ok ? response.json() : null)
      .then((body) => setGame(body?.game ?? null))
      .catch(() => setGame(null));
  }, []);

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refreshLiveGame();
    };

    refreshWhenVisible();
    const interval = window.setInterval(refreshWhenVisible, 60_000);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [refreshLiveGame]);

  const notices = useMemo<Notice[]>(() => {
    const result: Notice[] = [];
    const loggedIn = scenario.enabled ? scenario.loggedIn : customer.hasProfile;
    const activeCoupons = scenario.enabled
      ? (scenario.hasCoupon ? [{ CodiceCoupon: "DEMO" }] : [])
      : sortActiveCoupons(customer.profile?.coupons ?? []);
    const hasCoupon = activeCoupons.length > 0;
    const reservation = scenario.enabled ? scenario.hasReservation : Boolean(customer.profile?.upcomingReservations?.length);
    const hasCard = scenario.enabled ? scenario.visits > 0 : Boolean(customer.profile?.fidelityCards?.length || customer.profile?.contact?.CodiceCard || customer.profile?.contact?.CodiceCardAssegnata);
    const visits = scenario.enabled ? scenario.visits : customer.visits;
    const points = scenario.enabled ? Math.max(scenario.points, scenario.highestPoints) : customer.points;
    const rank = getActiveRank(
      visits,
      points,
      scenario.enabled ? scenario.historicalRank : undefined,
      scenario.enabled ? scenario.maintained : true,
    );
    const legendNickname = scenario.enabled
      ? (typeof window === "undefined" ? null : sessionStorage.getItem("demo_legend_nickname"))
      : customer.profile?.legendNickname;
    const hasReachedRank = loggedIn && hasCard && visits >= tortugaRanks[0].visits;
    const unlockedAchievements = !scenario.enabled && customer.profile
      ? new Set([
        ...customer.profile.achievementViews?.filter((achievement) => achievement.unlocked).map((achievement) => achievement.id) ?? [],
        ...missions.filter((mission) => mission.isUnlocked(customer.profile!)).map((mission) => mission.id),
      ])
      : new Set<string>();
    const activeGame = scenario.enabled ? (scenario.demoLiveGame === "none" ? null : scenario.demoLiveGame) : game?.active_game;
    const couponIds = activeCoupons.map((coupon) => coupon.CodiceCouponContatto ?? coupon.CodiceCoupon ?? coupon.DataCreazione ?? "coupon").sort().join("-");
    const reservationIds = scenario.enabled
      ? "demo"
      : customer.profile?.upcomingReservations?.map((item) => item.reservationCode ?? item.dateTime).sort().join("-") ?? "reservation";
    if (activeGame) result.push({ id: `game-${activeGame}-${scenario.enabled ? scenario.demoLiveGameSession : game?.activated_at ?? "unknown"}`, title: "Gioco live attivo", description: `Le istruzioni per ${activeGame === "kantaquiz" ? "Kantaquiz" : "Cervellone"} sono disponibili.`, href: "/stasera", Icon: Gamepad2 });
    if (hasCoupon) result.push({ id: `coupon-${couponIds}`, title: "Coupon disponibile", description: "Hai un coupon pronto da mostrare al Tortuga.", href: "/ciurma", Icon: Gift });
    if (reservation) result.push({ id: `reservation-${reservationIds}`, title: "Prenotazione confermata", description: "I dettagli della prossima prenotazione sono in Home.", href: "/", Icon: CalendarDays });
    if (loggedIn && !hasCard) result.push({ id: "fidelity", title: "Completa il Passaporto Pirata", description: "Attiva la Fidelity per iniziare ad accumulare Dobloni.", href: "/ciurma#attiva-fidelity", Icon: Shield });
    if (unlockedAchievements.size) result.push({ id: `achievements-${[...unlockedAchievements].sort().join("-")}`, title: unlockedAchievements.size === 1 ? "Impresa sbloccata" : "Imprese sbloccate", description: unlockedAchievements.size === 1 ? "Hai una nuova impresa nella Ciurma." : `Hai ${unlockedAchievements.size} imprese conquistate nella Ciurma.`, href: "/ciurma?tab=achievements", Icon: Trophy });
    if (hasReachedRank) result.push({ id: `rank-${rank.id}`, title: `Rango raggiunto: ${rank.label}`, description: rank.description, href: "/ciurma?tab=ranks", Icon: Award });
    if (hasReachedRank && rank.id === "leggenda" && !legendNickname) result.push({ id: "legend-nickname", title: "Scegli il tuo nickname", description: "Incidi il tuo nome nella Hall of Legends.", href: "/ciurma", Icon: Award });
    return result;
  }, [customer.hasProfile, customer.points, customer.profile, customer.visits, game?.active_game, game?.activated_at, scenario]);

  const visibleNotices = notices.filter((notice) => !dismissedNoticeIds.includes(notice.id));
  const markNoticeAsRead = (noticeId: string) => {
    setReadNoticesByOwner((current) => {
      const currentOwnerNotices = current[notificationOwner] ?? [];
      const nextOwnerNotices = currentOwnerNotices.includes(noticeId)
        ? currentOwnerNotices
        : [...currentOwnerNotices, noticeId];
      const next = { ...current, [notificationOwner]: nextOwnerNotices };
      localStorage.setItem("tortuga:read-notices", JSON.stringify(next));
      return next;
    });
    setOpen(false);
  };
  const openNotifications = () => {
    setOpen(true);
    void refreshLiveGame();
  };

  return <>
    <button type="button" className="header-scan-button relative" onClick={openNotifications} aria-label={`Notifiche${visibleNotices.length ? `: ${visibleNotices.length}` : ""}`}><Bell />{visibleNotices.length ? <span className="pointer-events-none absolute -right-1 -top-1 z-10 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent-strong)] px-1 text-[9px] font-black text-white">{visibleNotices.length}</span> : null}</button>
    {open ? <div className="header-scanner-overlay" role="dialog" aria-modal="true" aria-labelledby="notification-title" onClick={() => setOpen(false)}><div className="header-scanner-card" onClick={(event) => event.stopPropagation()}><header><div><p className="minimal-eyebrow">Centro notifiche</p><h2 id="notification-title">Messaggi di bordo</h2></div><button onClick={() => setOpen(false)} aria-label="Chiudi notifiche"><X /></button></header><div className="mt-4 space-y-2">{visibleNotices.length ? visibleNotices.map(({ id, title, description, href, Icon }) => <Link key={id} href={href} onClick={() => markNoticeAsRead(id)} className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[#f2ebdf] p-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[var(--accent-strong)]"><Icon size={19} /></span><span className="min-w-0 flex-1"><strong className="block text-sm text-[var(--text)]">{title}</strong><small className="mt-1 block text-[11px] leading-relaxed text-[var(--text-muted)]">{description}</small></span><ChevronRight className="text-[var(--accent-strong)]" /></Link>) : <p className="rounded-2xl bg-[#f2ebdf] p-5 text-sm text-[var(--text-muted)]">Nessun nuovo messaggio di bordo.</p>}</div></div></div> : null}
  </>;
}
