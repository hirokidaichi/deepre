import { OutputFormat, ResearchResult } from "./types.ts";

/**
 * 出力フォーマッターのインターフェース
 */
export interface OutputFormatter {
  format(result: ResearchResult): string;
}

/**
 * Markdown形式のフォーマッター
 */
export class MarkdownFormatter implements OutputFormatter {
  format(result: ResearchResult): string {
    const parts: string[] = [];

    // テーマ
    parts.push(`# ${result.theme}`);
    parts.push("");

    // 本文
    parts.push(result.content);
    parts.push("");

    // 引用情報
    if (result.citations.length > 0) {
      parts.push("## 引用");
      for (const citation of result.citations) {
        parts.push(`- ${citation.text}`);
        parts.push(`  [参照元](${citation.url})`);
      }
      parts.push("");
    }

    // フォローアップ質問
    if (result.followupQuestions.length > 0) {
      parts.push("## フォローアップ質問");
      for (const question of result.followupQuestions) {
        parts.push(`- ${question}`);
      }
      parts.push("");
    }

    return parts.join("\n");
  }
}

/**
 * JSON形式のフォーマッター
 */
export class JsonFormatter implements OutputFormatter {
  format(result: ResearchResult): string {
    const output = {
      theme: result.theme,
      content: result.content,
      citations: result.citations,
      followupQuestions: result.followupQuestions,
    };

    return JSON.stringify(output, null, 2);
  }
}

/**
 * フォーマッターファクトリ
 */
export class FormatterFactory {
  static create(format: OutputFormat): OutputFormatter {
    switch (format) {
      case "markdown":
        return new MarkdownFormatter();
      case "json":
        return new JsonFormatter();
      default:
        throw new Error(`未対応の出力形式です: ${format}`);
    }
  }
}
