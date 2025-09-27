"use client";

import type { MutableRefObject } from "react";
import Webcam from "react-webcam";

import type { Orientation, ScanStep } from "../types";

export type MetricsDisplay = {
  overallPercent: number | null;
  detectionPercent: number | null;
  centerPercent: number | null;
  sizePercent: number | null;
};

type CameraViewportProps = {
  webcamRef: MutableRefObject<Webcam | null>;
  canvasRef: MutableRefObject<HTMLCanvasElement | null>;
  onVideoPlay: () => void;
  metrics: MetricsDisplay;
  showMetrics: boolean;
  liveStatusClass: string;
  liveStatusText: string;
  isCaptureReady: boolean;
  step: ScanStep;
  orientationLabels: Record<Orientation, string>;
  videoConstraints: MediaTrackConstraints;
};

export function CameraViewport({
  webcamRef,
  canvasRef,
  onVideoPlay,
  metrics,
  showMetrics,
  liveStatusClass,
  liveStatusText,
  isCaptureReady,
  step,
  orientationLabels,
  videoConstraints,
}: CameraViewportProps) {
  const { overallPercent, detectionPercent, centerPercent, sizePercent } = metrics;
  const stepLabel = step === "finished" ? "Analisis Sedang Berlangsung" : orientationLabels[step];

  return (
    <div className="relative flex min-h-[320px] items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 p-4 backdrop-blur">
      <Webcam
        audio={false}
        mirrored
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        videoConstraints={videoConstraints}
        className="h-full w-full rounded-2xl object-cover"
        onUserMedia={onVideoPlay}
      />
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
      {showMetrics ? (
        <div className="pointer-events-none absolute left-4 top-20 flex w-[13rem] max-w-[14rem] flex-col gap-2 rounded-2xl border border-sky-400/40 bg-slate-950/80 p-4 text-xs text-slate-100 shadow-lg sm:left-6 sm:top-24 sm:w-60 lg:left-8 lg:top-28">
          <div className="flex items-center justify-between">
            <span className="font-semibold uppercase tracking-[0.3em] text-sky-300">Live Akurasi</span>
            <span className={`text-lg font-bold ${isCaptureReady ? "text-emerald-300" : "text-amber-300"}`}>
              {overallPercent ?? "--"}%
            </span>
          </div>
          <dl className="space-y-1 text-[0.7rem]">
            <div className="flex items-center justify-between">
              <dt>Deteksi</dt>
              <dd>{detectionPercent ?? "--"}%</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>Posisi</dt>
              <dd>{centerPercent ?? "--"}%</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>Skala</dt>
              <dd>{sizePercent ?? "--"}%</dd>
            </div>
          </dl>
          <p className={`text-[0.68rem] font-medium ${liveStatusClass}`}>{liveStatusText}</p>
        </div>
      ) : (
        <div className="pointer-events-none absolute left-4 top-20 rounded-full border border-slate-700/60 bg-slate-900/80 px-3 py-2 text-xs text-slate-300 shadow-lg sm:left-6 sm:top-24 lg:left-8 lg:top-28">
          Mencari wajah...
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-between p-6">
        <div className="w-full rounded-full border border-white/10 bg-black/20 px-4 py-2 text-center text-xs font-semibold uppercase tracking-[0.3em] text-white/80">
          {stepLabel}
        </div>
        <div className="w-full rounded-2xl border border-white/10 bg-black/30 p-4 text-center text-xs text-slate-100">
          Pastikan wajah berada di tengah frame dengan pencahayaan cukup.
        </div>
      </div>
    </div>
  );
}