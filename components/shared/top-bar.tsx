import Link from "next/link";
import { APP_NAME } from "@/lib/brand";
import { Account, ChevronLeft } from "./icons";

// The bar at the top of every signed-in screen: a back link (or the app
// name on the first screen) and the account button.
export function TopBar({ back }: { back?: { href: string; label: string } }) {
  return (
    <header className="flex min-h-[52px] items-center justify-between pt-3 pr-2 pl-2">
      {back ? (
        <Link
          href={back.href}
          className="flex min-h-11 items-center gap-0.5 px-2 text-base font-medium no-underline"
        >
          <ChevronLeft size={20} />
          {back.label}
        </Link>
      ) : (
        <span className="px-2 text-[17px] font-bold tracking-tight">
          {APP_NAME}
        </span>
      )}
      <Link
        href="/account"
        aria-label="Account"
        className="flex size-11 items-center justify-center rounded-full text-muted no-underline hover:text-ink"
      >
        <Account size={22} />
      </Link>
    </header>
  );
}
