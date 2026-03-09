interface AvatarProps {
  seed: string;
  size?: number;
  className?: string;
}

export function Avatar({ seed, size = 40, className = "" }: AvatarProps) {
  const safeSeed = seed.trim() || "?";
  const url = `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(safeSeed)}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
  const initials = safeSeed.slice(0, 2).toUpperCase();

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-(--color-card) ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={url}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        className="h-full w-full object-cover"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
          const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
          fallback?.style.setProperty("display", "flex");
          fallback?.removeAttribute("aria-hidden");
        }}
      />
      <span
        className="absolute inset-0 hidden items-center justify-center font-semibold text-(--color-foreground)"
        style={{ fontSize: size * 0.3 }}
        aria-hidden="true"
      >
        {initials}
      </span>
    </div>
  );
}
