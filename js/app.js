/**
 * app.js
 * アプリケーション初期化・タブ切り替え・全体制御
 */

document.addEventListener('DOMContentLoaded', () => {
  // ---- タブ切り替え ----
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      
      const bridgeView = document.getElementById('view-bridge-compare');
      const singleView = document.getElementById('view-single');
      const compareView = document.getElementById('view-compare');

      if (bridgeView) bridgeView.style.display = tab === 'bridge-compare' ? '' : 'none';
      if (singleView) singleView.style.display = tab === 'single' ? '' : 'none';
      if (compareView) compareView.style.display = tab === 'compare' ? '' : 'none';

      if (tab === 'bridge-compare') runBridgeCompare();
      else if (tab === 'single') runSingle();
      else if (tab === 'compare') runCompare();
    });
  });

  // ---- Radio ラベルの active 制御 ----
  function initRadioStyle(groupSelector) {
    document.querySelectorAll(groupSelector + ' input[type="radio"]').forEach(radio => {
      radio.addEventListener('change', () => updateRadioStyleFor(groupSelector));
    });
    updateRadioStyleFor(groupSelector);
  }

  function updateRadioStyleFor(groupSelector) {
    document.querySelectorAll(groupSelector + ' label').forEach(lbl => lbl.classList.remove('active'));
    const checked = document.querySelector(groupSelector + ' input[type="radio"]:checked');
    if (checked) {
      const parentLabel = checked.closest('label');
      if (parentLabel) parentLabel.classList.add('active');
    }
  }

  initRadioStyle('#repay-type');
  initRadioStyle('#repay-type-a');
  initRadioStyle('#repay-type-b');
  initRadioStyle('#repay-type-bridge');

  // 各モジュールのイベント初期化
  initBridgeEvents();
  initLoanEvents();

  // 初期描画実行
  updateStageInputs();
  runBridgeCompare();
});
