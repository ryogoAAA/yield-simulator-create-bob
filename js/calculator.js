/**
 * calculator.js
 * 住宅ローン計算・NISA複利計算・日割計算エンジン
 */

// フォーマッタ
const fmt = n => Math.round(n).toLocaleString('ja-JP');
const fmtMan = n => (Math.round(n / 1000) / 10).toLocaleString('ja-JP');

/**
 * 元利均等返済の償還スケジュールを計算
 * @param {number} P 借入元金（円）
 * @param {number} annualRate 年利率（%）
 * @param {number} months 返済月数
 * @returns {Array} 各月の返済明細
 */
function calcEqualInstallment(P, annualRate, months) {
  const r = annualRate / 12 / 100;
  const schedule = [];
  if (r === 0) {
    const monthly = P / months;
    let balance = P;
    for (let m = 1; m <= months; m++) {
      balance -= monthly;
      schedule.push({ month: m, principal: monthly, interest: 0, total: monthly, balance: Math.max(0, balance) });
    }
    return schedule;
  }
  const monthly = P * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1);
  let balance = P;
  for (let m = 1; m <= months; m++) {
    const interest  = balance * r;
    const principal = monthly - interest;
    balance -= principal;
    schedule.push({ month: m, principal, interest, total: monthly, balance: Math.max(0, balance) });
  }
  return schedule;
}

/**
 * 元金均等返済の償還スケジュールを計算
 * @param {number} P 借入元金（円）
 * @param {number} annualRate 年利率（%）
 * @param {number} months 返済月数
 * @returns {Array} 各月の返済明細
 */
function calcEqualPrincipal(P, annualRate, months) {
  const r = annualRate / 12 / 100;
  const principalPerMonth = P / months;
  const schedule = [];
  let balance = P;
  for (let m = 1; m <= months; m++) {
    const interest = balance * r;
    const total    = principalPerMonth + interest;
    balance -= principalPerMonth;
    schedule.push({ month: m, principal: principalPerMonth, interest, total, balance: Math.max(0, balance) });
  }
  return schedule;
}

/**
 * NISA積立の月次複利運用評価額を計算
 * @param {number} balance 初期残高（円）
 * @param {number} monthly 毎月積立額（円）
 * @param {number} annualRate 想定年利回り（%）
 * @param {number} months 運用月数
 * @returns {Array} 各月末の資産評価額
 */
function calcNisa(balance, monthly, annualRate, months) {
  const monthlyRate = Math.pow(1 + annualRate / 100, 1 / 12) - 1;
  const values = [];
  let val = balance;
  for (let m = 1; m <= months; m++) {
    val = (val + monthly) * (1 + monthlyRate);
    values.push(val);
  }
  return values;
}
