import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  ChefHat,
  Coins,
  HandCoins,
  Scale,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const theme = {
  "--ink": "#10222B",
  "--paper": "#F4F6F5",
  "--teal": "#0B6E5F",
  "--mint": "#D6EFE6",
  "--sun": "#FFC83D",
  "--line": "#D3DBD8",
} as React.CSSProperties;

const display = "font-[family-name:var(--font-display)]";

export default function LandingPage() {
  return (
    <div
      style={theme}
      className="min-h-screen bg-(--paper) text-(--ink) selection:bg-(--sun)"
    >
      <style>{`
        @keyframes print-out { from { transform: translateY(-100%); } to { transform: translateY(0); } }
        .receipt-print { animation: print-out 2.4s cubic-bezier(0.25, 0.6, 0.25, 1) 0.3s both; }
        @media (prefers-reduced-motion: reduce) { .receipt-print { animation: none; } }
      `}</style>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-(--line) bg-(--paper)/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link
            href="/"
            className={`${display} flex items-center gap-2 text-2xl font-bold`}
          >
            <span className="grid size-8 place-items-center rounded-md bg-(--teal) text-base text-white">
              H
            </span>
            Hub
          </Link>
          <nav className="hidden gap-8 text-sm font-medium md:flex">
            <a href="#fitur" className="hover:underline underline-offset-4">
              Fitur
            </a>
            <a href="#usaha" className="hover:underline underline-offset-4">
              Jenis usaha
            </a>
            <a href="#mulai" className="hover:underline underline-offset-4">
              Cara mulai
            </a>
            <a href="#faq" className="hover:underline underline-offset-4">
              Tanya jawab
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link href="/login">Masuk</Link>
            </Button>
            <Button asChild className="bg-(--ink) text-white hover:bg-(--teal)">
              <Link href="/register">Daftar</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl gap-12 px-5 pb-20 pt-10 md:grid-cols-[1.15fr_0.85fr] md:items-center md:pt-16">
          <div>
            <h1
              className={`${display} text-5xl font-extrabold leading-[1.02] tracking-tight md:text-7xl`}
            >
              Kasir, stok, dan laba toko Anda, tercatat rapi.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-(--ink)/75">
              Hub membantu toko, warung, kafe, dan usaha jasa mencatat setiap
              penjualan, menjaga stok tetap akurat, dan melihat untung rugi
              tanpa buku catatan.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="bg-(--teal) text-white hover:bg-(--ink)"
              >
                <Link href="/register">
                  Daftar sekarang <ArrowRight className="ml-1 size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-(--ink)/30 bg-transparent"
              >
                <a href="#fitur">Lihat fitur</a>
              </Button>
            </div>
          </div>

          <Receipt />
        </section>

        {/* Fitur */}
        <section id="fitur" className="border-t border-(--line) bg-white">
          <div className="mx-auto max-w-6xl px-5 py-20">
            <h2
              className={`${display} max-w-2xl text-4xl font-bold tracking-tight md:text-5xl`}
            >
              Dibuat untuk cara jualan yang sebenarnya.
            </h2>
            <p className="mt-4 max-w-xl text-(--ink)/70">
              Dari beras timbangan sampai kopi per gelas, dari bayar tunai
              sampai bon langganan.
            </p>

            <div className="mt-12 grid gap-4 md:grid-cols-6">
              <Feature
                className="md:col-span-4 bg-(--mint)"
                icon={<Wallet className="size-5" />}
                title="Satu transaksi, beberapa cara bayar"
              >
                Pembeli bayar separuh QRIS dan sisanya tunai? Catat keduanya di
                struk yang sama. Kembalian dihitung otomatis, dan transaksi yang
                salah ketik tidak akan tercatat dua kali.
              </Feature>
              <Feature
                className="md:col-span-2 bg-(--ink) text-white"
                icon={<Scale className="size-5" />}
                title="Jual curah"
                dark
              >
                Beras 2,5 kg, minyak 0,75 liter. Jumlah desimal didukung penuh,
                di kasir maupun di stok.
              </Feature>
              <Feature
                className="md:col-span-2"
                icon={<Boxes className="size-5" />}
                title="Stok yang bisa dilacak"
              >
                Setiap stok masuk, terjual, retur, atau disesuaikan punya
                riwayat. Lengkap dengan peringatan saat stok menipis.
              </Feature>
              <Feature
                className="md:col-span-2"
                icon={<HandCoins className="size-5" />}
                title="Bon pelanggan"
              >
                Catat piutang per pelanggan, atur batas bon, dan terima cicilan
                kapan saja.
              </Feature>
              <Feature
                className="md:col-span-2"
                icon={<ChefHat className="size-5" />}
                title="Resep untuk kafe & resto"
              >
                Jual satu porsi, bahan bakunya berkurang sendiri sesuai resep.
              </Feature>
              <Feature
                className="md:col-span-6 bg-(--sun)"
                icon={<Coins className="size-5" />}
                title="Laporan laba yang jujur"
              >
                Harga modal disimpan saat transaksi terjadi, jadi laba harian
                dan bulanan tidak berubah walau harga beli naik turun. Biaya
                operasional dan retur ikut dihitung.
              </Feature>
            </div>

            <p className="mt-8 text-sm text-(--ink)/70">
              Juga tersedia: satuan beli bertingkat (karung, dus, lusin), harga
              grosir, pembelian dari supplier, stok opname, shift kasir, kas
              masuk dan keluar, serta retur barang.
            </p>
          </div>
        </section>

        {/* Jenis usaha */}
        <section id="usaha" className="mx-auto max-w-6xl px-5 py-20">
          <h2
            className={`${display} max-w-2xl text-4xl font-bold tracking-tight md:text-5xl`}
          >
            Pilih jenis usaha, Hub menyesuaikan.
          </h2>
          <dl className="mt-12 divide-y divide-(--line) border-y border-(--line)">
            {[
              [
                "Toko & retail",
                "Barcode, varian ukuran dan warna, harga grosir, serta pembelian per karung atau dus.",
              ],
              [
                "Kafe & restoran",
                "Menu terhubung ke bahan baku lewat resep, jadi stok bahan ikut terpotong tiap menu terjual.",
              ],
              [
                "Jasa",
                "Layanan tanpa hitung stok. Cukup catat transaksi, pembayaran, dan laporan.",
              ],
              [
                "Usaha lainnya",
                "Aktifkan stok hanya pada barang yang perlu dihitung, sisanya jalan tanpa stok.",
              ],
            ].map(([t, d]) => (
              <div
                key={t}
                className="grid gap-2 py-6 md:grid-cols-[1fr_2fr] md:gap-8"
              >
                <dt className={`${display} text-2xl font-semibold`}>{t}</dt>
                <dd className="max-w-xl text-(--ink)/75">{d}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Cara mulai */}
        <section id="mulai" className="bg-(--ink) text-white">
          <div className="mx-auto max-w-6xl px-5 py-20">
            <h2
              className={`${display} max-w-2xl text-4xl font-bold tracking-tight md:text-5xl`}
            >
              Dari daftar sampai struk pertama.
            </h2>
            <ol className="mt-12 grid gap-8 md:grid-cols-4">
              {[
                ["Daftar akun", "Pakai email, tanpa kartu kredit."],
                ["Buat toko", "Isi nama toko dan pilih jenis usahanya."],
                ["Isi produk", "Tambah produk, varian, harga, dan stok awal."],
                [
                  "Mulai jualan",
                  "Buka kasir dan cetak atau kirim struk pertama.",
                ],
              ].map(([t, d], i) => (
                <li key={t} className="border-t border-white/25 pt-4">
                  <span
                    className={`${display} text-4xl font-bold text-(--sun)`}
                  >
                    {i + 1}
                  </span>
                  <h3 className="mt-3 text-lg font-semibold">{t}</h3>
                  <p className="mt-1 text-white/70">{d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto max-w-3xl px-5 py-20">
          <h2
            className={`${display} text-4xl font-bold tracking-tight md:text-5xl`}
          >
            Tanya jawab
          </h2>
          <Accordion type="single" collapsible className="mt-10">
            {[
              [
                "Apakah kasir bisa melihat harga modal dan laporan?",
                "Tidak. Akun kasir hanya bisa menjual dan melihat stok. Laporan, harga modal, dan pengaturan hanya untuk pemilik.",
              ],
              [
                "Bagaimana kalau transaksi salah?",
                "Transaksi bisa dibatalkan (void) dengan alasan, dan stok otomatis dikembalikan. Untuk barang yang dikembalikan pembeli, gunakan fitur retur.",
              ],
              [
                "Apakah bisa jual barang per kilo atau per liter?",
                "Bisa. Tandai satuan produk sebagai curah, lalu jumlahnya boleh berupa desimal.",
              ],
              [
                "Apakah cocok untuk kafe yang bahan bakunya dihitung?",
                "Cocok. Hubungkan menu dengan bahan di resep, dan stok bahan berkurang tiap menu terjual.",
              ],
              [
                "Bagaimana mencatat pelanggan yang berutang?",
                "Pilih bayar dengan bon di kasir. Hub mencatat piutang per pelanggan dan Anda bisa menerima pembayaran cicilan kapan saja.",
              ],
            ].map(([q, a]) => (
              <AccordionItem key={q} value={q}>
                <AccordionTrigger className="text-left text-base font-semibold">
                  {q}
                </AccordionTrigger>
                <AccordionContent className="text-(--ink)/75">
                  {a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-5 pb-20">
          <div className="relative grid overflow-hidden rounded-2xl bg-(--teal) text-white md:grid-cols-[1fr_260px]">
            {/* pola titik */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-60"
              style={{
                backgroundImage:
                  "radial-gradient(rgba(255,255,255,0.18) 1.2px, transparent 1.4px)",
                backgroundSize: "18px 18px",
                maskImage: "linear-gradient(90deg, black, transparent 80%)",
                WebkitMaskImage:
                  "linear-gradient(90deg, black, transparent 80%)",
              }}
            />
            <div className="relative px-8 py-14 md:px-14">
              <h2
                className={`${display} max-w-xl text-4xl font-bold tracking-tight md:text-5xl`}
              >
                Buka kasir pertama Anda hari ini.
              </h2>
              <p className="mt-4 max-w-md text-white/75">
                Daftar, buat toko, dan catat penjualan pertama dalam beberapa
                menit.
              </p>
              <div className="mt-8">
                <Button
                  asChild
                  size="lg"
                  className="bg-(--sun) text-(--ink) hover:bg-white"
                >
                  <Link href="/register">Daftar sekarang</Link>
                </Button>
              </div>
            </div>

            {/* sobekan tiket + barcode */}
            <div className="relative flex flex-col items-center justify-center gap-3 border-t-2 border-dashed border-white/40 bg-black/10 px-8 py-8 md:border-l-2 md:border-t-0">
              <span
                aria-hidden
                className="absolute -top-3 left-1/2 hidden size-6 -translate-x-1/2 rounded-full bg-(--paper) md:block md:-left-3 md:top-[-12px] md:translate-x-0"
              />
              <span
                aria-hidden
                className="absolute -bottom-3 hidden size-6 rounded-full bg-(--paper) md:-left-3 md:block"
              />
              <Barcode />
              <span className="font-[family-name:var(--font-receipt)] text-xs tracking-widest text-white/70">
                HUB-000001
              </span>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-(--line)">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm text-(--ink)/70">
          <span className={`${display} text-lg font-bold text-(--ink)`}>
            Hub
          </span>
          <span>
            © {new Date().getFullYear()} Hub. Dibuat untuk UMKM Indonesia.
          </span>
        </div>
      </footer>
    </div>
  );
}

function Feature({
  title,
  icon,
  children,
  className = "",
  dark = false,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  dark?: boolean;
}) {
  return (
    <article
      className={`relative overflow-hidden rounded-xl border border-(--line) p-6 md:p-8 ${className}`}
    >
      <DotMotif dark={dark} />
      <div
        className={`relative grid size-9 place-items-center rounded-lg ${
          dark ? "bg-white/15" : "bg-(--ink)/10"
        }`}
      >
        {icon}
      </div>
      <h3 className={`${display} relative mt-5 text-2xl font-semibold`}>
        {title}
      </h3>
      <p
        className={`relative mt-2 max-w-md leading-relaxed ${dark ? "text-white/75" : "text-(--ink)/75"}`}
      >
        {children}
      </p>
    </article>
  );
}

function Receipt() {
  const rows = [
    ["Beras curah", "2,5 kg × 14.000", "35.000"],
    ["Kopi susu (Large)", "2 × 18.000", "36.000"],
    ["Gula pasir", "1 kg × 17.000", "17.000"],
  ];
  return (
    <div className="mx-auto w-full max-w-sm rotate-1">
      {/* slot printer */}
      <div
        aria-hidden
        className="relative z-10 mx-2 h-3 rounded-full bg-(--ink)"
      />
      {/* kertas keluar dari slot; overflow-hidden memotong bagian yang belum keluar */}
      <div className="-mt-1.5 overflow-hidden px-4 pb-8">
        <div className="receipt-print drop-shadow-[0_14px_16px_rgba(16,34,43,0.22)]">
          <div className="bg-white px-6 py-7 font-[family-name:var(--font-receipt)] text-[13px]">
            <p className="text-center text-base font-medium">
              TOKO BERKAH JAYA
            </p>
            <p className="text-center text-(--ink)/60">Struk #0142</p>
            <div className="my-4 border-t border-dashed border-(--ink)/40" />
            <ul className="space-y-3">
              {rows.map(([n, q, t]) => (
                <li key={n}>
                  <div className="flex justify-between gap-3">
                    <span>{n}</span>
                    <span>{t}</span>
                  </div>
                  <span className="text-(--ink)/60">{q}</span>
                </li>
              ))}
            </ul>
            <div className="my-4 border-t border-dashed border-(--ink)/40" />
            <div className="flex justify-between text-base font-medium">
              <span>Total</span>
              <span>88.000</span>
            </div>
            <div className="mt-3 space-y-1 text-(--ink)/70">
              <div className="flex justify-between">
                <span>QRIS</span>
                <span>50.000</span>
              </div>
              <div className="flex justify-between">
                <span>Tunai</span>
                <span>40.000</span>
              </div>
              <div className="flex justify-between">
                <span>Kembali</span>
                <span>2.000</span>
              </div>
            </div>
            <div className="my-4 border-t border-dashed border-(--ink)/40" />
            <p className="text-center text-(--ink)/60">
              Terima kasih sudah berbelanja
            </p>
          </div>
          {/* sobekan kertas */}
          <div
            aria-hidden
            className="h-3 bg-white"
            style={{
              clipPath:
                "polygon(0 0,100% 0,100% 40%,95% 100%,90% 40%,85% 100%,80% 40%,75% 100%,70% 40%,65% 100%,60% 40%,55% 100%,50% 40%,45% 100%,40% 40%,35% 100%,30% 40%,25% 100%,20% 40%,15% 100%,10% 40%,5% 100%,0 40%)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

function DotMotif({ dark }: { dark?: boolean }) {
  const mask = "radial-gradient(circle at 100% 100%, black, transparent 65%)";
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundImage: `radial-gradient(${dark ? "rgba(255,255,255,.28)" : "rgba(16,34,43,.2)"} 1.2px, transparent 1.4px)`,
        backgroundSize: "18px 18px",
        maskImage: mask,
        WebkitMaskImage: mask,
      }}
    />
  );
}

const BARS = [
  2, 1, 3, 1, 1, 2, 4, 1, 2, 1, 3, 2, 1, 1, 4, 2, 1, 3, 1, 2, 2, 1, 3, 1, 4, 1,
  2, 3, 1, 2,
];

function Barcode() {
  return (
    <div aria-hidden className="flex h-16 items-stretch">
      {BARS.map((w, i) => (
        <span
          key={i}
          style={{ width: w * 2 }}
          className={i % 2 === 0 ? "bg-white" : "bg-transparent"}
        />
      ))}
    </div>
  );
}
