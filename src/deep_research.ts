// DenoでGemini APIを使用するためのクライアント実装
import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
} from "npm:@google/generative-ai";

// Gemini APIからのレスポンスに対する型定義
interface Citation {
  startIndex?: number;
  endIndex?: number;
  uri: string;
  title?: string;
}

// Google Generative AI API用の基本的なインターフェース
interface GenerationConfig {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
}

interface GroundingMetadata {
  webSearchCitations?: Array<{
    startIndex: number;
    endIndex: number;
    uri: string;
    title: string;
  }>;
  googleSearchQueries?: Array<{
    searchQuery: string;
  }>;
}

interface Response {
  text: () => string;
  groundingMetadata?: GroundingMetadata;
}

interface Result {
  response: Response;
}

// 複数ステップの研究調査を実行する関数
async function deepResearch(
  apiKey: string,
  researchQuestion: string,
  maxIterations = 3,
  model = "gemini-2.0-flash",
) {
  const genAI = new GoogleGenerativeAI(apiKey);

  // 1. 研究計画の生成
  const planModel = genAI.getGenerativeModel({
    model: model,
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 4096,
    },
  });

  const planPrompt =
    `以下のテーマについて、段階的に調査するための${maxIterations}ステップの具体的な研究計画を作成してください。
  各ステップでは、前のステップで得られた情報を基に、より深く掘り下げるべき点を明確にしてください。
  研究テーマ: ${researchQuestion}`;

  const planResult = await planModel.generateContent(planPrompt);
  const researchPlan = planResult.response.text();
  console.log("【研究計画】\n", researchPlan);

  // 2. 反復的な調査プロセスの実行
  // @ts-ignore - Gemini 2.0ではtools.google_searchが使用できるが型定義が追いついていない
  const researchModel = genAI.getGenerativeModel({
    model: model,
    generationConfig: {
      temperature: 0.0,
      maxOutputTokens: 8192,
    },
    tools: [{
      // Gemini 2.0では'google_search'を使用
      // @ts-ignore - google_searchはGemini 2.0で使用できるが型定義が存在しない
      google_search: {},
    }],
  });

  let currentFindings = "";
  let allCitations: Citation[] = [];
  let intermediateResults: any[] = [];

  // 各ステップの調査を実行
  for (let step = 1; step <= maxIterations; step++) {
    console.log(
      `\n====== 調査ステップ ${step}/${maxIterations} 実行中 ======\n`,
    );

    // 現在のステップの調査プロンプト作成
    let stepPrompt = "";
    if (step === 1) {
      // 最初のステップ
      stepPrompt = `次のテーマについて調査してください: ${researchQuestion}\n
      具体的な事実、数字、最新の動向について詳しく調べてください。`;
    } else {
      // 2回目以降のステップ - 前のステップの結果を考慮
      stepPrompt = `前回の調査で以下の情報が得られました:\n${currentFindings}\n
      これらの情報を踏まえて、次の点についてさらに詳しく調査してください:
      1. 前回の調査で不足していた情報
      2. 前回の調査で見つかった興味深いポイントの詳細
      3. 前回見つからなかった異なる視点や反対意見
      
      事実と数字を重視し、情報源を明確にしてください。`;
    }

    // 調査実行
    const stepResult = await researchModel.generateContent(stepPrompt);
    const stepResponse = stepResult.response;
    const stepFindings = stepResponse.text();

    // 引用情報の収集
    // @google/generative-aiライブラリの仕様に合わせて引用情報を取得
    // @ts-ignore - citationsプロパティは型定義に存在しないが実際には存在する
    const citations = stepResponse.citations || [];

    if (citations.length > 0) {
      allCitations = [...allCitations, ...citations];
    }

    // 結果を保存
    intermediateResults.push({
      step: step,
      content: stepFindings,
      citations: citations,
    });

    // 次のステップのための現在の発見を更新
    currentFindings = stepFindings;

    console.log(
      `ステップ ${step} の調査結果:\n`,
      stepFindings.substring(0, 300) + "...",
    );
  }

  // 3. 最終レポートの生成
  const finalPrompt =
    `あなたは研究者として、以下の複数ステップの調査結果から最終的な包括的レポートを作成してください。
  各ステップの調査結果を統合し、矛盾点を解決し、最も重要な発見をハイライトしてください。
  
  調査テーマ: ${researchQuestion}
  
  ${
      intermediateResults.map((result, index) =>
        `===== ステップ${index + 1}の調査結果 =====\n${result.content}`
      ).join("\n\n")
    }
  
  以上の調査結果をもとに、以下の構造で包括的な最終レポートを作成してください:
  1. 要約（主要な発見のまとめ）
  2. 背景と文脈
  3. 主要な発見（各ポイントに見出しをつけて整理）
  4. 議論と分析
  5. 結論と示唆
  
  レポートは事実に基づき、明確かつ構造化された形式で作成してください。`;

  const finalResult = await researchModel.generateContent(finalPrompt);
  const finalReport = finalResult.response.text();

  // 最終結果からも引用情報を収集
  // @ts-ignore - citationsプロパティは型定義に存在しないが実際には存在する
  const finalCitations = finalResult.response.citations || [];
  if (finalCitations.length > 0) {
    allCitations = [...allCitations, ...finalCitations];
  }

  // 引用情報を含む最終結果を返す
  return {
    question: researchQuestion,
    plan: researchPlan,
    intermediateResults: intermediateResults,
    finalReport: finalReport,
    citations: allCitations,
  };
}

