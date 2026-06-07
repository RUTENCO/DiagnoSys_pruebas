import { createCanvas, registerFont } from "canvas";
import { existsSync } from "node:fs";
import { Chart, registerables, type ChartConfiguration, type ChartItem } from "chart.js";

Chart.register(...registerables);

const CHART_FONT_FAMILY = "DiagnoSysSans";
const CHART_FONT_CANDIDATES = [
  "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
  "/usr/share/fonts/dejavu/DejaVuSans.ttf",
  String.raw`C:\Windows\Fonts\arial.ttf`,
  String.raw`C:\Windows\Fonts\calibri.ttf`,
];

let chartFontReady = false;

function ensureChartFont() {
  if (chartFontReady) return;

  for (const fontPath of CHART_FONT_CANDIDATES) {
    if (!existsSync(fontPath)) continue;

    try {
      registerFont(fontPath, { family: CHART_FONT_FAMILY });
      Chart.defaults.font.family = CHART_FONT_FAMILY;
      chartFontReady = true;
      return;
    } catch {
      continue;
    }
  }

  chartFontReady = true;
}

export async function renderRadarChart(
  labels: string[],
  values: number[],
  width = 320,
  height = 320
) {
  ensureChartFont();

  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d");

  context.fillStyle = "white";
  context.fillRect(0, 0, width, height);

  const configuration: ChartConfiguration<"radar", number[], string> = {
    type: "radar",
    data: {
      labels,
      datasets: [
        {
          label: "Puntaje",
          data: values,
          backgroundColor: "rgba(34,139,34,0.2)",
          borderColor: "rgba(34,139,34,1)",
          pointBackgroundColor: "rgba(34,139,34,1)",
        },
      ],
    },
    options: {
      font: {
        family: CHART_FONT_FAMILY,
      },
      aspectRatio: 1,
      layout: {
        padding: 12,
      },
      scales: {
        r: {
          beginAtZero: true,
          suggestedMin: 0,
          suggestedMax: Math.max(5, Math.max(...values)),
          ticks: {
            display: false,
            font: {
              family: CHART_FONT_FAMILY,
            },
          },
        },
      },
      plugins: {
        legend: { display: false },
      },
    },
  };

  const chart = new Chart(canvas as unknown as ChartItem, configuration);

  try {
    return canvas.toBuffer("image/png");
  } finally {
    chart.destroy();
  }
}
