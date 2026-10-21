import {
  Ambulance,
  Baby,
  CloudLightning,
  Flame,
  type LucideIcon,
  Phone,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Venus,
} from "lucide-react";

import type { EmergencyContact, EmergencyKind } from "../types";

const ICONS: Record<EmergencyKind, LucideIcon> = {
  general: Siren,
  police: ShieldCheck,
  fire: Flame,
  medical: Ambulance,
  women: Venus,
  children: Baby,
  cyber: ShieldAlert,
  disaster: CloudLightning,
  other: Phone,
};

/** Tap-to-call cards. The first "general" number is shown large at the top. */
export function EmergencyNumbers({ contacts }: { contacts: EmergencyContact[] }) {
  const main = contacts.find((contact) => contact.kind === "general");
  const rest = contacts.filter((contact) => contact !== main);

  return (
    <div className="space-y-3">
      {main && (
        <a
          href={`tel:${main.number}`}
          className="flex items-center gap-4 rounded-3xl bg-danger p-5 text-white shadow-lift transition-transform active:scale-[0.99] sm:p-6"
        >
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/15">
            <Siren aria-hidden className="size-7" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium opacity-90">{main.label}</span>
            <span className="block text-4xl font-bold tracking-tight tabular-nums">
              {main.number}
            </span>
            {main.description && (
              <span className="mt-0.5 block text-sm opacity-90">{main.description}</span>
            )}
          </span>
          <span className="hidden shrink-0 rounded-full bg-white px-4 py-2 text-sm font-semibold text-danger sm:block">
            Call
          </span>
        </a>
      )}

      <ul className="grid grid-cols-2 gap-3 desktop:grid-cols-4">
        {rest.map((contact) => {
          const Icon = ICONS[contact.kind];
          return (
            <li key={contact.id}>
              <a
                href={`tel:${contact.number}`}
                className="flex h-full flex-col rounded-2xl border border-border bg-surface p-4 shadow-card transition-colors hover:border-danger"
              >
                <Icon aria-hidden className="size-5 text-danger" />
                <span className="mt-3 text-2xl font-bold tracking-tight tabular-nums">
                  {contact.number}
                </span>
                <span className="text-sm font-medium">{contact.label}</span>
                {contact.description && (
                  <span className="mt-1 text-xs text-muted">{contact.description}</span>
                )}
                <span className="sr-only">Call {contact.number}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
