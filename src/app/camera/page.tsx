"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import Webcam from "react-webcam";
import * as faceapi from "face-api.js";
import { useCallback, useEffect, useRef, useState } from "react";

type PredictionResponse = {
  shape: string;
  confidence: number;
};

type ErrorResponse = {
  error?: string;
};

type Orientation = "front" | "left" | "right";
type ScanStep = Orientation | "finished";

const API_URL = "http://127.0.0.1:5000/predict";

const ORIENTATION_LABELS: Record<Orientation, string> = {
  front: "Tampak Depan",
  left: "Tampak Kiri",
  right: "Tampak Kanan",
};

const STEP_CONTENT: Record<ScanStep, { badge: string; title: string; description: string }> = {
  front: {
    badge: "Langkah 1 dari 3",
    title: "Ambil Foto Tampak Depan",
    description:
      "Posisikan wajah menghadap kamera dan pastikan seluruh wajah terlihat jelas.",
  },
  left: {
    badge: "Langkah 2 dari 3",
    title: "Ambil Foto Tampak Kiri",
    description: "Putar kepala secara perlahan ke kiri hingga profil samping terlihat.",
  },
  right: {
    badge: "Langkah 3 dari 3",
    title: "Ambil Foto Tampak Kanan",
    description: "Putar kepala ke kanan dan tetap berada dalam bingkai kamera.",
  },
  finished: {
    badge: "Semua Langkah Selesai",
    title: "Menunggu Hasil Analisis",
    description: "Gambar tampak depan sedang dianalisis. Hasil prediksi akan muncul di bawah.",
  },
};

const videoConstraints = {
  facingMode: "user" as const,
  width: 640,
  height: 480,
};

const DETECTION_INTERVAL_MS = 80;
const BOX_PADDING_RATIO = 0.25;
const FACE_DETECTOR_OPTIONS = new faceapi.TinyFaceDetectorOptions({
  inputSize: 512,
  scoreThreshold: 0.45,
});

type FaceMetrics = {
  detectionScore: number;
  centerScore: number;
  sizeScore: number;
  overallScore: number;
  timestamp: number;
};

const MIN_DETECTION_SCORE = 0.6;
const MIN_OVERALL_SCORE = 0.65;
const MAX_METRIC_AGE_MS = 800;
const MIN_SIZE_RATIO = 0.18;
const OPTIMAL_SIZE_RATIO = 0.45;

function getDetectionConfidence(detection: faceapi.FaceDetection): number {
  const candidate = detection as unknown as { score?: number; classScore?: number };
  const value = candidate.score ?? candidate.classScore ?? 0;
  return Math.max(0, Math.min(1, value));
}

function dataUrlToFile(dataUrl: string, filename: string): File {
  const parts = dataUrl.split(",");
  if (parts.length !== 2) {
    throw new Error("Format gambar tidak valid.");
  }

  const mimeMatch = parts[0].match(/data:(.*?);base64/);
  const mime = mimeMatch?.[1] ?? "image/jpeg";
  const binary = atob(parts[1]);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new File([bytes], filename, { type: mime });
}

function createMetrics(
  detection: faceapi.FaceDetection,
  displaySize: { width: number; height: number }
): FaceMetrics {
  const detectionScore = getDetectionConfidence(detection);
  const { box } = detection;

  const frameCenterX = displaySize.width / 2;
  const frameCenterY = displaySize.height / 2;
  const faceCenterX = box.x + box.width / 2;
  const faceCenterY = box.y + box.height / 2;

  const normalizedDx = Math.abs(faceCenterX - frameCenterX) / frameCenterX;
  const normalizedDy = Math.abs(faceCenterY - frameCenterY) / frameCenterY;
  const centerPenalty = Math.sqrt(normalizedDx * normalizedDx + normalizedDy * normalizedDy);
  const centerScore = Math.max(0, 1 - Math.min(1, centerPenalty));

  const sizeRatio = box.width / displaySize.width;
  const sizeScore = Math.max(
    0,
    Math.min(1, (sizeRatio - MIN_SIZE_RATIO) / Math.max(OPTIMAL_SIZE_RATIO - MIN_SIZE_RATIO, 0.0001))
  );

  const overallScore = Math.max(
    0,
    Math.min(1, detectionScore * 0.6 + centerScore * 0.25 + sizeScore * 0.15)
  );

  return {
    detectionScore,
    centerScore,
    sizeScore,
    overallScore,
    timestamp: Date.now(),
  };
}

