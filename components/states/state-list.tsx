"use client";

import { useId, useState } from "react";
import { ChevronRight, Search } from "@/components/shared/icons";
import type { UsState } from "@/lib/data/types";

// All 50 states with a search box. Open states post to /states/select,
// which remembers the choice; the rest say "Coming soon". Works without
// JavaScript too: the full list renders and the form posts normally.
export function StateList({ states }: { states: UsState[] }) {
  const [query, setQuery] = useState("");
  const inputId = useId();
  const q = query.trim().toLowerCase();
  const shown = states
    .filter((s) => q === "" || s.name.toLowerCase().includes(q))
    // Open states first, then alphabetical.
    .sort(
      (a, b) =>
        Number(b.enabled) - Number(a.enabled) || a.name.localeCompare(b.name),
    );

  return (
    <>
      <div className="flex flex-col gap-1.5 px-4 pt-4 pb-2">
        <label
          htmlFor={inputId}
          className="text-[13px] font-semibold text-ink-2"
        >
          Search states
        </label>
        <div className="flex min-h-12 items-center gap-2 rounded-xl border border-field bg-card px-3.5 focus-within:border-accent">
          <Search className="text-subtle" />
          <input
            id={inputId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a state name"
            autoComplete="off"
            className="grow bg-transparent text-base text-ink outline-none placeholder:text-subtle"
          />
        </div>
      </div>
      {shown.length === 0 ? (
        <p className="mx-4 mt-4 text-[15px] text-muted">
          No state matches “{query}”.
        </p>
      ) : (
        <ul className="mx-4 mt-2 flex flex-col overflow-hidden rounded-[14px] border border-line bg-card">
          {shown.map((state) => (
            <li
              key={state.code}
              className="border-b border-line-soft last:border-b-0"
            >
              {state.enabled ? (
                <form action="/states/select" method="post">
                  <button
                    type="submit"
                    name="state"
                    value={state.code}
                    className="flex min-h-16 w-full items-center gap-3 px-4 text-left text-ink hover:bg-line-soft"
                  >
                    <span className="grow text-[17px] font-semibold">
                      {state.name}
                    </span>
                    <span className="rounded-full bg-accent-soft px-2 py-1 text-xs font-semibold text-accent">
                      Beta
                    </span>
                    <ChevronRight className="text-muted" />
                  </button>
                </form>
              ) : (
                <div className="flex min-h-[52px] items-center px-4">
                  <span className="grow text-base text-muted">
                    {state.name}
                  </span>
                  <span className="text-[13px] text-subtle">Coming soon</span>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
