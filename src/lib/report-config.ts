export type ReportDisplayConfigPayload = {
  showExecutiveSummary: boolean;
  showRadar: boolean;
  showCategorization: boolean;
  showPrioritization: boolean;
  showActionPlan: boolean;
  showScaleLegend: boolean;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  headerTitle: string;
  headerSubtitle: string | null;
};

export const DEFAULT_REPORT_DISPLAY_CONFIG: ReportDisplayConfigPayload = {
  showExecutiveSummary: true,
  showRadar: true,
  showCategorization: true,
  showPrioritization: true,
  showActionPlan: true,
  showScaleLegend: true,
  logoUrl: null,
  primaryColor: "#2E6347",
  secondaryColor: "#24533b",
  headerTitle: "Reporte de Evaluación Digital",
  headerSubtitle: "Resultados consolidados del diagnóstico",
};

export function isHexColor(value: string): boolean {
  return /^#([0-9A-Fa-f]{6})$/.test(value);
}

export function normalizeOptionalText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  if (!cleaned) return null;
  return cleaned.slice(0, maxLength);
}

export function normalizeReportDisplayConfigInput(
  input: Record<string, unknown>
): ReportDisplayConfigPayload {
  const logoUrl = normalizeOptionalText(input.logoUrl, 500);
  const headerTitle = normalizeOptionalText(input.headerTitle, 120) ?? DEFAULT_REPORT_DISPLAY_CONFIG.headerTitle;
  const headerSubtitle = normalizeOptionalText(input.headerSubtitle, 160);

  const primaryColor =
    typeof input.primaryColor === "string" && isHexColor(input.primaryColor.trim())
      ? input.primaryColor.trim()
      : DEFAULT_REPORT_DISPLAY_CONFIG.primaryColor;

  const secondaryColor =
    typeof input.secondaryColor === "string" && isHexColor(input.secondaryColor.trim())
      ? input.secondaryColor.trim()
      : DEFAULT_REPORT_DISPLAY_CONFIG.secondaryColor;

  return {
    showExecutiveSummary: Boolean(input.showExecutiveSummary ?? DEFAULT_REPORT_DISPLAY_CONFIG.showExecutiveSummary),
    showRadar: Boolean(input.showRadar ?? DEFAULT_REPORT_DISPLAY_CONFIG.showRadar),
    showCategorization: Boolean(input.showCategorization ?? DEFAULT_REPORT_DISPLAY_CONFIG.showCategorization),
    showPrioritization: Boolean(input.showPrioritization ?? DEFAULT_REPORT_DISPLAY_CONFIG.showPrioritization),
    showActionPlan: Boolean(input.showActionPlan ?? DEFAULT_REPORT_DISPLAY_CONFIG.showActionPlan),
    showScaleLegend: Boolean(input.showScaleLegend ?? DEFAULT_REPORT_DISPLAY_CONFIG.showScaleLegend),
    logoUrl,
    primaryColor,
    secondaryColor,
    headerTitle,
    headerSubtitle,
  };
}

export function withDefaultReportConfig<T extends Partial<ReportDisplayConfigPayload> | null | undefined>(
  config: T
): ReportDisplayConfigPayload {
  if (!config) {
    return { ...DEFAULT_REPORT_DISPLAY_CONFIG };
  }

  return {
    ...DEFAULT_REPORT_DISPLAY_CONFIG,
    ...config,
  };
}