export default function CameraPage() {
  const webcamRef = useRef<Webcam | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const detectionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isDetectingRef = useRef(false);
  const liveMetricsRef = useRef<FaceMetrics | null>(null);
  const [liveMetrics, setLiveMetrics] = useState<FaceMetrics | null>(null);
  const [captures, setCaptures] = useState<Partial<Record<Orientation, string>>>({});
  const [captureMetrics, setCaptureMetrics] = useState<Partial<Record<Orientation, FaceMetrics>>>({});
  const lastFrontMetricsRef = useRef<FaceMetrics | null>(null);
  const [step, setStep] = useState<ScanStep>("front");
  const [localError, setLocalError] = useState<string | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [modelError, setModelError] = useState<string | null>(null);

  const mutation = useMutation<PredictionResponse, Error, File>({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("image", file);

      const metrics = lastFrontMetricsRef.current;
      if (metrics) {
        formData.append("face_detection_score", metrics.detectionScore.toFixed(3));
        formData.append("face_overall_score", metrics.overallScore.toFixed(3));
        formData.append("face_center_score", metrics.centerScore.toFixed(3));
        formData.append("face_size_score", metrics.sizeScore.toFixed(3));
      }

      const response = await fetch(API_URL, {
        method: "POST",
        body: formData,
      });

      const contentType = response.headers.get("content-type") ?? "";
      let payload: Partial<PredictionResponse & ErrorResponse> | null = null;

      if (contentType.includes("application/json")) {
        payload = await response.json();
      } else {
        const message = await response.text();
        throw new Error(message.trim() || "Respons dari server tidak dapat dibaca.");
      }

      if (!response.ok) {
        throw new Error(payload?.error || "Gagal melakukan prediksi.");
      }

      if (
        !payload ||
        typeof payload.shape !== "string" ||
        typeof payload.confidence !== "number"
      ) {
        throw new Error("Respons dari server tidak lengkap.");
      }

      return {
        shape: payload.shape,
        confidence: payload.confidence,
      };
    },
  });

  useEffect(() => {
    let isMounted = true;

    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
          faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
          faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
        ]);

        if (isMounted) {
          setIsModelLoading(false);
        }
      } catch (error) {
        console.error("Failed to load face detection models", error);
        if (isMounted) {
          setModelError("Gagal memuat model pendeteksi wajah.");
          setIsModelLoading(false);
        }
      }
    };

    loadModels();

    return () => {
      isMounted = false;
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
    };
  }, []);

  const runFaceDetection = useCallback(async () => {
    const video = webcamRef.current?.video;
    const canvas = canvasRef.current;

    if (!video || video.readyState !== 4 || !canvas) {
      return;
    }

    const displaySize = {
      width: video.videoWidth,
      height: video.videoHeight,
    };

    canvas.width = displaySize.width;
    canvas.height = displaySize.height;

    const detections = await faceapi.detectAllFaces(video, FACE_DETECTOR_OPTIONS);
    const resizedDetections = faceapi.resizeResults(detections, displaySize);
    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);

    if (!resizedDetections.length) {
      context.shadowColor = "transparent";
      context.shadowBlur = 0;
      liveMetricsRef.current = null;
      setLiveMetrics(null);
      return;
    }

    const primaryDetection = resizedDetections.reduce((best, current) =>
      getDetectionConfidence(current) > getDetectionConfidence(best) ? current : best
    );

    context.lineWidth = 3;
    context.shadowBlur = 6;
    context.shadowColor = "rgba(14, 165, 233, 0.45)";

    resizedDetections.forEach((detection) => {
      const { box } = detection;
      const paddingX = box.width * BOX_PADDING_RATIO;
      const paddingY = box.height * BOX_PADDING_RATIO;

      const drawX = Math.max(box.x - paddingX, 0);
      const drawY = Math.max(box.y - paddingY, 0);
      const drawWidth = Math.max(
        Math.min(box.width + paddingX * 2, canvas.width - drawX),
        0
      );
      const drawHeight = Math.max(
        Math.min(box.height + paddingY * 2, canvas.height - drawY),
        0
      );

      if (!drawWidth || !drawHeight) {
        return;
      }

      context.strokeStyle =
        detection === primaryDetection ? "#38bdf8" : "rgba(56, 189, 248, 0.55)";
      context.strokeRect(drawX, drawY, drawWidth, drawHeight);
    });

    context.shadowColor = "transparent";
    context.shadowBlur = 0;

    const metrics = createMetrics(primaryDetection, displaySize);
    liveMetricsRef.current = metrics;
    setLiveMetrics(metrics);
  }, []);

  const handleVideoPlay = useCallback(() => {
    if (isModelLoading || modelError) {
      return;
    }

    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }

    detectionIntervalRef.current = setInterval(async () => {
      if (isDetectingRef.current) {
        return;
      }

      isDetectingRef.current = true;
      try {
        await runFaceDetection();
      } finally {
        isDetectingRef.current = false;
      }
    }, DETECTION_INTERVAL_MS);
  }, [isModelLoading, modelError, runFaceDetection]);

  useEffect(() => {
    if (!isModelLoading && !modelError) {
      handleVideoPlay();
    } else if (modelError && detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
  }, [handleVideoPlay, isModelLoading, modelError]);

  const handleCapture = useCallback(() => {
    if (step === "finished") {
      return;
    }

    const metrics = liveMetricsRef.current;

    if (!metrics || Date.now() - metrics.timestamp > MAX_METRIC_AGE_MS) {
      setLocalError(
        "Posisi wajah belum terdeteksi stabil. Sesuaikan wajah agar berada dalam bingkai."
      );
      return;
    }

    if (
      metrics.overallScore < MIN_OVERALL_SCORE ||
      metrics.detectionScore < MIN_DETECTION_SCORE
    ) {
      setLocalError("Posisi wajah belum ideal. Sesuaikan posisi hingga indikator hijau.");
      return;
    }

    const screenshot = webcamRef.current?.getScreenshot();

    if (!screenshot) {
      setLocalError(
        "Tidak dapat mengambil gambar dari kamera. Periksa izin kamera dan coba lagi."
      );
      return;
    }

    const metricsSnapshot = { ...metrics };
    setCaptureMetrics((prev) => ({ ...prev, [step]: metricsSnapshot }));

    if (step === "front") {
      mutation.reset();
      lastFrontMetricsRef.current = metricsSnapshot;
    }

    setLocalError(null);

    const updatedCaptures = { ...captures, [step]: screenshot };
    setCaptures(updatedCaptures);

    if (step === "front") {
      setStep("left");
      return;
    }

    if (step === "left") {
      setStep("right");
      return;
    }

    const frontImageDataUrl = updatedCaptures.front;

    if (!frontImageDataUrl) {
      setLocalError("Gambar tampak depan tidak ditemukan. Proses direset, silakan ulangi.");
      setCaptures({});
      setCaptureMetrics({});
      lastFrontMetricsRef.current = null;
      setStep("front");
      mutation.reset();
      return;
    }

    const frontMetrics = captureMetrics.front ?? lastFrontMetricsRef.current;

    if (!frontMetrics) {
      setLocalError("Data akurasi wajah tampak depan tidak ditemukan. Proses direset, silakan ulangi.");
      setCaptures({});
      setCaptureMetrics({});
      lastFrontMetricsRef.current = null;
      setStep("front");
      mutation.reset();
      return;
    }

    lastFrontMetricsRef.current = frontMetrics;

    let frontFile: File;

    try {
      frontFile = dataUrlToFile(frontImageDataUrl, `face-front-${Date.now()}.jpg`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Gagal menyiapkan file untuk analisis.";
      setLocalError(message);
      setCaptures({});
      setCaptureMetrics({});
      lastFrontMetricsRef.current = null;
      setStep("front");
      mutation.reset();
      return;
    }

    setStep("finished");
    mutation.mutate(frontFile);
  }, [captureMetrics, captures, mutation, step]);

  const resetProcess = useCallback(() => {
    setCaptures({});
    setCaptureMetrics({});
    lastFrontMetricsRef.current = null;
    setLiveMetrics(null);
    liveMetricsRef.current = null;
    setStep("front");
    setLocalError(null);
    mutation.reset();
  }, [mutation]);

  const stepContent = STEP_CONTENT[step];
  const nextOrientation: Orientation | null =
    step === "front" ? "left" : step === "left" ? "right" : null;

  const captureButtonLabel =
    step === "front"
      ? "Ambil Gambar Tampak Depan"
      : step === "left"
      ? "Ambil Gambar Tampak Kiri"
      : "Ambil Gambar Tampak Kanan";

  const liveMetricAge = liveMetrics ? Date.now() - liveMetrics.timestamp : Number.POSITIVE_INFINITY;
  const isMetricFresh = liveMetricAge <= MAX_METRIC_AGE_MS;

  const liveOverallPercent = liveMetrics ? Math.round(liveMetrics.overallScore * 100) : null;
  const liveDetectionPercent = liveMetrics ? Math.round(liveMetrics.detectionScore * 100) : null;
  const liveCenterPercent = liveMetrics ? Math.round(liveMetrics.centerScore * 100) : null;
  const liveSizePercent = liveMetrics ? Math.round(liveMetrics.sizeScore * 100) : null;

  const isCaptureReady =
    Boolean(liveMetrics) &&
    isMetricFresh &&
    (liveMetrics?.overallScore ?? 0) >= MIN_OVERALL_SCORE &&
    (liveMetrics?.detectionScore ?? 0) >= MIN_DETECTION_SCORE;

  const liveStatusText = !liveMetrics
    ? "Wajah belum terdeteksi"
    : !isMetricFresh
    ? "Menstabilkan deteksi wajah..."
    : isCaptureReady
    ? "Posisi wajah siap diambil"
    : "Sesuaikan posisi wajah hingga indikator hijau.";

  const liveStatusClass = !liveMetrics
    ? "text-slate-200"
    : isCaptureReady
    ? "text-emerald-300"
    : isMetricFresh
    ? "text-amber-300"
    : "text-slate-200";

  const prediction = mutation.data ?? null;
  const confidenceValue = prediction ? Math.round(prediction.confidence * 1000) / 10 : null;
  const confidencePercent = confidenceValue !== null ? `${confidenceValue}%` : null;

  const displayError = localError ?? mutation.error?.message ?? null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center px-4 py-16">
      <div className="w-full space-y-10">
        <header className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="space-y-3">
            <span className="rounded-full border border-sky-400/40 bg-sky-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-sky-200">
              Face Shape AI
            </span>
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">
              Pemindaian Wajah Multi-Langkah
            </h1>
            <p className="text-sm text-slate-300 sm:text-base">
              Ambil foto depan, kiri, dan kanan secara berurutan. Sistem akan langsung menganalisis gambar tampak depan setelah ketiga foto berhasil diambil.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <Link
              href="/upload"
              className="inline-flex items-center justify-center rounded-full border border-slate-700/60 px-5 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
            >
              Gunakan Upload Foto
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full border border-slate-800 px-5 py-2 text-xs font-semibold text-slate-400 transition hover:border-slate-600 hover:text-slate-200"
            >
              Kembali ke Beranda
            </Link>
          </div>
        </header>

        <section className="grid gap-8 lg:grid-cols-[1.2fr_minmax(260px,1fr)]">
          <div className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-[0_30px_70px_-24px_rgba(15,118,230,0.45)] backdrop-blur">
            <div className="space-y-2">
              <span className="text-[0.65rem] font-semibold uppercase tracking-[0.4em] text-sky-200">
                {stepContent.badge}
              </span>
              <h2 className="text-2xl font-semibold text-white">{stepContent.title}</h2>
              <p className="text-sm text-slate-300">{stepContent.description}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
              {(Object.keys(ORIENTATION_LABELS) as Orientation[]).map((orientation, index) => {
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
                    <span className="font-medium text-slate-200">
                      {ORIENTATION_LABELS[orientation]}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {(Object.keys(ORIENTATION_LABELS) as Orientation[]).map((orientation) => (
                <div
                  key={orientation}
                  className="flex h-32 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-slate-600/70 bg-slate-900/70"
                >
                  {captures[orientation] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={captures[orientation]}
                      alt={`Pratinjau ${ORIENTATION_LABELS[orientation]}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="px-4 text-center text-xs text-slate-500">
                      Belum ada gambar {ORIENTATION_LABELS[orientation].toLowerCase()}.
                    </span>
                  )}
                </div>
              ))}
            </div>

            {step !== "finished" && (
              <button
                type="button"
                onClick={handleCapture}
                disabled={mutation.isPending || !isCaptureReady}
                className="inline-flex w-full items-center justify-center rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold text-white drop-shadow-[0_1px_2px_rgba(15,23,42,0.45)] transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {captureButtonLabel}
              </button>
            )}

            {step !== "finished" && (
              <p className={`text-xs ${liveStatusClass}`}>{liveStatusText}</p>
            )}

            {step === "finished" && (
              <div className="rounded-2xl border border-sky-400/30 bg-sky-500/10 px-6 py-4 text-sm text-sky-200">
                {mutation.isPending
                  ? "Menganalisis gambar tampak depan..."
                  : "Semua gambar berhasil diambil. Lihat hasil analisis di bawah."}
              </div>
            )}

            {nextOrientation && (
              <p className="text-xs text-slate-400">
                Selanjutnya: {ORIENTATION_LABELS[nextOrientation]}.
              </p>
            )}

            {(step !== "front" || mutation.isSuccess || Boolean(displayError)) && (
              <button
                type="button"
                onClick={resetProcess}
                disabled={mutation.isPending}
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

            {mutation.isPending && step === "finished" && (
              <span className="flex items-center gap-2 text-xs text-sky-200">
                <span className="h-2 w-2 animate-ping rounded-full bg-sky-400" />
                Menganalisis...
              </span>
            )}
          </div>

          <div className="relative flex min-h-[320px] items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 p-4 backdrop-blur">
            <Webcam
              audio={false}
              mirrored
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              videoConstraints={videoConstraints}
              className="h-full w-full rounded-2xl object-cover"
              onUserMedia={handleVideoPlay}
            />
            <canvas
              ref={canvasRef}
              className="pointer-events-none absolute inset-0 h-full w-full"
            />
            {liveMetrics ? (
              <div className="pointer-events-none absolute left-4 top-20 w-[13rem] max-w-[14rem] sm:left-6 sm:top-24 sm:w-60 lg:left-8 lg:top-28 flex flex-col gap-2 rounded-2xl border border-sky-400/40 bg-slate-950/80 p-4 text-xs text-slate-100 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="font-semibold uppercase tracking-[0.3em] text-sky-300">Live Akurasi</span>
                  <span className={`text-lg font-bold ${isCaptureReady ? "text-emerald-300" : "text-amber-300"}`}>
                    {liveOverallPercent ?? "--"}%
                  </span>
                </div>
                <dl className="space-y-1 text-[0.7rem]">
                  <div className="flex items-center justify-between">
                    <dt>Deteksi</dt>
                    <dd>{liveDetectionPercent ?? "--"}%</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt>Posisi</dt>
                    <dd>{liveCenterPercent ?? "--"}%</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt>Skala</dt>
                    <dd>{liveSizePercent ?? "--"}%</dd>
                  </div>
                </dl>
                <p className={`text-[0.68rem] font-medium ${liveStatusClass}`}>{liveStatusText}</p>
              </div>
            ) : (
              <div className="pointer-events-none absolute left-4 top-20 sm:left-6 sm:top-24 lg:left-8 lg:top-28 rounded-full border border-slate-700/60 bg-slate-900/80 px-3 py-2 text-xs text-slate-300 shadow-lg">
                Mencari wajah...
              </div>
            )}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-between p-6">
              <div className="w-full rounded-full border border-white/10 bg-black/20 px-4 py-2 text-center text-xs font-semibold uppercase tracking-[0.3em] text-white/80">
                {step !== "finished" ? ORIENTATION_LABELS[step as Orientation] : "Analisis Sedang Berlangsung"}
              </div>
              <div className="w-full rounded-2xl border border-white/10 bg-black/30 p-4 text-center text-xs text-slate-100">
                Pastikan wajah berada di tengah frame dengan pencahayaan cukup.
              </div>
            </div>
          </div>

          {(isModelLoading || modelError) && (
            <div className="mt-3 space-y-1 text-center text-xs">
              {isModelLoading && <p className="text-slate-400">Memuat model deteksi wajah...</p>}
              {modelError && <p className="text-rose-400">{modelError}</p>}
            </div>
          )}
        </section>

        {mutation.isSuccess && !displayError && (
          <section className="rounded-3xl border border-emerald-400/30 bg-emerald-500/10 p-8 text-center text-slate-100">
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-200">Hasil Prediksi</p>
            <h2 className="mt-4 text-3xl font-semibold text-white">
              {prediction?.shape ?? "Tidak diketahui"}
            </h2>
            <p className="mt-2 text-sm text-emerald-200">Tingkat kepercayaan model</p>
            <p className="mt-4 text-4xl font-bold text-emerald-100">{confidencePercent ?? "--"}</p>
          </section>
        )}
      </div>
    </main>
  );
}
