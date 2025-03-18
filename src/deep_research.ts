// 調査機能の実装
import { Citation, createGeminiClient, extractCitations } from "./gemini.ts";

// リダイレクト先のURLを取得する関数をインポート
import { revealRedirect } from "./reveal-redirect.ts";

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
  let allCitations: Citation[] = [];
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

    // 引用情報の抽出
    const stepCitations = extractCitations(stepResponse);
    if (stepCitations.length > 0) {
      allCitations = [...allCitations, ...stepCitations];
    }

    // 結果を保存
    intermediateResults.push({
      step: step,
      content: stepFindings,
      citations: stepCitations,
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

  // 最終レポートからの引用情報の抽出
  const finalStepCitations = extractCitations(finalResult.response);
  if (finalStepCitations.length > 0) {
    allCitations = [...allCitations, ...finalStepCitations];
  }

  // すべての引用情報をデバッグ出力
  console.log(`\n[INFO] 収集されたすべての引用情報: ${allCitations.length}件`);

  // 重複する引用情報を削除
  const uniqueCitations = allCitations.filter((citation, index, self) =>
    self.findIndex((c) => c.uri === citation.uri) === index
  );
  console.log(`\n[INFO] 重複除去後の引用情報: ${uniqueCitations.length}件`);

  // 引用情報を含む最終結果を返す
  return {
    question: researchQuestion,
    plan: researchPlan,
    intermediateResults: intermediateResults,
    finalReport: finalReport,
    citations: uniqueCitations,
  };
}

// 引用をマークダウンリンクに変換する関数
export async function addCitationsToReport(
  report: string,
  citations: Citation[],
): Promise<string> {
  // 引用情報がなければそのまま返す
  if (!citations || citations.length === 0) {
    console.log(`[WARNING] 引用情報がありません。レポートをそのまま返します。`);
    return report;
  }

  console.log(`[INFO] 引用情報の処理を開始: ${citations.length}件`);

  // 重複しない引用情報のみを抽出
  const uniqueCitations = citations.filter((citation, index, self) =>
    citation.uri && self.findIndex((c) => c.uri === citation.uri) === index
  );

  console.log(`[INFO] 重複除去後の引用情報: ${uniqueCitations.length}件`);

  // 引用情報を記録するための配列
  const processedCitations: Citation[] = [];

  // 既存の [n] パターンを検出（Geminiが生成した引用番号）
  const citationPattern = /\[(\d+)\]/g;
  const existingCitations = new Map<number, Citation>();

  // 1. まず既存の引用番号を検出し、実際の引用情報と対応付ける
  let match;
  let cleanedReport = report;
  const matches = Array.from(report.matchAll(citationPattern));

  if (matches.length > 0) {
    console.log(`[INFO] レポート内で検出された引用番号: ${matches.length}件`);

    // 最大の引用番号を特定
    const maxNum = Math.max(...matches.map((m) => parseInt(m[1], 10)));

    // 使用された引用番号とCitationオブジェクトを対応付ける
    for (let i = 1; i <= maxNum; i++) {
      if (i <= uniqueCitations.length) {
        existingCitations.set(i, uniqueCitations[i - 1]);
        processedCitations.push(uniqueCitations[i - 1]);
      }
    }
  }

  // 2. テキスト中にある引用情報（startIndexとendIndexを持つもの）を処理
  const indexBasedCitations = uniqueCitations.filter(
    (citation) =>
      typeof citation.startIndex === "number" &&
      typeof citation.endIndex === "number",
  );

  // startIndexとendIndexを持つ引用を処理（Geminiの検索による引用情報）
  if (indexBasedCitations.length > 0) {
    console.log(
      `[INFO] インデックスベースの引用: ${indexBasedCitations.length}件`,
    );

    // startIndexとendIndexの情報は処理しない
    // これらの引用は通常、レポート内に[n]形式で既に含まれているため
    for (const citation of indexBasedCitations) {
      // まだ処理されていない引用情報を追加
      if (!processedCitations.some((pc) => pc.uri === citation.uri)) {
        processedCitations.push(citation);
      }
    }
  }

  // 3. まだ処理されていない引用情報があれば追加
  for (const citation of uniqueCitations) {
    if (!processedCitations.some((pc) => pc.uri === citation.uri)) {
      processedCitations.push(citation);
    }
  }

  // 4. 参考文献リストを追加
  if (processedCitations.length > 0) {
    cleanedReport += "\n\n## 参考文献\n\n";

    // リダイレクト先のURLを並行して取得
    const finalUrls = await Promise.all(
      processedCitations.map((citation) =>
        citation.uri ? revealRedirect(citation.uri) : Promise.resolve("")
      ),
    );

    processedCitations.forEach((citation, index) => {
      cleanedReport += `[${index + 1}] ${citation.title || "参考文献"}: ${
        finalUrls[index] || citation.uri
      }\n`;
    });
  }

  return cleanedReport;
}
