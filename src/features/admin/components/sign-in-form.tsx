"use client";

import { useActionState } from "react";

import type { SignInState } from "../schemas";
import { signIn } from "../server/actions";

const INITIAL: SignInState = { status: "idle" };

const FIELD =
  "mt-1.5 h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring";

export function SignInForm() {
  const [state, action, pending] = useActionState(signIn, INITIAL);

  return (
    <form action={action} className="space-y-4">
      <label className="block text-sm font-medium">
        Email
        <input
          type="email"
          name="email"
          required
          maxLength={254}
          autoComplete="username"
          defaultValue={state.status === "error" ? state.email : undefined}
          className={FIELD}
        />
      </label>
      <label className="block text-sm font-medium">
        Password
        <input
          type="password"
          name="password"
          required
          maxLength={256}
          autoComplete="current-password"
          className={FIELD}
        />
      </label>
      {state.status === "error" && (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="h-11 w-full rounded-full bg-accent text-sm font-medium text-accent-foreground hover:bg-accent-strong disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
