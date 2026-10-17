import type { Metadata } from "next";
import { Suspense } from "react";
import { Note, PageTitle } from "@/components/shared/page-title";
import { ScreenSkeleton } from "@/components/shared/skeleton";
import { TopBar } from "@/components/shared/top-bar";
import { StateList } from "@/components/states/state-list";
import { getRepo } from "@/lib/auth/viewer";

export const metadata: Metadata = { title: "Choose your state" };

export default function StatesPage() {
  return (
    <Suspense fallback={<ScreenSkeleton rows={6} />}>
      <States />
    </Suspense>
  );
}

async function States() {
  const repo = await getRepo();
  const states = await repo.listStates();
  return (
    <main className="pb-10">
      <TopBar />
      <PageTitle
        title="Choose your state"
        subtitle="We'll remember it and open here next time."
      />
      <StateList states={states} />
      <Note>
        All 50 states are listed. More open up after the California beta.
      </Note>
    </main>
  );
}
