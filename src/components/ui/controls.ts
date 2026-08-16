/** Shared list-builder / toolbar control classes — one visual language. */

export const controlLabelClass =
  "text-sm font-medium tracking-wide text-muted";

export const controlGroupBarClass =
  "flex h-9 overflow-hidden border border-line rounded-[var(--radius-control)]";

export const controlGroupClass = `mt-1 ${controlGroupBarClass}`;

/** Use in stacked panels (settings) so segments span the panel width. */
export const controlGroupFullClass = `${controlGroupClass} w-full`;

export function segmentBtnClass(active: boolean): string {
  return `inline-flex h-full min-w-0 flex-1 items-center justify-center px-3 text-xs font-semibold tracking-wide transition-colors duration-[var(--motion-fast)] ${
    active
      ? "bg-accent text-white"
      : "bg-transparent text-muted hover:bg-panel hover:text-ink"
  }`;
}

export function iconControlClass(active = false): string {
  return `inline-flex h-9 w-9 shrink-0 items-center justify-center border rounded-[var(--radius-control)] text-sm transition-colors duration-[var(--motion-fast)] ${
    active
      ? "border-accent text-accent"
      : "border-line text-muted hover:border-accent hover:text-ink"
  }`;
}

export const stepperBtnClass =
  "inline-flex h-full w-9 shrink-0 items-center justify-center text-muted transition-colors duration-[var(--motion-fast)] hover:bg-panel hover:text-ink disabled:cursor-not-allowed disabled:opacity-30";

export const stepperValueClass =
  "inline-flex h-full min-w-14 items-center justify-center gap-1 border-x border-line px-2 text-sm font-semibold text-ink transition-colors duration-[var(--motion-fast)] hover:text-accent";

export const fieldInputClass =
  "mt-1 block w-full border border-line bg-panel px-3 py-2 text-base text-ink outline-none transition-colors duration-[var(--motion-fast)] focus:border-accent rounded-[var(--radius-control)] lg:text-sm";

/** Date / time picker trigger — button, not a text field. */
export const pickerTriggerClass =
  "flex h-9 w-full min-w-0 items-center gap-2 rounded-[var(--radius-control)] border border-line bg-panel px-3 text-left text-sm outline-none transition-colors duration-[var(--motion-fast)] hover:border-accent focus-visible:border-accent disabled:opacity-40";

/**
 * Native radio, restyled. Unchecked: `--line` ring. Checked: `--accent` fill.
 * Circle so it does not read as a checkbox (`--radius-control` stays on inputs).
 */
export const radioControlClass =
  "mt-0.5 size-4 shrink-0 appearance-none rounded-full border border-line bg-paper align-top transition-colors duration-[var(--motion-fast)] checked:border-accent checked:bg-accent focus-visible:outline-none focus-visible:border-accent disabled:opacity-40";

export const radioOptionClass =
  "flex cursor-pointer gap-3 text-sm text-ink";

/** Match `Button` sm height in toolbars. */
export const toolbarButtonClass = "h-9 px-3 text-xs";
