/**
 * charts.js
 * SVGグラフ生成（ドーナツ図、折れ線グラフ、NISA推移、残高推移、月別支払棒グラフ）
 */

/**
 * 元金・利息・手数料の内訳ドーナツSVGを生成
 */
function buildDonut(principal, interest, fee = 0) {
  const total = principal + interest + fee;
  if (total <= 0) return '';
  const pPct  = principal / total;
  const iPct  = interest / total;
  const fPct  = fee / total;

  const R = 60, r = 38, cx = 70, cy = 70, size = 140;
  function polarToXY(cx, cy, R, angleDeg) {
    const a = (angleDeg - 90) * Math.PI / 180;
    return [cx + R * Math.cos(a), cy + R * Math.sin(a)];
  }
  function slice(startDeg, sweepDeg, color) {
    if (sweepDeg <= 0) return '';
    if (sweepDeg >= 360) sweepDeg = 359.99;
    const [x1, y1] = polarToXY(cx, cy, R, startDeg);
    const [x2, y2] = polarToXY(cx, cy, R, startDeg + sweepDeg);
    const [ix1, iy1] = polarToXY(cx, cy, r, startDeg);
    const [ix2, iy2] = polarToXY(cx, cy, r, startDeg + sweepDeg);
    const large = sweepDeg > 180 ? 1 : 0;
    return `<path d="M${x1},${y1} A${R},${R} 0 ${large},1 ${x2},${y2} L${ix2},${iy2} A${r},${r} 0 ${large},0 ${ix1},${iy1} Z" fill="${color}" />`;
  }

  const pSweep = pPct * 360;
  const iSweep = iPct * 360;
  const fSweep = 360 - pSweep - iSweep;

  let res = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`;
  res += slice(0, pSweep, '#1e3a5f');
  res += slice(pSweep, iSweep, '#e05c2a');
  if (fee > 0) res += slice(pSweep + iSweep, fSweep, '#7c5cd8');
  res += `</svg>`;
  return res;
}

/**
 * 2プラン比較用 残高推移折れ線SVGを生成
 */
function buildLineChart(scheduleA, scheduleB, labelA, labelB) {
  const W = 680, H = 320;
  const ML = 74, MR = 20, MT = 20, MB = 48;
  const PW = W - ML - MR, PH = H - MT - MB;

  function sampleBalances(schedule) {
    if (!schedule || schedule.length === 0) return [0];
    const pts = [schedule[0].balance + schedule[0].principal];
    for (let m = 11; m < schedule.length; m += 12) pts.push(schedule[m].balance);
    return pts;
  }

  const bA = sampleBalances(scheduleA);
  const bB = sampleBalances(scheduleB);
  const maxYears = Math.max(bA.length, bB.length) - 1;
  const maxVal   = Math.max(...bA, ...bB, 1);

  const xScale = i => ML + (i / maxYears) * PW;
  const yScale = v => MT + PH - (v / maxVal) * PH;

  let yAxisLines = '';
  for (let i = 0; i <= 5; i++) {
    const val = (maxVal / 5) * i;
    const y   = yScale(val);
    const label = Math.round(val / 10000).toLocaleString('ja-JP');
    yAxisLines += `<line x1="${ML}" y1="${y}" x2="${ML + PW}" y2="${y}" stroke="#e5e7eb" stroke-width="1"/>`;
    yAxisLines += `<text x="${ML - 6}" y="${y + 4}" text-anchor="end" font-size="11" fill="#57606a">${label}</text>`;
  }

  let xAxisLabels = '';
  for (let y = 0; y <= maxYears; y += 5) {
    const x = xScale(y);
    xAxisLabels += `<line x1="${x}" y1="${MT}" x2="${x}" y2="${MT + PH}" stroke="#e5e7eb" stroke-width="1"/>`;
    xAxisLabels += `<text x="${x}" y="${MT + PH + 18}" text-anchor="middle" font-size="11" fill="#57606a">${y}年</text>`;
  }

  function toPolyline(balances, color) {
    const pts = balances.map((v, i) => `${xScale(i)},${yScale(v)}`).join(' ');
    return `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
  }

  const legendY = MT + PH + 38;
  const legend = `
    <line x1="${ML + 100}" y1="${legendY}" x2="${ML + 124}" y2="${legendY}" stroke="#1e3a5f" stroke-width="2.5"/>
    <text x="${ML + 130}" y="${legendY + 4}" font-size="12" fill="#1e3a5f" font-weight="600">${labelA}</text>
    <line x1="${ML + 260}" y1="${legendY}" x2="${ML + 284}" y2="${legendY}" stroke="#c07020" stroke-width="2.5"/>
    <text x="${ML + 290}" y="${legendY + 4}" font-size="12" fill="#c07020" font-weight="600">${labelB}</text>
  `;

  return `
    <div style="overflow-x:auto">
      <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="max-width:100%;display:block;margin:0 auto">
        ${yAxisLines}${xAxisLabels}
        <line x1="${ML}" y1="${MT}" x2="${ML}" y2="${MT + PH}" stroke="#d0d7de" stroke-width="1"/>
        <line x1="${ML}" y1="${MT + PH}" x2="${ML + PW}" y2="${MT + PH}" stroke="#d0d7de" stroke-width="1"/>
        ${toPolyline(bA, '#1e3a5f')}
        ${toPolyline(bB, '#c07020')}
        ${legend}
      </svg>
    </div>
  `;
}
