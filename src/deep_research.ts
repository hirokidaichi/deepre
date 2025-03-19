// 調査機能の実装
import { createGeminiClient } from "./gemini.ts";
//import { CitationManager } from "./citations.ts";

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
  const intermediateResults: {
    step: number;
    content: string;
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

    // 結果を保存
    intermediateResults.push({
      step: step,
      content: stepFindings.replace(/\[\d+\]/g, ""),
    });

    // 次のステップのための現在の発見を更新
    currentFindings = stepFindings.replace(/\[\d+\]/g, "");

    console.log(
      `ステップ ${step} の調査結果:\n`,
      stepFindings.substring(0, 300) + "...",
    );
  }

  // 3. 最終レポートの生成
  const finalPrompt =
    `あなたは研究者として、以下の研究テーマに関する複数ステップの調査結果から、最終的な包括的レポートを作成してください。

  研究テーマ: ${researchQuestion}

  このテーマに関して、以下の調査結果が得られています：
  ${
      intermediateResults.map((result, index) =>
        `===== ステップ${index + 1}の調査結果 =====\n${result.content}`
      ).join("\n\n")
    }
  
  上記の調査結果を統合し、以下の点に特に注意してレポートを作成してください：
  1. 研究テーマに直接関連する重要な発見を優先的に取り上げる
  2. テーマから外れた内容は省略するか、必要最小限の言及に留める
  3. 異なるステップで得られた関連する情報を適切に統合する
  4. 矛盾する情報がある場合は、より信頼性の高い情報を優先する
  
  レポートは事実に基づき、明確かつ構造化された形式で作成してください。
  また、各セクションが研究テーマに対してどのように関連しているかを明確にしてください。`;

  const finalResult = await researchModel.generateContent(finalPrompt);
  const finalReport = finalResult.response.text();

  // 最終レポートの引用情報のみを使用
  //const citationManager = CitationManager.fromResponse(finalResult.response);

  // 重複する引用情報を削除
  //const uniqueCitationManager = citationManager.deduplicate();

  // 引用情報を含む最終結果を返す
  return {
    question: researchQuestion,
    plan: researchPlan.replace(/\[\d+\]/g, ""),
    intermediateResults: intermediateResults,
    finalReport: finalReport,
    //citations: uniqueCitationManager.getCitations(),
  };
}
