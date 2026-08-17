import { type ButtonHTMLAttributes } from "react";

type Variant = "accent" | "accent-bordered" | "bordered" | "quiet" | "danger" | "danger-bordered";
type Size = "md" | "sm";

const variantClass: Record<Variant, string> = {
  accent:
    "bg-accent text-white hover:opacity-90 border border-transparent",
  "accent-bordered":
    "border border-accent text-accent hover:opacity-90 bg-transparent",
  bordered:
    "border border-line text-ink hover:border-accent bg-transparent",
  quiet: "border border-transparent text-muted hover:text-ink",
  danger:
    "bg-danger text-white hover:opacity-90 border border-transparent",
  "danger-bordered":
    "border border-danger text-danger hover:bg-danger hover:text-white bg-transparent",
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
      className={`inline-flex items-center justify-center rounded-[var(--radius-control)] font-semibold tracking-wide transition-[opacity,color,border-color,background-color] duration-[var(--motion-fast)] disabled:opacity-40 ${sizeClass[size]} ${variantClass[variant]} ${className}`}
      {...props}
    />
  );
}
