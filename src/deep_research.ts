// 調査機能の実装
import {
  GenerativeModel,
  GoogleGenerativeAI,
} from "npm:@google/generative-ai@0.24.0";
import {
  GeminiGroundingMetadata,
  GroundingMetadata,
  ResearchMetadata,
  ResearchReport,
  ResearchStep,
} from "./types.ts";
import { GroundingProcessor } from "./grounding.ts";

// 調査コンテキストの型定義
interface ResearchContext {
  question: string;
  currentFindings: string;
  intermediateResults: ResearchStep[];
  currentScore: number;
  step: number;
}

// 調査計画を生成する関数
async function generateResearchPlan(
  model: GenerativeModel,
  theme: string,
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

  調査テーマ: ${theme}`;

  const response = await model.generateContent(planPrompt);
  return response.response.text();
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
  model: GenerativeModel,
  theme: string,
  context: ResearchContext,
): Promise<{ score: number; missingInfo: string[] }> {
  const evaluationPrompt = `
    プロフェッショナルなリサーチャーとして、以下の調査結果について、テーマ「${theme}」に対する情報の充実度を評価してください。

    調査結果:
    ${context.currentFindings}

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

  // 評価テキストからスコアと不足情報を抽出
  const scoreMatch = evaluationText.match(/<score>(\d+)<\/score>/);
  const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;

  const missingInfo = evaluationText
    .split("\n")
    .filter((line) => line.trim().startsWith("-"))
    .map((line) => line.trim().substring(2));

  return { score, missingInfo };
}

// 1ステップの調査を実行する関数
async function executeResearchStep(
  model: GenerativeModel,
  context: ResearchContext,
): Promise<ResearchStep> {
  const stepPrompt = generateStepPrompt(context);
  const stepResult = await model.generateContent(stepPrompt);
  const stepFindings = stepResult.response.text();

  // 調査結果を現在の知見に追加
  context.currentFindings = stepFindings;

  // 調査結果の評価
  const { score, missingInfo } = await evaluateResearch(
    model,
    context.question,
    context,
  );

  return {
    step: context.step,
    content: stepFindings.replace(/\[\d+\]/g, ""), // 引用番号を削除
    score,
    missingInfo,
  };
}

// 最終レポートを生成する関数
async function generateFinalReport(
  model: GenerativeModel,
  theme: string,
  researchSteps: ResearchStep[],
): Promise<ResearchReport> {
  const finalPrompt =
    `プロフェッショナルなリサーチャーとして、以下のテーマに関する調査結果から、包括的な最終レポートを作成してください。

  調査テーマ: ${theme}

  これまでの調査で以下の情報が得られています：
  ${
      researchSteps.map((result) =>
        `===== ステップ${result.step}の調査結果（充実度スコア: ${result.score}）=====\n${result.content}`
      ).join("\n\n")
    }
  
  最終レポートでは以下の点を重視してください：
  「テーマに対する明確な回答や結論」
  「結論を支持する具体的な事実やデータ」
  
  レポートは、読み手が実践的に活用できる情報を提供することを心がけ、
  事実に基づいた客観的な分析と、実務に役立つ示唆を含めてください。`;

  const finalReport = await model.generateContent(finalPrompt);
  const content = finalReport.response.text();

  return {
    content,
    plan: "", // 後で設定
    question: theme,
    score: Math.max(...researchSteps.map((step) => step.score)),
  };
}

