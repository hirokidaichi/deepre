// テーマからファイル名を生成するための機能
import { GoogleGenerativeAI } from "@google/generative-ai";
import { join } from "@std/path";

/**
 * テーマから英語のファイル名を生成する関数
 * @param apiKey Gemini API Key
 * @param theme 調査テーマ
 * @returns ダッシュでつないだ英単語3〜4語からなるファイル名（拡張子なし）
 */
export async function generateFilenameFromTheme(
  apiKey: string,
  theme: string,
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
      temperature: 0.1,
      topP: 0.95,
      topK: 5,
      maxOutputTokens: 30,
    },
  });

  const prompt = `
あなたの役割は、与えられた日本語のテーマから、英語のファイル名の候補を生成することです。

指示:
1. 以下の日本語テーマを英語に翻訳し、そのキーワードを抽出してください
2. 抽出した英語のキーワードから3〜4個の単語を選び、ハイフンでつなげたファイル名を生成してください
3. 小文字のみを使用し、スペースや特殊文字は使わないでください
4. ファイル名は拡張子を含めないでください
5. 必ず1行のみで回答してください

テーマ: ${theme}

ファイル名の候補: `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const filename = response.text().trim();
  return filename;
}

/**
 * ファイル名を自動生成し、重複する場合は数字を付加する
 * @param baseFilename 基本となるファイル名（拡張子なし）
 * @param outputDir 出力先ディレクトリ
 * @param extension ファイル拡張子（デフォルトは.md）
 * @returns 重複しないファイルパス
 */
export async function generateUniqueFilename(
  baseFilename: string,
  outputDir: string,
  extension = ".md",
): Promise<string> {
  try {
    // 既存の同名ファイルをチェック
    const baseFilePath = join(outputDir, `${baseFilename}${extension}`);
    const fileExists = await Deno.stat(baseFilePath)
      .then(() => true)
      .catch(() => false);

    // 既存の類似ファイルを検索
    const similarFiles = [];
    const escExtension = extension.replace(/\./g, "\\.");
    const regex = new RegExp(`^${baseFilename}-(\\d+)${escExtension}$`);

    for await (const entry of Deno.readDir(outputDir)) {
      if (entry.isFile) {
        const match = entry.name.match(regex);
        if (match) {
          similarFiles.push({
            name: entry.name,
            number: parseInt(match[1], 10),
          });
        }
      }
    }

    let outputFilename;
    if (!fileExists && similarFiles.length === 0) {
      // ファイルが存在しない場合は基本ファイル名を使用
      outputFilename = `${baseFilename}${extension}`;
    } else {
      // 最大の番号を見つける
      let maxNum = 0;
      if (fileExists) {
        // 基本ファイルが存在する場合は最低でも1
        maxNum = 1;
      }

      // 既存の番号付きファイルから最大の番号を取得
      for (const file of similarFiles) {
        if (file.number > maxNum) {
          maxNum = file.number;
        }
      }

      // 次の番号を使用
      outputFilename = `${baseFilename}-${maxNum + 1}${extension}`;
    }

    return join(outputDir, outputFilename);
  } catch (error) {
    // エラーが発生した場合はデフォルトのファイル名を使用
    console.warn(
      `ファイル名生成中にエラーが発生しました: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return join(outputDir, `${baseFilename}${extension}`);
  }
}
