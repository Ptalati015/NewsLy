import { initials } from "@/lib/format";

export function CandidateAvatar({
  name,
  size = "md",
}: {
  name: string;
  size?: "md" | "lg";
}) {
  const box = size === "lg" ? "size-16 text-[22px]" : "size-12 text-[17px]";
  return (
    <span
      aria-hidden="true"
      className={`${box} flex shrink-0 items-center justify-center rounded-full bg-accent-soft font-bold text-accent`}
    >
      {initials(name)}
    </span>
  );
}
