// テーマからファイル名を生成するための機能
import { GoogleGenerativeAI } from "@google/generative-ai";

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
  console.log(`[INFO] テーマ「${theme}」からファイル名を生成します...`);
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

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const filename = response.text().trim();

    // 正しい形式かチェック（小文字、ハイフン区切り、3-4単語）
    if (/^[a-z]+(-[a-z]+){2,3}$/.test(filename)) {
      console.log(`[INFO] 生成されたファイル名: ${filename}`);
      return filename;
    } else {
      // フォールバック: テーマを英数字とハイフンのみに変換
      console.log(
        `[WARNING] 生成されたファイル名の形式が不適切です: ${filename}`,
      );
      const fallbackName = theme
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^\w\-]/g, "")
        .substring(0, 30);
      console.log(`[INFO] フォールバックファイル名: ${fallbackName}`);
      return fallbackName;
    }
  } catch (error) {
    console.error(`[ERROR] ファイル名生成中にエラーが発生しました:`, error);
    // エラー時のフォールバック: テーマを英数字とハイフンのみに変換
    const fallbackName = theme
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w\-]/g, "")
      .substring(0, 30);
    console.log(`[INFO] フォールバックファイル名: ${fallbackName}`);
    return fallbackName;
  }
}
