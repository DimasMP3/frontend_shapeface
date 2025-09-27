"use client";

type PredictionSummaryProps = {
  shape: string | null;
  confidencePercent: string | null;
};

export function PredictionSummary({ shape, confidencePercent }: PredictionSummaryProps) {
  return (
    <section className="rounded-3xl border border-emerald-400/30 bg-emerald-500/10 p-8 text-center text-slate-100">
      <p className="text-sm uppercase tracking-[0.3em] text-emerald-200">Hasil Prediksi</p>
      <h2 className="mt-4 text-3xl font-semibold text-white">{shape ?? "Tidak diketahui"}</h2>
      <p className="mt-2 text-sm text-emerald-200">Tingkat kepercayaan model</p>
      <p className="mt-4 text-4xl font-bold text-emerald-100">{confidencePercent ?? "--"}</p>
    </section>
  );
}