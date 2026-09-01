"use client";

import { useEffect, useState, useRef } from "react";
import { Upload, Trash2, Image as ImageIcon, Film, Loader2 } from "lucide-react";
import { formatInRome } from "@/lib/utils";

type LiveTvMediaAsset = {
  id: string;
  kind: "image" | "video";
  title: string;
  originalName: string;
  fileName: string;
  mediaUrl: string;
  mimeType: string;
  sizeBytes: number;
  storageMode: "vercel_blob" | "local_fs";
  createdAt: string;
};

export default function MediaManagerPage() {
  const [assets, setAssets] = useState<LiveTvMediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadMedia = async () => {
    try {
      const res = await fetch("/api/live-tv/admin/media-library", { cache: "no-store" });
      const body = await res.json();
      if (res.ok && body.assets) {
        setAssets(body.assets);
      } else {
        setError(body.error || "Errore caricamento media");
      }
    } catch {
      setError("Errore di connessione.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadMedia();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const handleUpload = async (file: File) => {
    if (!file) return;
    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("media", file);

    try {
      const res = await fetch("/api/live-tv/admin/upload-media", {
        method: "POST",
        body: formData,
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Errore durante l'upload.");
      
      await loadMedia();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async (asset: LiveTvMediaAsset) => {
    if (!window.confirm(`Vuoi davvero eliminare "${asset.title}"?`)) return;
    
    setLoading(true);
    try {
      const res = await fetch("/api/live-tv/admin/delete-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: asset.id }),
      });
      if (!res.ok) throw new Error("Errore durante l'eliminazione.");
      
      setAssets(assets.filter((a) => a.id !== asset.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 pb-32">
      <header className="mb-8">
        <h1 className="text-4xl font-black uppercase italic tracking-tight text-[var(--accent-strong)]">
          Media Manager
        </h1>
        <p className="text-white/60 font-semibold mt-2">
          Gestisci le immagini e i video per la Live TV e le push notification.
        </p>
      </header>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-semibold text-red-400">
          {error}
        </div>
      )}

      <div className="mb-10 rounded-2xl border border-white/10 bg-[#111] p-6 shadow-2xl">
        <h2 className="mb-4 text-xl font-bold uppercase tracking-wider text-white">
          Carica nuovo file
        </h2>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <input
            type="file"
            accept="image/*,video/*"
            ref={fileInputRef}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleUpload(file);
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="button-primary flex items-center gap-2"
          >
            {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
            {uploading ? "Caricamento in corso..." : "Seleziona File"}
          </button>
          <span className="text-xs font-semibold text-white/40">
            Supportati: JPG, PNG, WEBP, GIF, MP4, WEBM (Max 80MB)
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {loading && assets.length === 0 ? (
          <div className="col-span-full py-20 text-center text-white/40">
            <Loader2 size={32} className="mx-auto animate-spin mb-4" />
            <p>Caricamento libreria...</p>
          </div>
        ) : assets.length === 0 ? (
          <div className="col-span-full py-20 text-center text-white/40">
            <p>Nessun file presente nella libreria.</p>
          </div>
        ) : (
          assets.map((asset) => (
            <div
              key={asset.id}
              className="group relative flex aspect-square flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#111] transition-colors hover:border-[var(--accent-strong)]/50"
            >
              <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center p-2">
                {asset.kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={asset.mediaUrl}
                    alt={asset.title}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <video
                    src={asset.mediaUrl}
                    className="max-h-full max-w-full object-contain"
                    muted
                  />
                )}
                
                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm p-1.5 rounded-lg border border-white/10 text-white/80">
                  {asset.kind === "image" ? <ImageIcon size={14} /> : <Film size={14} />}
                </div>

                <div className="absolute inset-0 bg-black/80 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center gap-3">
                  <button
                    onClick={() => handleDelete(asset)}
                    className="p-3 rounded-xl bg-red-500/20 text-red-500 hover:bg-red-500/40 transition-colors"
                    title="Elimina"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
              <div className="border-t border-white/5 bg-[#0a0a0a] p-3">
                <p className="truncate text-xs font-bold text-white/90" title={asset.title}>
                  {asset.title}
                </p>
                <p className="mt-1 text-[0.65rem] text-white/40">
                  {formatInRome(asset.createdAt, { dateStyle: "short" })} • {(asset.sizeBytes / 1024 / 1024).toFixed(1)}MB
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


