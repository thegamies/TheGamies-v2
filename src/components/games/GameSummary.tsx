"use client";

import { useLayoutEffect, useRef, useState } from "react";

export function GameSummary({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || open) return;

    const measure = () => {
      setOverflows(el.scrollHeight > el.clientHeight + 1);
    };
    measure();

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text, open]);

  return (
    <div className="mt-6">
      <p
        ref={ref}
        className={`font-serif text-lg leading-relaxed text-ink/90 ${open ? "" : "line-clamp-4"}`}
      >
        {text}
      </p>
      {overflows ? (
        <button
          type="button"
          aria-expanded={open}
          className="mt-2 text-[11px] font-extrabold tracking-[0.18em] text-accent uppercase hover:underline"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Show less" : "Show more"}
        </button>
      ) : null}
    </div>
  );
}
