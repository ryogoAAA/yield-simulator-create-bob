# 住宅ローン比較ページ 追加計画

## 概要

`mortgage-calculator/index.html` に **タブ切り替え式の比較ビュー** を追加する。  
ファイルは引き続き1つのまま、「シミュレーション」タブと「比較」タブの2タブ構成にする。

比較ビューの要件：
- 入力欄を2セット横並び（ケースA / ケースB）
- サマリー欄を2セット横並び
- 月別返済表は **不要**
- グラフ：ドーナツグラフ2つ並べ ＋ 残高推移の折れ線グラフ（2ケース重ね合わせ）

---

## サブタスク 1 — タブ切り替えUI の追加

**Status:** `[ ] pending`

### Intent
ヘッダー直下にタブバーを追加し、「シミュレーション」と「比較」の2タブを切り替える仕組みを作る。  
既存のコンテンツは `#view-single`、新比較ビューは `#view-compare` として `display:none/block` で切り替える。

### Expected Outcomes
- ヘッダー下にタブが2つ表示される
- タブクリックで表示ビューが切り替わる
- 既存の「シミュレーション」機能は一切変わらない

### Todo List
1. `<header>` の直後にタブバー `<div class="tab-bar">` を追加（HTML）
2. 既存の `.container` を `<div id="view-single">` で囲む（HTML）
3. 空の `<div id="view-compare">` を `view-single` の後ろに追加（HTML）
4. タブバーのCSS（`.tab-bar`, `.tab-btn`, `.tab-btn.active`）を追加（CSS）
5. タブ切り替えJSを追加（JS）

### Relevant Context
- `mortgage-calculator/index.html:280-283` — `<header>` 要素
- `mortgage-calculator/index.html:285-378` — `.container` 要素（これを `#view-single` で囲む）

---

## サブタスク 2 — 比較ビューのHTML構造追加

**Status:** `[ ] pending`

### Intent
`#view-compare` 内に比較ページのHTMLを組み立てる。  
入力欄2セット、サマリー2セット、グラフエリアの3ブロック構成。

### Expected Outcomes
- 上段：入力欄A・Bが横2列に並ぶ（各列に借入金額、年利、返済期間、返済方式のみ）
- 中段：サマリーA・Bが横2列に並ぶ（計算前はプレースホルダー表示）
- 下段：グラフエリア（計算前は非表示）
- 「比較する」ボタンが中央に1つ

### Todo List
1. `#view-compare` 内に `.compare-container` を配置（グリッド 2列）（HTML）
2. ケースA・ケースB それぞれの入力カードを追加（HTML）
   - フィールド：借入金額、年利、返済期間、返済方式（ラジオ）のみ（NISAは省略）
   - 入力欄の `id` はサフィックス `-a` / `-b` で区別（例：`principal-a`）
3. 「比較する」ボタン（`#compare-btn`）を追加（HTML）
4. サマリーA・Bのコンテナ（`#summary-a`, `#summary-b`）を追加（HTML）
5. グラフエリアのコンテナ（`#compare-charts`）を追加（HTML）
6. 比較ビュー専用CSSを追加（`.compare-container`, `.compare-col`, `.compare-label` など）

### Relevant Context
- `mortgage-calculator/index.html:56-116` — 既存フォームグループのCSS（再利用する）
- `mortgage-calculator/index.html:147-172` — 既存サマリーグリッドCSS（再利用する）
- `mortgage-calculator/index.html:285-355` — 既存入力フォームHTML（フィールド構成の参考）

---

## サブタスク 3 — 比較計算ロジックとサマリー表示

**Status:** `[ ] pending`

### Intent
「比較する」ボタン押下時にケースA・Bを計算し、それぞれのサマリーを表示する。  
既存の `calcEqualInstallment`, `calcEqualPrincipal`, `buildDonut` 関数を再利用する。

### Expected Outcomes
- 「比較する」クリック → A・B の計算結果が各サマリーカードに表示される
- サマリーカードに：初回月返済額、毎月返済額、総返済額、借入元金、総利息、返済方式
- ドーナツグラフが各サマリーカード内に表示される（`buildDonut` 再利用）
- 入力エラー時はアラートで通知

### Todo List
1. `#compare-btn` のクリックイベントリスナーを追加（JS）
2. ケースA・Bの入力値を読み取り、バリデーション（JS）
3. `calcEqualInstallment` / `calcEqualPrincipal` でスケジュール計算（JS）
4. `renderCompareSummary(schedule, P, repay, targetId)` 関数を作成し、サマリーHTMLを生成して挿入（JS）
   - 既存のサマリーHTML生成コードをベースに簡略化（NISA比較セクションは省略）
   - `buildDonut` を使いドーナツグラフを含める

### Relevant Context
- `mortgage-calculator/index.html:396-444` — 計算関数（`calcEqualInstallment`, `calcEqualPrincipal`）
- `mortgage-calculator/index.html:447-470` — `buildDonut` 関数
- `mortgage-calculator/index.html:558-690` — 既存の計算メイン・サマリー表示（参考）

---

## サブタスク 4 — 残高推移の折れ線グラフ（SVG）追加

**Status:** `[ ] pending`

### Intent
比較ページ下部に、ケースA・Bの **残高推移を重ね合わせた折れ線グラフ** を純SVGで描画する。  
ドーナツグラフと同様にライブラリなし・SVG直書きで実装する。

### Expected Outcomes
- X軸：経過年数（0〜返済期間）
- Y軸：残高（万円）
- ケースAの折れ線：青（`#1e3a5f`）
- ケースBの折れ線：オレンジ（`#e05c2a`）
- 凡例あり（ケースA / ケースB の色と条件サマリー）
- 返済期間が異なるケースでも正しく表示できる

### Todo List
1. `buildLineChart(scheduleA, scheduleB, labelA, labelB)` 関数を作成（JS）
   - SVGの viewBox, 軸, グリッド線, パス(polyline), 凡例を生成
   - 月次データをすべてプロットすると点が多すぎるため、年次（12ヶ月ごと）サンプリング
2. 比較計算完了後に `buildLineChart` を呼び出し、`#compare-charts` に挿入（JS）
3. グラフのCSSスタイルを追加（`.line-chart-wrap`, 軸ラベルなど）

### Relevant Context
- `mortgage-calculator/index.html:447-470` — `buildDonut` のSVG生成パターン（参考）
- 折れ線グラフのSVGは `<polyline>` または `<path>` で描く
- サブタスク3完了後に着手

---

## 技術メモ

- **入力欄のIDルール：** ケースAは `-a` サフィックス（`principal-a`, `rate-a`, `years-a`）、ケースBは `-b` サフィックス
- **ラジオボタンのname属性：** 既存は `name="repay"`。比較ビューでは `name="repay-a"` / `name="repay-b"` で独立させる
- **CSS競合回避：** 比較ビュー専用スタイルは `.compare-` プレフィックスで既存クラスと区別する
- **グラフライブラリ：** 既存同様にライブラリ不使用・純SVG実装
- **レスポンシブ：** 900px以下で比較2列 → 1列に折り返す（既存の700pxブレークポイントに合わせる）
