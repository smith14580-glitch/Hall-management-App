import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-xl bg-white p-10 text-center shadow-sm ring-1 ring-stone-line">
      <p className="font-display text-6xl font-bold text-gold">404</p>
      <h1 className="mt-4 font-display text-2xl font-bold text-charcoal">Page nahi mila</h1>
      <p className="mt-2 text-sm text-ink/60">
        Ye page exist nahi karta ya hata diya gaya hai. Dashboard par wapas jao.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-charcoal px-5 py-2.5 text-sm font-semibold text-white hover:bg-charcoal-light"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
