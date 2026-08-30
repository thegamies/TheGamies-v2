import { type InputHTMLAttributes, type ReactNode } from "react";
import { radioControlClass, radioOptionClass } from "@/components/ui/controls";

export function Radio({
  className = "",
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  return (
    <input
      type="radio"
      className={`${radioControlClass} ${className}`}
      {...props}
    />
  );
}

export function RadioOption({
  children,
  hint,
  className = "",
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <label className={`${radioOptionClass} ${className}`}>
      <Radio {...props} />
      <span>
        <span className="font-medium">{children}</span>
        {hint ? (
          <span className="mt-0.5 block text-muted">{hint}</span>
        ) : null}
      </span>
    </label>
  );
}
