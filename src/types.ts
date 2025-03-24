import { GenerativeModel } from "npm:@google/generative-ai@0.24.0";

// 調査ステップの型定義
export interface ResearchStep {
  step: number;
  content: string;
  score: number;
  missingInfo: string[];
}

// 調査レポートの型定義
export interface ResearchReport {
  content: string;
  plan: string;
  question: string;
  score: number;
}

// Gemini APIのグラウンディングメタデータ型定義
export interface GeminiGroundingMetadata {
  groundingChunks?: Array<{
    web?: {
      uri?: string;
      title?: string;
    };
  }>;
  groundingSupports?: Array<{
    segment?: {
      startIndex?: number;
      endIndex?: number;
      text?: string;
    };
    groundingChunkIndices?: number[];
    confidenceScores?: number[];
  }>;
  webSearchQueries?: string[];
}

// 調査メタデータの型定義
export interface ResearchMetadata {
  steps: ResearchStep[];
  groundingMetadata: GeminiGroundingMetadata;
  totalSteps: number;
}

// Geminiモデルの型
export type GeminiModel = GenerativeModel;

// グラウンディング情報の型定義

/**
 * グラウンディングメタデータの型定義
 */
export interface GroundingMetadata {
  groundingChunks: GroundingChunk[];
  groundingSupports: GroundingSupport[];
}

/**
 * グラウンディングチャンクの型定義
 */
export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

/**
 * グラウンディングサポートの型定義
 */
export interface GroundingSupport {
  segment?: {
    startIndex: number;
    endIndex: number;
    text?: string;
  };
  groundingChunkIndices: number[];
  confidenceScores?: number[];
}

/**
 * レポート関連の出力JSONの型定義
 */
export interface ReportOutput {
  steps: ReportStep[];
  groundingMetadata: GroundingMetadata;
  totalSteps: number;
  retrievalMetadata?: Record<string, unknown>;
  webSearchQueries?: string[];
}

/**
 * レポートのステップデータの型定義
 */
export interface ReportStep {
  step: number;
  content: string;
  score?: number;
  missingInfo?: string[];
}

/**
 * レポートの最終結果の型定義
 */
export interface ResearchResult {
  report: {
    content: string;
  };
  metadata: ReportOutput;
}
