import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { execFileSync } from "child_process";
import path from "path";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";
import { resolveScopedUserForDiagnostics, ScopedUserError } from "@/lib/consultant-scope";
import { withDefaultReportConfig } from "@/lib/report-config";
import { renderRadarChart } from "@/lib/report-charts";

type RadarCategoryItem = { score: number };
type RadarCategory = { name: string; personalizedItems: RadarCategoryItem[] };
type RadarFormSource = {
  id: number;
  name: string;
  isCompleted: boolean;
  completedAt: Date | null;
  updatedAt: Date;
  baseFormId: number;
  baseForm: { module: { id: number; name: string } };
  personalizedCategories: RadarCategory[];
};

type RadarChartCategory = {
  name: string;
  score: number;
  maxScore: number;
  itemCount: number;
  totalScore: number;
};

type RadarForm = {
  id: number;
  name: string;
  module: string;
  isCompleted: boolean;
  completedAt: Date | null;
  categoryData: RadarChartCategory[];
  stats: {
    totalItems: number;
    totalScore: number;
    avgScore: number;
    maxPossibleScore: number;
    completionPercentage: number;
  };
};

function sumScores(items: RadarCategoryItem[]) {
  let total = 0;
  for (const item of items) {
    total += item.score || 0;
  }
  return total;
}

function buildRadarCategory(category: RadarCategory): RadarChartCategory {
  const items = category.personalizedItems || [];
  const totalScore = sumScores(items);
  const avgScore = items.length > 0 ? totalScore / items.length : 0;

  return {
    name: category.name,
    score: Math.round(avgScore * 100) / 100,
    maxScore: 5,
    itemCount: items.length,
    totalScore,
  };
}

function buildRadarForm(form: RadarFormSource): RadarForm {
  const categoryData = form.personalizedCategories.map(buildRadarCategory);
  const totalItems = form.personalizedCategories.reduce((sum, category) => sum + (category.personalizedItems?.length || 0), 0);
  const totalScore = form.personalizedCategories.reduce((sum, category) => sum + sumScores(category.personalizedItems || []), 0);
  const avgScore = totalItems > 0 ? totalScore / totalItems : 0;

  return {
    id: form.id,
    name: form.name,
    module: form.baseForm.module.name,
    isCompleted: form.isCompleted,
    completedAt: form.completedAt,
    categoryData,
    stats: {
      totalItems,
      totalScore,
      avgScore: Math.round(avgScore * 100) / 100,
      maxPossibleScore: totalItems * 5,
      completionPercentage: totalItems > 0 ? Math.round((avgScore / 5) * 100) : 0,
    },
  };
}

