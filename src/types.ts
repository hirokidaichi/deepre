// Gemini APIのレスポンス型定義
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

// 引用情報の型定義
export interface Citation {
  uri?: string;
  title?: string;
  startIndex?: number;
  endIndex?: number;
  license?: string;
  publicationDate?: string;
}

// Gemini APIのレスポンス型
export interface Response {
  text: () => string;
  groundingMetadata?: GroundingMetadata;
  candidates?: Array<{
    groundingMetadata?: GroundingMetadata;
    citationMetadata?: {
      citations: Citation[];
    };
  }>;
  citations?: Citation[];
}
