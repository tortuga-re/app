"use client";

import { useEffect, useRef, useState } from "react";
import type { LiveTvItem } from "@/lib/live-tv/types";

const CACHE_NAME = "tortuga-live-tv-media-v1";

// Track in-flight SSD cache downloads to avoid duplicate parallel fetches
const inFlightDownloads = new Set<string>();

/**
 * Hook useLiveTvMediaCache
 * 
 * Memorizza i file multimediali (video e immagini) ESCLUSIVAMENTE su disco SSD
 * tramite la CacheStorage API del browser e il Service Worker.
 *
 * ZERO MEMORY LEAK:
 * - NON crea Blob URL in memoria RAM.
 * - NON accumula ArrayBuffer nel processo Javascript.
 * - Il browser legge i file direttamente dal disco SSD
 *   in streaming a blocchi, mantenendo l'impronta RAM a livelli minimi anche dopo giorni.
 */
export function useLiveTvMediaCache(
  items: LiveTvItem[] = [],
  lastUpdateId?: number | string
) {
  const [cacheStatus, setCacheStatus] = useState<{
    total: number;
    cached: number;
    isFullyCached: boolean;
  }>({ total: 0, cached: 0, isFullyCached: false });

  const activeMediaUrls = useRef<Set<string>>(new Set());

  // Derive a stable string key from enabled media URLs so the effect only runs when URLs actually change
  const mediaUrlsKey = (items || [])
    .filter((item) => item.enabled && Boolean(item.mediaUrl?.trim()))
    .map((item) => item.mediaUrl!.trim())
    .sort()
    .join("|");

  useEffect(() => {
    let isCancelled = false;

    const urls = mediaUrlsKey ? mediaUrlsKey.split("|").filter(Boolean) : [];
    activeMediaUrls.current = new Set(urls);

    if (urls.length === 0) {
      setCacheStatus((prev) =>
        prev.total === 0 && prev.isFullyCached
          ? prev
          : { total: 0, cached: 0, isFullyCached: true }
      );
      return;
    }

    // Assicura la presenza su SSD tramite CacheStorage in background
    let mounted = true;
    (async () => {
      if (typeof window === "undefined" || !("caches" in window)) {
        setCacheStatus((prev) =>
          prev.total === urls.length && prev.isFullyCached
            ? prev
            : { total: urls.length, cached: urls.length, isFullyCached: true }
        );
        return;
      }

      try {
        const cache = await caches.open(CACHE_NAME);
        let readyCount = 0;

        for (const url of urls) {
          if (!mounted || isCancelled) break;

          try {
            const match = await cache.match(url);
            if (match && match.ok) {
              readyCount++;
            } else if (!inFlightDownloads.has(url)) {
              inFlightDownloads.add(url);
              // Scarica e archivia direttamente su SSD (senza blob in RAM)
              fetch(url, { mode: "cors", credentials: "same-origin" })
                .then(async (res) => {
                  if (res.ok) {
                    await cache.put(url, res);
                    if (mounted && !isCancelled) {
                      setCacheStatus((prev) => ({
                        ...prev,
                        cached: Math.min(prev.total, prev.cached + 1),
                        isFullyCached: prev.cached + 1 >= prev.total,
                      }));
                    }
                  }
                })
                .catch(() => undefined)
                .finally(() => inFlightDownloads.delete(url));
            }
          } catch {
            // Ignora eventuali eccezioni e procedi
          }
        }

        if (mounted && !isCancelled) {
          setCacheStatus((prev) => {
            const isFull = readyCount >= urls.length;
            if (
              prev.total === urls.length &&
              prev.cached === readyCount &&
              prev.isFullyCached === isFull
            ) {
              return prev;
            }
            return {
              total: urls.length,
              cached: readyCount,
              isFullyCached: isFull,
            };
          });
        }
      } catch (err) {
        console.warn("[LiveTvMediaCache] CacheStorage error:", err);
      }
    })();

    return () => {
      isCancelled = true;
      mounted = false;
    };
  }, [mediaUrlsKey, lastUpdateId]);

  return {
    // Restituisce l'URL canonico originale: il Service Worker intercetta la richiesta
    // e la serve direttamente da SSD / CacheStorage
    getCachedUrl: (url?: string | null) => (url ? url.trim() : null),
    cacheStatus,
  };
}

