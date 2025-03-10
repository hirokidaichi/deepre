/**
 * Deepre CLI
 * Perplexity APIを使用した研究調査CLIツール
 */

import { ensureDir, join, parse } from "./deps.ts";
import { ResearchClient } from "./research.ts";
import { PerplexityModel } from "./perplexity.ts";

// 環境変数からAPIキーを取得
const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
if (!PERPLEXITY_API_KEY) {
  console.error("環境変数 PERPLEXITY_API_KEY が設定されていません。");
  Deno.exit(1);
}

// コマンドライン引数をパース
const flags = parse(Deno.args, {
  string: ["model", "output", "recency"],
  boolean: ["help"],
  default: {
    model: PerplexityModel.SONAR_DEEP_RESEARCH,
    output: "research",
    recency: "month",
  },
});

// ヘルプを表示
if (flags.help) {
  console.log(`
使用方法: deepre <テーマ> [オプション]

オプション:
  --model    使用するモデル (デフォルト: sonar-deep-research)
  --output   出力ディレクトリ (デフォルト: research)
  --recency  検索期間 (month/week/day/hour) (デフォルト: month)
  --help     このヘルプを表示

環境変数:
  PERPLEXITY_API_KEY  Perplexity APIのキー
`);
  Deno.exit(0);
}

// テーマが指定されているか確認
const theme = flags._[0]?.toString();
if (!theme) {
  console.error("調査テーマを指定してください。");
  Deno.exit(1);
}

// 研究調査クライアントを初期化
const client = new ResearchClient({
  apiKey: PERPLEXITY_API_KEY,
  model: flags.model as PerplexityModel,
  maxTokens: 1000, // 開発時用に制限
  temperature: 0.7,
  searchRecencyFilter: flags.recency as "month" | "week" | "day" | "hour",
});

// メイン処理
async function main() {
  try {
    console.log(`調査を開始します: ${theme}`);
    console.time("調査時間");

    // 調査を実行
    const result = await client.research(theme);

    // 出力ディレクトリを作成
    const outputDir = flags.output;
    await ensureDir(outputDir);

    // ファイル名を生成
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const basename = result.suggestedFilename || "research-result";
    const filename = `${basename}-${timestamp}`;

    // マークダウンファイルを保存
    const mdPath = join(outputDir, `${filename}.md`);
    await Deno.writeTextFile(mdPath, result.toMarkdown());

    console.timeEnd("調査時間");
    console.log(`結果を保存しました:`);
    console.log(`- マークダウン: ${mdPath}`);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("エラーが発生しました:", error.message);
    } else {
      console.error("エラーが発生しました:", String(error));
    }
    Deno.exit(1);
  }
}

// メイン処理を実行
await main();
