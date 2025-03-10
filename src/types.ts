/**
 * 調査結果の引用情報
 */
export interface Citation {
  text: string;
  url: string;
}

/**
 * 調査結果の形式
 */
export interface ResearchResult {
  theme: string;
  content: string;
  citations: Citation[];
  followupQuestions: string[];
  suggestedFilename?: string;
}

/**
 * 出力フォーマット
 */
export type OutputFormat = "markdown" | "json";

/**
 * CLIオプション
 */
export interface CliOptions {
  output?: string;
  model?: string;
  apiKey?: string;
  maxTokens?: number;
  temperature?: number;
  format?: OutputFormat;
  noCitations?: boolean;
  noFollowup?: boolean;
}
