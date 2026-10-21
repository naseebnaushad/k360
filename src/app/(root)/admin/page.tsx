import type { Metadata } from "next";
import { LogOut, ShieldAlert } from "lucide-react";
import { Suspense } from "react";

import { SiteHeader } from "@/components/layout/site-header";
import { Container } from "@/components/ui/container";
import { ReportList, SignInForm, parseStatusParam } from "@/features/admin";
import { getReportCounts, getReports, getViewer, signOut } from "@/features/admin/server";

export const metadata: Metadata = {
  title: "Reports",
  robots: { index: false, follow: false },
};

type Props = PageProps<"/admin">;

/** Private page where maintainers review "Report a problem" submissions. */
export default function AdminPage({ searchParams }: Props) {
  return (
    <>
      <SiteHeader homeHref="/" context="Admin" />
      <main>
        <Container className="py-10">
          {/* The session is read per request, so everything below streams in. */}
          <Suspense fallback={<p className="text-muted">Loading…</p>}>
            <AdminContent searchParams={searchParams} />
          </Suspense>
        </Container>
      </main>
    </>
  );
}

async function AdminContent({ searchParams }: Pick<Props, "searchParams">) {
  const { supabase, viewer } = await getViewer();

  if (viewer.kind === "signed-out") {
    return (
      <div className="mx-auto max-w-sm rounded-3xl border border-border bg-surface p-6 shadow-card sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-1 mb-6 text-sm text-muted">For maintainers reviewing reports.</p>
        <SignInForm />
      </div>
    );
  }

  if (viewer.kind === "not-admin") {
    return (
      <div className="mx-auto max-w-sm text-center">
        <ShieldAlert aria-hidden className="mx-auto size-10 text-muted" />
        <h1 className="mt-4 text-xl font-semibold">No access</h1>
        <p className="mt-2 text-sm text-muted">{viewer.email} is signed in but is not an admin.</p>
        <SignOutButton />
      </div>
    );
  }

  const status = parseStatusParam((await searchParams).status);
  const [reports, counts] = await Promise.all([
    getReports(supabase, status),
    getReportCounts(supabase),
  ]);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Reports</h1>
          <p className="mt-1 text-sm text-muted">Problems visitors reported with places.</p>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted">
          <span className="truncate">{viewer.email}</span>
          <SignOutButton />
        </div>
      </div>
      <ReportList reports={reports} status={status} counts={counts} />
    </>
  );
}

function SignOutButton() {
  return (
    <form action={signOut} className="inline-block">
      <button
        type="submit"
        className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-4 text-sm font-medium text-foreground hover:border-accent hover:text-accent sm:mt-0"
      >
        <LogOut aria-hidden className="size-4" />
        Sign out
      </button>
    </form>
  );
}
