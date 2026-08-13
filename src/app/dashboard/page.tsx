"use client";
import React from "react";
import { useSession } from "next-auth/react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export default function Page() {
    const { data: session } = useSession();
    const { t } = useLanguage();

  const steps = [
    {
      id: 1,
      step: "Zoom In",
      title: t("dashboard.zoomIn.title"),
      desc: t("dashboard.zoomIn.desc"),
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      id: 2,
      step: "Zoom Out",
      title: t("dashboard.zoomOut.title"),
      desc: t("dashboard.zoomOut.desc"),
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <path d="M12 2v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 20v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4.9 4.9l1.4 1.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M18.7 18.7l1.4 1.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      id: 3,
      step: "Categorización",
      title: t("dashboard.categorization.title"),
      desc: t("dashboard.categorization.desc"),
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      ),
    },
    {
      id: 4,
      step: "Priorización",
      title: t("dashboard.prioritization.title"),
      desc: t("dashboard.prioritization.desc"),
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <path d="M12 2v20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M6 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
  ];

  return (
    <main className="min-h-screen py-12 px-6 sm:px-12 lg:px-24">
      <section className="max-w-5xl mx-auto">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-primary">{t("dashboard.heroTitle")}</h1>
            <p className="text-lg text-black mt-8">{t("dashboard.heroSubtitle")}</p>
          </div>
        </header>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {steps.map((s) => (
            <article
              key={s.id}
              className="group rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition transform hover:-translate-y-1 green-interactive flex flex-col h-full min-h-[200px] sm:min-h-[220px]"
              aria-labelledby={`step-${s.id}-title`}
            >
              <div className="flex items-start gap-4 flex-1">
                <div className="flex-none rounded-lg bg-green-200 p-3 text-primary">{s.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-primary uppercase">{t("dashboard.step")} {s.id}</p>
                    <div className="text-sm font-medium text-primary">{s.step}</div>
                  </div>
                  <h3 id={`step-${s.id}-title`} className="mt-2 text-xl font-semibold text-primary">{s.title}</h3>
                  <p className="mt-2 text-sm text-gray-700">{s.desc}</p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <div className="text-base text-gray-800">{t("dashboard.duration")} <strong>~3–10 min</strong></div>
              </div>
            </article>
          ))}
        </div>

        <section className="mt-10 border border-gray-100 rounded-2xl p-6 green-interactive">
          <h4 className="text-lg font-semibold text-primary">{t("dashboard.targetUsers")}</h4>
          <p className="mt-2 text-base text-gray-700">
            {t("dashboard.targetUsersDesc")}
          </p>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border border-primary green-interactive">
              <p className="text-base font-medium text-primary">{t("dashboard.companies")}</p>
              <p className="text-sm text-gray-700 mt-1">{t("dashboard.companiesDesc")}</p>
            </div>
            <div className="p-4 rounded-lg border border-primary green-interactive">
              <p className="text-base font-medium text-primary">{t("dashboard.students")}</p>
              <p className="text-sm text-gray-700 mt-1">{t("dashboard.studentsDesc")}</p>
            </div>
            <div className="p-4 rounded-lg border border-primary green-interactive">
              <p className="text-base font-medium text-primary">{t("dashboard.consultants")}</p>
              <p className="text-sm text-gray-700 mt-1">{t("dashboard.consultantsDesc")}</p>
            </div>
          </div>
        </section>

        <footer className="mt-12 text-base text-gray-600 border-t pt-6">
          <p><strong>{t("dashboard.contact")}</strong> <a href="mailto:proyectogestionti@gmail.com" className=" font-semibold text-blue-500 hover:underline">proyectogestionti@gmail.com</a></p>
          <p className="mt-2 text-gray-700"><strong>{t("dashboard.credits")}</strong> {t("dashboard.creditsNames")}</p>
          <p className="mt-2 text-gray-700 italic">{t("dashboard.researchNote")} <strong>{t("dashboard.researchTitle")}</strong> {t("dashboard.researchIp")}</p>
        </footer>
      </section>
    </main>
  );
}