function drawWrappedText(
  page: import("pdf-lib").PDFPage,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  options: { lineHeight: number; size: number; color?: import("pdf-lib").RGB }
) {
  const { lineHeight, size, color = rgb(0, 0, 0) } = options;
  const words = text.split(" ");
  let line = "";
  let cursorY = y;

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    const width = page.getWidth() * 0.001 * testLine.length * size;
    if (width > maxWidth && line) {
      page.drawText(line, { x, y: cursorY, size, color });
      line = word;
      cursorY -= lineHeight;
    } else {
      line = testLine;
    }
  }

  if (line) {
    page.drawText(line, { x, y: cursorY, size, color });
    cursorY -= lineHeight;
  }

  return cursorY;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ reportId: string }> }
) {
  try {
    const { reportId } = await context.params;
    const reportIdInt = Number.parseInt(reportId, 10);

    if (Number.isNaN(reportIdInt)) {
      return NextResponse.json({ error: "Invalid report ID" }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const isOrganization = session.user.role?.name === "organization";
    const isConsultant = session.user.role?.name === "consultant";

    if (!isOrganization && !isConsultant) {
      return NextResponse.json({ error: "Organization access required" }, { status: 403 });
    }

    let userId = Number.parseInt(session.user.id, 10);
    if (isConsultant) {
      const organizationId = request.nextUrl.searchParams.get("organizationId");
      const scopedUser = await resolveScopedUserForDiagnostics(session.user.id, organizationId);
      userId = scopedUser.targetUserId;
    }

    const report = await prisma.report.findFirst({
      where: { id: reportIdInt, userId },
      select: {
        id: true,
        name: true,
        version: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const [categorization, high, medium, low, medium2, configRaw] = await Promise.all([
      prisma.opportunity.findMany({ where: { reportId: reportIdInt, userId }, select: { name: true }, orderBy: { id: "asc" } }),
      prisma.highPriority.findMany({ where: { reportId: reportIdInt, userId }, select: { name: true }, orderBy: { id: "asc" } }),
      prisma.mediumPriority.findMany({ where: { reportId: reportIdInt, userId }, select: { name: true }, orderBy: { id: "asc" } }),
      prisma.lowPriority.findMany({ where: { reportId: reportIdInt, userId }, select: { name: true }, orderBy: { id: "asc" } }),
      prisma.mediumPriority2.findMany({ where: { reportId: reportIdInt, userId }, select: { name: true }, orderBy: { id: "asc" } }),
      prisma.reportDisplayConfig.findUnique({
        where: { organizationUserId: userId },
        select: {
          showExecutiveSummary: true,
          showRadar: true,
          showCategorization: true,
          showPrioritization: true,
          showActionPlan: true,
          showScaleLegend: true,
          logoUrl: true,
          primaryColor: true,
          secondaryColor: true,
          headerTitle: true,
          headerSubtitle: true,
        },
      }),
    ]);

    // Also fetch personalized forms to render zoom-in / zoom-out charts like radar-data route
    const personalizedForms = await prisma.personalizedForm.findMany({
      where: {
        userId: userId,
        auditId: null,
        reportId: reportIdInt,
      },
      include: {
        baseForm: {
          select: {
            id: true,
            name: true,
            tag: true,
            module: { select: { id: true, name: true } },
          },
        },
        personalizedCategories: {
          include: { personalizedItems: { select: { id: true, name: true, score: true, isCustom: true } } },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // group latest forms by module+baseForm
    const latestFormsByModule = new Map<string, RadarFormSource>();
    personalizedForms.forEach((form) => {
      const moduleId = form.baseForm.module.id;
      const baseFormId = form.baseFormId;
      const key = `${moduleId}-${baseFormId}`;
      const existing = latestFormsByModule.get(key);
      if (!existing || new Date(form.updatedAt) > new Date(existing.updatedAt)) {
        latestFormsByModule.set(key, form as RadarFormSource);
      }
    });

    const latestForms = Array.from(latestFormsByModule.values());

    const processFormsForRadar = (forms: RadarFormSource[]): RadarForm[] => forms.map(buildRadarForm);

    const zoomInForms = latestForms.filter((f) => f.baseForm.module.name.toLowerCase().includes("zoom in"));
    const zoomOutForms = latestForms.filter((f) => f.baseForm.module.name.toLowerCase().includes("zoom out"));

    const zoomInData = processFormsForRadar(zoomInForms);
    const zoomOutData = processFormsForRadar(zoomOutForms);

    const config = withDefaultReportConfig(
      configRaw
        ? {
            showExecutiveSummary: configRaw.showExecutiveSummary,
            showRadar: configRaw.showRadar,
            showCategorization: configRaw.showCategorization,
            showPrioritization: configRaw.showPrioritization,
            showActionPlan: configRaw.showActionPlan,
            showScaleLegend: configRaw.showScaleLegend,
            logoUrl: configRaw.logoUrl,
            primaryColor: configRaw.primaryColor ?? undefined,
            secondaryColor: configRaw.secondaryColor ?? undefined,
            headerTitle: configRaw.headerTitle ?? undefined,
            headerSubtitle: configRaw.headerSubtitle,
          }
        : null
    );

    const pdf = await PDFDocument.create();
    const firstPage = pdf.addPage([595, 842]);
    const titleColor = rgb(0.18, 0.39, 0.28);
    const dark = rgb(0.12, 0.12, 0.12);
    const white = rgb(1, 1, 1);

    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

    let currentPage = firstPage;
    let y = 800;

    const newPage = () => {
      currentPage = pdf.addPage([595, 842]);
      y = 800;
      return currentPage;
    };

    const ensureSpace = (needed: number) => {
      if (y - needed < 70) {
        newPage();
      }
      return currentPage;
    };

    const drawHeader = (title: string, subtitle?: string) => {
      ensureSpace(52);
      currentPage.drawText(title, { x: 40, y, size: 16, font: fontBold, color: titleColor });
      y -= 18;
      if (subtitle) {
        y = drawWrappedText(currentPage, subtitle, 40, y, 500, { lineHeight: 13, size: 10, color: dark }) - 4;
      }
    };

    const drawStatCard = (x: number, label: string, value: string | number, accent = titleColor) => {
      const cardTop = y - 46;
      currentPage.drawRectangle({ x, y: cardTop, width: 165, height: 40, color: white, borderColor: accent, borderWidth: 1 });
      currentPage.drawText(label, { x: x + 10, y: cardTop + 24, size: 9, font, color: dark });
      currentPage.drawText(String(value), { x: x + 10, y: cardTop + 10, size: 16, font: fontBold, color: accent });
    };

    const drawSeparatedList = (items: string[]) => {
      if (!items.length) {
        ensureSpace(20);
        y = drawWrappedText(currentPage, "Sin elementos para mostrar.", 44, y, 500, { lineHeight: 13, size: 10, color: dark }) - 2;
        return;
      }

      for (const item of items) {
        ensureSpace(18);
        y = drawWrappedText(currentPage, `• ${item}`, 44, y, 500, { lineHeight: 13, size: 10, color: dark }) - 2;
      }
    };

    const drawChartSection = async (title: string, subtitle: string, forms: RadarForm[]) => {
      if (!forms.length) return;

      drawHeader(title, subtitle);

      for (const form of forms) {
        const rawLabels = form.categoryData.map((category) => category.name);
        const rawValues = form.categoryData.map((category) => category.score);

        // Ensure a minimum number of points so radar charts render properly
        const minPoints = 3;
        const labels = rawLabels.length >= minPoints ? rawLabels : [...rawLabels, ...Array(minPoints - rawLabels.length).fill('')];
        const values = rawValues.length >= minPoints ? rawValues : [...rawValues, ...Array(minPoints - rawValues.length).fill(0)];

        const chartPlotHeight = 200; // area for the chart image
        const headerHeight = 48; // space for title + meta (increased to avoid overlap)
        const chartTotalHeight = chartPlotHeight + headerHeight;

        ensureSpace(chartTotalHeight + 12);

        const rectLowerY = y - chartTotalHeight;
        // Draw the containing rectangle (includes header area)
        currentPage.drawRectangle({ x: 36, y: rectLowerY, width: 523, height: chartTotalHeight, color: white, borderColor: rgb(0.85, 0.9, 0.86), borderWidth: 1 });

        // Draw title and meta inside the top area of the rectangle
        const titleY = rectLowerY + chartTotalHeight - 12;
        const metaY = rectLowerY + chartTotalHeight - 28;
        currentPage.drawText(`${form.module} - ${form.name}`, { x: 46, y: titleY, size: 11, font: fontBold, color: dark });
        currentPage.drawText(`Puntaje prom: ${form.stats.avgScore}/5.0`, { x: 46, y: metaY, size: 9, font, color: dark });

        try {
          const imgBuffer = await renderRadarChart(labels, values, 520, chartPlotHeight);
          const pngImage = await pdf.embedPng(imgBuffer);
          // place the image inside the rectangle with padding
          const imgY = rectLowerY + 8;
          currentPage.drawImage(pngImage, { x: 48, y: imgY, width: 490, height: chartPlotHeight });
        } catch (err) {
          console.error("Error rendering chart for form:", form.name, { labelsCount: labels.length, valuesCount: values.length, labels, valuesSample: values.slice(0,5), err });

          // Fallback: attempt child process renderer
          try {
            const scriptPath = path.join(process.cwd(), "src", "scripts", "render-chart-child.cjs");
            const input = JSON.stringify({ labels, values, width: 520, height: chartPlotHeight });
            const out = execFileSync(process.execPath, [scriptPath], { input, encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
            const pngBuf = Buffer.from(out, "base64");
            const pngImage = await pdf.embedPng(pngBuf);
            const imgY = rectLowerY + 8;
            currentPage.drawImage(pngImage, { x: 48, y: imgY, width: 490, height: chartPlotHeight });
          } catch (fallbackErr) {
            console.error("Child fallback render failed for form:", form.name, fallbackErr);
            try {
              const safeLabels = labels && labels.length ? labels : ["Sin datos", "", ""];
              const safeValues = values && values.length ? values : [0, 0, 0];
              const fallbackBuf = await renderRadarChart(safeLabels, safeValues, 520, chartPlotHeight);
              const fallbackPng = await pdf.embedPng(fallbackBuf);
              const imgY = rectLowerY + 8;
              currentPage.drawImage(fallbackPng, { x: 48, y: imgY, width: 490, height: chartPlotHeight });
            } catch (fallbackErr2) {
              console.error("Fallback render failed for form:", form.name, fallbackErr2);
              currentPage.drawText("No se pudo renderizar la gráfica.", { x: 48, y: rectLowerY + (chartTotalHeight / 2), size: 10, font, color: dark });
            }
          }
        }

        y = rectLowerY - 18;
      }
    };

    // Try to embed logo at top-right if provided
    if (config.logoUrl) {
      try {
        const logoSource = config.logoUrl.startsWith("/") ? `${request.nextUrl.origin}${config.logoUrl}` : config.logoUrl;
        const logoResp = await fetch(logoSource);
        if (logoResp.ok) {
          const contentType = logoResp.headers.get("content-type") || "image/png";
          const logoBuffer = await logoResp.arrayBuffer();
          let logoImage: import("pdf-lib").PDFImage | null = null;
          if (contentType.includes("png")) {
            logoImage = await pdf.embedPng(logoBuffer);
          } else if (contentType.includes("jpeg") || contentType.includes("jpg")) {
            logoImage = await pdf.embedJpg(logoBuffer);
          }

          if (logoImage) {
            const logoWidth = 96;
            const ratio = (logoImage.height || 32) / (logoImage.width || 96);
            const logoHeight = Math.round(logoWidth * ratio);
            currentPage.drawImage(logoImage, { x: 595 - 40 - logoWidth, y: 800 - logoHeight, width: logoWidth, height: logoHeight });
          }
        }
      } catch (err) {
        console.error("Error fetching or embedding logo:", err, config.logoUrl);
      }
    }

    currentPage.drawText(config.headerTitle, { x: 40, y, size: 20, font: fontBold, color: titleColor });
    y -= 22;
    if (config.headerSubtitle) {
      y = drawWrappedText(currentPage, config.headerSubtitle, 40, y, 500, { lineHeight: 13, size: 11, color: dark }) - 2;
    }
    currentPage.drawText(`Reporte: ${report.name} (v${report.version})`, { x: 40, y, size: 10, font, color: dark });
    y -= 14;
    currentPage.drawText(`Organización: ${report.user.name} - ${report.user.email}`, { x: 40, y, size: 10, font, color: dark });
    y -= 14;
    currentPage.drawText(`Fecha: ${new Date(report.createdAt).toLocaleString("es-CO")}`, { x: 40, y, size: 10, font, color: dark });
    y -= 20;

    if (config.showExecutiveSummary) {
      drawHeader("Resumen Ejecutivo", "Este informe consolida el estado del diagnóstico digital con resultados por módulo, categorización, priorización y plan de acción.");
      drawSeparatedList([
        `Zoom In: ${zoomInData.length} formularios`,
        `Zoom Out: ${zoomOutData.length} formularios`,
        `Categorización: ${categorization.length} elementos`,
        `Priorización: ${high.length + medium.length + medium2.length + low.length} elementos`,
      ]);
      y -= 10;
    }

    drawHeader("Resumen General", "Métricas principales del reporte, equivalentes a las tarjetas que ves en la interfaz web.");
    drawStatCard(40, "Formularios Zoom In", zoomInData.length, titleColor);
    drawStatCard(220, "Formularios Zoom Out", zoomOutData.length, titleColor);
    drawStatCard(400, "Total Formularios", zoomInData.length + zoomOutData.length + categorization.length + high.length + medium.length + medium2.length + low.length, rgb(0.12, 0.45, 0.82));
    y -= 60;

    if (config.showRadar) {
      await drawChartSection("Zoom In - Evaluación de Habilidades", "Las mismas gráficas del reporte web para los formularios Zoom In.", zoomInData);
      await drawChartSection("Zoom Out - Evaluación de Capacidades", "Las mismas gráficas del reporte web para los formularios Zoom Out.", zoomOutData);
    }

    if (config.showCategorization) {
      drawHeader("Categorización", "Resumen de oportunidades, necesidades y problemas del reporte web.");
      drawSeparatedList(
        categorization.length > 0
          ? categorization.map((item) => item.name)
          : ["Sin elementos guardados para este reporte."]
      );
      y -= 8;
    }

    if (config.showPrioritization) {
      drawHeader("Priorización", "Distribución de elementos por nivel de impacto y urgencia.");
      drawSeparatedList([
        `Alta prioridad: ${high.length}`,
        `Media (alto impacto): ${medium.length}`,
        `Media (alta urgencia): ${medium2.length}`,
        `Baja prioridad: ${low.length}`,
      ]);
      y -= 8;
    }

    if (config.showActionPlan) {
      drawHeader("Plan de acción recomendado", "Muestra la secuencia sugerida a partir del resumen de priorización.");
      const actions = [
        ...high.map((item) => ({ name: item.name, level: "Alta prioridad" })),
        ...medium.map((item) => ({ name: item.name, level: "Media (alto impacto)" })),
        ...medium2.map((item) => ({ name: item.name, level: "Media (alta urgencia)" })),
        ...low.map((item) => ({ name: item.name, level: "Baja prioridad" })),
      ];

      drawSeparatedList(
        actions.length > 0
          ? actions.map((item, index) => `${index + 1}. ${item.name} (${item.level})`)
          : ["Sin acciones priorizadas para este reporte."]
      );
      y -= 8;
    }

    if (config.showScaleLegend) {
      ensureSpace(20);
      currentPage.drawText("Escala de referencia: 1 (muy bajo) a 5 (muy alto)", { x: 40, y, size: 10, font, color: dark });
      y -= 16;
    }

    const bytes = await pdf.save();

    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="reporte-${report.id}.pdf"`,
      },
    });
  } catch (error) {
    if (error instanceof ScopedUserError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Error creating report PDF:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
