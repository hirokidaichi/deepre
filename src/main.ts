#!/usr/bin/env -S deno run -A

import { Command } from "@cliffy/command";
import { Input, Select } from "@cliffy/prompt";
import { ensureDir } from "@std/fs";
import { join } from "@std/path";
//import { _ } from "./citations.ts";
import { deepResearch } from "./deep_research.ts";
// generate-filename.tsからファイル名生成関数をインポート
import { generateFilenameFromTheme } from "./generate-filename.ts";

// メインコマンドを定義
await new Command()
  .name("deepre")
  .version("0.1.0")
  .description("AI駆動の深い調査レポート生成ツール")
  .option("-o, --output-dir <dir:string>", "出力ディレクトリを指定", {
    default: "./research",
  })
  .option(
    "-k, --api-key <key:string>",
    "Gemini API Key（GEMINI_API_KEY環境変数からも取得）",
  )
  .option("-m, --model <name:string>", "使用するGeminiモデル", {
    default: "gemini-2.0-flash",
  })
  .option("-i, --iterations <number:number>", "調査反復回数", {
    default: 10,
  })
  .arguments("[テーマ:string]")
  .action(async (options: {
    apiKey?: string;
    outputDir: string;
    model: string;
    iterations: number;
  }, theme?: string) => {
    // API KEYの確認
    let apiKey = options.apiKey;
    if (!apiKey) {
      apiKey = Deno.env.get("GEMINI_API_KEY");

      if (!apiKey) {
        apiKey = await Input.prompt({
          message: "Gemini API Keyを入力してください",
        });
      }
    }

    if (!apiKey) {
      console.error("エラー: Gemini API Keyが指定されていません。");
      Deno.exit(1);
    }

    // テーマの確認
    let researchTheme = theme;
    if (!researchTheme) {
      researchTheme = await Input.prompt({
        message: "調査テーマを入力してください",
      });
    }

    if (!researchTheme) {
      console.error("エラー: 調査テーマが指定されていません。");
      Deno.exit(1);
    }

    // モデルの選択（オプション）
    const modelOptions = [
      "gemini-2.0-flash",
      "gemini-2.0-pro",
      "gemini-1.5-flash",
      "gemini-1.5-pro",
    ];
    if (!modelOptions.includes(options.model)) {
      const selectedModel = await Select.prompt({
        message: "使用するモデルを選択してください",
        options: modelOptions,
        default: "gemini-2.0-flash",
      });
      options.model = selectedModel;
    }

    // 出力ディレクトリの確保
    await ensureDir(options.outputDir);

    // ファイル名を生成

    const timestamp =
      new Date().toISOString().replace(/[:.]/g, "-").split("T")[0];
    const basename = await generateFilenameFromTheme(apiKey, researchTheme);

    const filename = `${basename}_${timestamp}.md`;
    const outputPath = join(options.outputDir, filename);

    console.log(`\n====== 調査の開始 ======`);
    console.log(`テーマ: ${researchTheme}`);
    console.log(`モデル: ${options.model}`);
    console.log(`反復回数: ${options.iterations}`);
    console.log(`出力ファイル: ${outputPath}`);
    console.log(`=======================\n`);

    try {
      // 調査の実行
      const result = await deepResearch(
        apiKey,
        researchTheme,
        options.iterations,
        options.model,
      );

      // 引用を追加
      /*const citationManager = new CitationManager(result.citations);
      const reportWithCitations = await citationManager.addCitationsToReport(
        result.finalReport,
      );*/

      // 結果をファイルに保存
      //const resolvedReport = await reportWithCitations;
      await Deno.writeTextFile(outputPath, result.finalReport);

      console.log(`\n====== 調査完了 ======`);
      console.log(`レポートを ${outputPath} に保存しました`);
    } catch (error) {
      console.error("エラーが発生しました:", error);
      Deno.exit(1);
    }
  })
  .parse(Deno.args);
