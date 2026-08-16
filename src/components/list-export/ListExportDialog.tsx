"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  exportGameCountOptions,
  defaultPosterHeaderTitle,
  type ExportGame,
  type ListExportListType,
} from "./listExportTypes";
import {
  EXPORT_LAYOUT_DEFAULT,
  getExportDimensions,
  type ExportLayoutId,
} from "./exportDimensions";
import {
  rankChromeForStyle,
  type ExportRankFormat,
  type ExportRankStyle,
} from "./rankChrome";
import {
  exportMountStyle,
  exportNodeToImage,
  exportImageFilename,
  exportImageMimeType,
} from "./exportToPng";
import { ListExportPoster } from "./ListExportAwardsLayout";
import {
  canCopyImage,
  canUseWebShare,
  copyImageElementToClipboard,
  isMobileDevice,
  isSecureClipboardContext,
  saveImageBlob,
  shareImageFile,
} from "./shareOrDownload";

const PREVIEW_MAX_W = 420;
const PREVIEW_SIDE_INSET = 16;
const EXPORT_FORMAT = "jpeg" as const;

function initialPreviewWidth(): number {
  if (typeof window === "undefined") return 280;
  return Math.max(160, Math.min(PREVIEW_MAX_W, window.innerWidth - 96));
}

export interface ListExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  games: ExportGame[];
  year: number;
  title: string;
  listType?: ListExportListType;
  rankStyle?: ExportRankStyle;
  rankFormat?: ExportRankFormat;
  showYearBadge?: boolean;
  showTopCount?: boolean;
}

