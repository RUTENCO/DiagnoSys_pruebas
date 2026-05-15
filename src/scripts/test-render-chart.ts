import fs from 'fs';
import path from 'path';
import { renderRadarChart } from '../lib/report-charts';

(async () => {
  try {
    const labels = ['Capacidad A', 'Capacidad B', 'Capacidad C', 'Capacidad D'];
    const values = [3.2, 4.1, 2.5, 3.8];
    const buf = await renderRadarChart(labels, values, 600, 360);
    const out = path.resolve(process.cwd(), 'tmp-chart.png');
    fs.writeFileSync(out, Buffer.from(buf));
    console.log('Wrote', out);
  } catch (err) {
    console.error('Render error:', err);
    process.exitCode = 1;
  }
})();