// メインの調査実行関数
export async function deepResearch(
  apiKey: string,
  researchQuestion: string,
  maxIterations: number = 3,
  modelName: string = "gemini-2.0-flash",
  scoreThreshold: number = 85,
): Promise<{
  report: ResearchReport;
  metadata: ResearchMetadata;
}> {
  const genAI = new GoogleGenerativeAI(apiKey);

  // 検索機能付きモデルの作成
  // @ts-ignore Gemini 2.0の検索機能は型定義が追いついていない
  const model = genAI.getGenerativeModel({
    model: modelName,
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

  const context: ResearchContext = {
    question: researchQuestion,
    currentFindings: "",
    intermediateResults: [],
    currentScore: 0,
    step: 1,
  };

  // 調査計画の生成
  const researchPlan = await generateResearchPlan(model, researchQuestion);
  console.log("【研究計画】\n", researchPlan);

  // 反復的な調査プロセスの実行
  while (
    context.currentScore < scoreThreshold && context.step <= maxIterations
  ) {
    console.log(
      `\n====== 調査ステップ ${context.step}/${maxIterations} 実行中 ======\n`,
    );

    const stepResult = await executeResearchStep(model, context);

    context.intermediateResults.push(stepResult);
    context.currentFindings = stepResult.content;
    context.currentScore = stepResult.score;

    console.log(`[INFO] ステップ ${context.step} の調査を完了しました`);
    console.log(`[INFO] 情報充実度スコア: ${stepResult.score}/100`);
    console.log(
      `ステップ ${context.step} の調査結果:\n`,
      stepResult.content.substring(0, 300) + "...",
    );

    if (stepResult.missingInfo.length > 0) {
      console.log("\n[INFO] 不足している情報:");
      stepResult.missingInfo.forEach((info) => console.log(`- ${info}`));
    }

    context.step++;
  }

  // 最終レポートの生成
  const report = await generateFinalReport(
    model,
    researchQuestion,
    context.intermediateResults,
  );
  report.plan = researchPlan;

  // メタデータの準備
  const finalContent = await model.generateContent(report.content);

  // groundingMetadataの取得
  // @ts-ignore Gemini 2.0の型定義が追いついていないため
  const groundingMetadata =
    finalContent.response.candidates?.[0]?.groundingMetadata || {};

  const metadata: ResearchMetadata = {
    steps: context.intermediateResults,
    groundingMetadata,
    totalSteps: context.step - 1,
  };

  return { report, metadata };
}

/**
 * GeminiGroundingMetadataをGroundingMetadataに変換するアダプタ関数
 */
function convertToGroundingMetadata(
  geminiMetadata: GeminiGroundingMetadata,
): GroundingMetadata {
  // 空のグラウンディングメタデータを作成
  const metadata: GroundingMetadata = {
    groundingChunks: [],
    groundingSupports: [],
  };

  // チャンク情報の変換
  if (geminiMetadata.groundingChunks) {
    metadata.groundingChunks = geminiMetadata.groundingChunks
      .filter((chunk) => chunk.web?.uri && chunk.web?.title)
      .map((chunk) => ({
        web: {
          uri: chunk.web!.uri!,
          title: chunk.web!.title!,
        },
      }));
  }

  // サポート情報の変換
  if (geminiMetadata.groundingSupports) {
    metadata.groundingSupports = geminiMetadata.groundingSupports
      .filter((support) => support.segment && support.groundingChunkIndices)
      .map((support) => ({
        segment: support.segment
          ? {
            startIndex: support.segment.startIndex || 0,
            endIndex: support.segment.endIndex || 0,
            text: support.segment.text,
          }
          : undefined,
        groundingChunkIndices: support.groundingChunkIndices || [],
        confidenceScores: support.confidenceScores,
      }));
  }

  return metadata;
}

// グラウンディング情報を使用した調査実行関数
export async function deepResearchWithGrounding(
  apiKey: string,
  researchQuestion: string,
  maxIterations: number = 3,
  modelName: string = "gemini-2.0-flash",
  scoreThreshold: number = 85,
): Promise<string> {
  // 通常の調査を実行
  const { report, metadata } = await deepResearch(
    apiKey,
    researchQuestion,
    maxIterations,
    modelName,
    scoreThreshold,
  );

  // groundingMetadataを使用してレポートを処理
  console.log("[INFO] グラウンディング処理を開始します");

  // GeminiGroundingMetadataをGroundingMetadataに変換
  const groundingMetadata = convertToGroundingMetadata(
    metadata.groundingMetadata,
  );

  const processor = new GroundingProcessor(report.content, groundingMetadata);
  const processedContent = await processor.processReport();
  console.log("[INFO] グラウンディング処理が完了しました");

  return processedContent;
}
