"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";

type BrandedIframeProps = {
  src: string;
  title: string;
  allow?: string;
};

const LOAD_TIMEOUT_MS = 10_000;

export function BrandedIframe({ src, title, allow }: BrandedIframeProps) {
  const [loaded, setLoaded] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (loaded) return;

    const timeout = window.setTimeout(() => setTimedOut(true), LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(timeout);
  }, [loaded, src]);

  return (
    <div className="branded-frame-shell">
      <iframe
        key={src}
        src={src}
        title={title}
        allow={allow}
        onLoad={() => setLoaded(true)}
      />
      <div
        className={`tortuga-frame-loader${loaded ? " is-loaded" : ""}`}
        aria-hidden={loaded}
        aria-live="polite"
      >
        <div className="tortuga-treasure" aria-hidden="true">
          <svg viewBox="0 0 160 150" role="presentation">
            <g className="treasure-coins">
              <circle className="treasure-coin coin-one" cx="60" cy="35" r="9" />
              <circle className="treasure-coin coin-two" cx="83" cy="25" r="8" />
              <circle className="treasure-coin coin-three" cx="105" cy="39" r="9" />
              <path className="coin-mark coin-one" d="M60 30v10M56 33h6a3 3 0 0 1 0 6h-6" />
              <path className="coin-mark coin-two" d="M83 21v8M79 24h6" />
              <path className="coin-mark coin-three" d="M105 34v10M101 37h6a3 3 0 0 1 0 6h-6" />
            </g>
            <g className="treasure-chest">
              <path d="M31 78V63c0-20 15-34 49-34s49 14 49 34v15" />
              <path d="M27 76h106v54H27z" />
              <path d="M27 91h106M80 30v100" />
              <rect x="72" y="82" width="16" height="24" rx="4" />
              <path d="M76 82v-5a4 4 0 0 1 8 0v5" />
              <path d="M38 66c11-14 25-20 42-20s31 6 42 20" />
            </g>
          </svg>
        </div>
        <p className="tortuga-loader-title">Approdo in corso…</p>
        <p className="tortuga-loader-copy">Prepariamo la rotta per la tua ciurma.</p>
        {timedOut ? (
          <div className="tortuga-loader-timeout">
            <p>La traversata sta richiedendo più del previsto.</p>
            <a href={src} target="_blank" rel="noreferrer">
              Apri nel browser <ExternalLink size={15} />
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}
