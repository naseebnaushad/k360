"use client";

import { CircleCheck, Flag, X } from "lucide-react";
import { useActionState, useId } from "react";

import { REPORT_NOTE_MAX_LENGTH, REPORT_REASONS, type ReportFormState } from "../reports";
import { reportPlace } from "../server/actions";

const INITIAL: ReportFormState = { status: "idle" };

/**
 * "Report a problem" link that opens a small form (a bottom sheet on mobile,
 * a dialog on desktop). No account needed; reports are reviewed by maintainers.
 */
export function ReportProblem({ placeId, placeName }: { placeId: string; placeName: string }) {
  const [state, action, pending] = useActionState(reportPlace, INITIAL);
  const id = useId();
  const sheetId = `report-${id.replace(/:/g, "")}`;

  return (
    <>
      <button
        type="button"
        popoverTarget={sheetId}
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-accent"
      >
        <Flag aria-hidden className="size-4" />
        Report a problem
      </button>

      <div id={sheetId} popover="auto" className="sheet sheet-dialog">
        <div className="flex max-h-[85dvh] flex-col rounded-t-3xl bg-surface shadow-lift desktop:rounded-3xl">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-semibold">Report a problem</h2>
            <button
              type="button"
              popoverTarget={sheetId}
              popoverTargetAction="hide"
              className="flex size-9 items-center justify-center rounded-full hover:bg-surface-muted"
            >
              <X aria-hidden className="size-5" />
              <span className="sr-only">Close</span>
            </button>
          </div>

          {state.status === "success" ? (
            <div className="px-5 py-10 text-center">
              <CircleCheck aria-hidden className="mx-auto size-10 text-success" />
              <p className="mt-3 font-medium">Thanks for letting us know.</p>
              <p className="mt-1 text-sm text-muted">We&apos;ll check and fix {placeName}.</p>
              <button
                type="button"
                popoverTarget={sheetId}
                popoverTargetAction="hide"
                className="mt-6 h-11 rounded-full border border-border px-6 text-sm font-medium hover:border-accent hover:text-accent"
              >
                Done
              </button>
            </div>
          ) : (
            <form action={action} className="flex min-h-0 flex-col">
              <div className="overflow-y-auto px-5 py-5">
                <input type="hidden" name="placeId" value={placeId} />
                {/* Trap for bots: hidden from people, so it is only ever filled automatically. */}
                <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
                  <label>
                    Company
                    <input type="text" name="company" tabIndex={-1} autoComplete="off" />
                  </label>
                </div>

                <fieldset>
                  <legend className="text-sm font-medium">
                    What&apos;s wrong with {placeName}?
                  </legend>
                  <div className="mt-3 space-y-1">
                    {REPORT_REASONS.map((reason) => (
                      <label
                        key={reason.value}
                        className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-sm hover:bg-surface-muted has-checked:bg-accent-soft has-checked:font-medium"
                      >
                        <input
                          type="radio"
                          name="reason"
                          value={reason.value}
                          required
                          className="size-4 accent-(--accent)"
                        />
                        {reason.label}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <label className="mt-5 block text-sm font-medium">
                  Details <span className="font-normal text-muted">(optional)</span>
                  <textarea
                    name="note"
                    rows={3}
                    maxLength={REPORT_NOTE_MAX_LENGTH}
                    placeholder="For example, the correct phone number or new address"
                    className="mt-2 block w-full rounded-2xl border border-border bg-background px-4 py-3 font-normal placeholder:text-muted focus:border-accent focus:outline-none"
                  />
                </label>

                {state.status === "error" && (
                  <p role="alert" className="mt-4 text-sm text-danger">
                    {state.message}
                  </p>
                )}
                <p className="mt-4 text-xs text-muted">
                  Don&apos;t include personal details. Reports are only seen by the people who
                  maintain this guide.
                </p>
              </div>
              <div className="border-t border-border p-4">
                <button
                  type="submit"
                  disabled={pending}
                  className="h-12 w-full rounded-full bg-accent font-medium text-accent-foreground hover:bg-accent-strong disabled:opacity-60"
                >
                  {pending ? "Sending…" : "Send report"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