// 引用をマークダウンリンクに変換する関数
function addCitationsToReport(report: string, citations: Citation[]): string {
  // 引用情報がなければそのまま返す
  if (!citations || citations.length === 0) {
    return report;
  }

  let reportWithCitations = report;
  const processedCitations: Citation[] = [];

  // 引用箇所にリンクを追加
  for (let i = 0; i < citations.length; i++) {
    const citation = citations[i];

    // 有効な引用情報のみ処理する
    if (!citation.uri) continue;

    // 重複引用を除外
    if (processedCitations.some((c) => c.uri === citation.uri)) continue;
    processedCitations.push(citation);

    const citationId = processedCitations.length;

    // 引用箇所の識別
    const startIndex = citation.startIndex;
    const endIndex = citation.endIndex;

    // startIndexとendIndexが有効な範囲内かチェック
    if (
      startIndex === undefined || endIndex === undefined ||
      startIndex < 0 || endIndex > reportWithCitations.length ||
      startIndex >= endIndex
    ) {
      continue;
    }

    // 該当部分のテキスト
    const citedText = reportWithCitations.substring(startIndex, endIndex);

    // リンク付きテキストに置換
    const linkedText = `[${citedText}[${citationId}]](${citation.uri})`;

    // 文字列を置換する際に、インデックスのずれを考慮
    // （前の置換で文字列の長さが変わるため）
    reportWithCitations = reportWithCitations.substring(0, startIndex) +
      linkedText +
      reportWithCitations.substring(endIndex);
  }

  // 参考文献リストを追加
  if (processedCitations.length > 0) {
    reportWithCitations += "\n\n## 参考文献\n\n";
    processedCitations.forEach((citation, index) => {
      reportWithCitations += `[${index + 1}] [${
        citation.title || "タイトルなし"
      }](${citation.uri})\n`;
    });
  }

  return reportWithCitations;
}

// メイン関数の実行
async function main() {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    console.error("環境変数GEMINI_API_KEYが設定されていません。");
    Deno.exit(1);
  }

  try {
    const result = await deepResearch(
      apiKey,
      "量子コンピューティングの最新の商業応用と将来性について",
      3, // 3ステップで調査
    );

    console.log("\n====== 最終レポート ======\n");

    // 引用をリンクとして追加
    const reportWithCitations = addCitationsToReport(
      result.finalReport,
      result.citations,
    );
    console.log(reportWithCitations);

    // マークダウンファイルとして保存
    await Deno.writeTextFile(
      "quantum_computing_report.md",
      reportWithCitations,
    );
    console.log("\nレポートをquantum_computing_report.mdに保存しました。");
  } catch (error) {
    console.error("エラーが発生しました:", error);
  }
}

// スクリプト実行
if (import.meta.main) {
  main();
}
