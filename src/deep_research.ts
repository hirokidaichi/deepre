// 調査機能の実装
import { createGeminiClient } from "./gemini.ts";
//import { CitationManager } from "./citations.ts";

// Geminiモデルのレスポンス型
interface GeminiResponse {
  text: () => string;
}

// Geminiモデルの型
interface GeminiModel {
  generateContent: (prompt: string) => Promise<{
    response: GeminiResponse;
  }>;
}

interface ResearchStep {
  step: number;
  content: string;
  score: number;
  missingInfo: string[];
}

interface ResearchContext {
  question: string;
  currentFindings: string;
  intermediateResults: ResearchStep[];
  currentScore: number;
  step: number;
}

// 調査計画を生成する関数
async function generateResearchPlan(
  model: GeminiModel,
  question: string,
): Promise<string> {
  const planPrompt =
    `あなたはプロフェッショナルなリサーチャーとして、以下のテーマについて調査を行います。
  まず、このテーマについて以下の観点から分析してください：

  1. テーマの本質的な問い
  2. 期待される成果や理解すべきポイント
  3. 潜在的な課題や注意点

  その上で、効果的な調査計画を立案してください。各ステップでは：
  - 具体的に何を明らかにするのか
  - どのような情報を収集するのか
  - なぜその情報が重要なのか
  を明確にしてください。

  調査テーマ: ${question}`;

  const planResult = await model.generateContent(planPrompt);
  return planResult.response.text();
}

// 調査ステップのプロンプトを生成する関数
function generateStepPrompt(context: ResearchContext): string {
  if (context.step === 1) {
    return `次のテーマについて、プロフェッショナルなリサーチャーとして調査を行ってください: ${context.question}

    以下の点に特に注意して情報を収集してください：
    1. テーマに関する最新の事実や統計データ
    2. 主要な議論や見解
    3. 業界や分野での具体的な事例
    4. 信頼できる情報源からの裏付けデータ

    それぞれの情報について、なぜそれが重要なのか、どのように結論に貢献するのかを明確にしてください。`;
  }

  const lastStep =
    context.intermediateResults[context.intermediateResults.length - 1];
  return `前回の調査で以下の情報が得られました:\n${context.currentFindings}\n
    
    特に以下の不足している情報について重点的に調査してください：
    ${lastStep.missingInfo.map((info) => `- ${info}`).join("\n")}
    
    この調査ステップでは：
    1. 上記の不足情報を補完する具体的なデータや事例
    2. これまでの発見に対する異なる視点や解釈
    3. 発見した情報の実務的な意味や影響
    4. 情報の信頼性を高めるための追加の裏付けデータ
    
    を収集してください。各情報について、その重要性と全体の結論への貢献を説明してください。`;
}

// 調査結果を評価する関数
async function evaluateResearch(
  model: GeminiModel,
  question: string,
  findings: string,
): Promise<{ score: number; missingInfo: string[] }> {
  const evaluationPrompt = `
    プロフェッショナルなリサーチャーとして、以下の調査結果について、テーマ「${question}」に対する情報の充実度を評価してください。

    調査結果:
    ${findings}

    以下の観点から評価を行い、回答してください：
    1. 情報の具体性と正確性（事実、数字、事例の充実度）
    2. 情報の網羅性（テーマの重要な側面をカバーできているか）
    3. 情報の信頼性（情報源の質、裏付けの有無）
    4. 分析の深さ（単なる事実の列挙ではなく、意味や影響の考察があるか）
    5. 多角的な視点（異なる立場や解釈が考慮されているか）
    6. 85点以上で最終レポートを作成するので、十分な情報があれば85点以上を返すようにしてください。

    回答形式：
    1. スコア（0-100）を<score>数字</score>の形式で
    2. 不足している情報や追加で調べるべき点を箇条書きで
    3. スコアの根拠を簡潔に
    `;

  const evaluation = await model.generateContent(evaluationPrompt);
  const evaluationText = evaluation.response.text();

  const scoreMatch = evaluationText.match(/<score>(\d+)<\/score>/);
  const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;

  const missingInfo = evaluationText
    .split("\n")
    .filter((line: string) => line.trim().startsWith("-"))
    .map((line: string) => line.trim().substring(2));

  return { score, missingInfo };
}

// 最終レポートを生成する関数
async function generateFinalReport(
  model: GeminiModel,
  context: ResearchContext,
): Promise<string> {
  const finalPrompt =
    `プロフェッショナルなリサーチャーとして、以下のテーマに関する調査結果から、包括的な最終レポートを作成してください。

  調査テーマ: ${context.question}

  これまでの調査で以下の情報が得られています：
  ${
      context.intermediateResults.map((result) =>
        `===== ステップ${result.step}の調査結果（充実度スコア: ${result.score}）=====\n${result.content}`
      ).join("\n\n")
    }
  
  最終レポートでは以下の点を重視してください：
  「テーマに対する明確な回答や結論」
  「結論を支持する具体的な事実やデータ」
  
  レポートは、読み手が実践的に活用できる情報を提供することを心がけ、
  事実に基づいた客観的な分析と、実務に役立つ示唆を含めてください。`;

  const finalResult = await model.generateContent(finalPrompt);
  return finalResult.response.text();
}

// 1ステップの調査を実行する関数
async function executeResearchStep(
  model: GeminiModel,
  context: ResearchContext,
): Promise<ResearchStep> {
  const stepPrompt = generateStepPrompt(context);
  const stepResult = await model.generateContent(stepPrompt);
  const stepFindings = stepResult.response.text();

  const { score, missingInfo } = await evaluateResearch(
    model,
    context.question,
    stepFindings,
  );

  return {
    step: context.step,
    content: stepFindings.replace(/\[\d+\]/g, ""),
    score,
    missingInfo,
  };
}

// メインの調査実行関数
export async function deepResearch(
  apiKey: string,
  researchQuestion: string,
  maxIterations = 3,
  model = "gemini-2.0-flash",
  scoreThreshold = 95,
) {
  const geminiClient = createGeminiClient(apiKey, model);
  const planModel = geminiClient.createPlanModel();
  const researchModel = geminiClient.createResearchModel();

  // 調査計画の生成
  const researchPlan = await generateResearchPlan(planModel, researchQuestion);
  console.log("【研究計画】\n", researchPlan);

  // 調査コンテキストの初期化
  const context: ResearchContext = {
    question: researchQuestion,
    currentFindings: "",
    intermediateResults: [],
    currentScore: 0,
    step: 1,
  };

  // 反復的な調査プロセスの実行
  while (
    context.currentScore < scoreThreshold && context.step <= maxIterations
  ) {
    console.log(
      `\n====== 調査ステップ ${context.step}/${maxIterations} 実行中 ======\n`,
    );

    const stepResult = await executeResearchStep(researchModel, context);

    context.intermediateResults.push(stepResult);
    context.currentFindings = stepResult.content;
    context.currentScore = stepResult.score;

    console.log(`[INFO] ステップ ${context.step} の調査を完了しました`);
    console.log(`[INFO] 情報充実度スコア: ${stepResult.score}`);
    console.log(
      `ステップ ${context.step} の調査結果:\n`,
      stepResult.content.substring(0, 300) + "...",
    );

    context.step++;
  }

  // 最終レポートの生成
  const finalReport = await generateFinalReport(researchModel, context);

  return {
    question: researchQuestion,
    plan: researchPlan.replace(/\[\d+\]/g, ""),
    intermediateResults: context.intermediateResults,
    finalReport,
    finalScore: context.currentScore,
  };
}
