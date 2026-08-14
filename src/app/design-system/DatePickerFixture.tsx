"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { DateTimePicker } from "@/components/ui/DateTimePicker";
import { Dialog } from "@/components/ui/Dialog";
import { TimePicker } from "@/components/ui/TimePicker";
import { YearPicker } from "@/components/ui/YearPicker";

export function DatePickerFixture() {
  const [open, setOpen] = useState("2026-11-01T18:00");
  const [close, setClose] = useState("2026-12-15T18:00");
  const [empty, setEmpty] = useState("");
  const [dateOnly, setDateOnly] = useState("2026-11-01");
  const [year, setYear] = useState(2026);
  const [time, setTime] = useState("18:00");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dangerOpen, setDangerOpen] = useState(false);

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <p className="mb-2 text-[11px] font-extrabold tracking-[0.18em] text-muted uppercase">
          Year
        </p>
        <YearPicker value={year} onChange={setYear} />
      </div>
      <div>
        <p className="mb-2 text-[11px] font-extrabold tracking-[0.18em] text-muted uppercase">
          Date
        </p>
        <div className="space-y-3">
          <DatePicker value={dateOnly} onChange={setDateOnly} />
          <DatePicker value="" onChange={() => {}} disabled />
        </div>
      </div>
      <div>
        <p className="mb-2 text-[11px] font-extrabold tracking-[0.18em] text-muted uppercase">
          Time
        </p>
        <TimePicker value={time} onChange={setTime} />
      </div>
      <div>
        <p className="mb-2 text-[11px] font-extrabold tracking-[0.18em] text-muted uppercase">
          Date and time
        </p>
        <div className="space-y-3">
          <DateTimePicker value={empty} onChange={setEmpty} />
          <DateTimePicker
            value={open}
            max={close}
            onChange={setOpen}
            aria-label="Opens"
          />
          <DateTimePicker
            value={close}
            min={open}
            onChange={setClose}
            aria-label="Closes"
          />
        </div>
      </div>
      <div>
        <p className="mb-2 text-[11px] font-extrabold tracking-[0.18em] text-muted uppercase">
          Dialog
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="bordered" onClick={() => setDialogOpen(true)}>
            Open dialog
          </Button>
          <Button
            type="button"
            variant="danger-bordered"
            onClick={() => setDangerOpen(true)}
          >
            Delete event
          </Button>
        </div>
        <Dialog
          open={dialogOpen}
          title="Create event"
          onClose={() => setDialogOpen(false)}
        >
          <p className="mt-2 text-sm text-muted">
            Overlay, `--panel` surface, display title. Escape or the dimmed
            edge closes it.
          </p>
          <div className="mt-4 flex justify-end">
            <Button
              type="button"
              variant="bordered"
              onClick={() => setDialogOpen(false)}
            >
              Close
            </Button>
          </div>
        </Dialog>
        <Dialog
          open={dangerOpen}
          title="Delete event"
          tone="danger"
          onClose={() => setDangerOpen(false)}
          className="w-full max-w-md"
        >
          <p className="mt-2 text-sm text-muted">
            Danger tone: `--danger` title and border. Filled danger confirms.
            Type-to-confirm lives on the product form.
          </p>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="bordered"
              onClick={() => setDangerOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" variant="danger" onClick={() => setDangerOpen(false)}>
              Delete event
            </Button>
          </div>
        </Dialog>
      </div>
    </div>
  );
}
