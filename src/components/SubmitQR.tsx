"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

/**
 * A QR code that points at a path on this same site (default: /submit), built
 * from whatever origin the app is running on — so it works locally and once
 * deployed to Vercel with no edits. Includes a copy-link button.
 */
export default function SubmitQR({
  path = "/submit",
  size = 200,
  compact = false,
  caption,
}: {
  path?: string;
  size?: number;
  /** Compact = just the QR + a small caption (no link text or copy button). */
  compact?: boolean;
  caption?: string;
}) {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUrl(`${window.location.origin}${path}`);
  }, [path]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be blocked; the link is shown on screen anyway */
    }
  }

  if (compact) {
    return (
      <div className="flex flex-col items-center gap-1.5">
        <div className="card p-2">
          {url ? (
            <QRCodeSVG
              value={url}
              size={size}
              fgColor="#1a1320"
              bgColor="#ffffff"
              level="M"
              marginSize={1}
              style={{ height: "auto", width: size }}
            />
          ) : (
            <div
              className="animate-pulse rounded bg-brand-bg"
              style={{ height: size, width: size }}
            />
          )}
        </div>
        {caption && (
          <span className="text-xs font-semibold text-brand-muted">
            {caption}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="card p-4">
        {url ? (
          <QRCodeSVG
            value={url}
            size={size}
            fgColor="#1a1320"
            bgColor="#ffffff"
            level="M"
            marginSize={2}
            style={{ height: "auto", width: size }}
          />
        ) : (
          <div
            className="animate-pulse rounded-lg bg-brand-bg"
            style={{ height: size, width: size }}
          />
        )}
      </div>
      <div className="flex w-full max-w-xs flex-col items-center gap-2">
        <code className="w-full truncate rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-center text-xs text-brand-muted">
          {url || "…"}
        </code>
        <button
          onClick={copy}
          className="btn-primary rounded-full px-5 py-2 text-sm font-medium"
        >
          {copied ? "Copied! ✓" : "Copy link"}
        </button>
      </div>
    </div>
  );
}
