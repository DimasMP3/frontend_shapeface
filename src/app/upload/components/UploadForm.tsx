'use client';

import type { ChangeEvent, FormEvent } from 'react';

type UploadFormProps = {
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  onReset: () => void;
  previewUrl: string | null;
  isFileInputDisabled: boolean;
  isModelLoading: boolean;
  isValidatingFile: boolean;
  isSubmitDisabled: boolean;
  isMutating: boolean;
  showResetButton: boolean;
};

export function UploadForm({
  onSubmit,
  onFileChange,
  onReset,
  previewUrl,
  isFileInputDisabled,
  isModelLoading,
  isValidatingFile,
  isSubmitDisabled,
  isMutating,
  showResetButton,
}: UploadFormProps) {
  return (
    <form
      onSubmit={onSubmit}
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
            onChange={onFileChange}
            disabled={isFileInputDisabled}
            className="w-full rounded-lg border border-slate-700/60 bg-slate-900/40 px-4 py-3 text-sm text-slate-200 file:mr-4 file:rounded-md file:border-none file:bg-emerald-500 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 disabled:cursor-not-allowed"
          />
          <div className="space-y-1 text-xs">
            {isModelLoading && (
              <p className="text-slate-400">Memuat model pendeteksi wajah...</p>
            )}
            {isValidatingFile && !isModelLoading && (
              <p className="text-emerald-200">Memeriksa wajah pada gambar...</p>
            )}
          </div>
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
          disabled={isSubmitDisabled}
          className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-white drop-shadow-[0_1px_2px_rgba(15,23,42,0.45)] transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isModelLoading
            ? 'Menyiapkan model...'
            : isValidatingFile
            ? 'Memeriksa wajah...'
            : isMutating
            ? 'Menganalisis...'
            : 'Prediksi Sekarang'}
        </button>
        {showResetButton && (
          <button
            type="button"
            onClick={onReset}
            disabled={isMutating || isValidatingFile}
            className="inline-flex items-center justify-center rounded-full border border-slate-700/60 px-5 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            Reset Form
          </button>
        )}
        {isMutating && (
          <span className="flex items-center gap-2 text-xs text-emerald-200">
            <span className="h-2 w-2 animate-ping rounded-full bg-emerald-400" />
            Menganalisis...
          </span>
        )}
      </div>
    </form>
  );
}
