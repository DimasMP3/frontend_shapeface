"use client";

import Link from "next/link";

export function CameraHeader() {
  return (
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
  );
}