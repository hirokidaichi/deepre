# deepre CLI仕様書

## 概要

Perplexity APIを使用して深い調査を行うCLIツール。 @cliffy
を使用してコマンドライン引数を処理し、マークダウンまたはJSON形式で結果を出力する。

## コマンド構文

```bash
deepre <theme|theme.md> [options]
```

## オプション

- `--output, -o <file>`: 出力先のファイル（デフォルト:
  `{theme}-research.{format}`）
- `--model, -m <model>`: 使用するPerplexityモデル（デフォルト:
  `sonar-deep-research`）
- `--api-key, -k <key>`: Perplexity API Key（環境変数 `PERPLEXITY_API_KEY`
  からも読み取り可能）
- `--max-tokens <number>`: 生成する最大トークン数（デフォルト: 4096）
- `--temperature <number>`: 生成時の温度パラメータ（デフォルト: 0.7）
- `--format, -f <format>`: 出力形式（`markdown` または `json`、デフォルト:
  `markdown`）
- `--no-citations`: 引用を含めない
- `--no-followup`: フォローアップ質問を含めない
- `--no-usage`: 使用量情報を表示しない

## 入力形式

1. 文字列による直接指定:

```bash
deepre "量子コンピュータの現状"
```

2. Markdownファイルによる指定:

```bash
deepre research-theme.md
```

## 環境変数

- `PERPLEXITY_API_KEY`: Perplexity APIキー

## 出力形式

### Markdown形式

1. テーマ（見出し）
2. 調査結果の本文
3. 引用情報（URLリンク付き）
4. フォローアップ質問
5. 使用量情報（トークン数と概算費用）

### JSON形式

```json
{
  "theme": "調査テーマ",
  "content": "調査結果本文",
  "citations": [
    {
      "text": "引用テキスト",
      "url": "引用元URL"
    }
  ],
  "followupQuestions": [
    "フォローアップ質問1",
    "フォローアップ質問2"
  ],
  "usage": {
    "promptTokens": 123,
    "completionTokens": 456,
    "totalTokens": 579,
    "estimatedCost": "0.0023 USD"
  }
}
```

## 依存関係管理

### deps.ts（メイン依存関係）

```typescript
// Cliffy関連の依存関係
export {
  Command,
  EnumType,
} from "https://deno.land/x/cliffy@v1.0.0-rc.7/command/mod.ts";
export { Spinner } from "https://deno.land/x/cliffy@v1.0.0-rc.7/prompt/spinner.ts";

// dotenv
export { load as loadEnv } from "https://deno.land/std@0.219.0/dotenv/mod.ts";

// ローカルモジュール
export {
  DeepResearch,
  type DeepResearchOptions,
  PerplexityModel,
  type ResearchResult,
} from "./src/deepresearch.ts";
```

### deps_test.ts（テスト用依存関係）

```typescript
export {
  assert,
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.219.0/assert/mod.ts";
export {
  assertSpyCalls,
  spy,
  stub,
} from "https://deno.land/std@0.219.0/testing/mock.ts";
```

## テスト構成

### ユニットテスト

- `src/deepresearch.test.ts`: DeepResearchクラスのテスト
- `src/formatter.test.ts`: 出力フォーマッターのテスト
- `src/cli.test.ts`: CLIインターフェースのテスト

### モック

- Perplexity APIのレスポンスをモック
- ファイル読み書きをモック
- 環境変数の読み込みをモック

## エラーハンドリング

1. API キーが未設定の場合のエラー
2. APIリクエスト失敗時のエラー
3. 出力ファイル書き込み失敗時のエラー
4. 入力Markdownファイルが存在しない場合のエラー
5. 入力Markdownファイルの読み込み失敗時のエラー

## 実装方針

1. シンプルな単一責任の設計
2. 環境変数とコマンドライン引数の柔軟な組み合わせ
3. エラーメッセージの日本語対応
4. 進行状況の表示（スピナーなど）
5. テストカバレッジの重視
6. モジュール間の疎結合

## 使用量情報

### トークン数の計測

- プロンプトトークン数（入力）
- 補完トークン数（出力）
- 合計トークン数

### 料金計算（概算）

各モデルの料金体系に基づいて概算費用を表示：

| モデル              | 入力料金（/1Kトークン） | 出力料金（/1Kトークン） |
| ------------------- | ----------------------- | ----------------------- |
| sonar-medium-online | $0.0015                 | $0.006                  |
| sonar-small-online  | $0.0015                 | $0.006                  |
| sonar               | $0.0015                 | $0.006                  |
| sonar-pro           | $0.0015                 | $0.006                  |
| sonar-small-online  | $0.0015                 | $0.006                  |
| sonar-medium-online | $0.0015                 | $0.006                  |

### 表示例

```
使用量情報:
- プロンプトトークン: 123
- 補完トークン: 456
- 合計トークン: 579
- 概算費用: 0.0023 USD
```

## 使用例

```bash
# 基本的な使用方法（文字列指定）
deepre "量子コンピュータの現状" -o quantum.md

# Markdownファイルによる指定
deepre quantum-research.md -o result.md

# JSON形式で出力
deepre "AIの倫理" -f json -o ai-ethics.json

# モデルを指定して使用
deepre "気候変動対策" -m sonar-reasoning-pro -o climate.md

# 使用量情報を非表示
deepre "AIの倫理" --no-usage

# 環境変数を使用
export PERPLEXITY_API_KEY="your-api-key"
deepre research-theme.md
```
