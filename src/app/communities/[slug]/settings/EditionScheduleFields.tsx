"use client";

import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { TimePicker } from "@/components/ui/TimePicker";
import {
  formatEditionDateTimeInput,
  type EditionScheduleFieldNotice,
} from "@/lib/communities/edition-status";
import { todayIsoDate } from "@/lib/ui/calendar-month";
import {
  clampIsoDateTime,
  datePart,
  mergeIsoDateAndTime,
  parseIsoDateTime,
  timePart,
} from "@/lib/ui/time-picker";

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
  notice,
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
  notice?: EditionScheduleFieldNotice | null;
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
        notice={notice?.field === "opens" ? notice : null}
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
        notice={notice?.field === "closes" ? notice : null}
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
        notice={notice?.field === "publishes" ? notice : null}
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
  notice,
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
  notice?: EditionScheduleFieldNotice | null;
  onChange: (next: string) => void;
}) {
  const dateId = `${idPrefix}-${name}-date`;
  const timeId = `${idPrefix}-${name}-time`;
  const parsed = parseIsoDateTime(value);
  const date = parsed?.date ?? "";
  const time = value ? timePart(value) : "";
  const dateMin = min ? datePart(min) : undefined;
  const dateMax = max ? datePart(max) : undefined;
  const selectedDate = date || todayIsoDate();
  const minTime =
    min && datePart(min) === selectedDate ? timePart(min) : undefined;
  const maxTime =
    max && datePart(max) === selectedDate ? timePart(max) : undefined;

  function emit(next: string) {
    const clamped = clampIsoDateTime(next, min, max);
    if (clamped == null) return;
    onChange(clamped);
  }

  function onDate(nextDate: string) {
    const now = new Date();
    emit(
      mergeIsoDateAndTime(nextDate, time, {
        hours: parsed?.hours ?? now.getHours(),
        minutes: parsed?.minutes ?? now.getMinutes(),
      }),
    );
  }

  function onTime(nextTime: string) {
    const now = new Date();
    emit(
      mergeIsoDateAndTime(date || todayIsoDate(), nextTime, {
        hours: now.getHours(),
        minutes: now.getMinutes(),
      }),
    );
  }

  return (
    <div>
      <p className="block text-sm text-muted">{label}</p>
      <input type="hidden" name={name} value={value} />
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <DatePicker
          id={dateId}
          value={date}
          min={dateMin}
          max={dateMax}
          required
          disabled={disabled}
          className="min-w-[10rem] flex-1"
          aria-label={`${label} date`}
          anchorYear={year}
          onChange={onDate}
        />
        <TimePicker
          id={timeId}
          value={time}
          min={minTime}
          max={maxTime}
          required
          disabled={disabled}
          className="w-[9.5rem] shrink-0"
          aria-label={`${label} time`}
          onChange={onTime}
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
      {notice ? (
        <p
          className="mt-1 text-sm text-accent"
          role={notice.tone === "error" ? "alert" : "status"}
        >
          {notice.message}
        </p>
      ) : null}
    </div>
  );
}
