// テーマからファイル名を生成するための機能
import { GoogleGenerativeAI } from "@google/generative-ai";
import { extname, join } from "@std/path";

/**
 * 出力パスの種類を表す列挙型
 */
export enum OutputPathType {
  FILE = "file",
  DIRECTORY = "directory",
  INVALID = "invalid",
}

/**
 * ファイル操作用の依存性インターフェース
 */
export interface FileSystemDependency {
  stat: (path: string) => Promise<Deno.FileInfo>;
  mkdir: (path: string, options?: { recursive?: boolean }) => Promise<void>;
  readDir: (path: string) => AsyncIterable<Deno.DirEntry>;
}

/**
 * Gemini API用の依存性インターフェース
 */
export interface GeminiDependency {
  generateContent: (
    prompt: string,
  ) => Promise<{ response: { text: () => string } }>;
}

/**
 * デフォルトのファイルシステム依存性実装
 */
export const defaultFileSystem: FileSystemDependency = {
  stat: (path: string) => Deno.stat(path),
  mkdir: (path: string, options) => Deno.mkdir(path, options),
  readDir: (path: string) => Deno.readDir(path),
};

/**
 * テーマと出力パスから最終的なファイルパスを生成する
 * @param theme 調査テーマ
 * @param apiKey Gemini API Key
 * @param outputPath 出力パス（省略可能）
 * @param dependencies 依存性オブジェクト
 * @returns 最終的な出力ファイルパス
 */
export async function generate(
  theme: string,
  apiKey: string,
  outputPath?: string,
  dependencies: {
    fileSystem?: FileSystemDependency;
    geminiApi?: GeminiDependency;
    generateFilenameFromTheme?: (
      apiKey: string,
      theme: string,
      geminiApi?: GeminiDependency,
    ) => Promise<string>;
    generateUniqueFilename?: (
      baseFilename: string,
      outputDir: string,
      extension?: string,
      fileSystem?: FileSystemDependency,
    ) => Promise<string>;
    determineOutputPathType?: (
      path: string,
      fileSystem?: FileSystemDependency,
    ) => Promise<OutputPathType>;
  } = {},
): Promise<string> {
  // 依存性の解決
  const fs = dependencies.fileSystem || defaultFileSystem;
  const _generateFilenameFromTheme = dependencies.generateFilenameFromTheme ||
    generateFilenameFromTheme;
  const _generateUniqueFilename = dependencies.generateUniqueFilename ||
    generateUniqueFilename;
  const _determineOutputPathType = dependencies.determineOutputPathType ||
    determineOutputPathType;

  // 出力パスが指定されていない場合はデフォルトのディレクトリを使用
  if (!outputPath) {
    const defaultDir = "research";
    try {
      await fs.mkdir(defaultDir, { recursive: true });
    } catch (e) {
      if (!(e instanceof Deno.errors.AlreadyExists)) {
        throw e;
      }
    }
    const baseFilename = await _generateFilenameFromTheme(
      apiKey,
      theme,
      dependencies.geminiApi,
    );
    return await _generateUniqueFilename(baseFilename, defaultDir, ".md", fs);
  }

  // 出力パスの種類を判定
  const pathType = await _determineOutputPathType(outputPath, fs);

  if (pathType === OutputPathType.FILE) {
    return outputPath;
  }

  // ディレクトリの場合、テーマに基づいてファイル名を生成
  try {
    await fs.mkdir(outputPath, { recursive: true });
  } catch (e) {
    if (!(e instanceof Deno.errors.AlreadyExists)) {
      throw e;
    }
  }

  const baseFilename = await _generateFilenameFromTheme(
    apiKey,
    theme,
    dependencies.geminiApi,
  );
  return await _generateUniqueFilename(baseFilename, outputPath, ".md", fs);
}

/**
 * 出力パスの種類を判定する関数
 * @param path 判定対象のパス
 * @param fileSystem ファイルシステム依存性
 * @returns OutputPathType
 */
export async function determineOutputPathType(
  path: string,
  fileSystem: FileSystemDependency = defaultFileSystem,
): Promise<OutputPathType> {
  try {
    const fileInfo = await fileSystem.stat(path);
    if (fileInfo.isDirectory) {
      return OutputPathType.DIRECTORY;
    }
    if (fileInfo.isFile) {
      return OutputPathType.FILE;
    }
    return extname(path) ? OutputPathType.FILE : OutputPathType.DIRECTORY;
  } catch {
    // パスが存在しない場合は、拡張子の有無で判定
    return extname(path) ? OutputPathType.FILE : OutputPathType.DIRECTORY;
  }
}

/**
 * テーマから英語のファイル名を生成する関数
 * @param apiKey Gemini API Key
 * @param theme 調査テーマ
 * @param geminiApi Gemini API依存性
 * @returns ダッシュでつないだ英単語3〜4語からなるファイル名（拡張子なし）
 */
export async function generateFilenameFromTheme(
  apiKey: string,
  theme: string,
  geminiApi?: GeminiDependency,
): Promise<string> {
  // 依存性の解決
  let api = geminiApi;
  if (!api) {
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
    api = {
      generateContent: (prompt: string) => model.generateContent(prompt),
    };
  }

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

  const result = await api.generateContent(prompt);
  const response = await result.response;
  const filename = response.text().trim();
  return filename;
}

/**
 * ファイル名を自動生成し、重複する場合は数字を付加する
 * @param baseFilename 基本となるファイル名（拡張子なし）
 * @param outputDir 出力先ディレクトリ
 * @param extension ファイル拡張子（デフォルトは.md）
 * @param fileSystem ファイルシステム依存性
 * @returns 重複しないファイルパス
 */
export async function generateUniqueFilename(
  baseFilename: string,
  outputDir: string,
  extension = ".md",
  fileSystem: FileSystemDependency = defaultFileSystem,
): Promise<string> {
  try {
    // 既存の同名ファイルをチェック
    const baseFilePath = join(outputDir, `${baseFilename}${extension}`);
    const fileExists = await fileSystem.stat(baseFilePath)
      .then(() => true)
      .catch(() => false);

    // 既存の類似ファイルを検索
    const similarFiles = [];
    const escExtension = extension.replace(/\./g, "\\.");
    const regex = new RegExp(`^${baseFilename}-(\\d+)${escExtension}$`);

    for await (const entry of fileSystem.readDir(outputDir)) {
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(`ファイル名生成中にエラーが発生しました: ${errorMessage}`);
    return join(outputDir, `${baseFilename}${extension}`);
  }
}
