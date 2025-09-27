'use client';

import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import * as faceapi from 'face-api.js';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';

export type PredictionResponse = {
  shape: string;
  confidence: number;
};

type ErrorResponse = {
  error?: string;
};

const API_URL = 'http://127.0.0.1:5000/predict';

const FACE_DETECTOR_OPTIONS = new faceapi.TinyFaceDetectorOptions({
  inputSize: 512,
  scoreThreshold: 0.45,
});

export type UploadMutation = UseMutationResult<PredictionResponse, Error, File, unknown>;

export type UseUploadFlowResult = {
  selectedFile: File | null;
  previewUrl: string | null;
  isModelLoading: boolean;
  modelError: string | null;
  isValidatingFile: boolean;
  displayError: string | null;
  confidencePercent: string | null;
  handleFileChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
  resetForm: () => void;
  mutation: UploadMutation;
};

export function useUploadFlow(): UseUploadFlowResult {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [modelError, setModelError] = useState<string | null>(null);
  const [isValidatingFile, setIsValidatingFile] = useState(false);

  const validationIdRef = useRef(0);

  useEffect(() => {
    let isMounted = true;

    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
        ]);

        if (isMounted) {
          setIsModelLoading(false);
        }
      } catch (error) {
        console.error('Failed to load face detection models', error);
        if (isMounted) {
          setModelError('Gagal memuat model pendeteksi wajah.');
          setIsModelLoading(false);
        }
      }
    };

    loadModels();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedFile]);

  const mutation = useMutation<PredictionResponse, Error, File>({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(API_URL, {
        method: 'POST',
        body: formData,
      });

      const contentType = response.headers.get('content-type') ?? '';
      let payload: Partial<PredictionResponse & ErrorResponse> | null = null;

      if (contentType.includes('application/json')) {
        payload = await response.json();
      } else {
        const fallbackMessage = await response.text();
        throw new Error(
          fallbackMessage.trim() || 'Respons dari server tidak dapat dibaca.'
        );
      }

      if (!response.ok) {
        throw new Error(payload?.error || 'Gagal melakukan prediksi.');
      }

      if (
        !payload ||
        typeof payload.shape !== 'string' ||
        typeof payload.confidence !== 'number'
      ) {
        throw new Error('Respons dari server tidak lengkap.');
      }

      return {
        shape: payload.shape,
        confidence: payload.confidence,
      };
    },
  });

  const validateFaceImage = useCallback(async (file: File) => {
    const objectUrl = URL.createObjectURL(file);
    const fallbackMessage =
      'Gambar tidak dapat diproses. Pastikan format file valid dan wajah terlihat jelas.';

    try {
      const image = await faceapi.fetchImage(objectUrl);
      const detection = await faceapi.detectSingleFace(
        image,
        FACE_DETECTOR_OPTIONS
      );

      if (!detection) {
        throw new Error(
          'Tidak ditemukan wajah pada gambar. Gunakan foto dengan wajah jelas.'
        );
      }
    } catch (error) {
      if (error instanceof Error && error.message) {
        if (error.message.toLowerCase().includes('wajah')) {
          throw error;
        }
      }

      throw new Error(fallbackMessage);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }, []);

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const input = event.target;
      const file = input.files?.[0] ?? null;

      setSelectedFile(null);
      setFormError(null);
      mutation.reset();

      if (!file) {
        input.value = '';
        return;
      }

      if (isModelLoading) {
        setFormError(
          'Model pendeteksi wajah sedang dimuat. Coba lagi dalam beberapa saat.'
        );
        input.value = '';
        return;
      }

      if (modelError) {
        setFormError(modelError);
        input.value = '';
        return;
      }

      validationIdRef.current += 1;
      const currentValidationId = validationIdRef.current;

      setIsValidatingFile(true);

      try {
        await validateFaceImage(file);

        if (validationIdRef.current === currentValidationId) {
          setSelectedFile(file);
        }
      } catch (error) {
        const fallbackMessage =
          'Gambar tidak dapat diproses. Pastikan format file valid dan wajah terlihat jelas.';
        const message =
          error instanceof Error && error.message
            ? error.message
            : fallbackMessage;

        if (validationIdRef.current === currentValidationId) {
          setFormError(
            message.toLowerCase().includes('wajah') ? message : fallbackMessage
          );
        }
      } finally {
        if (validationIdRef.current === currentValidationId) {
          setIsValidatingFile(false);
        }
      }

      input.value = '';
    },
    [isModelLoading, modelError, mutation, validateFaceImage]
  );

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (isModelLoading) {
        setFormError('Model pendeteksi wajah sedang dimuat. Silakan tunggu.');
        return;
      }

      if (modelError) {
        setFormError(modelError);
        return;
      }

      if (isValidatingFile) {
        setFormError('Pemeriksaan wajah pada gambar masih berlangsung.');
        return;
      }

      if (!selectedFile) {
        setFormError('Silakan pilih gambar wajah terlebih dahulu.');
        return;
      }

      setFormError(null);
      mutation.mutate(selectedFile);
    },
    [isModelLoading, isValidatingFile, modelError, mutation, selectedFile]
  );

  const resetForm = useCallback(() => {
    validationIdRef.current += 1;
    setSelectedFile(null);
    setPreviewUrl(null);
    setFormError(null);
    setIsValidatingFile(false);
    mutation.reset();
  }, [mutation]);

  const confidenceValue = mutation.data
    ? Math.round(mutation.data.confidence * 1000) / 10
    : null;

  const confidencePercent = confidenceValue !== null ? `${confidenceValue}%` : null;

  const displayError = formError ?? modelError ?? mutation.error?.message ?? null;

  return {
    selectedFile,
    previewUrl,
    isModelLoading,
    modelError,
    isValidatingFile,
    displayError,
    confidencePercent,
    handleFileChange,
    handleSubmit,
    resetForm,
    mutation,
  };
}
