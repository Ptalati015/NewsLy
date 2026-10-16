"use client";

export default function ErrorScreen({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-start justify-center gap-3 px-6">
      <h1 className="text-[28px] leading-[34px] font-bold tracking-tight">
        Something went wrong
      </h1>
      <p className="text-[15px] leading-[22px] text-muted">
        This screen couldn&apos;t load. Yesterday&apos;s news is still saved;
        try again in a moment.
      </p>
      <button
        type="button"
        onClick={reset}
        className="min-h-11 rounded-xl border border-field bg-card px-4 text-[15px] font-semibold"
      >
        Try again
      </button>
    </main>
  );
}
