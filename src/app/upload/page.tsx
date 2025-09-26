'use client';

import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';

type PredictionResponse = {
  shape: string;
  confidence: number;
};

type ErrorResponse = {
  error?: string;
};

const API_URL = 'http://127.0.0.1:5000/predict';

export default function UploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

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

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const input = event.target;
      const file = input.files?.[0] ?? null;

      setSelectedFile(file);
      setFormError(null);

      if (file) {
        mutation.reset();
      }

      input.value = '';
    },
    [mutation]
  );

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!selectedFile) {
        setFormError('Silakan pilih gambar wajah terlebih dahulu.');
        return;
      }

      setFormError(null);
      mutation.mutate(selectedFile);
    },
    [mutation, selectedFile]
  );

  const resetForm = useCallback(() => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setFormError(null);
    mutation.reset();
  }, [mutation]);

  const confidenceValue = mutation.data
    ? Math.round(mutation.data.confidence * 1000) / 10
    : null;

  const confidencePercent = confidenceValue !== null ? `${confidenceValue}%` : null;

  const displayError = formError ?? mutation.error?.message ?? null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center px-4 py-16">
      <div className="w-full space-y-10">
        <header className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="space-y-3">
            <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200">
              Face Shape AI
            </span>
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">
              Unggah Foto untuk Analisis Cepat
            </h1>
            <p className="text-sm text-slate-300 sm:text-base">
              Pilih satu gambar wajah terbaik Anda, lalu kirim ke model kami untuk memprediksi bentuk wajah beserta tingkat kepercayaannya.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <Link
              href="/camera"
              className="inline-flex items-center justify-center rounded-full border border-slate-700/60 px-5 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
            >
              Gunakan Kamera
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full border border-slate-800 px-5 py-2 text-xs font-semibold text-slate-400 transition hover:border-slate-600 hover:text-slate-200"
            >
              Kembali ke Beranda
            </Link>
          </div>
        </header>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-[0_30px_70px_-24px_rgba(34,197,94,0.35)] backdrop-blur"
        >
          <div className="flex flex-col gap-6 lg:flex-row">
            <div className="flex-1 space-y-3">
              <div className="space-y-2">
                <span className="text-[0.65rem] font-semibold uppercase tracking-[0.4em] text-emerald-200">
                  Langkah 1
                </span>
                <h2 className="text-2xl font-semibold text-white">
                  Pilih Gambar Wajah (PNG/JPG)
                </h2>
                <p className="text-sm text-slate-300">
                  Pastikan wajah jelas, minim bayangan, dan menghadap kamera agar model dapat mengenali fitur wajah dengan optimal.
                </p>
              </div>

              <input
                id="face-image"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={mutation.isPending}
                className="w-full rounded-lg border border-slate-700/60 bg-slate-900/40 px-4 py-3 text-sm text-slate-200 file:mr-4 file:rounded-md file:border-none file:bg-emerald-500 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 disabled:cursor-not-allowed"
              />
            </div>

            <div className="flex w-full max-w-xs items-center justify-center">
              <div className="flex h-52 w-full items-center justify-center overflow-hidden rounded-2xl border border-dashed border-slate-600/70 bg-slate-900/70">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="Pratinjau wajah" className="h-full w-full object-cover" />
                ) : (
                  <span className="px-6 text-center text-xs text-slate-400">
                    Pratinjau gambar akan muncul di sini setelah Anda memilih file.
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-between gap-3 text-sm text-slate-300 sm:flex-row">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-white drop-shadow-[0_1px_2px_rgba(15,23,42,0.45)] transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {mutation.isPending ? 'Menganalisis...' : 'Prediksi Sekarang'}
            </button>
            {(selectedFile || mutation.isSuccess || Boolean(displayError)) && (
              <button
                type="button"
                onClick={resetForm}
                disabled={mutation.isPending}
                className="inline-flex items-center justify-center rounded-full border border-slate-700/60 px-5 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Reset Form
              </button>
            )}
            {mutation.isPending && (
              <span className="flex items-center gap-2 text-xs text-emerald-200">
                <span className="h-2 w-2 animate-ping rounded-full bg-emerald-400" />
                Menganalisis...
              </span>
            )}
          </div>
        </form>

        {displayError && (
          <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-6 py-4 text-sm text-red-200">
            {displayError}
          </div>
        )}

        {mutation.isSuccess && !displayError && (
          <section className="rounded-3xl border border-emerald-400/30 bg-emerald-500/10 p-8 text-center text-slate-100">
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-200">Hasil Prediksi</p>
            <h2 className="mt-4 text-3xl font-semibold text-white">
              {mutation.data.shape}
            </h2>
            <p className="mt-2 text-sm text-emerald-200">
              Tingkat kepercayaan model
            </p>
            <p className="mt-4 text-4xl font-bold text-emerald-100">
              {confidencePercent}
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
