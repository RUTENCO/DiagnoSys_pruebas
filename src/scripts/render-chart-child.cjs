#!/usr/bin/env node
const { createCanvas, registerFont } = require('canvas');
const fs = require('node:fs');
const { Chart, registerables } = require('chart.js');

Chart.register(...registerables);

const CHART_FONT_FAMILY = 'DiagnoSysSans';
const CHART_FONT_CANDIDATES = [
  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
  '/usr/share/fonts/dejavu/DejaVuSans.ttf',
  String.raw`C:\Windows\Fonts\arial.ttf`,
  String.raw`C:\Windows\Fonts\calibri.ttf`,
];

let chartFontReady = false;

function ensureChartFont() {
  if (chartFontReady) return;

  for (const fontPath of CHART_FONT_CANDIDATES) {
    if (!fs.existsSync(fontPath)) continue;

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

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString();
}

(async () => {
  try {
    const raw = await readStdin();
    if (!raw) {
      throw new Error('No input provided to render-chart-child');
    }

    const opts = JSON.parse(raw);
    const labels = Array.isArray(opts.labels) ? opts.labels : [];
    const values = Array.isArray(opts.values) ? opts.values : [];
    const width = typeof opts.width === 'number' ? opts.width : 320;
    const height = typeof opts.height === 'number' ? opts.height : 320;

    const canvas = createCanvas(width, height);
    const context = canvas.getContext('2d');
    ensureChartFont();
    context.fillStyle = 'white';
    context.fillRect(0, 0, width, height);

    const configuration = {
      type: 'radar',
      data: {
        labels,
        datasets: [
          {
            label: 'Puntaje',
            data: values,
            backgroundColor: 'rgba(34,139,34,0.2)',
            borderColor: 'rgba(34,139,34,1)',
            pointBackgroundColor: 'rgba(34,139,34,1)',
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
            suggestedMax: Math.max(5, ...(values.length ? values : [0])),
            ticks: {
              display: false,
              font: {
                family: CHART_FONT_FAMILY,
              },
            },
          },
        },
        plugins: { legend: { display: false } },
      },
    };

    const chart = new Chart(context, configuration);

    const buffer = canvas.toBuffer('image/png');
    chart.destroy();
    // write base64 to stdout so parent can decode
    process.stdout.write(buffer.toString('base64'));
  } catch (err) {
    console.error('Child renderer error:', err?.stack || String(err));
    process.exitCode = 2;
  }
})();
