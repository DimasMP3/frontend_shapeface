"use client";

import type { Orientation, ScanStep, StepContent } from "../types";

type CaptureSidebarProps = {
  step: ScanStep;
  stepContent: StepContent;
  orientationLabels: Record<Orientation, string>;
  captures: Partial<Record<Orientation, string>>;
  onCapture: () => void;
  onReset: () => void;
  isCaptureReady: boolean;
  isMutating: boolean;
  isMutationSuccess: boolean;
  captureButtonLabel: string;
  liveStatusClass: string;
  liveStatusText: string;
  nextOrientation: Orientation | null;
  displayError: string | null;
};

export function CaptureSidebar({
  step,
  stepContent,
  orientationLabels,
  captures,
  onCapture,
  onReset,
  isCaptureReady,
  isMutating,
  isMutationSuccess,
  captureButtonLabel,
  liveStatusClass,
  liveStatusText,
  nextOrientation,
  displayError,
}: CaptureSidebarProps) {
  const orientationOrder = Object.keys(orientationLabels) as Orientation[];
  const showCaptureButton = step !== "finished";
  const showResetButton = step !== "front" || isMutationSuccess || Boolean(displayError);
  const showAnalyzingIndicator = isMutating && step === "finished";

  return (
    <div className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-[0_30px_70px_-24px_rgba(15,118,230,0.45)] backdrop-blur">
      <div className="space-y-2">
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.4em] text-sky-200">
          {stepContent.badge}
        </span>
        <h2 className="text-2xl font-semibold text-white">{stepContent.title}</h2>
        <p className="text-sm text-slate-300">{stepContent.description}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
        {orientationOrder.map((orientation, index) => {
          const isCaptured = Boolean(captures[orientation]);
          const isActive = step === orientation;

          return (
            <div
              key={orientation}
              className="flex items-center gap-2 rounded-full border border-slate-700/70 bg-slate-900/60 px-4 py-2"
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[0.7rem] font-bold ${
                  isCaptured
                    ? "bg-emerald-500/90 text-white"
                    : isActive
                    ? "bg-sky-500/80 text-white"
                    : "bg-slate-800 text-slate-300"
                }`}
              >
                {index + 1}
              </span>
              <span className="font-medium text-slate-200">{orientationLabels[orientation]}</span>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {orientationOrder.map((orientation) => (
          <div
            key={orientation}
            className="flex h-32 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-slate-600/70 bg-slate-900/70"
          >
            {captures[orientation] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={captures[orientation]}
                alt={`Pratinjau ${orientationLabels[orientation]}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="px-4 text-center text-xs text-slate-500">
                Belum ada gambar {orientationLabels[orientation].toLowerCase()}.
              </span>
            )}
          </div>
        ))}
      </div>

      {showCaptureButton && (
        <button
          type="button"
          onClick={onCapture}
          disabled={isMutating || !isCaptureReady}
          className="inline-flex w-full items-center justify-center rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold text-white drop-shadow-[0_1px_2px_rgba(15,23,42,0.45)] transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {captureButtonLabel}
        </button>
      )}

      {showCaptureButton && (
        <p className={`text-xs ${liveStatusClass}`}>{liveStatusText}</p>
      )}

      {step === "finished" && (
        <div className="rounded-2xl border border-sky-400/30 bg-sky-500/10 px-6 py-4 text-sm text-sky-200">
          {isMutating
            ? "Menganalisis gambar tampak depan..."
            : "Semua gambar berhasil diambil. Lihat hasil analisis di bawah."}
        </div>
      )}

      {nextOrientation && (
        <p className="text-xs text-slate-400">Selanjutnya: {orientationLabels[nextOrientation]}.</p>
      )}

      {showResetButton && (
        <button
          type="button"
          onClick={onReset}
          disabled={isMutating}
          className="inline-flex w-full items-center justify-center rounded-full border border-slate-700/60 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          Coba Lagi
        </button>
      )}

      {displayError && (
        <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-6 py-4 text-sm text-red-200">
          {displayError}
        </div>
      )}

      {showAnalyzingIndicator && (
        <span className="flex items-center gap-2 text-xs text-sky-200">
          <span className="h-2 w-2 animate-ping rounded-full bg-sky-400" />
          Menganalisis...
        </span>
      )}
    </div>
  );
}