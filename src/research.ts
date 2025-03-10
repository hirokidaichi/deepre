/**
 * Research Module
 * Perplexity APIを使用した研究調査を行うモジュール
 */

import { PerplexityClient, PerplexityClientOptions } from "./perplexity.ts";
import { Citation } from "./types.ts";

/**
 * 調査結果の型
 */
export interface ResearchResultData {
  answer: string;
  citations: Citation[];
  suggestedFilename: string;
}

/**
 * 調査結果を扱うクラス
 */
export class ResearchResult {
  private data: ResearchResultData;

  constructor(data: ResearchResultData) {
    this.data = data;
  }

  /**
   * 調査結果の本文を取得
   */
  get answer(): string {
    return this.data.answer;
  }

  /**
   * 引用情報を取得
   */
  get citations(): Citation[] {
    return this.data.citations;
  }

  /**
   * 提案されたファイル名を取得
   */
  get suggestedFilename(): string {
    return this.data.suggestedFilename;
  }

  /**
   * Markdown形式の文字列に変換
   */
  toMarkdown(): string {
    let markdown = `# 調査結果\n\n${this.answer}\n\n`;

    if (this.citations && this.citations.length > 0) {
      markdown += "## 参考文献\n\n";
      this.citations.forEach((citation, index) => {
        markdown += `${index + 1}. [${citation.text}](${citation.url})\n`;
      });
      markdown += "\n";
    }

    return markdown;
  }
}

/**
 * 研究調査クライアントのオプション
 */
export interface ResearchClientOptions
  extends Omit<PerplexityClientOptions, "returnCitations"> {
  // returnCitationsは常にtrueなので除外
}

/**
 * 研究調査を行うクライアント
 */
export class ResearchClient {
  private client: PerplexityClient;

  /**
   * ResearchClientを初期化
   * @param options クライアントオプション
   */
  constructor(options: ResearchClientOptions) {
    // returnCitationsを強制的にtrueに設定
    this.client = new PerplexityClient({
      ...options,
      returnCitations: true,
    });
  }

  /**
   * 調査を実行する
   * @param theme 調査テーマ
   * @returns 調査結果
   */
  async research(theme: string): Promise<ResearchResult> {
    const systemPrompt = `
あなたは、与えられたテーマについて深い調査を行い、その結果を日本語でまとめるアシスタントです。
以下の要件に従って、調査結果を提供してください：

1. 調査結果は、テーマに関する深い洞察と分析を含むこと
2. 情報は信頼できるソースから引用すること
3. 引用は具体的な情報とURLを含むこと
4. 出力は以下のフォーマットに従うこと：

調査結果の本文

<citations>
- 引用1の内容 (URL1)
- 引用2の内容 (URL2)
</citations>

<research-name>
このリサーチ結果を表す3〜4単語の英語のファイル名（ハイフン区切り、小文字のみ）
</research-name>
`;

    const userPrompt = `以下のテーマについて調査してください：\n\n${theme}`;

    const result = await this.client.chat([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    const answer = result.content;
    const citations = result.citations;
    const suggestedFilename = this.extractResearchName(answer);

    return new ResearchResult({
      answer: this.extractContent(answer),
      citations,
      suggestedFilename,
    });
  }

  /**
   * 調査結果からファイル名を抽出する
   * @param text 調査結果のテキスト
   * @returns 抽出されたファイル名
   */
  private extractResearchName(text: string): string {
    const match = text.match(/<research-name>\s*([^<]+)\s*<\/research-name>/);
    if (!match) return "";
    return match[1].trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  /**
   * 調査結果から本文を抽出する
   * @param text 調査結果のテキスト
   * @returns 抽出された本文
   */
  private extractContent(text: string): string {
    return text
      .split("<citations>")[0]
      .split("<research-name>")[0]
      .replace(/<think>[\s\S]*?<\/think>/g, "")
      .trim();
  }
}
