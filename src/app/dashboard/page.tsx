"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function Page() {
    const router = useRouter();
    const { data: session } = useSession();

    const handleClick = () => {
      const role = session?.user?.role;
      if (!role) {
        router.push("/login");
        return;
      }
      const path = `/dashboard/${role.name}/zoom-in`;
      router.push(path);
    };

  const steps = [
    {
      id: 1,
      step: "Zoom In",
      title: "Evalúa tu organización",
      desc: "Analiza tus habilidades estratégicas y ocultas, capacidades y activos.",
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
      title: "Observa el entorno",
      desc: "Identifica tendencias, fuerzas del mercado, dinámicas sectoriales y contexto macroeconómico.",
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
      title: "Define el impacto",
      desc: "Clasifica los hallazgos como oportunidades, necesidades o problemas.",
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
      title: "Planifica acciones",
      desc: "Prioriza iniciativas según horizontes de crecimiento (H1, H2, H3).",
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
            <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">Plataforma de Diagnóstico Estratégico para la Transformación Digital</h1>
            <p className="text-sm text-gray-600 mt-1">DiagnoSys — comprende, evalúa y proyecta la transformación digital de tu organización con una herramienta guiada, flexible y estratégica.</p>
          </div>
          <div className="flex items-center gap-4">
            <button className="hidden sm:inline-block px-4 py-2 bg-primary text-white rounded-lg shadow hover:bg-indigo-650 transition cursor-pointer" onClick={handleClick}>Iniciar Diagnóstico</button>
          </div>
        </header>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {steps.map((s) => (
            <article
              key={s.id}
              className="group rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition transform hover:-translate-y-1 green-interactive"
              aria-labelledby={`step-${s.id}-title`}
            >
              <div className="flex items-start gap-4">
                <div className="flex-none rounded-lg bg-green-200 p-3 text-primary">{s.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-primary uppercase">Paso {s.id}</p>
                    <div className="text-xs text-gray-600">{s.step}</div>
                  </div>
                  <h3 id={`step-${s.id}-title`} className="mt-2 text-lg font-semibold text-gray-900">{s.title}</h3>
                  <p className="mt-2 text-sm text-gray-600">{s.desc}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-500">Duración estimada: <strong>~3–6 min</strong></div>
              </div>
            </article>
          ))}
        </div>

        <section className="mt-10 border border-gray-100 rounded-2xl p-6 green-interactive">
          <h4 className="text-base font-semibold text-gray-900">Usuarios Objetivo</h4>
          <p className="mt-2 text-sm text-gray-600">
            Empresas, estudiantes de pregrado y posgrado, consultores e individuos interesados en acelerar o aprender sobre transformación digital mediante metodologías basadas en inteligencia tecnológica.
          </p>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border border-primary green-interactive">
              <p className="text-sm font-medium text-gray-800">Empresas</p>
              <p className="text-xs text-gray-500 mt-1">Diagnósticos estratégicos para planificación de transformación.</p>
            </div>
            <div className="p-4 rounded-lg border border-primary green-interactive">
              <p className="text-sm font-medium text-gray-800">Estudiantes</p>
              <p className="text-xs text-gray-500 mt-1">Herramienta práctica para aprendizaje y proyectos académicos.</p>
            </div>
            <div className="p-4 rounded-lg border border-primary green-interactive">
              <p className="text-sm font-medium text-gray-800">Consultores</p>
              <p className="text-xs text-gray-500 mt-1">Herramienta estructurada para trabajo con clientes y evaluaciones.</p>
            </div>
          </div>
        </section>

        <footer className="mt-12 text-sm text-gray-600 border-t pt-6">
          <p><strong>Contacto:</strong> <a href="mailto:proyectogestionti@gmail.com" className="text-indigo-600 hover:underline">proyectogestionti@gmail.com</a></p>
          <p className="mt-1"><strong>Créditos:</strong> Jhon Fredy Hoyos Cárdenas, Daniel Ramírez Cárdenas, Hellen Jakeline Rubio</p>
          <p className="mt-1 text-gray-500 italic">Este proyecto se desarrolla como parte de la iniciativa de investigación <strong>&ldquo;Marco de Gobernanza de Datos para Universidades.&rdquo;</strong> IP: Gina Maestre.</p>
        </footer>
      </section>
    </main>
  );
}