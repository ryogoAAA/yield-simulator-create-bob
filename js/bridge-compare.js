/**
 * bridge-compare.js
 * つなぎ融資 vs 分割融資 比較シミュレーション UIおよび描画ロジック
 */

function formatDateOffset(monthsOffset, dayOffset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + monthsOffset);
  if (dayOffset !== 0) d.setDate(d.getDate() + dayOffset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const defaultStagePresets = {
  1: [
    { name: '1回目: 建物引渡・完成時', amountMan: 4500, date: formatDateOffset(10) }
  ],
  2: [
    { name: '1回目: 土地購入代金', amountMan: 1800, date: formatDateOffset(2) },
    { name: '2回目: 建物引渡・完成時', amountMan: 2700, date: formatDateOffset(10) }
  ],
  3: [
    { name: '1回目: 土地購入代金', amountMan: 1800, date: formatDateOffset(2) },
    { name: '2回目: 着工金（建物）', amountMan: 1350, date: formatDateOffset(6) },
    { name: '3回目: 建物引渡・完成時', amountMan: 1350, date: formatDateOffset(10) }
  ],
  4: [
    { name: '1回目: 土地代金', amountMan: 2960, date: '2026-11-26' },
    { name: '2回目: 着工金', amountMan: 4041, date: '2027-01-28' },
    { name: '3回目: 上棟・中間金', amountMan: 1530, date: '2027-06-19' },
    { name: '4回目: 建物引渡・完成時', amountMan: 567.5, date: '2027-06-19' }
  ],
  5: [
    { name: '1回目: 土地手付・取得', amountMan: 1350, date: formatDateOffset(1) },
    { name: '2回目: 土地残代金', amountMan: 900, date: formatDateOffset(3) },
    { name: '3回目: 建物着工金', amountMan: 900, date: formatDateOffset(5) },
    { name: '4回目: 建物中間金', amountMan: 675, date: formatDateOffset(8) },
    { name: '5回目: 建物引渡・完成時', amountMan: 675, date: formatDateOffset(10) }
  ]
};

let lastTsunagiSchedule = [];
let lastBunkatsuSchedule = [];
let lastNisaTrackTsunagi = [];
let lastMaxConstMonths = 0;
let activeTableTab = 'tsunagi';
let activeChartTab = 'nisa';

function updateStageInputs() {
  const stagesCountEl = document.getElementById('br-stages-count');
  const count = stagesCountEl ? parseInt(stagesCountEl.value, 10) : 4;
  const container = document.getElementById('stage-inputs-container');
  if (!container) return;
  const presets = defaultStagePresets[count] || defaultStagePresets[4];

  let html = '';
  presets.forEach((cfg, idx) => {
    const isFinal = (idx === count - 1);
    html += `
      <div class="stage-item" data-idx="${idx}">
        <div class="stage-title">
          <span>第${idx + 1}回: ${cfg.name}</span>
          ${isFinal ? '<span style="color:#2a9d5c">【完成・本融資実行日】</span>' : '<span style="color:#e05c2a">中間支払い</span>'}
        </div>
        <div class="stage-grid" style="grid-template-columns: 1.3fr 1.3fr 0.8fr;">
          <div class="form-group" style="margin-bottom:0">
            <label>支払金額</label>
            <div class="input-wrap">
              <input type="number" class="stg-amt" data-idx="${idx}" value="${cfg.amountMan}" min="0" step="10" />
              <span class="input-unit">万円</span>
            </div>
          </div>
          <div class="form-group" style="margin-bottom:0">
            <label>支払予定日</label>
            <div class="input-wrap">
              <input type="date" class="stg-date" data-idx="${idx}" value="${cfg.date}" />
            </div>
          </div>
          <div class="form-group" style="margin-bottom:0">
            <label>構成比率</label>
            <div class="input-wrap">
              <input type="text" class="stg-pct" data-idx="${idx}" readonly style="background:#f7f8fa;color:#57606a;" value="0%" />
            </div>
          </div>
        </div>
        <div class="stg-days-info" style="font-size:11px;color:#57606a;margin-top:4px;"></div>
      </div>
    `;
  });
  container.innerHTML = html;

  container.querySelectorAll('.stage-item').forEach(item => {
    const amtInp = item.querySelector('.stg-amt');
    const dateInp = item.querySelector('.stg-date');

    amtInp.addEventListener('input', () => {
      updateStagePercentages();
      runBridgeCompare();
    });

    dateInp.addEventListener('change', () => {
      runBridgeCompare();
    });
  });

  updateStagePercentages();
}

function updateStagePercentages() {
  const stageItems = document.querySelectorAll('#stage-inputs-container .stage-item');
  let sumMan = 0;
  stageItems.forEach(el => {
    sumMan += parseFloat(el.querySelector('.stg-amt').value) || 0;
  });
  stageItems.forEach(el => {
    const amt = parseFloat(el.querySelector('.stg-amt').value) || 0;
    const pct = sumMan > 0 ? (Math.round((amt / sumMan) * 1000) / 10) : 0;
    el.querySelector('.stg-pct').value = `${pct}%`;
  });
  return sumMan;
}

function runBridgeCompare() {
  try {
    const mainRateTsunagiEl = document.getElementById('br-main-rate-tsunagi');
    const mainRateBunkatsuEl = document.getElementById('br-main-rate-bunkatsu');
    const yearsEl = document.getElementById('br-years');
    const repayRadio = document.querySelector('#repay-type-bridge input[type="radio"]:checked');
    const tsunagiRateEl = document.getElementById('br-tsunagi-rate');
    const tsunagiFeePerEl = document.getElementById('br-tsunagi-fee-per');
    const bunkatsuFeePerEl = document.getElementById('br-bunkatsu-fee-per');
    const includeFeeInLoanEl = document.getElementById('br-include-fee-in-loan');
    const nisaRateEl = document.getElementById('br-nisa-rate');

    const mainRateTsunagi = mainRateTsunagiEl ? parseFloat(mainRateTsunagiEl.value) : 1.53;
    const mainRateBunkatsu = mainRateBunkatsuEl ? parseFloat(mainRateBunkatsuEl.value) : 1.37;
    const years = yearsEl ? parseInt(yearsEl.value, 10) : 35;
    const mainMonths = Math.max(12, (isNaN(years) ? 35 : years) * 12);
    const repay = repayRadio ? repayRadio.value : 'equal_installment';

    const tsunagiRate = tsunagiRateEl ? parseFloat(tsunagiRateEl.value) : 2.8;
    const tsunagiFeePer = tsunagiFeePerEl ? parseFloat(tsunagiFeePerEl.value) || 0 : 0;
    const bunkatsuFeePer = bunkatsuFeePerEl ? parseFloat(bunkatsuFeePerEl.value) || 0 : 0;
    const includeFeeInLoan = includeFeeInLoanEl ? includeFeeInLoanEl.checked : true;
    const nisaAnnualRate = nisaRateEl ? parseFloat(nisaRateEl.value) || 0 : 5.0;

    // 1. 各ステージ情報の取得
    const stageItems = document.querySelectorAll('#stage-inputs-container .stage-item');
    if (stageItems.length === 0) return;

    const stages = [];
    let calculatedStageSum = 0;
    stageItems.forEach((el, idx) => {
      const amtInp = el.querySelector('.stg-amt');
      const dateInp = el.querySelector('.stg-date');
      const amtMan = amtInp ? (parseFloat(amtInp.value) || 0) : 0;
      const dateVal = dateInp ? dateInp.value : '';
      const amtYen = amtMan * 10000;
      calculatedStageSum += amtYen;
      stages.push({
        idx: idx + 1,
        amount: amtYen,
        amountMan: amtMan,
        dateStr: dateVal,
        dateObj: dateVal ? new Date(dateVal) : new Date(),
        isFinal: (idx === stageItems.length - 1)
      });
    });

    const effectiveTotalPrincipal = calculatedStageSum;
    const finalStage = stages[stages.length - 1];
    const finalDate = finalStage ? finalStage.dateObj : new Date();

    // 各ステージの日数・月数計算と情報ラベル更新
    stages.forEach((s, idx) => {
      const itemEl = stageItems[idx];
      const infoEl = itemEl.querySelector('.stg-days-info');
      if (s.isFinal) {
        s.days = 0;
        s.months = 0;
        if (infoEl) infoEl.innerHTML = `<span style="color:#2a9d5c;">※この日より本融資の返済がスタートします</span>`;
      } else {
        const diffMs = Math.max(0, finalDate.getTime() - s.dateObj.getTime());
        const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
        s.days = days;
        s.months = days / 30.4375;
        if (infoEl) {
          infoEl.innerHTML = `引渡まで <strong>${days} 日間</strong>（約 ${(days / 30.4).toFixed(1)} ヶ月）`;
        }
      }
    });

    const intermediateStages = stages.filter(s => !s.isFinal && s.days > 0);
    const intermediateCount = stages.filter(s => !s.isFinal).length;

    // 2. 本融資の手数料 (2.2% 税込)
    const baseBankFee = effectiveTotalPrincipal * 0.022;
    const totalWithFee = effectiveTotalPrincipal + baseBankFee;

    // 分割実行合計ボックスの表示更新
    const sumPEl = document.getElementById('stg-sum-principal');
    const sumFEl = document.getElementById('stg-sum-fee');
    const sumTotEl = document.getElementById('stg-sum-total-with-fee');
    if (sumPEl) sumPEl.textContent = `${fmtMan(effectiveTotalPrincipal)} 万円 (${fmt(effectiveTotalPrincipal)} 円)`;
    if (sumFEl) sumFEl.textContent = `${fmtMan(baseBankFee)} 万円 (${fmt(baseBankFee)} 円)`;
    if (sumTotEl) sumTotEl.textContent = `${fmtMan(totalWithFee)} 万円 (${fmt(totalWithFee)} 円)`;

    if (effectiveTotalPrincipal <= 0) return;

    // 借入元金の確定 (手数料を含めるかどうか)
    const finalMainPrincipal = includeFeeInLoan ? totalWithFee : effectiveTotalPrincipal;

    // -------------------------------------------------------------
    // 【プランA: つなぎ融資】
    // -------------------------------------------------------------
    let tsunagiTotalInterest = 0;
    intermediateStages.forEach(s => {
      const interest = s.amount * (tsunagiRate / 100) * (s.days / 365);
      tsunagiTotalInterest += interest;
    });

    const tsunagiExtraFees = intermediateCount * tsunagiFeePer;
    const tsunagiMainP = finalMainPrincipal + tsunagiTotalInterest;

    // 本融資スケジュール (完成後 35年: つなぎ用本融資年利)
    const tsunagiMainSchedule = repay === 'equal_installment'
      ? calcEqualInstallment(tsunagiMainP, mainRateTsunagi, mainMonths)
      : calcEqualPrincipal(tsunagiMainP, mainRateTsunagi, mainMonths);

    const maxConstMonths = Math.max(...stages.map(s => Math.ceil(s.months || 0)), 0);

    const tsunagiFullSchedule = [];
    for (let m = 1; m <= maxConstMonths; m++) {
      tsunagiFullSchedule.push({
        month: m,
        phase: 'bridge',
        principal: 0,
        interest: 0,
        total: 0,
        balance: effectiveTotalPrincipal
      });
    }
    tsunagiMainSchedule.forEach(r => {
      tsunagiFullSchedule.push({
        month: maxConstMonths + r.month,
        phase: 'main',
        principal: r.principal,
        interest: r.interest,
        total: r.total,
        balance: r.balance
      });
    });

    const tsunagiMainInterest = tsunagiMainSchedule.reduce((s, r) => s + r.interest, 0);
    const tsunagiTotalPayment = tsunagiMainSchedule.reduce((s, r) => s + r.total, 0)
      + (includeFeeInLoan ? 0 : baseBankFee)
      + tsunagiExtraFees;

    // -------------------------------------------------------------
    // 【プランB: 分割融資】
    // -------------------------------------------------------------
    let bunkatsuConstructionInterestTotal = 0;
    intermediateStages.forEach(s => {
      const interest = s.amount * (mainRateBunkatsu / 100) * (s.days / 365);
      bunkatsuConstructionInterestTotal += interest;
    });

    const bunkatsuExtraFees = intermediateCount * bunkatsuFeePer;
    const bunkatsuMainP = finalMainPrincipal;

    // 本融資スケジュール (完成後 35年: 分割用本融資年利)
    const bunkatsuMainSchedule = repay === 'equal_installment'
      ? calcEqualInstallment(bunkatsuMainP, mainRateBunkatsu, mainMonths)
      : calcEqualPrincipal(bunkatsuMainP, mainRateBunkatsu, mainMonths);

    const bunkatsuConstMonthlyPayments = [];
    for (let m = 1; m <= maxConstMonths; m++) {
      const monthsBeforeThisMonth = maxConstMonths - m + 1;
      let activeP = 0;
      stages.forEach(s => {
        if (!s.isFinal && s.months >= monthsBeforeThisMonth - 0.5) {
          activeP += s.amount;
        }
      });
      const monthlyInt = activeP * (mainRateBunkatsu / 100 / 12);
      bunkatsuConstMonthlyPayments.push({
        month: m,
        phase: 'bridge',
        activePrincipal: activeP,
        principal: 0,
        interest: monthlyInt,
        total: monthlyInt,
        balance: effectiveTotalPrincipal
      });
    }

    const bunkatsuFullSchedule = [];
    bunkatsuConstMonthlyPayments.forEach(r => bunkatsuFullSchedule.push(r));
    bunkatsuMainSchedule.forEach(r => {
      bunkatsuFullSchedule.push({
        month: maxConstMonths + r.month,
        phase: 'main',
        principal: r.principal,
        interest: r.interest,
        total: r.total,
        balance: r.balance
      });
    });

    const bunkatsuMainInterest = bunkatsuMainSchedule.reduce((s, r) => s + r.interest, 0);
    const bunkatsuTotalPayment = bunkatsuMainSchedule.reduce((s, r) => s + r.total, 0)
      + bunkatsuConstructionInterestTotal
      + (includeFeeInLoan ? 0 : baseBankFee)
      + bunkatsuExtraFees;

    lastTsunagiSchedule = tsunagiFullSchedule;
    lastBunkatsuSchedule = bunkatsuFullSchedule;

    // -------------------------------------------------------------
    // 【NISA 運用シミュレーション】
    // -------------------------------------------------------------
    const monthlyRate = Math.pow(1 + nisaAnnualRate / 100, 1 / 12) - 1;

    const bunkatsuNisaFinal = 0;
    const bunkatsuNisaInvested = 0;
    const bunkatsuNisaGain = 0;

    let tsunagiNisaBalance = 0;
    let tsunagiTotalContributed = 0;
    const tsunagiNisaTrack = [];

    // 着工期間中
    for (let m = 0; m < maxConstMonths; m++) {
      const savedInterest = bunkatsuConstMonthlyPayments[m] ? bunkatsuConstMonthlyPayments[m].interest : 0;
      tsunagiNisaBalance = (tsunagiNisaBalance + savedInterest) * (1 + monthlyRate);
      tsunagiTotalContributed += savedInterest;
      tsunagiNisaTrack.push(tsunagiNisaBalance);
    }
    // 本融資返済期間中 (複利成長)
    for (let m = 0; m < mainMonths; m++) {
      tsunagiNisaBalance = tsunagiNisaBalance * (1 + monthlyRate);
      tsunagiNisaTrack.push(tsunagiNisaBalance);
    }

    const tsunagiNisaFinal = tsunagiNisaBalance;
    const tsunagiNisaInvested = tsunagiTotalContributed;
    const tsunagiNisaGain = Math.max(0, tsunagiNisaFinal - tsunagiNisaInvested);
    lastNisaTrackTsunagi = tsunagiNisaTrack;
    lastMaxConstMonths = maxConstMonths;

    // 実質負担総額 (総支払額 - NISA評価益)
    const tsunagiNetCost = tsunagiTotalPayment - tsunagiNisaGain;
    const bunkatsuNetCost = bunkatsuTotalPayment - bunkatsuNisaGain;
    const diffNetCost = Math.abs(tsunagiNetCost - bunkatsuNetCost);
    const isBunkatsuWin = bunkatsuNetCost < tsunagiNetCost;

    // -------------------------------------------------------------
    // UI表示: サマリー & 判定
    // -------------------------------------------------------------
    renderVerdict(
      isBunkatsuWin,
      tsunagiTotalPayment,
      bunkatsuTotalPayment,
      tsunagiNetCost,
      bunkatsuNetCost,
      diffNetCost,
      tsunagiTotalInterest,
      bunkatsuConstructionInterestTotal,
      tsunagiMainSchedule[0].total,
      bunkatsuMainSchedule[0].total,
      tsunagiExtraFees,
      bunkatsuExtraFees,
      includeFeeInLoan
    );

    renderBridgePlanSummary('br-tsunagi-summary', {
      type: 'つなぎ融資',
      constMonthly: '0 円（後払い上乗せ）',
      mainRateApplied: mainRateTsunagi,
      mainMonthly: tsunagiMainSchedule[0].total,
      mainPrincipal: tsunagiMainP,
      totalPayment: tsunagiTotalPayment,
      intermediateInterest: tsunagiTotalInterest,
      mainInterest: tsunagiMainInterest,
      totalInterest: tsunagiTotalInterest + tsunagiMainInterest,
      fees: (includeFeeInLoan ? 0 : baseBankFee) + tsunagiExtraFees,
      accentColor: '#1e3a5f'
    });

    renderBridgePlanSummary('br-bunkatsu-summary', {
      type: '分割融資',
      constMonthly: `約 ${fmt(bunkatsuConstMonthlyPayments.length > 0 ? bunkatsuConstMonthlyPayments[0].interest : 0)} 〜 ${fmt(bunkatsuConstMonthlyPayments.length > 0 ? bunkatsuConstMonthlyPayments[bunkatsuConstMonthlyPayments.length - 1].interest : 0)} 円`,
      mainRateApplied: mainRateBunkatsu,
      mainMonthly: bunkatsuMainSchedule[0].total,
      mainPrincipal: bunkatsuMainP,
      totalPayment: bunkatsuTotalPayment,
      intermediateInterest: bunkatsuConstructionInterestTotal,
      mainInterest: bunkatsuMainInterest,
      totalInterest: bunkatsuConstructionInterestTotal + bunkatsuMainInterest,
      fees: (includeFeeInLoan ? 0 : baseBankFee) + bunkatsuExtraFees,
      accentColor: '#10b981'
    });

    renderBridgeNisaSummary(
      tsunagiNisaInvested,
      bunkatsuNisaInvested,
      tsunagiNisaFinal,
      bunkatsuNisaFinal,
      tsunagiNisaGain,
      bunkatsuNisaGain,
      tsunagiNetCost,
      bunkatsuNetCost,
      bunkatsuConstructionInterestTotal
    );

    // グラフ
    renderBridgeCharts(tsunagiFullSchedule, bunkatsuFullSchedule, maxConstMonths);

    // テーブル
    renderBridgeScheduleTable();
  } catch (err) {
    console.error('runBridgeCompare error:', err);
  }
}

// 判定コメント描画
function renderVerdict(
  isBunkatsuWin,
  tsunagiTotalPay,
  bunkatsuTotalPay,
  tsunagiNet,
  bunkatsuNet,
  diffNet,
  tsunagiInterInt,
  bunkatsuInterInt,
  tsunagiMonthly,
  bunkatsuMonthly,
  tsunagiExtraFees,
  bunkatsuExtraFees,
  includeFeeInLoan
) {
  const box = document.getElementById('br-verdict-content');
  if (!box) return;
  const diffPay = Math.abs(tsunagiTotalPay - bunkatsuTotalPay);
  const winPlan = isBunkatsuWin ? '分割融資' : 'つなぎ融資';
  const winClass = isBunkatsuWin ? 'bunkatsu-win' : 'tsunagi-win';
  const badgeClass = isBunkatsuWin ? 'badge-bunkatsu' : 'badge-tsunagi';

  let reasonList = '';
  if (isBunkatsuWin) {
    reasonList = `
      <ul style="margin: 8px 0 8px 20px; font-size:13px; color:#2c3e50;">
        <li><strong>金利差による利息圧縮:</strong> 中間資金に本融資の低金利が適用され、着工中利息を <strong>${fmt(Math.max(0, tsunagiInterInt - bunkatsuInterInt))}円</strong> 抑制できました。</li>
        <li><strong>利息の複利上乗せ回避:</strong> つなぎ融資では利息が本融資元本に加算されて35年ローン化するため、完成後の月々返済額が <strong>約 ${fmt(Math.max(0, tsunagiMonthly - bunkatsuMonthly))}円/月</strong> 分割融資の方が安くなります。</li>
        <li><strong>手数料の差:</strong> 諸手数料の差（つなぎ事務手数料計: ${fmt(tsunagiExtraFees)}円 vs 分割追加手数料計: ${fmt(bunkatsuExtraFees)}円）を考慮しても、金利メリットが大きく上回っています。</li>
      </ul>
    `;
  } else {
    reasonList = `
      <ul style="margin: 8px 0 8px 20px; font-size:13px; color:#2c3e50;">
        <li><strong>手続きコスト・手数料の優位:</strong> 分割融資の手数料負担や中間期間の短さにより、つなぎ融資の方が総額で有利となっています。</li>
        <li><strong>着工中のキャッシュフロー:</strong> つなぎ融資は着工期間中の月々支払いが0円のため、家賃との二重払いを防ぐ資金繰りの観点で優位性があります。</li>
      </ul>
    `;
  }

  box.innerHTML = `
    <div class="verdict-box ${winClass}">
      <span class="verdict-badge ${badgeClass}">総合判定: 【${winPlan}】が有利</span>
      <div style="font-size:15px;font-weight:700;color:#1e3a5f;margin-bottom:6px;">
        実質コスト差（NISA運用益控除後）: <span style="font-size:20px;color:${isBunkatsuWin ? '#15803d' : '#1e3a5f'}">${fmt(diffNet)} 円</span> （単純ローン総支払差額: ${fmt(diffPay)} 円）
      </div>
      <div>
        ${reasonList}
        <div style="background:#fff;padding:10px 14px;border-radius:6px;border:1px solid #e2e8f0;font-size:12px;color:#475569;margin-top:10px;">
          💡 <strong>判定ポイント & NISA投資効果:</strong><br>
          ・<strong>分割融資のメリット</strong>: 中間資金を低金利で抑えられ、ローン単体の総返済額は安くなります。<br>
          ・<strong>つなぎ融資 + NISA積立の逆転効果</strong>: つなぎ融資では着工中の支払いが0円のため、浮いた利息分をNISAで35年間長期複利運用することで大きな資産（運用益）を作ることができ、ローンの実質コストを逆転・大幅軽減できる可能性があります。<br>
          ・<strong>資金繰り</strong>: 現在の家賃とローンの二重払いを防ぎたい場合は、着工中の現金支出がない「つなぎ融資」が安全です。
        </div>
      </div>
    </div>
  `;
}

// 各プランのサマリーHTML
function renderBridgePlanSummary(targetId, p) {
  const target = document.getElementById(targetId);
  if (!target) return;
  const donutSvg = buildDonut(p.mainPrincipal, p.totalInterest, p.fees);
  target.innerHTML = `
    <div class="summary-grid" style="grid-template-columns:1fr 1fr;">
      <div class="summary-item highlight" style="grid-column:span 2">
        <div class="s-label">本融資後の毎月返済額 (年利 ${p.mainRateApplied}%)</div>
        <div class="s-val" style="color:${p.accentColor};font-size:20px">${fmt(p.mainMonthly)}<span>円/月</span></div>
      </div>
      <div class="summary-item">
        <div class="s-label">着工中の月々利息目安</div>
        <div class="s-val" style="font-size:13px">${p.constMonthly}</div>
      </div>
      <div class="summary-item">
        <div class="s-label">総支払額（手数料込）</div>
        <div class="s-val" style="font-size:15px">${fmt(p.totalPayment)}<span>円</span></div>
      </div>
      <div class="summary-item">
        <div class="s-label">本融資借入元金</div>
        <div class="s-val" style="font-size:14px">${fmt(p.mainPrincipal)}<span>円</span></div>
      </div>
      <div class="summary-item">
        <div class="s-label">中間融資利息</div>
        <div class="s-val" style="font-size:14px;color:#e05c2a">${fmt(p.intermediateInterest)}<span>円</span></div>
      </div>
      <div class="summary-item">
        <div class="s-label">本融資総利息</div>
        <div class="s-val" style="font-size:14px;color:#e05c2a">${fmt(p.mainInterest)}<span>円</span></div>
      </div>
      <div class="summary-item">
        <div class="s-label">各種手数料合計</div>
        <div class="s-val" style="font-size:14px;color:#7c5cd8">${fmt(p.fees)}<span>円</span></div>
      </div>
    </div>
    <div class="chart-row" style="margin-top:14px;justify-content:center;">
      <div class="donut-wrap">
        ${donutSvg}
        <div class="donut-center">
          <div class="dc-label">利息+手数料</div>
          <div class="dc-val" style="font-size:14px">${((p.totalInterest + p.fees) / p.totalPayment * 100).toFixed(1)}%</div>
        </div>
      </div>
    </div>
  `;
}

// NISAサマリーHTML
function renderBridgeNisaSummary(tsunagiInvested, bunkatsuInvested, tsunagiFinal, bunkatsuFinal, tsunagiGain, bunkatsuGain, tsunagiNet, bunkatsuNet, bunkatsuIntTotal) {
  const target = document.getElementById('br-nisa-summary');
  if (!target) return;
  target.innerHTML = `
    <div class="summary-grid" style="grid-template-columns: repeat(4, 1fr);">
      <div class="summary-item success">
        <div class="s-label">つなぎ: NISA積立累計（元本）</div>
        <div class="s-val" style="font-size:15px">${fmt(tsunagiInvested)}<span>円</span></div>
      </div>
      <div class="summary-item success">
        <div class="s-label">つなぎ: NISA完済時評価額</div>
        <div class="s-val">${fmt(tsunagiFinal)}<span>円</span></div>
      </div>
      <div class="summary-item success">
        <div class="s-label">つなぎ: NISA運用益</div>
        <div class="s-val">+${fmt(tsunagiGain)}<span>円</span></div>
      </div>
      <div class="summary-item highlight">
        <div class="s-label">つなぎ: 実質負担総額</div>
        <div class="s-val">${fmt(tsunagiNet)}<span>円</span></div>
      </div>

      <div class="summary-item">
        <div class="s-label">分割: NISA投資額</div>
        <div class="s-val" style="font-size:15px;color:#57606a">0<span>円</span></div>
      </div>
      <div class="summary-item">
        <div class="s-label">分割: NISA完済時評価額</div>
        <div class="s-val" style="color:#57606a">0<span>円</span></div>
      </div>
      <div class="summary-item">
        <div class="s-label">分割: NISA運用益</div>
        <div class="s-val" style="color:#57606a">0<span>円</span></div>
      </div>
      <div class="summary-item highlight" style="border-color:#10b981;background:#f0faf4;">
        <div class="s-label">分割: 実質負担総額</div>
        <div class="s-val" style="color:#15803d">${fmt(bunkatsuNet)}<span>円</span></div>
      </div>
    </div>
    <div style="font-size:12px;color:#57606a;margin-top:10px;line-height:1.6;">
      ※ <strong>NISA運用の比較ロジック</strong>:<br>
      ・<strong>分割融資</strong>: 着工中に利息（合計 ${fmt(bunkatsuIntTotal)} 円）を月々支払うため、NISA投資枠は <strong>0 円</strong> として計算。<br>
      ・<strong>つなぎ融資</strong>: 着工中の月々利息支払いが 0 円で済むため、その <strong>浮いた利息分（毎月分）をそのままNISA口座に拠出し、本融資完済まで長期複利運用</strong> した評価額および運用益を算出しています。<br>
      ・<strong>実質負担総額</strong> = 住宅ローン総支払額（諸手数料込） − NISA運用益
    </div>
  `;
}

// グラフ描画 (純SVG / 3タブ対応)
function renderBridgeCharts(tsunagiSch, bunkatsuSch, maxConstMonths) {
  if (!tsunagiSch || tsunagiSch.length === 0) return;
  const chartBox = document.getElementById('br-chart-content');
  if (!chartBox) return;

  const W = 680, H = 290;
  const ML = 76, MR = 20, MT = 20, MB = 48;
  const PW = W - ML - MR, PH = H - MT - MB;
  const totalM = tsunagiSch.length;

  if (activeChartTab === 'nisa') {
    const ptsNisa = [];
    const ptsNetT = [];
    const ptsNetB = [];
    const xLabels = [];
    const step = 12;

    let cumPayT = 0;
    let cumPayB = 0;
    for (let m = 0; m < totalM; m++) {
      cumPayT += tsunagiSch[m].total;
      cumPayB += bunkatsuSch[m].total;
      if (m % step === 0 || m === totalM - 1) {
        const nisaVal = lastNisaTrackTsunagi[m] || 0;
        ptsNisa.push(nisaVal);
        ptsNetT.push(Math.max(0, cumPayT - nisaVal));
        ptsNetB.push(cumPayB);
        xLabels.push(Math.floor(m / 12));
      }
    }

    const maxVal = Math.max(...ptsNisa, ...ptsNetT, ...ptsNetB, 100000);
    const N = ptsNisa.length;
    const xOf = i => ML + (i / (N - 1)) * PW;
    const yOf = v => MT + PH - (v / maxVal) * PH;

    let yAxis = '';
    for (let i = 0; i <= 4; i++) {
      const val = (maxVal / 4) * i;
      const y = yOf(val);
      yAxis += `<line x1="${ML}" y1="${y}" x2="${ML+PW}" y2="${y}" stroke="#e5e7eb" stroke-width="1"/>`;
      yAxis += `<text x="${ML-6}" y="${y+4}" text-anchor="end" font-size="10" fill="#57606a">${fmt(val/10000)}万</text>`;
    }

    let xAxis = '';
    for (let i = 0; i < xLabels.length; i += 3) {
      const x = xOf(i);
      xAxis += `<line x1="${x}" y1="${MT}" x2="${x}" y2="${MT+PH}" stroke="#e5e7eb" stroke-width="1"/>`;
      xAxis += `<text x="${x}" y="${MT+PH+16}" text-anchor="middle" font-size="10" fill="#57606a">${xLabels[i]}年目</text>`;
    }

    const pathNisa = ptsNisa.map((v, i) => `${xOf(i)},${yOf(v)}`).join(' ');
    const pathNetT = ptsNetT.map((v, i) => `${xOf(i)},${yOf(v)}`).join(' ');
    const pathNetB = ptsNetB.map((v, i) => `${xOf(i)},${yOf(v)}`).join(' ');

    const legendY = MT + PH + 36;
    const legend = `
      <line x1="${ML + 10}" y1="${legendY}" x2="${ML + 30}" y2="${legendY}" stroke="#2a9d5c" stroke-width="3"/>
      <text x="${ML + 35}" y="${legendY + 4}" font-size="11" fill="#2a9d5c" font-weight="600">つなぎ: NISA資産評価額</text>
      <line x1="${ML + 220}" y1="${legendY}" x2="${ML + 240}" y2="${legendY}" stroke="#3b82d4" stroke-width="2.5" stroke-dasharray="4,3"/>
      <text x="${ML + 245}" y="${legendY + 4}" font-size="11" fill="#3b82d4" font-weight="600">つなぎ: 実質累計負担</text>
      <line x1="${ML + 420}" y1="${legendY}" x2="${ML + 440}" y2="${legendY}" stroke="#10b981" stroke-width="2.5"/>
      <text x="${ML + 445}" y="${legendY + 4}" font-size="11" fill="#10b981" font-weight="600">分割: 累計支払額</text>
    `;

    chartBox.innerHTML = `
      <div style="overflow-x:auto">
        <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="max-width:100%;display:block;margin:0 auto">
          ${yAxis}${xAxis}
          <line x1="${ML}" y1="${MT}" x2="${ML}" y2="${MT+PH}" stroke="#d0d7de" stroke-width="1"/>
          <line x1="${ML}" y1="${MT+PH}" x2="${ML+PW}" y2="${MT+PH}" stroke="#d0d7de" stroke-width="1"/>
          <polyline points="${pathNisa}" fill="none" stroke="#2a9d5c" stroke-width="3"/>
          <polyline points="${pathNetT}" fill="none" stroke="#3b82d4" stroke-width="2.5" stroke-dasharray="4,3"/>
          <polyline points="${pathNetB}" fill="none" stroke="#10b981" stroke-width="2.5"/>
          ${legend}
        </svg>
      </div>
    `;

  } else if (activeChartTab === 'balance') {
    const ptsT = [];
    const ptsB = [];
    const xLabels = [];
    const step = 12;

    for (let m = 0; m < totalM; m += step) {
      ptsT.push(tsunagiSch[m].balance);
      ptsB.push(bunkatsuSch[m].balance);
      xLabels.push(Math.floor(m / 12));
    }
    ptsT.push(tsunagiSch[totalM - 1].balance);
    ptsB.push(bunkatsuSch[totalM - 1].balance);

    const maxVal = Math.max(...ptsT, ...ptsB, 1);
    const N = ptsT.length;
    const xOf = i => ML + (i / (N - 1)) * PW;
    const yOf = v => MT + PH - (v / maxVal) * PH;

    let yAxis = '';
    for (let i = 0; i <= 4; i++) {
      const val = (maxVal / 4) * i;
      const y = yOf(val);
      yAxis += `<line x1="${ML}" y1="${y}" x2="${ML+PW}" y2="${y}" stroke="#e5e7eb" stroke-width="1"/>`;
      yAxis += `<text x="${ML-6}" y="${y+4}" text-anchor="end" font-size="10" fill="#57606a">${fmt(val/10000)}万</text>`;
    }

    let xAxis = '';
    for (let i = 0; i < xLabels.length; i += 3) {
      const x = xOf(i);
      xAxis += `<line x1="${x}" y1="${MT}" x2="${x}" y2="${MT+PH}" stroke="#e5e7eb" stroke-width="1"/>`;
      xAxis += `<text x="${x}" y="${MT+PH+16}" text-anchor="middle" font-size="10" fill="#57606a">${xLabels[i]}年目</text>`;
    }

    const pathT = ptsT.map((v, i) => `${xOf(i)},${yOf(v)}`).join(' ');
    const pathB = ptsB.map((v, i) => `${xOf(i)},${yOf(v)}`).join(' ');

    const legendY = MT + PH + 36;
    const legend = `
      <line x1="${ML + 140}" y1="${legendY}" x2="${ML + 165}" y2="${legendY}" stroke="#1e3a5f" stroke-width="3"/>
      <text x="${ML + 170}" y="${legendY + 4}" font-size="11" fill="#1e3a5f" font-weight="600">つなぎ融資 残高</text>
      <line x1="${ML + 310}" y1="${legendY}" x2="${ML + 335}" y2="${legendY}" stroke="#10b981" stroke-width="3"/>
      <text x="${ML + 340}" y="${legendY + 4}" font-size="11" fill="#10b981" font-weight="600">分割融資 残高</text>
    `;

    chartBox.innerHTML = `
      <div style="overflow-x:auto">
        <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="max-width:100%;display:block;margin:0 auto">
          ${yAxis}${xAxis}
          <line x1="${ML}" y1="${MT}" x2="${ML}" y2="${MT+PH}" stroke="#d0d7de" stroke-width="1"/>
          <line x1="${ML}" y1="${MT+PH}" x2="${ML+PW}" y2="${MT+PH}" stroke="#d0d7de" stroke-width="1"/>
          <polyline points="${pathT}" fill="none" stroke="#1e3a5f" stroke-width="2.5"/>
          <polyline points="${pathB}" fill="none" stroke="#10b981" stroke-width="2.5"/>
          ${legend}
        </svg>
      </div>
    `;

  } else if (activeChartTab === 'monthly') {
    const monthsToShow = Math.min(36, totalM);
    const barW = Math.max(4, (PW / monthsToShow) * 0.38);
    const maxMonthly = Math.max(...tsunagiSch.slice(0, monthsToShow).map(r => r.total), ...bunkatsuSch.slice(0, monthsToShow).map(r => r.total), 10000);

    const xOfM = m => ML + (m / monthsToShow) * PW + (PW / monthsToShow) / 2;
    const yOfV = v => MT + PH - (v / maxMonthly) * PH;

    let yAxis = '';
    for (let i = 0; i <= 4; i++) {
      const val = (maxMonthly / 4) * i;
      const y = yOfV(val);
      yAxis += `<line x1="${ML}" y1="${y}" x2="${ML+PW}" y2="${y}" stroke="#e5e7eb" stroke-width="1"/>`;
      yAxis += `<text x="${ML-6}" y="${y+4}" text-anchor="end" font-size="10" fill="#57606a">${fmt(val/10000)}万</text>`;
    }

    let bars = '';
    for (let m = 0; m < monthsToShow; m++) {
      const rT = tsunagiSch[m];
      const rB = bunkatsuSch[m];
      const cx = xOfM(m);

      const hT = (rT.total / maxMonthly) * PH;
      const yT = MT + PH - hT;
      bars += `<rect x="${cx - barW - 1}" y="${yT}" width="${barW}" height="${hT}" fill="#1e3a5f" rx="1"/>`;

      const hB = (rB.total / maxMonthly) * PH;
      const yB = MT + PH - hB;
      bars += `<rect x="${cx + 1}" y="${yB}" width="${barW}" height="${hB}" fill="#10b981" rx="1"/>`;
    }

    let xLabels = '';
    for (let m = 0; m < monthsToShow; m += 4) {
      const cx = xOfM(m);
      xLabels += `<text x="${cx}" y="${MT+PH+16}" text-anchor="middle" font-size="10" fill="#57606a">${m+1}月目</text>`;
    }
    if (lastMaxConstMonths > 0 && lastMaxConstMonths < monthsToShow) {
      const lineX = xOfM(lastMaxConstMonths);
      xLabels += `
        <line x1="${lineX}" y1="${MT}" x2="${lineX}" y2="${MT+PH}" stroke="#e05c2a" stroke-dasharray="3,3" stroke-width="1.5"/>
        <text x="${lineX}" y="${MT - 6}" text-anchor="middle" font-size="10" fill="#e05c2a" font-weight="700">完成・引渡</text>
      `;
    }

    const legendY = MT + PH + 36;
    const legend = `
      <rect x="${ML + 140}" y="${legendY-8}" width="14" height="10" fill="#1e3a5f" rx="2"/>
      <text x="${ML + 160}" y="${legendY}" font-size="11" fill="#1e3a5f" font-weight="600">つなぎ融資 月支払</text>
      <rect x="${ML + 310}" y="${legendY-8}" width="14" height="10" fill="#10b981" rx="2"/>
      <text x="${ML + 330}" y="${legendY}" font-size="11" fill="#10b981" font-weight="600">分割融資 月支払</text>
    `;

    chartBox.innerHTML = `
      <div style="overflow-x:auto">
        <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="max-width:100%;display:block;margin:0 auto">
          ${yAxis}${xLabels}
          <line x1="${ML}" y1="${MT}" x2="${ML}" y2="${MT+PH}" stroke="#d0d7de" stroke-width="1"/>
          <line x1="${ML}" y1="${MT+PH}" x2="${ML+PW}" y2="${MT+PH}" stroke="#d0d7de" stroke-width="1"/>
          ${bars}
          ${legend}
        </svg>
      </div>
    `;
  }
}

// 明細スケジュールテーブル描画
function renderBridgeScheduleTable() {
  const tableContent = document.getElementById('br-schedule-table-content');
  if (!tableContent) return;
  const sch = activeTableTab === 'tsunagi' ? lastTsunagiSchedule : lastBunkatsuSchedule;
  if (!sch || sch.length === 0) return;

  let rowsHtml = '';
  let cumulative = 0;
  sch.forEach((r) => {
    cumulative += r.total;
    const isBridge = r.phase === 'bridge';
    const phaseBadge = isBridge
      ? `<span class="phase-badge phase-bridge">着工中</span>`
      : `<span class="phase-badge phase-main">本融資</span>`;

    rowsHtml += `
      <tr>
        <td>${r.month}月目 ${phaseBadge}</td>
        <td class="td-principal">${fmt(r.principal)}円</td>
        <td class="td-interest">${fmt(r.interest)}円</td>
        <td class="td-total">${fmt(r.total)}円</td>
        <td class="td-cumulative">${fmt(cumulative)}円</td>
        <td>${fmt(r.balance)}円</td>
      </tr>
    `;
  });

  tableContent.innerHTML = `
    <div class="table-wrap" style="max-height:360px;overflow-y:auto">
      <table>
        <thead>
          <tr>
            <th>経過月</th>
            <th>元金返済額</th>
            <th>利息支払額</th>
            <th>月返済合計</th>
            <th>累計支払額</th>
            <th>残高</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  `;
}

function initBridgeEvents() {
  const btnChartNisa = document.getElementById('btn-chart-nisa');
  const btnChartBal = document.getElementById('btn-chart-balance');
  const btnChartMon = document.getElementById('btn-chart-monthly');

  if (btnChartNisa) {
    btnChartNisa.addEventListener('click', function() {
      activeChartTab = 'nisa';
      document.querySelectorAll('[id^="btn-chart-"]').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      renderBridgeCharts(lastTsunagiSchedule, lastBunkatsuSchedule, lastMaxConstMonths);
    });
  }
  if (btnChartBal) {
    btnChartBal.addEventListener('click', function() {
      activeChartTab = 'balance';
      document.querySelectorAll('[id^="btn-chart-"]').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      renderBridgeCharts(lastTsunagiSchedule, lastBunkatsuSchedule, lastMaxConstMonths);
    });
  }
  if (btnChartMon) {
    btnChartMon.addEventListener('click', function() {
      activeChartTab = 'monthly';
      document.querySelectorAll('[id^="btn-chart-"]').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      renderBridgeCharts(lastTsunagiSchedule, lastBunkatsuSchedule, lastMaxConstMonths);
    });
  }

  const btnTabTsunagi = document.getElementById('btn-table-tsunagi');
  const btnTabBunkatsu = document.getElementById('btn-table-bunkatsu');
  if (btnTabTsunagi && btnTabBunkatsu) {
    btnTabTsunagi.addEventListener('click', function() {
      activeTableTab = 'tsunagi';
      this.classList.add('active');
      btnTabBunkatsu.classList.remove('active');
      renderBridgeScheduleTable();
    });
    btnTabBunkatsu.addEventListener('click', function() {
      activeTableTab = 'bunkatsu';
      this.classList.add('active');
      btnTabTsunagi.classList.remove('active');
      renderBridgeScheduleTable();
    });
  }

  ['br-main-rate-tsunagi','br-main-rate-bunkatsu','br-years','br-tsunagi-rate','br-tsunagi-fee-per','br-bunkatsu-fee-per','br-nisa-rate'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', runBridgeCompare);
  });
  const feeInLoanEl = document.getElementById('br-include-fee-in-loan');
  if (feeInLoanEl) feeInLoanEl.addEventListener('change', runBridgeCompare);
  const stagesCountEl = document.getElementById('br-stages-count');
  if (stagesCountEl) {
    stagesCountEl.addEventListener('change', () => {
      updateStageInputs();
      runBridgeCompare();
    });
  }
  document.querySelectorAll('#repay-type-bridge input[type="radio"]').forEach(r => {
    r.addEventListener('change', runBridgeCompare);
  });
}
