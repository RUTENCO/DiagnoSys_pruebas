export async function renderRadarChart(
  labels: string[],
  values: number[],
  width = 600,
  height = 360
) {
  // Import dynamically to avoid Next.js bundling issues on the server
  const mod = await import("chartjs-node-canvas");
  const ChartJSNodeCanvas = (mod as any).ChartJSNodeCanvas;

  const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, backgroundColour: "white" });

  const configuration = {
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
      scales: {
        r: {
          beginAtZero: true,
          suggestedMin: 0,
          suggestedMax: Math.max(5, Math.max(...values)),
        },
      },
      plugins: {
        legend: { display: false },
      },
    },
  } as any;

  const image = await chartJSNodeCanvas.renderToBuffer(configuration, "image/png");
  return image;
}
