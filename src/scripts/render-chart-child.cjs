#!/usr/bin/env node
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

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
    const width = typeof opts.width === 'number' ? opts.width : 600;
    const height = typeof opts.height === 'number' ? opts.height : 360;

    const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, backgroundColour: 'white' });

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
        scales: {
          r: {
            beginAtZero: true,
            suggestedMin: 0,
            suggestedMax: Math.max(5, ...(values.length ? values : [0])),
          },
        },
        plugins: { legend: { display: false } },
      },
    };

    const buffer = await chartJSNodeCanvas.renderToBuffer(configuration, 'image/png');
    // write base64 to stdout so parent can decode
    process.stdout.write(buffer.toString('base64'));
  } catch (err) {
    console.error('Child renderer error:', err && err.stack ? err.stack : String(err));
    process.exitCode = 2;
  }
})();
