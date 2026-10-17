export function PageTitle({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 px-4 pt-2">
      <h1 className="text-[28px] leading-[34px] font-bold tracking-tight">
        {title}
      </h1>
      {subtitle ? (
        <p className="text-[15px] leading-[22px] text-muted">{subtitle}</p>
      ) : null}
      {children}
    </div>
  );
}

export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mx-4 mt-6 mb-2 text-[13px] font-bold tracking-[0.06em] text-muted uppercase">
      {children}
    </h2>
  );
}

export function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="mx-4 mt-4 text-[13px] leading-5 text-muted">{children}</p>
  );
}
