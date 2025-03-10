import { assertEquals } from "./deps_test.ts";
import { FormatterFactory } from "./formatter.ts";
import { ResearchResult } from "./types.ts";

const sampleResult: ResearchResult = {
  theme: "テストテーマ",
  content: "これはテストコンテンツです。",
  citations: [
    {
      text: "引用テキスト",
      url: "https://example.com",
    },
  ],
  followupQuestions: [
    "フォローアップ質問1",
    "フォローアップ質問2",
  ],
};

Deno.test("MarkdownFormatter", async (t) => {
  const formatter = FormatterFactory.create("markdown");

  await t.step("Markdown形式で出力できる", () => {
    const output = formatter.format(sampleResult);
    const expected = `# テストテーマ

これはテストコンテンツです。

## 引用
- 引用テキスト
  [参照元](https://example.com)

## フォローアップ質問
- フォローアップ質問1
- フォローアップ質問2
`;
    assertEquals(output, expected);
  });
});

Deno.test("JsonFormatter", async (t) => {
  const formatter = FormatterFactory.create("json");

  await t.step("JSON形式で出力できる", () => {
    const output = formatter.format(sampleResult);
    const parsed = JSON.parse(output);
    assertEquals(parsed.theme, sampleResult.theme);
    assertEquals(parsed.citations, sampleResult.citations);
    assertEquals(parsed.followupQuestions, sampleResult.followupQuestions);
  });
});

Deno.test("FormatterFactory", async (t) => {
  await t.step("未対応の形式でエラーを投げる", () => {
    try {
      // @ts-expect-error: 意図的に不正な形式を指定
      FormatterFactory.create("invalid");
      throw new Error("エラーが発生すべき");
    } catch (error: unknown) {
      if (error instanceof Error) {
        assertEquals(error.message, "未対応の出力形式です: invalid");
      } else {
        throw new Error("予期しない型のエラーが発生しました");
      }
    }
  });
});
