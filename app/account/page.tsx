import type { Metadata } from "next";
import { Suspense } from "react";
import { PageTitle } from "@/components/shared/page-title";
import { ScreenSkeleton } from "@/components/shared/skeleton";
import { TopBar } from "@/components/shared/top-bar";
import { requireViewer } from "@/lib/auth/viewer";
import { getSessionPolicy } from "@/lib/config";
import { STATE_TIME_ZONE } from "@/lib/format";

export const metadata: Metadata = { title: "Account" };

export default function AccountPage() {
  return (
    <Suspense fallback={<ScreenSkeleton rows={2} />}>
      <Account />
    </Suspense>
  );
}

async function Account() {
  const viewer = await requireViewer();
  const policy = getSessionPolicy();
  const until = viewer.expiresAt
    ? new Intl.DateTimeFormat("en-US", {
        timeZone: STATE_TIME_ZONE,
        dateStyle: "long",
      }).format(new Date(viewer.expiresAt))
    : null;
  return (
    <main className="pb-10">
      <TopBar back={{ href: "/", label: "Home" }} />
      <PageTitle
        title="Account"
        subtitle={viewer.demo ? "Demo mode" : viewer.email}
      />
      <section className="mx-4 mt-6 flex flex-col gap-2 rounded-2xl border border-line bg-card p-4">
        <h2 className="text-lg font-bold">Staying signed in</h2>
        <p className="text-[15px] leading-[23px] text-ink-2">
          You stay signed in on this device. For safety the session ends{" "}
          {policy.maxAgeDays} days after you sign in, or after {policy.idleDays}{" "}
          days without using the app, whichever comes first.
        </p>
        {until ? (
          <p className="text-[15px] leading-[23px] text-ink-2">
            If you keep using the app, this session lasts until {until}.
          </p>
        ) : null}
      </section>
      <form action="/auth/sign-out" method="post" className="mx-4 mt-4">
        <button
          type="submit"
          className="min-h-12 w-full rounded-xl border border-field bg-card text-[15px] font-semibold text-ink hover:bg-line-soft"
        >
          Sign out
        </button>
      </form>
    </main>
  );
}
