export function AppLogo() {
  return (
    <span className="flex items-center gap-2.5">
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="size-5 text-logo"
        fill="currentColor"
      >
        <rect x="1" y="9" width="3.5" height="6" rx="0.75" />
        <rect x="6.25" y="5.5" width="3.5" height="9.5" rx="0.75" />
        <rect x="11.5" y="1" width="3.5" height="14" rx="0.75" />
      </svg>
      <span className="text-base font-semibold tracking-tight text-foreground">
        InvestTrack
      </span>
    </span>
  );
}
