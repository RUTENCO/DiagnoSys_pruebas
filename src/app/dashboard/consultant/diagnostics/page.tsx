"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function ConsultantDiagnosticsContent() {
  const searchParams = useSearchParams();
  const organizationId = searchParams.get("organizationId");
  const organizationName = searchParams.get("organizationName");

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-[#2E6347] mb-2">Diagnostics</h1>
      <p className="text-gray-700 mb-6">This section is empty for now.</p>

      {organizationId ? (
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-gray-600">Selected organization</p>
          <p className="text-xl font-semibold text-primary">
            {organizationName || `Organization #${organizationId}`}
          </p>
          <Link
            href="/dashboard/consultant/organizations"
            className="inline-block mt-4 text-blue-700 hover:underline"
          >
            Back to Organizations
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border bg-white p-4">
          <p className="text-gray-700">Select an organization first from Organizations.</p>
          <Link
            href="/dashboard/consultant/organizations"
            className="inline-block mt-3 text-blue-700 hover:underline"
          >
            Go to Organizations
          </Link>
        </div>
      )}
    </div>
  );
}

export default function ConsultantDiagnosticsPage() {
  return (
    <Suspense fallback={<div className="max-w-5xl mx-auto py-8 px-4 text-gray-500">Loading...</div>}>
      <ConsultantDiagnosticsContent />
    </Suspense>
  );
}
