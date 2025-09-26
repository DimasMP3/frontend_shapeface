import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center px-4 py-16">
      <div className="w-full space-y-12">
        <header className="space-y-4 text-center">
          <span className="rounded-full border border-sky-400/40 bg-sky-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-sky-200">
            Face Shape AI
          </span>
          <h1 className="text-3xl font-semibold text-white sm:text-4xl">
            Pilih Metode Analisis Bentuk Wajah Anda
          </h1>
          <p className="text-sm text-slate-300 sm:text-base">
            Gunakan kamera untuk panduan pemindaian multi-langkah atau unggah foto wajah terbaik Anda.
            Sistem akan mengirim gambar ke model kami untuk memprediksi bentuk wajah dan tingkat kepercayaannya.
          </p>
        </header>

        <section className="grid gap-8 md:grid-cols-2">
          <div className="flex flex-col justify-between rounded-3xl border border-white/10 bg-white/5 p-8 shadow-[0_30px_70px_-24px_rgba(15,118,230,0.45)] backdrop-blur">
            <div className="space-y-4">
              <span className="text-[0.65rem] font-semibold uppercase tracking-[0.4em] text-sky-200">
                Live Camera
              </span>
              <h2 className="text-2xl font-semibold text-white">Pemindaian Multi-Arah</h2>
              <p className="text-sm text-slate-300">
                Ikuti tiga langkah pengambilan gambar (depan, kiri, dan kanan). Gambar tampak depan akan otomatis dikirim untuk dianalisis setelah semua langkah selesai.
              </p>
            </div>
            <Link
              href="/camera"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-white drop-shadow-[0_1px_2px_rgba(15,23,42,0.45)] transition hover:bg-sky-400"
            >
              Gunakan Kamera
            </Link>
          </div>

          <div className="flex flex-col justify-between rounded-3xl border border-white/10 bg-white/5 p-8 shadow-[0_30px_70px_-24px_rgba(34,197,94,0.35)] backdrop-blur">
            <div className="space-y-4">
              <span className="text-[0.65rem] font-semibold uppercase tracking-[0.4em] text-emerald-200">
                Upload Foto
              </span>
              <h2 className="text-2xl font-semibold text-white">Unggah Gambar Wajah</h2>
              <p className="text-sm text-slate-300">
                Pilih satu foto wajah dengan pencahayaan baik dan serahkan pada model untuk mendapatkan prediksi bentuk wajah secara instan.
              </p>
            </div>
            <Link
              href="/upload"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-white drop-shadow-[0_1px_2px_rgba(15,23,42,0.45)] transition hover:bg-emerald-400"
            >
              Unggah Foto
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
