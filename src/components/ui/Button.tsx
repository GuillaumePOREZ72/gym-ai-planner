import { type ButtonHTMLAttributes, forwardRef } from "react";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = "",
      variant = "primary",
      size = "md",
      isLoading,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    // Avant-Garde Minimalism: Stark contrast, sharp micro-interactions, clean typography.
    const baseStyles =
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm font-medium transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] select-none cursor-pointer";

    const variants: Record<ButtonVariant, string> = {
      primary:
        "bg-accent text-background shadow-[0_0_15px_rgba(163,230,53,0.1)] hover:bg-accent-hover hover:shadow-[0_0_20px_rgba(163,230,53,0.25)]",
      secondary: "bg-card text-foreground hover:bg-border",
      outline: "border border-border bg-transparent text-foreground hover:border-muted",
      ghost: "text-muted hover:text-foreground hover:bg-card/50",
    };

    const sizes: Record<ButtonSize, string> = {
      sm: "h-8 px-4 text-xs tracking-wide uppercase",
      md: "h-10 px-6 text-sm tracking-wide",
      lg: "h-12 px-8 text-base",
      icon: "h-10 w-10",
    };

    const classes = [baseStyles, variants[variant], sizes[size], className]
      .filter(Boolean)
      .join(" ");

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <svg
            className="mr-2 h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
