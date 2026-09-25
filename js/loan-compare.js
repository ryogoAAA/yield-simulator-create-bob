/**
 * loan-compare.js
 * 通常シミュレーション (Single) & 2プラン比較 (Compare) UI制御
 */

function renderTable(schedule, hasNisa) {
  const totalYears = Math.ceil(schedule.length / 12);
  let yearTabs = '<div class="year-tabs" id="year-tabs">';
  for (let y = 1; y <= totalYears; y++) {
    yearTabs += `<button class="year-tab" data-year="${y}">${y}年目</button>`;
  }
  yearTabs += '</div>';

  let tableHtml = `
    <div class="table-wrap" id="schedule-table-wrap" style="max-height:420px;overflow-y:auto">
      <table>
        <thead>
          <tr>
            <th>回数</th>
            <th>元金返済額</th>
            <th>利息</th>
            <th>月返済額</th>
            <th>累計支払額</th>
            <th>残高</th>
            ${hasNisa ? '<th>NISA評価額</th>' : ''}
          </tr>
        </thead>
        <tbody>
  `;
  let cumulative = 0;
  schedule.forEach((row) => {
    cumulative += row.total;
    const rowId = `srow-${row.month}`;
    const nisaCell = hasNisa
      ? `<td class="td-nisa">${row.nisaValue != null ? fmt(row.nisaValue) + '円' : '—'}</td>`
      : '';
    tableHtml += `<tr id="${rowId}">
      <td>${row.month}回</td>
      <td class="td-principal">${fmt(row.principal)}円</td>
      <td class="td-interest">${fmt(row.interest)}円</td>
      <td class="td-total">${fmt(row.total)}円</td>
      <td class="td-cumulative">${fmt(cumulative)}円</td>
      <td>${fmt(row.balance)}円</td>
      ${nisaCell}
    </tr>`;
  });
  tableHtml += `</tbody></table></div>`;

  const scheduleContent = document.getElementById('schedule-content');
  if (scheduleContent) scheduleContent.innerHTML = yearTabs + tableHtml;

  const tableWrap = document.getElementById('schedule-table-wrap');
  document.querySelectorAll('.year-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const y = parseInt(btn.dataset.year);
      const firstMonth = (y - 1) * 12 + 1;
      const targetRow  = document.getElementById('srow-' + firstMonth);
      if (targetRow && tableWrap) {
        tableWrap.scrollTop = targetRow.offsetTop - tableWrap.offsetTop;
      }
      document.querySelectorAll('.year-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

function runSingle() {
  const PEl = document.getElementById('principal');
  const rateEl = document.getElementById('rate');
  const yearsEl = document.getElementById('years');
  const repayEl = document.querySelector('#repay-type input[type="radio"]:checked');
  if (!PEl || !rateEl || !yearsEl || !repayEl) return;

  const P     = parseFloat(PEl.value) * 10000;
  const rate  = parseFloat(rateEl.value);
  const years = parseInt(yearsEl.value, 10);
  const repay = repayEl.value;

  if (isNaN(P) || P <= 0 || isNaN(rate) || rate < 0 || isNaN(years) || years < 1) return;

  const nisaBalance = (parseFloat(document.getElementById('nisa-balance').value) || 0) * 10000;
  const nisaMonthly = parseFloat(document.getElementById('nisa-monthly').value) || 0;
  const nisaRate    = parseFloat(document.getElementById('nisa-rate').value)    || 0;
  const months = years * 12;

  const schedule = repay === 'equal_installment'
    ? calcEqualInstallment(P, rate, months)
    : calcEqualPrincipal(P, rate, months);

  const nisaValues = calcNisa(nisaBalance, nisaMonthly, nisaRate, months);
  schedule.forEach((row, i) => { row.nisaValue = nisaValues[i]; });

  const totalPay       = schedule.reduce((s, r) => s + r.total, 0);
  const totalInterest  = schedule.reduce((s, r) => s + r.interest, 0);
  const firstMonthly   = schedule[0].total;
  const lastMonthly    = schedule[schedule.length - 1].total;
  const repayLabel     = repay === 'equal_installment' ? '元利均等返済' : '元金均等返済';

  const donutSvg = buildDonut(P, totalInterest);
  const nisaFinal = schedule[months - 1].nisaValue;
  const nisaTotalInvest = nisaBalance + nisaMonthly * months;
  const nisaGain = nisaFinal - nisaTotalInvest;
  const gainColor = nisaGain >= totalInterest ? '#2a9d5c' : '#e05c2a';

  const summaryHtml = `
    <div class="summary-grid">
      <div class="summary-item highlight">
        <div class="s-label">初回月返済額</div>
        <div class="s-val">${fmt(firstMonthly)}<span>円</span></div>
      </div>
      ${repay === 'equal_principal' ? `
      <div class="summary-item">
        <div class="s-label">最終月返済額</div>
        <div class="s-val">${fmt(lastMonthly)}<span>円</span></div>
      </div>` : `
      <div class="summary-item">
        <div class="s-label">毎月返済額（一定）</div>
        <div class="s-val">${fmt(firstMonthly)}<span>円</span></div>
      </div>`}
      <div class="summary-item">
        <div class="s-label">総返済額</div>
        <div class="s-val">${fmt(totalPay)}<span>円</span></div>
      </div>
      <div class="summary-item">
        <div class="s-label">借入元金</div>
        <div class="s-val">${fmt(P)}<span>円</span></div>
      </div>
      <div class="summary-item">
        <div class="s-label">総利息</div>
        <div class="s-val" style="color:#e05c2a">${fmt(totalInterest)}<span>円</span></div>
      </div>
      <div class="summary-item">
        <div class="s-label">返済方式</div>
        <div class="s-val" style="font-size:14px">${repayLabel}</div>
      </div>
    </div>
    <div class="section-divider" style="margin-top:20px">完済時 NISA vs ローン 比較</div>
    <div class="summary-grid">
      <div class="summary-item success">
        <div class="s-label">NISA評価額（完済時）</div>
        <div class="s-val">${fmt(nisaFinal)}<span>円</span></div>
      </div>
      <div class="summary-item">
        <div class="s-label">NISA総投資額</div>
        <div class="s-val">${fmt(nisaTotalInvest)}<span>円</span></div>
      </div>
      <div class="summary-item success">
        <div class="s-label">NISA運用益</div>
        <div class="s-val" style="color:${gainColor}">${fmt(nisaGain)}<span>円</span></div>
      </div>
      <div class="summary-item" style="grid-column:span 2;border-color:${nisaFinal <= totalPay ? '#e05c2a' : '#2a9d5c'};background:${nisaFinal <= totalPay ? '#fff8f4' : '#f0faf4'}">
        <div class="s-label">総返済額 − NISA評価額</div>
        <div class="s-val" style="color:${nisaFinal <= totalPay ? '#e05c2a' : '#2a9d5c'}">${nisaFinal <= totalPay ? '+' : ''}${fmt(totalPay - nisaFinal)}<span>円</span></div>
      </div>
    </div>
    <div class="chart-row" style="margin-top:20px">
      <div class="donut-wrap">
        ${donutSvg}
        <div class="donut-center">
          <div class="dc-label">利息割合</div>
          <div class="dc-val">${(totalInterest / totalPay * 100).toFixed(1)}%</div>
        </div>
      </div>
    </div>
  `;
  const summaryContent = document.getElementById('summary-content');
  if (summaryContent) summaryContent.innerHTML = summaryHtml;
  renderTable(schedule, true);
}

function renderCompareSummary(schedule, P, repay, targetId, accentColor, nisaOpts) {
  const totalPay       = schedule.reduce((s, r) => s + r.total, 0);
  const totalInterest  = schedule.reduce((s, r) => s + r.interest, 0);
  const firstMonthly   = schedule[0].total;
  const lastMonthly    = schedule[schedule.length - 1].total;
  const repayLabel     = repay === 'equal_installment' ? '元利均等返済' : '元金均等返済';
  const donutSvg       = buildDonut(P, totalInterest);
  const months         = schedule.length;

  const nisaFinal      = schedule[months - 1].nisaValue;
  const nisaTotalInvest = nisaOpts.balance + nisaOpts.monthly * months;
  const nisaGain       = nisaFinal - nisaTotalInvest;
  const gainColor      = nisaGain >= totalInterest ? '#2a9d5c' : '#e05c2a';

  const html = `
    <div class="summary-grid">
      <div class="summary-item highlight">
        <div class="s-label">初回月返済額</div>
        <div class="s-val" style="color:${accentColor}">${fmt(firstMonthly)}<span>円</span></div>
      </div>
      ${repay === 'equal_principal' ? `
      <div class="summary-item">
        <div class="s-label">最終月返済額</div>
        <div class="s-val">${fmt(lastMonthly)}<span>円</span></div>
      </div>` : `
      <div class="summary-item">
        <div class="s-label">毎月返済額（一定）</div>
        <div class="s-val">${fmt(firstMonthly)}<span>円</span></div>
      </div>`}
      <div class="summary-item">
        <div class="s-label">総返済額</div>
        <div class="s-val">${fmt(totalPay)}<span>円</span></div>
      </div>
      <div class="summary-item">
        <div class="s-label">借入元金</div>
        <div class="s-val">${fmt(P)}<span>円</span></div>
      </div>
      <div class="summary-item">
        <div class="s-label">総利息</div>
        <div class="s-val" style="color:#e05c2a">${fmt(totalInterest)}<span>円</span></div>
      </div>
      <div class="summary-item">
        <div class="s-label">返済方式</div>
        <div class="s-val" style="font-size:14px">${repayLabel}</div>
      </div>
    </div>
    <div class="section-divider" style="margin-top:20px">完済時 NISA vs ローン 比較</div>
    <div class="summary-grid">
      <div class="summary-item success">
        <div class="s-label">NISA評価額（完済時）</div>
        <div class="s-val">${fmt(nisaFinal)}<span>円</span></div>
      </div>
      <div class="summary-item">
        <div class="s-label">NISA総投資額</div>
        <div class="s-val">${fmt(nisaTotalInvest)}<span>円</span></div>
      </div>
      <div class="summary-item success">
        <div class="s-label">NISA運用益</div>
        <div class="s-val" style="color:${gainColor}">${fmt(nisaGain)}<span>円</span></div>
      </div>
    </div>
    <div class="chart-row" style="margin-top:20px">
      <div class="donut-wrap">
        ${donutSvg}
        <div class="donut-center">
          <div class="dc-label">利息割合</div>
          <div class="dc-val">${(totalInterest / totalPay * 100).toFixed(1)}%</div>
        </div>
      </div>
    </div>
  `;
  const target = document.getElementById(targetId);
  if (target) target.innerHTML = html;
}

function runCompare() {
  const PAEl = document.getElementById('principal-a');
  const rateAEl = document.getElementById('rate-a');
  const yrsAEl = document.getElementById('years-a');
  const repAEl = document.querySelector('#repay-type-a input[type="radio"]:checked');

  const PBEl = document.getElementById('principal-b');
  const rateBEl = document.getElementById('rate-b');
  const yrsBEl = document.getElementById('years-b');
  const repBEl = document.querySelector('#repay-type-b input[type="radio"]:checked');

  if (!PAEl || !rateAEl || !yrsAEl || !repAEl || !PBEl || !rateBEl || !yrsBEl || !repBEl) return;

  const PA    = parseFloat(PAEl.value) * 10000;
  const rateA = parseFloat(rateAEl.value);
  const yrsA  = parseInt(yrsAEl.value, 10);
  const repA  = repAEl.value;

  const PB    = parseFloat(PBEl.value) * 10000;
  const rateB = parseFloat(rateBEl.value);
  const yrsB  = parseInt(yrsBEl.value, 10);
  const repB  = repBEl.value;

  if (isNaN(PA) || PA <= 0 || isNaN(rateA) || rateA < 0 || isNaN(yrsA) || yrsA < 1) return;
  if (isNaN(PB) || PB <= 0 || isNaN(rateB) || rateB < 0 || isNaN(yrsB) || yrsB < 1) return;

  const schA = repA === 'equal_installment'
    ? calcEqualInstallment(PA, rateA, yrsA * 12)
    : calcEqualPrincipal(PA, rateA, yrsA * 12);
  const schB = repB === 'equal_installment'
    ? calcEqualInstallment(PB, rateB, yrsB * 12)
    : calcEqualPrincipal(PB, rateB, yrsB * 12);

  const nisaBalA  = (parseFloat(document.getElementById('nisa-balance-a').value) || 0) * 10000;
  const nisaMonA  = parseFloat(document.getElementById('nisa-monthly-a').value) || 0;
  const nisaRateA = parseFloat(document.getElementById('nisa-rate-a').value) || 0;
  const valsA = calcNisa(nisaBalA, nisaMonA, nisaRateA, yrsA * 12);
  schA.forEach((row, i) => { row.nisaValue = valsA[i]; });

  const nisaBalB  = (parseFloat(document.getElementById('nisa-balance-b').value) || 0) * 10000;
  const nisaMonB  = parseFloat(document.getElementById('nisa-monthly-b').value) || 0;
  const nisaRateB = parseFloat(document.getElementById('nisa-rate-b').value) || 0;
  const valsB = calcNisa(nisaBalB, nisaMonB, nisaRateB, yrsB * 12);
  schB.forEach((row, i) => { row.nisaValue = valsB[i]; });

  renderCompareSummary(schA, PA, repA, 'summary-a', '#1e3a5f', { balance: nisaBalA, monthly: nisaMonA });
  renderCompareSummary(schB, PB, repB, 'summary-b', '#c07020', { balance: nisaBalB, monthly: nisaMonB });

  const labelA = `A: ${Math.round(PA/10000)}万円 ${rateA}% ${yrsA}年`;
  const labelB = `B: ${Math.round(PB/10000)}万円 ${rateB}% ${yrsB}年`;
  const chartWrap = document.getElementById('line-chart-wrap');
  if (chartWrap) chartWrap.innerHTML = buildLineChart(schA, schB, labelA, labelB);
}

function initLoanEvents() {
  ['principal','rate','years','nisa-balance','nisa-monthly','nisa-rate'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', runSingle);
  });
  document.querySelectorAll('#repay-type input[type="radio"]').forEach(r => {
    r.addEventListener('change', runSingle);
  });

  ['principal-a','rate-a','years-a','nisa-balance-a','nisa-monthly-a','nisa-rate-a',
   'principal-b','rate-b','years-b','nisa-balance-b','nisa-monthly-b','nisa-rate-b'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', runCompare);
  });
  document.querySelectorAll('#repay-type-a input[type="radio"], #repay-type-b input[type="radio"]').forEach(r => {
    r.addEventListener('change', runCompare);
  });
}
