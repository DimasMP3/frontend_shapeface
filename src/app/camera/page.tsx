"use client";

import { useMutation } from "@tanstack/react-query";
import * as faceapi from "face-api.js";
import { useCallback, useEffect, useRef, useState } from "react";
import type Webcam from "react-webcam";

import { CameraHeader } from "./components/CameraHeader";
import { CameraViewport } from "./components/CameraViewport";
import { CaptureSidebar } from "./components/CaptureSidebar";
import { PredictionSummary } from "./components/PredictionSummary";
import {
  API_URL,
  BOX_PADDING_RATIO,
  DETECTION_INTERVAL_MS,
  FACE_DETECTOR_OPTIONS,
  MAX_METRIC_AGE_MS,
  MIN_DETECTION_SCORE,
  MIN_OVERALL_SCORE,
  ORIENTATION_LABELS,
  STEP_CONTENT,
  VIDEO_CONSTRAINTS,
} from "./constants";
import { createMetrics, dataUrlToFile, getDetectionConfidence } from "./utils";
import type {
  ErrorResponse,
  FaceMetrics,
  Orientation,
  PredictionResponse,
  ScanStep,
} from "./types";

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
        <CameraHeader />

        <section className="grid gap-8 lg:grid-cols-[1.2fr_minmax(260px,1fr)]">
          <CaptureSidebar
            step={step}
            stepContent={stepContent}
            orientationLabels={ORIENTATION_LABELS}
            captures={captures}
            onCapture={handleCapture}
            onReset={resetProcess}
            isCaptureReady={isCaptureReady}
            isMutating={mutation.isPending}
            isMutationSuccess={mutation.isSuccess}
            captureButtonLabel={captureButtonLabel}
            liveStatusClass={liveStatusClass}
            liveStatusText={liveStatusText}
            nextOrientation={nextOrientation}
            displayError={displayError}
          />

          <div className="space-y-3">
            <CameraViewport
              webcamRef={webcamRef}
              canvasRef={canvasRef}
              onVideoPlay={handleVideoPlay}
              metrics={{
                overallPercent: liveOverallPercent,
                detectionPercent: liveDetectionPercent,
                centerPercent: liveCenterPercent,
                sizePercent: liveSizePercent,
              }}
              showMetrics={Boolean(liveMetrics)}
              liveStatusClass={liveStatusClass}
              liveStatusText={liveStatusText}
              isCaptureReady={isCaptureReady}
              step={step}
              orientationLabels={ORIENTATION_LABELS}
              videoConstraints={VIDEO_CONSTRAINTS}
            />

            {(isModelLoading || modelError) && (
              <div className="space-y-1 text-center text-xs">
                {isModelLoading && <p className="text-slate-400">Memuat model deteksi wajah...</p>}
                {modelError && <p className="text-rose-400">{modelError}</p>}
              </div>
            )}
          </div>
        </section>

        {mutation.isSuccess && !displayError && (
          <PredictionSummary shape={prediction?.shape ?? null} confidencePercent={confidencePercent} />
        )}
      </div>
    </main>
  );
}