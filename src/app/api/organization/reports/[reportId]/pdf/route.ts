import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";
import { resolveScopedUserForDiagnostics, ScopedUserError } from "@/lib/consultant-scope";
import { buildReportPdfFilename, withDefaultReportConfig } from "@/lib/report-config";
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

type RadarFormSummarySource = {
  id: number;
  name: string;
  isCompleted: boolean;
  completedAt: Date | null;
  updatedAt: Date;
  baseFormId: number;
  baseForm: { module: { id: number; name: string } };
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

    const [configRaw, opportunities, needs, problems, high, medium, low, medium2] = await Promise.all([
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
          logoData: true,
          logoContentType: true,
          primaryColor: true,
          secondaryColor: true,
          headerTitle: true,
          headerSubtitle: true,
        },
      }),
      prisma.opportunity.findMany({ where: { reportId: reportIdInt, userId }, select: { name: true }, orderBy: { id: "asc" } }),
      prisma.need.findMany({ where: { reportId: reportIdInt, userId }, select: { name: true }, orderBy: { id: "asc" } }),
      prisma.problem.findMany({ where: { reportId: reportIdInt, userId }, select: { name: true }, orderBy: { id: "asc" } }),
      prisma.highPriority.findMany({ where: { reportId: reportIdInt, userId }, select: { name: true }, orderBy: { id: "asc" } }),
      prisma.mediumPriority.findMany({ where: { reportId: reportIdInt, userId }, select: { name: true }, orderBy: { id: "asc" } }),
      prisma.lowPriority.findMany({ where: { reportId: reportIdInt, userId }, select: { name: true }, orderBy: { id: "asc" } }),
      prisma.mediumPriority2.findMany({ where: { reportId: reportIdInt, userId }, select: { name: true }, orderBy: { id: "asc" } }),
    ]);

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
            logoData: configRaw.logoData,
            logoContentType: configRaw.logoContentType,
            primaryColor: configRaw.primaryColor ?? undefined,
            secondaryColor: configRaw.secondaryColor ?? undefined,
            headerTitle: configRaw.headerTitle ?? undefined,
            headerSubtitle: configRaw.headerSubtitle,
          }
        : null
    );

    const personalizedForms: RadarFormSummarySource[] = config.showRadar
      ? await prisma.personalizedForm.findMany({
          where: {
            userId,
            auditId: null,
            reportId: reportIdInt,
          },
          include: {
            baseForm: {
              select: {
                id: true,
                name: true,
                module: { select: { id: true, name: true } },
              },
            },
            personalizedCategories: {
              include: { personalizedItems: { select: { score: true } } },
            },
          },
          orderBy: { updatedAt: "desc" },
        })
      : await prisma.personalizedForm.findMany({
          where: {
            userId,
            auditId: null,
            reportId: reportIdInt,
          },
          select: {
            id: true,
            name: true,
            isCompleted: true,
            completedAt: true,
            updatedAt: true,
            baseFormId: true,
            baseForm: { select: { id: true, name: true, module: { select: { id: true, name: true } } } },
          },
          orderBy: { updatedAt: "desc" },
        });

    const latestFormsByModule = new Map<string, RadarFormSummarySource>();
    personalizedForms.forEach((form) => {
      const moduleId = form.baseForm.module.id;
      const baseFormId = form.baseFormId;
      const key = `${moduleId}-${baseFormId}`;
      const existing = latestFormsByModule.get(key);
      if (!existing || new Date(form.updatedAt) > new Date(existing.updatedAt)) {
        latestFormsByModule.set(key, form);
      }
    });

    const latestForms = Array.from(latestFormsByModule.values());
    const zoomInForms = latestForms.filter((f) => f.baseForm.module.name.toLowerCase().includes("zoom in"));
    const zoomOutForms = latestForms.filter((f) => f.baseForm.module.name.toLowerCase().includes("zoom out"));
    const processFormsForRadar = (forms: RadarFormSource[]): RadarForm[] => forms.map(buildRadarForm);
    const zoomInData = config.showRadar ? processFormsForRadar(zoomInForms as RadarFormSource[]) : [];
    const zoomOutData = config.showRadar ? processFormsForRadar(zoomOutForms as RadarFormSource[]) : [];

    const pdf = await PDFDocument.create();
    const firstPage = pdf.addPage([595, 842]);
    const white = rgb(1, 1, 1);

    // Convert hex color like #RRGGBB to pdf-lib rgb
    const hexToRgbNormalized = (hex: string) => {
      try {
        const cleaned = hex.replace('#', '').trim();
        const r = parseInt(cleaned.substring(0, 2), 16);
        const g = parseInt(cleaned.substring(2, 4), 16);
        const b = parseInt(cleaned.substring(4, 6), 16);
        return rgb(r / 255, g / 255, b / 255);
      } catch {
        return rgb(0.18, 0.39, 0.28);
      }
    };

    const titleColor = config.titleColor ? hexToRgbNormalized(config.titleColor) : rgb(0.18, 0.39, 0.28);
    const dark = config.textColor ? hexToRgbNormalized(config.textColor) : rgb(0.12, 0.12, 0.12);

    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

    let logoImage: import("pdf-lib").PDFImage | null = null;
    const logoWidth = 72;
    let logoHeight = 0;

    const logoBytes = configRaw?.logoData ? Buffer.from(configRaw.logoData as Uint8Array) : null;
    const logoContentType = configRaw?.logoContentType || "";

    if (logoBytes) {
      if (logoContentType.includes("png")) {
        logoImage = await pdf.embedPng(logoBytes);
      } else if (logoContentType.includes("jpeg") || logoContentType.includes("jpg")) {
        logoImage = await pdf.embedJpg(logoBytes);
      }
    } else if (config.logoUrl) {
      try {
        if (config.logoUrl.startsWith("/")) {
          const logoPath = path.join(process.cwd(), "public", config.logoUrl.replace(/^\//, ""));
          const fileBuffer = await readFile(logoPath);
          if (config.logoUrl.toLowerCase().endsWith(".png")) {
            logoImage = await pdf.embedPng(fileBuffer);
          } else if (config.logoUrl.toLowerCase().endsWith(".jpg") || config.logoUrl.toLowerCase().endsWith(".jpeg")) {
            logoImage = await pdf.embedJpg(fileBuffer);
          }
        } else {
          const logoResp = await fetch(config.logoUrl);
          if (logoResp.ok) {
            const contentType = logoResp.headers.get("content-type") || "image/png";
            const fileBuffer = await logoResp.arrayBuffer();
            if (contentType.includes("png")) {
              logoImage = await pdf.embedPng(fileBuffer);
            } else if (contentType.includes("jpeg") || contentType.includes("jpg")) {
              logoImage = await pdf.embedJpg(fileBuffer);
            }
          }
        }
      } catch (error) {
        console.error("Error loading logo for PDF:", error);
      }
    }

    if (logoImage) {
      const ratio = (logoImage.height || 32) / (logoImage.width || 72);
      logoHeight = Math.round(logoWidth * ratio);
    }

    let currentPage = firstPage;
    let y = 800;

    const drawLogo = (page: import("pdf-lib").PDFPage) => {
      if (!logoImage || !logoHeight) return;
      page.drawImage(logoImage, {
        x: 595 - 32 - logoWidth,
        y: 28,
        width: logoWidth,
        height: logoHeight,
      });
    };

    const newPage = () => {
      currentPage = pdf.addPage([595, 842]);
      y = 800;
      drawLogo(currentPage);
      return currentPage;
    };

    const ensureSpace = (needed: number) => {
      if (y - needed < 70) {
        newPage();
      }
      return currentPage;
    };

    drawLogo(currentPage);

    const drawHeader = (title: string, subtitle?: string) => {
      ensureSpace(52);
      currentPage.drawText(title, { x: 40, y, size: 16, font: fontBold, color: titleColor });
      y -= 24;
      if (subtitle) {
        y = drawWrappedText(currentPage, subtitle, 40, y, 500, { lineHeight: 13, size: 10, color: dark }) - 6;
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
        y = drawWrappedText(currentPage, "Sin elementos para mostrar.", 44, y, 500, { lineHeight: 13, size: 10, color: dark }) - 6;
        return;
      }

      for (const item of items) {
        ensureSpace(18);
        y = drawWrappedText(currentPage, `• ${item}`, 44, y, 500, { lineHeight: 13, size: 10, color: dark }) - 6;
      }
    };

    const normalizeRadarSeries = (form: RadarForm) => {
      const rawLabels = form.categoryData.map((category) => category.name);
      const rawValues = form.categoryData.map((category) => category.score);
      const minPoints = 3;

      return {
        rawLabels,
        rawValues,
        labels: rawLabels.length >= minPoints ? rawLabels : [...rawLabels, ...new Array(minPoints - rawLabels.length).fill("")],
        values: rawValues.length >= minPoints ? rawValues : [...rawValues, ...new Array(minPoints - rawValues.length).fill(0)],
      };
    };

    const drawRadarLabels = (labels: string[], values: number[] | undefined, x: number, y: number, width: number, fontSize = 9) => {
      if (!labels.length) return y;

      const formatValue = (v: number | undefined) => {
        if (v === undefined || v === null) return "0";
        return Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100);
      };

      let cursorY = y;
      for (let i = 0; i < labels.length; i++) {
        const label = labels[i];
        if (!label) continue;
        const val = values && values[i] !== undefined ? formatValue(values[i]) : "0";
        currentPage.drawText(`• ${label} (${val})`, { x, y: cursorY, size: fontSize, font, color: dark });
        cursorY -= 12;
      }

      return cursorY;
    };

    const drawChartSection = async (title: string, subtitle: string, forms: RadarForm[]) => {
      if (!forms.length) return;

      drawHeader(title, subtitle);

      for (const form of forms) {
        const { rawLabels, rawValues, labels, values } = normalizeRadarSeries(form);
        const hasRadarData = rawLabels.length > 0 && rawValues.length > 0;

        const chartPlotHeight = 200;
        const headerHeight = 48;
        const labelColumnWidth = 170;
        const contentWidth = 523;
        const chartWidth = 260;
        const chartHeight = 180;
        const chartLeftX = 46;
        const labelsX = chartLeftX + chartWidth + 20;
        const chartAreaHeight = hasRadarData ? chartPlotHeight : 84;
        const chartTotalHeight = headerHeight + chartAreaHeight;

        ensureSpace(chartTotalHeight + 12);

        const rectLowerY = y - chartTotalHeight;
        // Draw the containing rectangle (includes header area)
        currentPage.drawRectangle({ x: 36, y: rectLowerY, width: contentWidth, height: chartTotalHeight, color: white, borderColor: rgb(0.85, 0.9, 0.86), borderWidth: 1 });

        // Draw title and meta inside the top area of the rectangle
        const titleY = rectLowerY + chartTotalHeight - 12;
        const metaY = rectLowerY + chartTotalHeight - 28;
        currentPage.drawText(`${form.module} - ${form.name}`, { x: 46, y: titleY, size: 11, font: fontBold, color: dark });
        currentPage.drawText(`Puntaje prom: ${form.stats.avgScore}/5.0`, { x: 46, y: metaY, size: 9, font, color: dark });

        if (hasRadarData) {
            try {
            const imgBuffer = await renderRadarChart(new Array(labels.length).fill(""), values, 320, 320);
            const pngImage = await pdf.embedPng(imgBuffer);
            const imgY = rectLowerY + 18;
            currentPage.drawImage(pngImage, { x: chartLeftX, y: imgY, width: chartWidth, height: chartHeight });
            drawRadarLabels(rawLabels, rawValues, labelsX, rectLowerY + chartAreaHeight - 24, labelColumnWidth, 9);
          } catch (error) {
            console.error("Error rendering chart for form:", form.name, { labelsCount: labels.length, valuesCount: values.length, labels, valuesSample: values.slice(0, 5), error });

            currentPage.drawText("No se pudo renderizar la gráfica.", {
              x: 46,
              y: rectLowerY + chartAreaHeight - 24,
              size: 10,
              font,
              color: dark,
            });
            drawRadarLabels(rawLabels, rawValues, 46, rectLowerY + chartAreaHeight - 40, contentWidth - 80, 9);
          }
        } else {
          currentPage.drawText("Sin categorías para graficar.", {
            x: 46,
            y: rectLowerY + chartAreaHeight - 24,
            size: 10,
            font,
            color: dark,
          });
          currentPage.drawText("Completa datos en el formulario para ver el radar.", {
            x: 46,
            y: rectLowerY + chartAreaHeight - 40,
            size: 9,
            font,
            color: dark,
          });
        }

        y = rectLowerY - 24;
      }
    };

    drawLogo(currentPage);

    const headerTitleSize = 20;
    const headerTitleWidth = fontBold.widthOfTextAtSize(config.headerTitle, headerTitleSize);
    currentPage.drawText(config.headerTitle, {
      x: Math.max(40, (595 - headerTitleWidth) / 2),
      y,
      size: headerTitleSize,
      font: fontBold,
      color: titleColor,
    });
    y -= 22;
    if (config.headerSubtitle) {
      y = drawWrappedText(currentPage, config.headerSubtitle, 40, y, 500, { lineHeight: 13, size: 11, color: dark }) - 6;
    }
    currentPage.drawText(`Reporte: ${report.name} (v${report.version})`, { x: 40, y, size: 10, font, color: dark });
    y -= 16;
    currentPage.drawText(`Organización: ${report.user.name} - ${report.user.email}`, { x: 40, y, size: 10, font, color: dark });
    y -= 16;
    currentPage.drawText(`Fecha: ${new Date(report.createdAt).toLocaleString("es-CO")}`, { x: 40, y, size: 10, font, color: dark });
    y -= 28;

    if (config.showExecutiveSummary) {
      drawHeader("Resumen Ejecutivo", "Este informe consolida el estado del diagnóstico digital con resultados por módulo, categorización, priorización y plan de acción.");
      drawSeparatedList([
        `Zoom In: ${zoomInData.length} formularios`,
        `Zoom Out: ${zoomOutData.length} formularios`,
        `Categorización: ${opportunities.length + needs.length + problems.length} elementos`,
        `Priorización: ${high.length + medium.length + medium2.length + low.length} elementos`,
      ]);
      y -= 28;
    }

    drawHeader("Resumen General");
    drawStatCard(40, "Formularios Zoom In", zoomInData.length, titleColor);
    drawStatCard(220, "Formularios Zoom Out", zoomOutData.length, titleColor);
    drawStatCard(400, "Total Formularios", zoomInData.length + zoomOutData.length + opportunities.length + needs.length + problems.length + high.length + medium.length + medium2.length + low.length, titleColor);
    y -= 90;

    if (config.showRadar) {
      await drawChartSection("Zoom In - Evaluación de Habilidades", "", zoomInData);
      await drawChartSection("Zoom Out - Evaluación de Capacidades", "", zoomOutData);
    }

    if (config.showCategorization) {
      drawHeader("Categorización");
      
      // Oportunidades
      ensureSpace(20);
      currentPage.drawText("Oportunidades", { x: 44, y, size: 12, font: fontBold, color: titleColor });
      y -= 14;
      drawSeparatedList(
        opportunities.length > 0
          ? opportunities.map((item) => item.name)
          : ["Sin oportunidades registradas."]
      );
      y -= 14;
      
      // Necesidades
      ensureSpace(20);
      currentPage.drawText("Necesidades", { x: 44, y, size: 12, font: fontBold, color: titleColor });
      y -= 14;
      drawSeparatedList(
        needs.length > 0
          ? needs.map((item) => item.name)
          : ["Sin necesidades registradas."]
      );
      y -= 14;
      
      // Problemas
      ensureSpace(20);
      currentPage.drawText("Problemas", { x: 44, y, size: 12, font: fontBold, color: titleColor });
      y -= 14;
      drawSeparatedList(
        problems.length > 0
          ? problems.map((item) => item.name)
          : ["Sin problemas registrados."]
      );
      y -= 14;
    }

    if (config.showPrioritization) {
      drawHeader("Priorización");
      drawSeparatedList([
        `Alta prioridad: ${high.length}`,
        `Media (alto impacto): ${medium.length}`,
        `Media (alta urgencia): ${medium2.length}`,
        `Baja prioridad: ${low.length}`,
      ]);
      y -= 14;
    }

    if (config.showActionPlan) {
      drawHeader("Plan de acción recomendado");
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
      y -= 14;
    }

    const bytes = await pdf.save();
    const downloadFilename = buildReportPdfFilename(config.headerTitle, report.id);

    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${downloadFilename}"; filename*=UTF-8''${encodeURIComponent(downloadFilename)}`,
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
