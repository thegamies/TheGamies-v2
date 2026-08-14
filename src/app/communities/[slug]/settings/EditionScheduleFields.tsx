"use client";

import { Button } from "@/components/ui/Button";
import { DateTimePicker } from "@/components/ui/DateTimePicker";
import { formatEditionDateTimeInput } from "@/lib/communities/edition-status";

export function EditionScheduleFields({
  opens,
  closes,
  publishes,
  bounds,
  disabled,
  idPrefix,
  onOpens,
  onCloses,
  onPublishes,
  year,
}: {
  opens: string;
  closes: string;
  publishes: string;
  bounds: {
    opensMax?: string;
    closesMin?: string;
    closesMax?: string;
    publishesMin?: string;
  };
  disabled: boolean;
  idPrefix: string;
  onOpens: (next: string) => void;
  onCloses: (next: string) => void;
  onPublishes: (next: string) => void;
  year?: number;
}) {
  return (
    <>
      <ScheduleDateTimeField
        idPrefix={idPrefix}
        label="Opens"
        name="opensAt"
        value={opens}
        max={bounds.opensMax}
        disabled={disabled}
        year={year}
        onChange={onOpens}
      />
      <ScheduleDateTimeField
        idPrefix={idPrefix}
        label="Closes"
        name="closesAt"
        value={closes}
        min={bounds.closesMin}
        max={bounds.closesMax}
        disabled={disabled}
        year={year}
        onChange={onCloses}
      />
      <ScheduleDateTimeField
        idPrefix={idPrefix}
        label="Results publish"
        name="publishesAt"
        value={publishes}
        min={bounds.publishesMin}
        disabled={disabled}
        year={year}
        onChange={onPublishes}
      />
    </>
  );
}

function ScheduleDateTimeField({
  idPrefix,
  label,
  name,
  value,
  min,
  max,
  disabled,
  year,
  onChange,
}: {
  idPrefix: string;
  label: string;
  name: string;
  value: string;
  min?: string;
  max?: string;
  disabled: boolean;
  year?: number;
  onChange: (next: string) => void;
}) {
  const inputId = `${idPrefix}-${name}`;
  return (
    <div>
      <label htmlFor={inputId} className="block text-sm text-muted">
        {label}
      </label>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <DateTimePicker
          id={inputId}
          name={name}
          value={value}
          min={min}
          max={max}
          required
          disabled={disabled}
          className="min-w-0 flex-1"
          aria-label={label}
          anchorYear={year}
          onChange={onChange}
        />
        <Button
          type="button"
          variant="bordered"
          size="sm"
          disabled={disabled}
          className="shrink-0 whitespace-nowrap"
          onClick={() => onChange(formatEditionDateTimeInput(new Date()))}
        >
          Set to now
        </Button>
      </div>
    </div>
  );
}
