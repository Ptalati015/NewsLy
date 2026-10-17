import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Newspaper } from "@/components/shared/icons";
import { signInMessage } from "@/lib/auth/messages";
import { safeNextPath } from "@/lib/auth/safe-next";
import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE } from "@/lib/brand";
import { getSessionPolicy, getSupabaseConfig, isDemoMode } from "@/lib/config";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage(props: PageProps<"/sign-in">) {
  return (
    <main className="flex min-h-dvh flex-col px-6 py-8">
      <div className="flex grow flex-col justify-center gap-4">
        <div className="flex items-center gap-2.5">
          <span className="flex size-10 items-center justify-center rounded-[10px] bg-accent text-white">
            <Newspaper size={22} />
          </span>
          <span className="text-[30px] font-bold tracking-tight">
            {APP_NAME}
          </span>
        </div>
        <h1 className="font-serif text-[34px] leading-10 font-semibold tracking-tight">
          {APP_TAGLINE}
        </h1>
        <p className="text-base leading-6 text-muted">{APP_DESCRIPTION}</p>
      </div>
      <Suspense fallback={<SignInActions next="/" message={null} />}>
        <SignInPanel searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}

async function SignInPanel({
  searchParams,
}: {
  searchParams: PageProps<"/sign-in">["searchParams"];
}) {
  const params = await searchParams;
  const next = safeNextPath(
    typeof params.next === "string" ? params.next : null,
  );
  const message = signInMessage(params.reason, getSessionPolicy());
  return <SignInActions next={next} message={message} />;
}

function SignInActions({
  next,
  message,
}: {
  next: string;
  message: string | null;
}) {
  const demo = isDemoMode();
  const configured = getSupabaseConfig() !== null;
  return (
    <div className="flex flex-col gap-3">
      {message ? (
        <p
          role="status"
          className="rounded-xl border border-line bg-card px-4 py-3 text-[15px] leading-[22px] text-ink-2"
        >
          {message}
        </p>
      ) : null}
      {demo ? (
        <>
          <p className="rounded-xl border border-line bg-demo-soft px-4 py-3 text-[15px] leading-[22px] text-demo">
            Demo mode: no sign-in, data from the seed files.
          </p>
          <Link href="/states" className={buttonClass}>
            Open the demo
          </Link>
        </>
      ) : configured ? (
        <form action="/auth/sign-in" method="post">
          <input type="hidden" name="next" value={next} />
          <button type="submit" className={buttonClass}>
            Continue with Google
          </button>
        </form>
      ) : (
        <>
          <p className="rounded-xl border border-line bg-card px-4 py-3 text-[15px] leading-[22px] text-ink-2">
            Sign-in isn&apos;t set up yet. It turns on once the Supabase project
            and Google sign-in are connected.
          </p>
          <button
            type="button"
            disabled
            className={`${buttonClass} opacity-50`}
          >
            Continue with Google
          </button>
        </>
      )}
      <p className="mt-1 text-center text-[13px] leading-5 text-muted">
        Beta: invite only, California elections.
      </p>
    </div>
  );
}

const buttonClass =
  "flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-xl bg-accent text-base font-semibold text-white no-underline hover:bg-accent-strong hover:text-white";
