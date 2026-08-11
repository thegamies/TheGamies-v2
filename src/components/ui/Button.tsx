import { type ButtonHTMLAttributes } from "react";

type Variant = "accent" | "bordered" | "quiet";
type Size = "md" | "sm";

const variantClass: Record<Variant, string> = {
  accent:
    "bg-accent text-white hover:opacity-90 border border-transparent",
  bordered:
    "border border-line text-ink hover:border-accent bg-transparent",
  quiet: "border border-transparent text-muted hover:text-ink",
};

const sizeClass: Record<Size, string> = {
  md: "px-4 py-2 text-sm",
  sm: "h-9 px-3 text-xs",
};

export function Button({
  variant = "accent",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-[var(--radius-control)] font-semibold tracking-wide transition-[opacity,color,border-color] duration-[var(--motion-fast)] disabled:opacity-40 ${sizeClass[size]} ${variantClass[variant]} ${className}`}
      {...props}
    />
  );
}
