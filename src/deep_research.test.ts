import { assertEquals } from "@std/assert";
import { addCitationsToReport } from "./deep_research.ts";
import { Citation } from "./gemini.ts";

Deno.test("addCitationsToReport - 引用がない場合は元のレポートを返す", () => {
  const report = "これはテストレポートです。";
  const citations: Citation[] = [];

  const result = addCitationsToReport(report, citations);

  assertEquals(result, report);
});

// 実装では無効な引用情報でもuriがあれば参考文献に追加される
Deno.test("addCitationsToReport - 引用箇所が無効でも参考文献は追加される", () => {
  const report = "これはテストレポートです。";
  const citations: Citation[] = [
    { uri: "https://example.com" }, // 有効なuri
  ];

  const result = addCitationsToReport(report, citations);

  // 期待値：元のレポート + 参考文献リスト
  const expected = `これはテストレポートです。

## 参考文献

[1] [タイトルなし](https://example.com)
`;

  assertEquals(result, expected);
});

// このテストは実際のAPIを使わないのでスキップ
Deno.test({
  name: "deepResearch - 基本的な機能テスト",
  ignore: true,
  fn: () => {
    // 実際のテストでは外部API呼び出しをモック化する必要があります
    console.log("このテストはスキップされます");
  },
});
