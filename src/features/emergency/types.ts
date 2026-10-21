export type EmergencyKind =
  "general" | "police" | "fire" | "medical" | "women" | "children" | "cyber" | "disaster" | "other";

export interface EmergencyContact {
  id: string;
  /** Digits only (optionally with a leading +), safe to put in a tel: link. */
  number: string;
  label: string;
  description: string | null;
  kind: EmergencyKind;
}
