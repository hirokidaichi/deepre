#!/usr/bin/env -S deno run -A

import { Command } from "@cliffy/command";
// Removed unused import
import { deepResearchWithGrounding } from "./deep_research.ts";
import { generate } from "./generate-filename.ts";

/**
 * メインの処理を実行する関数
 */
async function main() {
  await new Command()
    .name("deepre")
    .version("1.0.0")
    .description("深い調査を行うCLIツール")
    .arguments("<theme:string>")
    .option("-k, --api-key <key:string>", "Google AI Studio APIキー")
    .option(
      "-o, --output <file:string>",
      "出力ファイルまたはディレクトリのパス",
      { default: "research" },
    )
    .option("-m, --model <name:string>", "使用するモデル名", {
      default: "gemini-2.0-flash",
    })
    .option("-i, --iterations <number:number>", "最大調査ステップ数", {
      default: 3,
    })
    .action(async (options, theme) => {
      try {
        // APIキーの取得: コマンドライン引数 -> 環境変数
        const apiKey = options.apiKey ||
          Deno.env.get("GOOGLE_API_KEY") ||
          Deno.env.get("GEMINI_API_KEY");

        if (!apiKey) {
          console.error("エラー: APIキーが指定されていません。");
          console.error(
            "--api-keyオプションまたは環境変数GOOGLE_API_KEY/GEMINI_API_KEYを設定してください。",
          );
          Deno.exit(1);
        }

        console.log(`調査テーマ: ${theme}`);
        console.log(`使用モデル: ${options.model}`);
        console.log(`調査ステップ数: ${options.iterations}`);
        console.log("調査を開始します...");

        // deepResearchWithGrounding関数を呼び出して調査を実行
        const processedContent = await deepResearchWithGrounding(
          apiKey,
          theme,
          options.iterations,
          options.model,
          90, // スコアしきい値はデフォルト値を使用
        );

        // 出力ファイルパスの生成
        const outputPath = await generate(theme, apiKey, options.output);

        // 処理結果を保存
        await Deno.writeTextFile(outputPath, processedContent);
        console.log(`調査結果は ${outputPath} に保存されました。`);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error
          ? error.message
          : String(error);
        console.error(`エラーが発生しました: ${errorMessage}`);
        Deno.exit(1);
      }
    })
    .parse(Deno.args);
}

// メイン処理を実行
if (import.meta.main) {
  main();
}
