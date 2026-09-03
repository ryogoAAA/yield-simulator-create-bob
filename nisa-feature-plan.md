# NISA口座シミュレーション機能追加 計画

## 概要

住宅ローン計算機（`mortgage-calculator/index.html`）に NISA 口座のシミュレーション機能を追加する。
ユーザーが NISA の現在残高・毎月積立額・想定利回りを入力すると、ローン返済スケジュール表に
NISA 評価額の月次推移列が並び、完済時のローン vs NISA 比較サマリーも表示される。

---

## サブタスク 1 — NISA 入力フォームの追加

**Status:** [ ] pending

### Intent
左カラム（`#form-card`）の既存ローン入力フォームの下に、NISA 条件の入力グループを追加する。

### Expected Outcomes
- 「NISA口座の設定」セクションが `#form-card` 内に表示される
- 3 つの入力欄（現在残高・毎月積立額・想定年利回り）が正しく機能する
- 既存のローン入力 UI に影響しない

### Todo List
- [ ] `#form-card` の `<button class="calc-btn">` の直前に NISA 入力グループを追加
  - `id="nisa-balance"` 現在の NISA 残高（円、デフォルト 0）
  - `id="nisa-monthly"` 毎月積立額（円、デフォルト 30000）
  - `id="nisa-rate"` 想定年利回り（%、デフォルト 5.0）
- [ ] セクション見出しを `<h2>` または区切り線で視覚的に分離する（既存スタイル `.card h2` を流用）

### Relevant Context
- HTML: 行 275–318（`#form-card`）
- 入力ウィジェットパターン: `.input-wrap` + `.input-unit`（行 108–123）
- 計算ボタン: `id="calc-btn"`（行 315）

---

## サブタスク 2 — NISA 月次評価額の計算ロジック追加

**Status:** [ ] pending

### Intent
JavaScript に NISA 評価額を月次複利で計算する関数を追加し、スケジュール配列の各行に `nisaValue` フィールドを付与する。

### Expected Outcomes
- `calcNisa(balance, monthly, annualRate, months)` 関数が正確な複利計算を返す
- 各月の `nisaValue` が `schedule[m-1].nisaValue` として参照できる
- ローン計算と NISA 計算は独立して呼び出せる（疎結合）

### Todo List
- [ ] `calcNisa(balance, monthly, annualRate, months)` 関数を追加
  - 月利 `r = annualRate / 12 / 100`
  - 毎月: `balance = (balance + monthly) * (1 + r)` を繰り返して配列で返す
- [ ] `id="calc-btn"` のクリックハンドラ内で NISA 入力値を読み取り、`calcNisa` を呼び出す
- [ ] `calcEqualInstallment` / `calcEqualPrincipal` が返す `schedule` 配列の各要素に `nisaValue` を合成する
  - スケジュール計算後に `schedule[i].nisaValue = nisaValues[i]` として付与

### Relevant Context
- `calcEqualInstallment`: 行 358–379
- `calcEqualPrincipal`: 行 382–394
- 計算ボタンハンドラ: 行 502–528（`id="calc-btn"` addEventListener）

---

## サブタスク 3 — 返済スケジュール表への NISA 評価額列の追加

**Status:** [ ] pending

### Intent
`renderTable` 関数のテーブルに「NISA評価額」列を追加し、各月の NISA 評価額推移を表示する。

### Expected Outcomes
- テーブルに「NISA評価額」列が追加され、`schedule[i].nisaValue` が正しく表示される
- 列は既存の `.td-*` 命名規則に沿ったスタイルで表示される（緑系カラーを使用）
- NISA 入力が未入力（残高・積立ともに 0）の場合、列は表示しない（または「-」表示）

### Expected Outcomes
- 既存の 6 列（回数・元金・利息・月返済額・累計支払額・残高）の後に列を追加
- `.td-nisa` クラスで緑系カラー（`#2a9d5c`）を適用

### Todo List
- [ ] CSS に `.td-nisa { color: #2a9d5c; font-weight: 600; }` を追加
- [ ] `renderTable` の `<thead>` に `<th>NISA評価額</th>` を追加
- [ ] `rows.forEach` の行生成に `<td class="td-nisa">` セルを追加
- [ ] NISA 入力が実質 0 の場合は `—` を表示するガード処理を追加

### Relevant Context
- `renderTable` 関数: 行 427–500
- テーブルヘッダー: 行 448–455
- 行生成ループ: 行 461–469
- 既存 `.td-*` スタイル: 行 209–212

---

## サブタスク 4 — 完済時 NISA 比較サマリーの追加

**Status:** [ ] pending

### Intent
返済サマリーカード（`#summary-card`）の下部、もしくは別カードとして「ローン完済時の比較」セクションを追加し、
完済時の NISA 評価額・総投資額・運用益・ローン総利息を横並びで比較表示する。

### Expected Outcomes
- ローン完済月時点の NISA 評価額が表示される
- NISA 総投資額（現在残高 + 積立額 × 期間）・運用益が表示される
- 「ローン総利息 vs NISA運用益」を視覚的に比較できる
- NISA 入力が未設定の場合はこのセクションを非表示にする

### Todo List
- [ ] `#summary-content` 内の既存サマリーグリッド下部に比較セクションを追加
- [ ] 完済時 NISA 評価額: `schedule[months - 1].nisaValue`
- [ ] 総投資額: `nisaBalance + nisaMonthly * months`
- [ ] 運用益: `完済時NISA評価額 - 総投資額`
- [ ] 比較ハイライト: 「運用益 > ローン総利息」なら緑、そうでなければオレンジで色分け
- [ ] NISA 入力が 0 の場合はセクションを `display:none` にするガード処理

### Relevant Context
- `#summary-content` 生成コード: 行 529–587
- `.summary-item.highlight` パターン: 行 144–148
- 総利息変数: `totalInterest`（行 521）
- 完済月: `schedule[months - 1]`
