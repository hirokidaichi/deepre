// 調査機能の実装
import { createGeminiClient } from "./gemini.ts";
import { CitationManager } from "./citations.ts";
import type { Citation } from "./types.ts";

// 複数ステップの研究調査を実行する関数
export async function deepResearch(
  apiKey: string,
  researchQuestion: string,
  maxIterations = 3,
  model = "gemini-2.0-flash",
) {
  // Geminiクライアントの初期化
  const geminiClient = createGeminiClient(apiKey, model);
  const planModel = geminiClient.createPlanModel();
  const researchModel = geminiClient.createResearchModel();

  // 1. 研究計画の生成
  const planPrompt =
    `以下のテーマについて、段階的に調査するための${maxIterations}ステップの具体的な研究計画を作成してください。
  各ステップでは、前のステップで得られた情報を基に、より深く掘り下げるべき点を明確にしてください。
  研究テーマ: ${researchQuestion}`;

  const planResult = await planModel.generateContent(planPrompt);
  const researchPlan = planResult.response.text();
  console.log("【研究計画】\n", researchPlan);

  // 2. 反復的な調査プロセスの実行
  let currentFindings = "";
  let citationManager = new CitationManager();
  const intermediateResults: {
    step: number;
    content: string;
    citations: Citation[];
  }[] = [];

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

    console.log(`[INFO] ステップ ${step} の調査を完了しました`);

    // 引用情報の抽出と追加
    const stepCitationManager = CitationManager.fromResponse(stepResponse);
    citationManager = citationManager.addAll(
      stepCitationManager.getCitations(),
    );

    // 結果を保存
    intermediateResults.push({
      step: step,
      content: stepFindings,
      citations: stepCitationManager.getCitations(),
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

  console.log(`[INFO] 最終レポートの生成が完了しました`);

  // 最終レポートからの引用情報の抽出と追加
  citationManager = citationManager.addAll(
    CitationManager.fromResponse(finalResult.response).getCitations(),
  );

  // すべての引用情報をデバッグ出力
  console.log(
    `\n[INFO] 収集されたすべての引用情報: ${citationManager.getCitations().length}件`,
  );

  // 重複する引用情報を削除
  const uniqueCitationManager = citationManager.deduplicate();
  console.log(
    `\n[INFO] 重複除去後の引用情報: ${uniqueCitationManager.getCitations().length}件`,
  );

  // 引用情報を含む最終結果を返す
  return {
    question: researchQuestion,
    plan: researchPlan,
    intermediateResults: intermediateResults,
    finalReport: await uniqueCitationManager.addCitationsToReport(finalReport),
    citations: uniqueCitationManager.getCitations(),
  };
}

// CitationManagerのメソッドを使用するため、addCitationsToReportのエクスポートは不要になりました
