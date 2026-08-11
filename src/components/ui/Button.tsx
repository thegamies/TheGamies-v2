import { type ButtonHTMLAttributes } from "react";

type Variant = "accent" | "bordered" | "quiet";

const variantClass: Record<Variant, string> = {
  accent:
    "bg-accent text-white hover:opacity-90 border border-transparent",
  bordered:
    "border border-line text-ink hover:border-accent bg-transparent",
  quiet: "border border-transparent text-muted hover:text-ink",
};

export function Button({
  variant = "accent",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-[var(--radius-control)] px-4 py-2 text-sm font-semibold tracking-wide transition-[opacity,color,border-color] duration-[var(--motion-fast)] disabled:opacity-40 ${variantClass[variant]} ${className}`}
      {...props}
    />
  );
}
