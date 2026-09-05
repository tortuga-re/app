"use client";

import { useEffect, useState, useRef } from "react";
import { Heart, Image as ImageIcon, ChevronLeft, ChevronRight, Sparkles, X, Maximize2 } from "lucide-react";

type EveningPhoto = {
  id: string;
  mediaUrl: string;
  createdAt: string;
  likesCount: number;
  likedByDevices: string[];
};

function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem("tortuga_device_id");
    if (!id) {
      id = "dev_" + Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem("tortuga_device_id", id);
    }
    return id;
  } catch {
    return "dev_fallback_" + Date.now();
  }
}

export function LivePhotosCarousel() {
  const [photos, setPhotos] = useState<EveningPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [deviceId, setDeviceId] = useState("");
  const [likingId, setLikingId] = useState<string | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDeviceId(getOrCreateDeviceId());
  }, []);

  const fetchPhotos = async () => {
    try {
      const res = await fetch("/api/live-tv/customer-photos");
      if (res.ok) {
        const data = await res.json();
        setPhotos(data.photos || []);
      }
    } catch (err) {
      console.error("Errore lettura carosello foto:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchPhotos();
    const interval = setInterval(() => {
      void fetchPhotos();
    }, 15000); // refresh every 15s

    return () => clearInterval(interval);
  }, []);

  // Keyboard navigation for lightbox modal
  useEffect(() => {
    if (selectedPhotoIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedPhotoIndex(null);
      } else if (e.key === "ArrowLeft") {
        setSelectedPhotoIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
      } else if (e.key === "ArrowRight") {
        setSelectedPhotoIndex((prev) => (prev !== null && prev < photos.length - 1 ? prev + 1 : prev));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedPhotoIndex, photos.length]);

  const handleLike = async (photoId: string) => {
    if (!deviceId || likingId) return;

    // Optimistic UI update
    setPhotos((prev) =>
      prev.map((p) => {
        if (p.id === photoId) {
          const already = p.likedByDevices?.includes(deviceId);
          if (already) return p;
          return {
            ...p,
            likesCount: p.likesCount + 1,
            likedByDevices: [...(p.likedByDevices || []), deviceId],
          };
        }
        return p;
      })
    );

    setLikingId(photoId);

    try {
      await fetch("/api/live-tv/customer-photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId, deviceId }),
      });
    } catch (err) {
      console.error("Errore salvataggio like:", err);
    } finally {
      setLikingId(null);
    }
  };

  const handleMediaError = (photoId: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    setSelectedPhotoIndex((prevIndex) => {
      if (prevIndex === null) return null;
      const currentPhoto = photos[prevIndex];
      if (currentPhoto && currentPhoto.id === photoId) {
        return null;
      }
      return prevIndex;
    });
  };

  const scrollCarousel = (direction: "left" | "right") => {
    if (!carouselRef.current) return;
    const amount = direction === "left" ? -280 : 280;
    carouselRef.current.scrollBy({ left: amount, behavior: "smooth" });
  };

  if (loading && photos.length === 0) {
    return (
      <div className="loyalty-summary p-6 text-center text-[var(--text-muted)] text-sm">
        <div className="animate-spin inline-block w-5 h-5 border-2 border-current border-t-transparent text-[var(--accent)] rounded-full mb-2" />
        <p>Caricamento scatti della serata...</p>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="loyalty-summary p-5 text-center text-[var(--text-muted)] space-y-1.5 border border-dashed border-[rgba(40,35,28,.2)]">
        <ImageIcon className="mx-auto text-[var(--accent-strong)]/60" size={24} />
        <p className="font-bold text-xs text-[var(--text)]">Carosello Foto Serata</p>
        <p className="text-[11px] text-[var(--text-muted)]">
          Nessuna foto inviata stasera. Invia la prima foto col form qui sopra per andare in onda e finire nel carosello! (Attivo dalle 12:00 alle 02:00)
        </p>
      </div>
    );
  }

  return (
    <section className="loyalty-summary space-y-3.5 my-4">
      {/* Header Carosello */}
      <div className="flex items-center justify-between border-b border-[rgba(40,35,28,.12)] pb-2.5">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-[#c59a47]" />
          <div>
            <p className="minimal-eyebrow">Galleria Live</p>
            <h2 className="tonight-section-title">Foto della Serata ({photos.length})</h2>
          </div>
        </div>

        {/* Carousel arrows for desktop / smooth navigation */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => scrollCarousel("left")}
            className="p-1.5 rounded-full bg-[#f3ecdf] hover:bg-[#e7dfcf] border border-[rgba(40,35,28,.1)] text-[var(--text)] transition-colors cursor-pointer"
            title="Precedente"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => scrollCarousel("right")}
            className="p-1.5 rounded-full bg-[#f3ecdf] hover:bg-[#e7dfcf] border border-[rgba(40,35,28,.1)] text-[var(--text)] transition-colors cursor-pointer"
            title="Successivo"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Carosello orizzontale */}
      <div
        ref={carouselRef}
        className="flex gap-3 overflow-x-auto pb-2 pt-1 snap-x snap-mandatory scrollbar-none"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {photos.map((photo, index) => {
          const isLiked = deviceId ? photo.likedByDevices?.includes(deviceId) : false;
          const formattedTime = new Date(photo.createdAt).toLocaleTimeString("it-IT", {
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <div
              key={photo.id}
              className="snap-start shrink-0 w-60 sm:w-64 rounded-2xl bg-[#1a1612] border border-[#c59a47]/30 overflow-hidden shadow-md flex flex-col justify-between group cursor-pointer"
              onClick={() => setSelectedPhotoIndex(index)}
            >
              {/* Contenitore Immagine */}
              <div className="relative aspect-4/3 bg-black overflow-hidden flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.mediaUrl}
                  alt="Scatto live serata"
                  onError={() => handleMediaError(photo.id)}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-bold text-white/90">
                  {formattedTime}
                </span>

                {/* Overlay al passaggio o tap per ingrandire */}
                <div className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 backdrop-blur-md text-white/80 opacity-80 group-hover:opacity-100 transition-opacity">
                  <Maximize2 size={13} />
                </div>
              </div>

              {/* Barra delle azioni / Like */}
              <div
                className="p-3 bg-[#120f0c] flex items-center justify-between gap-2 border-t border-[#c59a47]/20"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="text-[11px] text-white/70 font-semibold">
                  {photo.likesCount} {photo.likesCount === 1 ? "like" : "like"}
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleLike(photo.id);
                  }}
                  disabled={isLiked || likingId === photo.id}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                    isLiked
                      ? "bg-red-500/20 text-red-400 border border-red-500/40"
                      : "bg-[#c59a47]/20 text-[#f4e0ad] border border-[#c59a47]/40 hover:bg-[#c59a47]/30 active:scale-95"
                  }`}
                >
                  <Heart
                    size={15}
                    className={isLiked ? "fill-red-500 text-red-500" : "text-[#c59a47]"}
                  />
                  <span>{isLiked ? "Ti piace" : "Metti Like"}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lightbox Modal per Foto a Schermo Intero */}
      {selectedPhotoIndex !== null && photos[selectedPhotoIndex] ? (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-200 select-none"
          onClick={() => setSelectedPhotoIndex(null)}
        >
          {/* Header Modal */}
          <div
            className="flex items-center justify-between w-full max-w-4xl mx-auto z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#c59a47]/20 border border-[#c59a47]/40 flex items-center justify-center text-[#f4e0ad]">
                <Sparkles size={16} />
              </div>
              <div>
                <p className="text-xs font-extrabold text-[#f4e0ad]">Foto della Serata</p>
                <p className="text-[11px] text-white/70">
                  Scatto delle{" "}
                  {new Date(photos[selectedPhotoIndex].createdAt).toLocaleTimeString("it-IT", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedPhotoIndex(null)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Chiudi (Esc)"
            >
              <X size={22} />
            </button>
          </div>

          {/* Central Content Area (Image + Left/Right nav) */}
          <div
            className="relative flex-1 flex items-center justify-center my-2 max-w-5xl mx-auto w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Freccia Sinistra */}
            {selectedPhotoIndex > 0 ? (
              <button
                type="button"
                onClick={() => setSelectedPhotoIndex(selectedPhotoIndex - 1)}
                className="absolute left-1 sm:left-4 z-10 p-3 rounded-full bg-black/60 border border-white/20 text-white hover:bg-black/90 hover:scale-105 transition-all cursor-pointer shadow-lg"
                title="Foto precedente"
              >
                <ChevronLeft size={24} />
              </button>
            ) : null}

            {/* Fullscreen Photo */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos[selectedPhotoIndex].mediaUrl}
              alt="Scatto live serata a schermo intero"
              onError={() => handleMediaError(photos[selectedPhotoIndex].id)}
              className="max-h-[72vh] max-w-[92vw] object-contain rounded-2xl shadow-2xl border border-white/10"
            />

            {/* Freccia Destra */}
            {selectedPhotoIndex < photos.length - 1 ? (
              <button
                type="button"
                onClick={() => setSelectedPhotoIndex(selectedPhotoIndex + 1)}
                className="absolute right-1 sm:right-4 z-10 p-3 rounded-full bg-black/60 border border-white/20 text-white hover:bg-black/90 hover:scale-105 transition-all cursor-pointer shadow-lg"
                title="Foto successiva"
              >
                <ChevronRight size={24} />
              </button>
            ) : null}
          </div>

          {/* Footer Bar: Likes & Action */}
          <div
            className="flex items-center justify-between w-full max-w-md mx-auto bg-[#1a1612] border border-[#c59a47]/40 rounded-2xl p-3.5 shadow-2xl z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-white">
                ❤️ {photos[selectedPhotoIndex].likesCount}{" "}
                {photos[selectedPhotoIndex].likesCount === 1 ? "like" : "like"}
              </span>
              <span className="text-xs text-white/50">
                ({selectedPhotoIndex + 1} di {photos.length})
              </span>
            </div>

            {(() => {
              const currentPhoto = photos[selectedPhotoIndex];
              const isLiked = deviceId ? currentPhoto.likedByDevices?.includes(deviceId) : false;

              return (
                <button
                  type="button"
                  onClick={() => void handleLike(currentPhoto.id)}
                  disabled={isLiked || likingId === currentPhoto.id}
                  className={`px-4 py-2 rounded-xl font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md ${
                    isLiked
                      ? "bg-red-500/20 text-red-400 border border-red-500/40 cursor-default"
                      : "bg-gradient-to-r from-[#c59a47] to-[#d9b66d] text-black hover:brightness-110 active:scale-95"
                  }`}
                >
                  <Heart
                    size={17}
                    className={isLiked ? "fill-red-500 text-red-500" : "fill-black text-black"}
                  />
                  <span>{isLiked ? "Ti piace già" : "Metti Like ORA!"}</span>
                </button>
              );
            })()}
          </div>
        </div>
      ) : null}
    </section>
  );
}

