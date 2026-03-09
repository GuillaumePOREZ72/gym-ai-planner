interface AvatarProps {
  seed: string;
  size?: number;
  className?: string;
}

export function Avatar({ seed, size = 40, className = "" }: AvatarProps) {
  const url = `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9`;

  const initials = seed.slice(0, 2).toUpperCase();

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-(--color-card) ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={url}
        alt="avatar"
        width={size}
        height={size}
        className="h-full w-full object-cover"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
          (e.currentTarget.nextElementSibling as HTMLElement | null)?.style.setProperty("display", "flex");
        }}
      />
      <span
        className="absolute inset-0 hidden items-center justify-center text-xs font-semibold text-(--color-foreground)"
        aria-hidden="true"
      >
        {initials}
      </span>
    </div>
  );
}
