import * as faceapi from "face-api.js";

import type { Orientation, ScanStep, StepContent } from "./types";

export const API_URL = "http://127.0.0.1:5000/predict";

export const ORIENTATION_LABELS: Record<Orientation, string> = {
  front: "Tampak Depan",
  left: "Tampak Kiri",
  right: "Tampak Kanan",
};

export const STEP_CONTENT: Record<ScanStep, StepContent> = {
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

export const VIDEO_CONSTRAINTS = {
  facingMode: "user" as const,
  width: 640,
  height: 480,
};

export const DETECTION_INTERVAL_MS = 80;
export const BOX_PADDING_RATIO = 0.25;
export const FACE_DETECTOR_OPTIONS = new faceapi.TinyFaceDetectorOptions({
  inputSize: 512,
  scoreThreshold: 0.45,
});

export const MIN_DETECTION_SCORE = 0.6;
export const MIN_OVERALL_SCORE = 0.65;
export const MAX_METRIC_AGE_MS = 800;
export const MIN_SIZE_RATIO = 0.18;
export const OPTIMAL_SIZE_RATIO = 0.45;