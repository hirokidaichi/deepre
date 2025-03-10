/**
 * Perplexity Module
 * Perplexity APIを使用するための基本的なクライアントモジュール
 */

import { Citation } from "./types.ts";

/**
 * Perplexityがサポートするモデル
 */
export enum PerplexityModel {
  // Sonarモデル
  SONAR_DEEP_RESEARCH = "sonar-deep-research",
  SONAR_REASONING_PRO = "sonar-reasoning-pro",
  SONAR_REASONING = "sonar-reasoning",
  SONAR_PRO = "sonar-pro",
  SONAR = "sonar",
  // Llamaモデル
  LLAMA_3_SONAR_SMALL_128K = "llama-3-sonar-small-128k",
  LLAMA_3_SONAR_MEDIUM_128K = "llama-3-sonar-medium-128k",
  // その他のモデル
  R1_1776 = "r1-1776",
}

/**
 * チャット応答の型
 */
export interface ChatResponse {
  content: string;
  citations: Citation[];
}

/**
 * PerplexityClientのオプション
 */
export interface PerplexityClientOptions {
  apiKey: string;
  model?: PerplexityModel | string;
  maxTokens?: number;
  temperature?: number;
  returnCitations?: boolean;
  topP?: number;
  searchDomainFilter?: string[];
  returnImages?: boolean;
  searchRecencyFilter?: "month" | "week" | "day" | "hour";
  topK?: number;
  stream?: boolean;
  presencePenalty?: number;
  frequencyPenalty?: number;
}

/**
 * Perplexity APIのメッセージ
 */
export interface PerplexityMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Perplexity APIのリクエスト
 */
export interface PerplexityRequest {
  model: string;
  messages: PerplexityMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  return_citations?: boolean;
  search_domain_filter?: string[];
  return_images?: boolean;
  search_recency_filter?: "month" | "week" | "day" | "hour";
  top_k?: number;
  stream?: boolean;
  presence_penalty?: number;
  frequency_penalty?: number;
}

/**
 * Perplexity APIのレスポンス
 */
export interface PerplexityResponse {
  id: string;
  model: string;
  object: string;
  created: number;
  choices: {
    index: number;
    finish_reason: string;
    message: {
      role: string;
      content: string;
    };
    delta?: {
      role: string;
      content: string;
    };
    citations?: {
      text: string;
      url: string;
    }[];
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Perplexity APIを使用するための基本的なクライアント
 */
export class PerplexityClient {
  private apiKey: string;
  private model: string;
  private maxTokens: number;
  private temperature: number;
  private returnCitations: boolean;
  private topP: number;
  private searchDomainFilter?: string[];
  private returnImages: boolean;
  private searchRecencyFilter?: "month" | "week" | "day" | "hour";
  private topK: number;
  private stream: boolean;
  private presencePenalty: number;
  private frequencyPenalty: number;
  private baseUrl = "https://api.perplexity.ai";

  /**
   * PerplexityClientを初期化
   * @param options クライアントオプション
   */
  constructor(options: PerplexityClientOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model?.toString() ||
      PerplexityModel.SONAR_DEEP_RESEARCH;
    this.maxTokens = options.maxTokens || 4096;
    this.temperature = options.temperature || 0.7;
    this.returnCitations = options.returnCitations ?? true;
    this.topP = options.topP ?? 0.9;
    this.searchDomainFilter = options.searchDomainFilter;
    this.returnImages = options.returnImages ?? false;
    this.searchRecencyFilter = options.searchRecencyFilter;
    this.topK = options.topK ?? 0;
    this.stream = options.stream ?? false;
    this.presencePenalty = options.presencePenalty ?? 0;
    this.frequencyPenalty = options.frequencyPenalty ?? 1;
  }

  /**
   * 使用するモデルを設定
   * @param model モデル名
   */
  setModel(model: PerplexityModel | string): void {
    this.model = model.toString();
  }

  /**
   * 現在設定されているモデルを取得
   * @returns モデル名
   */
  getModel(): string {
    return this.model;
  }

  /**
   * 利用可能なモデルの一覧を取得
   * @returns モデル名の配列
   */
  getAvailableModels(): string[] {
    return Object.values(PerplexityModel);
  }

  /**
   * チャットメッセージを送信する
   * @param messages チャットメッセージの配列
   * @returns チャット応答
   */
  async chat(messages: PerplexityMessage[]): Promise<ChatResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/chat/completions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: this.model,
            messages,
            max_tokens: this.maxTokens,
            temperature: this.temperature,
            top_p: this.topP,
            return_citations: this.returnCitations,
            search_domain_filter: this.searchDomainFilter,
            return_images: this.returnImages,
            search_recency_filter: this.searchRecencyFilter,
            top_k: this.topK,
            stream: this.stream,
            presence_penalty: this.presencePenalty,
            frequency_penalty: this.frequencyPenalty,
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Perplexity API エラー (${response.status}): ${errorText}`,
        );
      }

      const data = await response.json() as PerplexityResponse;
      const content = data.choices[0]?.message?.content || "";
      const citations = data.choices[0]?.citations || [];

      return {
        content,
        citations: this.returnCitations
          ? citations.map((citation) => ({
            text: citation.text,
            url: citation.url,
          }))
          : [],
      };
    } catch (error) {
      throw new Error(`APIリクエストの実行中にエラーが発生しました: ${error}`);
    }
  }
}
