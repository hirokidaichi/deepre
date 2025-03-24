# DeepRe - AI駆動の深い調査レポート生成ツール

DeepReは、Google GeminiのAI
APIを活用して、指定されたテーマについて深い調査レポートを自動生成するDenoベースのCLIツールです。複数回の反復調査によって質の高い情報を収集し、包括的なレポートを作成します。

## 特徴

- **反復的な調査プロセス**: 情報の質が十分になるまで調査を繰り返します
- **自動評価システム**: 収集した情報の充実度を自動評価します
- **Gemini API連携**: 最新のGemini 2.0モデルを活用した高度な検索と分析
- **調査計画の自動生成**: テーマから最適な調査アプローチを計画します
- **日本語完全対応**: 日本語でのテーマ設定と出力に対応しています
- **Markdown形式のレポート**: 結果は整形されたMarkdownとして出力されます

## インストール

### 必要条件

- Deno ランタイム
- Google Gemini API
  キー（`GEMINI_API_KEY`環境変数として設定するか、実行時に指定）

### グローバルインストール

```bash
deno task install
```

## 使用方法

### 基本的な使用法

```bash
deepre "調査テーマ"
```

### オプション

```bash
deepre "調査テーマ" -k "GEMINI_API_KEY" -o "./output" -m "gemini-2.0-pro" -i 15
```

- `-k, --api-key`: Gemini API Key（環境変数`GEMINI_API_KEY`からも取得可能）
- `-o, --output-dir`: 出力ディレクトリ（デフォルト: ./research）
- `-m, --model`: 使用するGeminiモデル（デフォルト: gemini-2.0-flash）
- `-i, --iterations`: 調査反復回数（デフォルト: 10）

## 環境変数の設定

```bash
# macOS/Linux
export GEMINI_API_KEY="あなたのGemini APIキー"

# Windows (コマンドプロンプト)
set GEMINI_API_KEY=あなたのGemini APIキー

# Windows (PowerShell)
$env:GEMINI_API_KEY="あなたのGemini APIキー"
```

## 開発

```bash
# 開発モードで実行
deno task deepre

# リント・型チェック・フォーマット・テスト
deno task check-all

# 個別のチェック
deno task lint
deno task check
deno task fmt
deno task test
```

## 活用例

- 学術研究の事前調査
- 市場動向・競合分析
- 技術トレンド調査
- 特定トピックの詳細情報収集

## ライセンス

[MIT License](LICENSE)
