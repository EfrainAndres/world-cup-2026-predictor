import Link from "next/link";
import { PageContainer } from "../src/components/PageContainer";

export default function NotFoundPage() {
  return (
    <PageContainer className="py-12">
      <section
        aria-labelledby="not-found-heading"
        className="mx-auto max-w-2xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Page not found</p>
        <h1 id="not-found-heading" className="mt-2 text-3xl font-semibold text-slate-950">
          Match not found
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          This match or page could not be found. It may be unavailable from the current results source, or the link may be invalid.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/matches"
            className="inline-flex min-h-[44px] items-center rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
          >
            View matches
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
          >
            Go home
          </Link>
        </div>
      </section>
    </PageContainer>
  );
}
