import * as faceapi from "face-api.js";

import { MIN_SIZE_RATIO, OPTIMAL_SIZE_RATIO } from "./constants";
import type { FaceMetrics } from "./types";

export function getDetectionConfidence(detection: faceapi.FaceDetection): number {
  const candidate = detection as unknown as { score?: number; classScore?: number };
  const value = candidate.score ?? candidate.classScore ?? 0;
  return Math.max(0, Math.min(1, value));
}

export function dataUrlToFile(dataUrl: string, filename: string): File {
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

export function createMetrics(
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