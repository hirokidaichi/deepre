import { assertEquals } from "jsr:@std/testing@^0.219.1/asserts";
import {
  type GroundingMetadata,
  GroundingProcessor,
  GroundingReport,
} from "./grounding.ts";

// テスト用のGroundingProcessorサブクラス
class TestGroundingProcessor extends GroundingProcessor {
  constructor(text: string, metadata: GroundingMetadata) {
    super(text, metadata);
  }

  process(text: string): Promise<string> {
    return Promise.resolve(`processed: ${text}`);
  }
}

Deno.test("GroundingProcessor - 基本的な変換テスト", async () => {
  const processor = new TestGroundingProcessor("", {
    groundingChunks: [],
    groundingSupports: [],
  });
  const result = await processor.process("test");
  assertEquals(result, "processed: test");
});

Deno.test("GroundingReport - インタビューアーカイブのデータを使用した実践的なテスト", () => {
  const report = new GroundingReport({
    report:
      "広木大地氏は、開発者体験を「超高速に仮説検証する能力」を高めることと定義しています。また、開発生産性の可視化と改善活動に取り組むことが重要だと述べています。",
    metadata: {
      groundingChunks: [
        {
          web: {
            uri: "https://levtech.jp/media/entry/791",
            title:
              "【日本CTO協会理事・広木大地氏に聞く】開発者体験向上に企業がファーストステップを踏み出すためにできること",
          },
        },
        {
          web: {
            uri: "https://zenn.dev/hirokidaichi",
            title: "広木大地のZenn記事一覧",
          },
        },
      ],
      groundingSupports: [
        {
          segment: {
            startIndex: 0,
            endIndex: 45,
          },
          groundingChunkIndices: [0],
          confidenceScores: [0.95],
        },
        {
          segment: {
            startIndex: 46,
            endIndex: 82,
          },
          groundingChunkIndices: [1],
          confidenceScores: [0.92],
        },
      ],
    },
  });

  assertEquals(report.hasGrounding(), true);
  assertEquals(report.getGroundingScore(), 0.935); // (0.95 + 0.92) / 2
  assertEquals(report.getGroundingUrls(), [
    "https://levtech.jp/media/entry/791",
    "https://zenn.dev/hirokidaichi",
  ]);
});

Deno.test("GroundingReport - 複数のソースからの引用を含むテスト", () => {
  const report = new GroundingReport({
    report:
      "エンジニアリング組織論では、技術と経営を結びつけ、組織を成長させるための考え方が示されています。不確実な状況に強い組織を作るためには、スクラムなどのフレームワークが有効です。",
    metadata: {
      groundingChunks: [
        {
          web: {
            uri: "https://exa-corp.co.jp/engineering-organization",
            title: "エンジニアリング組織論への招待",
          },
        },
        {
          web: {
            uri: "https://gihyo.jp/article/scrum-framework",
            title: "スクラムフレームワークの実践",
          },
        },
      ],
      groundingSupports: [
        {
          segment: {
            startIndex: 0,
            endIndex: 60,
          },
          groundingChunkIndices: [0],
          confidenceScores: [0.98],
        },
        {
          segment: {
            startIndex: 61,
            endIndex: 110,
          },
          groundingChunkIndices: [1],
          confidenceScores: [0.96],
        },
      ],
    },
  });

  assertEquals(report.hasGrounding(), true);
  assertEquals(report.getGroundingScore(), 0.97); // (0.98 + 0.96) / 2
  assertEquals(report.getGroundingUrls(), [
    "https://exa-corp.co.jp/engineering-organization",
    "https://gihyo.jp/article/scrum-framework",
  ]);
});

Deno.test("GroundingReport - 信頼性の低いソースを含むテスト", () => {
  const report = new GroundingReport({
    report:
      "開発生産性の指標として、ソースコード量(SLOC)、プルリクエスト量、ストーリーポイント量などが挙げられます。",
    metadata: {
      groundingChunks: [
        {
          web: {
            uri: "https://tech-blog.example.com/metrics",
            title: "開発生産性の指標について",
          },
        },
      ],
      groundingSupports: [
        {
          segment: {
            startIndex: 0,
            endIndex: 82,
          },
          groundingChunkIndices: [0],
          confidenceScores: [0.45],
        },
      ],
    },
  });

  assertEquals(report.hasGrounding(), false);
  assertEquals(report.getGroundingScore(), 0.45);
  assertEquals(report.getGroundingUrls(), [
    "https://tech-blog.example.com/metrics",
  ]);
});
