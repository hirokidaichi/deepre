// Gemini APIを利用するためのモジュール
import { GoogleGenerativeAI } from "@google/generative-ai";

// Gemini APIからのレスポンスに対する型定義
export interface Citation {
  uri?: string;
  title?: string;
  startIndex?: number;
  endIndex?: number;
  license?: string;
  publicationDate?: string;
}

// Gemini API設定用インターフェース
export interface GenerationConfig {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
}

export interface GroundingMetadata {
  webSearchCitations?: Array<{
    startIndex: number;
    endIndex: number;
    uri: string;
    title: string;
  }>;
  googleSearchQueries?: Array<{
    searchQuery: string;
  }>;
  webSearchQueries?:
    | string[]
    | Array<{
      searchQuery: string;
    }>;
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
    };
    groundingChunkIndices?: number[];
    confidenceScores?: number[];
  }>;
}

export interface Response {
  text: () => string;
  groundingMetadata?: GroundingMetadata;
  candidates?: Array<{
    groundingMetadata?: GroundingMetadata;
    citationMetadata?: {
      citations: CitationMetadata[];
    };
  }>;
  citations?: CitationMetadata[];
}

export interface CitationMetadata {
  uri?: string;
  title?: string;
  startIndex?: number;
  endIndex?: number;
  license?: string;
  publicationDate?: string;
}

export interface Result {
  response: Response;
}

// レスポンスから引用情報を抽出する関数
export function extractCitations(response: unknown): Citation[] {
  try {
    return extractGroundingCitations(response as Response);
  } catch (error) {
    console.error("[ERROR] 引用情報の抽出中にエラーが発生しました:", error);
    return [];
  }
}

// groundingMetadataから引用情報を抽出する関数
function extractGroundingCitations(response: Response): Citation[] {
  const citations: Citation[] = [];

  // レスポンスやcandidatesがない場合は早期リターン
  if (!response?.candidates?.[0]?.groundingMetadata) {
    return citations;
  }

  try {
    const groundingMetadata = response.candidates[0].groundingMetadata;
    const chunks = groundingMetadata.groundingChunks || [];
    const supports = groundingMetadata.groundingSupports || [];

    // chunkがない、またはsupportsがない場合は処理する必要がない
    if (chunks.length === 0 || supports.length === 0) {
      return citations;
    }

    // groundingChunksからURLとタイトルの情報を取得
    const urlMap = new Map<number, { uri: string; title: string }>();
    for (let i = 0; i < chunks.length; i++) {
      const uri = chunks[i].web?.uri;
      if (uri) {
        urlMap.set(i, {
          uri,
          title: chunks[i].web?.title || "不明なタイトル",
        });
      }
    }

    // groundingSupportsからテキストの範囲情報を取得し、対応するURLと組み合わせる
    for (const support of supports) {
      if (!support.segment || !support.groundingChunkIndices) continue;

      // 最も信頼度の高いチャンクインデックスとその信頼度を特定
      let bestChunkIndex = -1;
      let bestConfidence = -1;

      for (let i = 0; i < support.groundingChunkIndices.length; i++) {
        const chunkIndex = support.groundingChunkIndices[i];
        const confidence = support.confidenceScores?.[i] || 0;

        if (confidence > bestConfidence && urlMap.has(chunkIndex)) {
          bestChunkIndex = chunkIndex;
          bestConfidence = confidence;
        }
      }

      // 有効なチャンクがない場合はスキップ
      if (bestChunkIndex < 0 || !urlMap.has(bestChunkIndex)) continue;

      // 引用情報を作成
      const urlInfo = urlMap.get(bestChunkIndex)!;
      const startIndex = support.segment.startIndex;
      const endIndex = support.segment.endIndex;

      if (typeof startIndex === "number" && typeof endIndex === "number") {
        citations.push({
          uri: urlInfo.uri,
          title: urlInfo.title,
          startIndex,
          endIndex,
        });
      }
    }

    if (citations.length > 0) {
      console.log(`[INFO] ${citations.length}件の引用情報を抽出しました`);
    }
  } catch (error) {
    console.error("[ERROR] 引用情報抽出中にエラーが発生しました:", error);
  }

  return citations;
}

// Geminiクライアントを生成するファクトリー関数
export function createGeminiClient(
  apiKey: string,
  model = "gemini-2.0-flash",
) {
  const genAI = new GoogleGenerativeAI(apiKey);

  // 通常のGeminiモデルの作成
  const createModel = () =>
    genAI.getGenerativeModel({
      model: model,
      generationConfig: {
        temperature: 0.2,
        topP: 0.7,
        topK: 40,
        maxOutputTokens: 8192,
      },
    });

  // 計画生成用の低温度モデルの作成
  const createPlanModel = () =>
    genAI.getGenerativeModel({
      model: model,
      generationConfig: {
        temperature: 0.0, // 決定論的な出力
        topP: 0.95,
        topK: 1,
        maxOutputTokens: 4096,
      },
    });

  // 検索機能付きモデルの作成
  const createResearchModel = () => {
    // @ts-ignore Gemini 2.0の検索機能は型定義が追いついていない
    return genAI.getGenerativeModel({
      model: model,
      generationConfig: {
        temperature: 0.2,
        topP: 0.7,
        topK: 40,
        maxOutputTokens: 8192,
      },
      tools: [{
        // @ts-ignore Google Search機能はGemini 2.0で使用可能
        google_search: {},
      }],
    });
  };

  return {
    createModel,
    createPlanModel,
    createResearchModel,
  };
}
