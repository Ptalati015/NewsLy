import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-start justify-center gap-3 px-6">
      <h1 className="text-[28px] leading-[34px] font-bold tracking-tight">
        Page not found
      </h1>
      <p className="text-[15px] leading-[22px] text-muted">
        That link doesn&apos;t match a state, election, race or candidate we
        follow.
      </p>
      <Link
        href="/"
        className="flex min-h-11 items-center text-base font-semibold"
      >
        Go to the start
      </Link>
    </main>
  );
}
