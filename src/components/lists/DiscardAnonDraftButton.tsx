"use client";

import { discardAnonDraftAction } from "@/app/create/actions";
import { Button } from "@/components/ui/Button";
import { clearListDraftCookieClient } from "@/lib/lists/draft-cookie";

export function DiscardAnonDraftButton({
  next,
  label = "Start a new list",
}: {
  next?: string;
  label?: string;
}) {
  return (
    <form
      action={discardAnonDraftAction}
      onSubmit={() => {
        clearListDraftCookieClient();
      }}
    >
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Button type="submit" variant="bordered">
        {label}
      </Button>
    </form>
  );
}
