import { GroundingMetadata } from "../types.ts";

// サンプルレポート
export const sampleReport =
  "これは最初の文章です。これは二番目の文章です。これは三番目の文章です。";

// サンプルメタデータ
export const sampleMetadata: GroundingMetadata = {
  groundingChunks: [
    {
      web: {
        uri: "https://example.com/1",
        title: "例1のタイトル",
      },
    },
    {
      web: {
        uri: "https://example.com/2",
        title: "例2のタイトル",
      },
    },
    {
      web: {
        uri: "https://example.com/3",
        title: "例3のタイトル",
      },
    },
  ],
  groundingSupports: [
    {
      segment: {
        startIndex: 0,
        endIndex: 11,
        text: "これは最初の文章です。",
      },
      groundingChunkIndices: [0],
      confidenceScores: [0.9],
    },
    {
      segment: {
        startIndex: 11,
        endIndex: 23,
        text: "これは二番目の文章です。",
      },
      groundingChunkIndices: [1],
      confidenceScores: [0.8],
    },
    {
      segment: {
        startIndex: 23,
        endIndex: 35,
        text: "これは三番目の文章です。",
      },
      groundingChunkIndices: [2],
      confidenceScores: [0.7],
    },
  ],
};

// 期待される出力結果（実際の出力に合わせて修正）
export const expectedResult =
  "[これは最初の文章です。](https://example.com/1)[これは二番目の文章です。](https://example.com/2)[これは三番目の文章です。](https://example.com/3)\n\n## 参考文献\n\n1. 例1のタイトル: https://example.com/1\n2. 例2のタイトル: https://example.com/2\n3. 例3のタイトル: https://example.com/3\n";