export function ListExportDialog({
  open,
  onOpenChange,
  games,
  year,
  title,
  listType = "goty",
  rankStyle = "chip",
  rankFormat = "ordinal",
  showYearBadge,
  showTopCount,
}: ListExportDialogProps) {
  const [layout] = useState<ExportLayoutId>(EXPORT_LAYOUT_DEFAULT);
  const [busy, setBusy] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewWidth, setPreviewWidth] = useState(initialPreviewWidth);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const defaultHeaderTitle = useMemo(
    () => defaultPosterHeaderTitle(listType, title),
    [listType, title],
  );
  const [headerTitleDraft, setHeaderTitleDraft] = useState(defaultHeaderTitle);
  const [appliedHeaderTitle, setAppliedHeaderTitle] = useState(defaultHeaderTitle);

  const exportRef = useRef<HTMLDivElement>(null);
  const previewShellRef = useRef<HTMLDivElement>(null);
  const previewImgRef = useRef<HTMLImageElement>(null);
  const previewBlobRef = useRef<Blob | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const renderEpochRef = useRef(0);

  const gameCountOptions = useMemo(
    () => exportGameCountOptions(games.length),
    [games.length],
  );
  const defaultGameCount = useMemo(
    () => gameCountOptions[gameCountOptions.length - 1] ?? 1,
    [gameCountOptions],
  );
  const [gameCount, setGameCount] = useState(defaultGameCount);

  const titleDirty = headerTitleDraft.trim() !== appliedHeaderTitle.trim();

  const revokePreviewUrl = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    previewBlobRef.current = null;
    setPreviewUrl(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    // Reset draft controls when the dialog opens or source list changes.
    queueMicrotask(() => {
      setGameCount(defaultGameCount);
      setHeaderTitleDraft(defaultHeaderTitle);
      setAppliedHeaderTitle(defaultHeaderTitle);
    });
  }, [open, defaultGameCount, defaultHeaderTitle]);

  useEffect(() => {
    if (!open) {
      queueMicrotask(() => {
        setCopied(false);
        setRenderError(null);
        revokePreviewUrl();
      });
    }
  }, [open, revokePreviewUrl]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const el = previewShellRef.current;
    if (!el) return;

    const update = () => {
      const available = Math.floor(el.clientWidth);
      if (available <= 0) return;
      const fitted = available - PREVIEW_SIDE_INSET * 2;
      setPreviewWidth(Math.max(160, Math.min(PREVIEW_MAX_W, fitted)));
    };
    update();
    const raf = requestAnimationFrame(() => update());

    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [open]);

  const dims = getExportDimensions(layout);
  const previewW = Math.min(previewWidth, dims.width);
  const previewH = Math.round((previewW / dims.width) * dims.height);
  const mobile = isMobileDevice();
  const showShare = mobile || canUseWebShare();
  const exportFilename = exportImageFilename(year, EXPORT_FORMAT);
  const exportMime = exportImageMimeType(EXPORT_FORMAT);
  const saveLabel =
    mobile && canUseWebShare()
      ? "Save to Photos"
      : mobile
        ? "Save image"
        : "Download JPEG";

  const posterProps = {
    games,
    year,
    layout,
    width: dims.width,
    height: dims.height,
    gameCount,
    title: appliedHeaderTitle,
    listType,
    showYearBadge,
    showTopCount,
    rankChrome: rankChromeForStyle(rankStyle, rankFormat),
  };

  const renderPreview = useCallback(async () => {
    const epoch = ++renderEpochRef.current;
    setRendering(true);
    setRenderError(null);

    try {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      if (epoch !== renderEpochRef.current) return;

      const node = exportRef.current;
      if (!node) throw new Error("Export mount missing");

      const blob = await exportNodeToImage(
        node,
        dims.width,
        dims.height,
        EXPORT_FORMAT,
      );
      if (epoch !== renderEpochRef.current) return;

      const url = URL.createObjectURL(blob);
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = url;
      previewBlobRef.current = blob;
      setPreviewUrl(url);
    } catch (e) {
      if (epoch !== renderEpochRef.current) return;
      console.error(e);
      revokePreviewUrl();
      setRenderError("Could not render the preview. Some cover hosts block export.");
    } finally {
      if (epoch === renderEpochRef.current) setRendering(false);
    }
  }, [dims.height, dims.width, revokePreviewUrl]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      void renderPreview();
    });
    return () => {
      cancelAnimationFrame(frame);
      renderEpochRef.current += 1;
    };
  }, [open, layout, gameCount, games, year, listType, rankStyle, rankFormat, showYearBadge, showTopCount, appliedHeaderTitle, renderPreview]);

  const applyHeaderTitle = () => {
    const next = headerTitleDraft.trim() || defaultHeaderTitle;
    setHeaderTitleDraft(next);
    setAppliedHeaderTitle(next);
  };

  const ensureBlob = useCallback(async (): Promise<Blob> => {
    if (previewBlobRef.current) return previewBlobRef.current;
    const node = exportRef.current;
    if (!node) throw new Error("Export mount missing");
    const blob = await exportNodeToImage(node, dims.width, dims.height, EXPORT_FORMAT);
    previewBlobRef.current = blob;
    const url = URL.createObjectURL(blob);
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = url;
    setPreviewUrl(url);
    return blob;
  }, [dims.height, dims.width]);

  const handleDownload = async () => {
    setBusy(true);
    try {
      const blob = await ensureBlob();
      await saveImageBlob(blob, exportFilename, `${title} | GOTY`, exportMime);
    } catch (e) {
      if ((e as DOMException).name === "AbortError") return;
      console.error(e);
      window.alert(
        "Could not create the image. If covers are missing, some hosts may block export.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = async () => {
    if (!isSecureClipboardContext() || !canCopyImage()) {
      window.alert(
        mobile
          ? "Copy from a button only works on https:// sites. Long-press the preview image and choose Copy or Save Image."
          : "Copy needs https:// (secure site). On local http://, use Download instead.",
      );
      return;
    }
    setBusy(true);
    try {
      const img = previewImgRef.current;
      if (!img?.src) throw new Error("Preview image is not ready");
      await copyImageElementToClipboard(img);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
      window.alert(
        mobile
          ? "Could not copy automatically. Long-press the preview image and choose Copy or Save Image."
          : "Could not copy the image to the clipboard. Try Download instead.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleShare = async () => {
    setBusy(true);
    try {
      const blob = await ensureBlob();
      await shareImageFile(blob, exportFilename, `${title} | GOTY`, exportMime);
    } catch (e) {
      if ((e as DOMException).name === "AbortError") return;
      console.error(e);
      window.alert("Sharing is not available or was cancelled.");
    } finally {
      setBusy(false);
    }
  };

  const actionsDisabled = busy || rendering || !previewUrl;

  if (!open) return null;

  const labelCls =
    "text-[11px] font-extrabold tracking-[0.16em] text-[var(--muted)] uppercase";
  const btnBase =
    "inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold transition-opacity disabled:opacity-40";

  return (
    <>
      {createPortal(
        <div style={exportMountStyle(dims.width, dims.height)} aria-hidden>
          <div
            ref={exportRef}
            style={{ width: dims.width, height: dims.height, position: "relative" }}
          >
            <ListExportPoster {...posterProps} />
          </div>
        </div>,
        document.body,
      )}

      {createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />
          <div className="relative flex max-h-[min(92vh,900px)] w-full max-w-2xl flex-col overflow-hidden border border-[var(--line)] bg-[var(--panel)] shadow-2xl">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--line)] px-6 py-4">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold tracking-[-0.02em] text-[var(--ink)]">
                  <span className="text-[var(--accent)]" aria-hidden>
                    ↓
                  </span>
                  Export image
                </h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {mobile
                    ? "Long-press the poster to Copy or Save to Photos, or use the buttons."
                    : "Your poster renders below. Copy, download, or share when it’s ready."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="text-[var(--muted)] transition-colors hover:text-[var(--ink)]"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
              <div className="space-y-2">
                <p className={labelCls}>Games to show</p>
                <select
                  value={String(gameCount)}
                  onChange={(e) => setGameCount(Number(e.target.value))}
                  disabled={gameCountOptions.length <= 1 || busy || rendering}
                  className="w-full border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)] disabled:opacity-50"
                >
                  {gameCountOptions.map((n) => (
                    <option key={n} value={String(n)}>
                      Top {n}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="export-header-title" className={labelCls}>
                    Poster title
                  </label>
                  {headerTitleDraft !== defaultHeaderTitle ? (
                    <button
                      type="button"
                      className="px-2 py-1 text-xs text-[var(--muted)] hover:text-[var(--ink)]"
                      onClick={() => setHeaderTitleDraft(defaultHeaderTitle)}
                      disabled={busy || rendering}
                    >
                      Use list name
                    </button>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <input
                    id="export-header-title"
                    value={headerTitleDraft}
                    onChange={(e) => setHeaderTitleDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && titleDirty && !busy && !rendering) {
                        e.preventDefault();
                        applyHeaderTitle();
                      }
                    }}
                    placeholder={defaultHeaderTitle}
                    maxLength={60}
                    disabled={busy}
                    className="min-w-0 flex-1 border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
                  />
                  <button
                    type="button"
                    className={`${btnBase} shrink-0 border border-[var(--line)] text-[var(--ink)] hover:border-[var(--accent)]`}
                    disabled={!titleDirty || busy || rendering}
                    onClick={applyHeaderTitle}
                  >
                    Set text
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <p className={labelCls}>Preview</p>
                <div
                  ref={previewShellRef}
                  className="w-full min-w-0 max-w-full overflow-hidden px-1"
                >
                  <div
                    className="relative mx-auto overflow-hidden border border-[var(--line)] bg-black/40"
                    style={{ width: previewW, height: previewH, maxWidth: "100%" }}
                  >
                    {previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        ref={previewImgRef}
                        src={previewUrl}
                        alt={
                          listType === "custom"
                            ? "My list export"
                            : `${year} My Games of the Year export`
                        }
                        width={dims.width}
                        height={dims.height}
                        draggable
                        className="block h-full w-full object-contain"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center px-4 text-center text-sm text-[var(--muted)]">
                        {renderError ??
                          (rendering ? "Rendering poster…" : "Preparing preview…")}
                      </div>
                    )}
                    {rendering && previewUrl ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm font-medium text-[var(--ink)]">
                        Updating…
                      </div>
                    ) : null}
                  </div>
                </div>
                {mobile && previewUrl ? (
                  <p className="text-center text-[11px] text-[var(--muted)]">
                    Tip: long-press the image for Copy or Save Image.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-2 border-t border-[var(--line)] px-6 py-4 sm:flex-row sm:flex-wrap sm:justify-end">
              {showShare ? (
                <button
                  type="button"
                  className={`${btnBase} w-full border border-[var(--line)] text-[var(--ink)] hover:border-[var(--accent)] sm:w-auto`}
                  disabled={actionsDisabled}
                  onClick={handleShare}
                >
                  {busy ? "Working…" : "Share"}
                </button>
              ) : null}
              <button
                type="button"
                className={`${btnBase} w-full border border-[var(--line)] text-[var(--ink)] hover:border-[var(--accent)] sm:w-auto`}
                disabled={actionsDisabled}
                onClick={handleCopy}
              >
                {copied ? "Copied!" : busy ? "Working…" : "Copy to clipboard"}
              </button>
              <button
                type="button"
                className={`${btnBase} w-full bg-[var(--accent)] text-white hover:opacity-90 sm:w-auto`}
                disabled={actionsDisabled}
                onClick={handleDownload}
              >
                {busy ? "Working…" : saveLabel}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
