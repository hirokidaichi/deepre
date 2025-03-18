# Gemini APIとGrounding Google Searchを使ったDeep Research実装調査

## 1. はじめに

この調査レポートでは、Gemini APIとGrounding Google
Searchを活用して、OpenAIのDeep
Research機能に相当するツールを実装するための方向性と実装方法について検討します。最新の情報と技術的な実装方法について調査した結果をまとめています。

## 2. Deep Researchとは

Deep ResearchはOpenAIが開発した高度なAI研究ツールで、以下の特徴を持っています：

- オンライン情報を活用した包括的な研究が可能
- テキスト、画像、PDF、ユーザーアップロードファイルなど様々な形式のデータを処理
- 人間が数時間かかる作業を数分で完了する効率性
- 研究計画の作成、情報収集、結果の分析、レポート生成までを自動化
- 信頼性の高い情報源からの引用と出典の明示

Deep
Researchは、特に学術研究や市場分析、競合調査などのシナリオで、情報収集と分析を大幅に効率化します。

## 3. Gemini APIとGrounding Google Search概要

### 3.1 Gemini API

Gemini
APIは、Googleが提供する高度な生成AIモデルへのアクセスを可能にするAPIです。最新のバージョンにはGemini
1.5 FlashやGemini 2.0などがあり、長文脈理解や複雑な推論能力を持っています。

### 3.2 Grounding Google Search

Grounding with Google Searchは、Gemini
APIの機能で、AIモデルの回答をGoogle検索の結果に基づいて「接地」させることができます。主な特徴：

- AIの回答の正確性と最新性を向上
- 情報源（インライン支援リンク）の提供
- Google検索の提案を回答と共に表示
- 動的検索による必要に応じた接地（Dynamic Retrieval）

Grounding Google
Searchを使用すると、AIモデルが持つ知識だけでなく、Webから最新の情報を取得して回答を生成できるため、Deep
Research相当の機能を実装する上で核となる技術です。

## 4. 実装方向性

### 4.1 基本アーキテクチャ

以下に、Gemini APIとGrounding Google Searchを使用したDeep
Research相当のツールの基本アーキテクチャを示します：

1. **フロントエンド**：ユーザーインターフェース（Web
   UI、CLI、またはAPIインターフェース）
2. **バックエンド**：Node.js/Express、Deno、または他のサーバーサイド技術
3. **Gemini API統合**：Google検索接地機能を有効にした状態でGemini APIを呼び出す
4. **結果処理**：API応答から情報を抽出し、引用、ソース、検索提案を含む形式に整形

### 4.2 主要機能の実装方針

1. **研究計画生成**
   - ユーザーの質問から複数ステップの研究計画を生成
   - ユーザーによる計画の承認または修正を可能に

2. **情報収集プロセス**
   - Gemini APIのGoogle検索接地機能を使用して情報を収集
   - 複数回の検索を行い、発見した情報に基づいて新しい検索を行う反復的プロセス

3. **包括的レポート生成**
   - 収集した情報を統合し、構造化されたレポートを生成
   - 引用と情報源へのリンクを提供

4. **フォローアップと対話**
   - レポート生成後も質問やレポートの改善要求に対応
   - 対話的なリサーチ体験の提供

## 5. 技術的実装例

### 5.1 Node.jsでの実装例

```javascript
const {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} = require("@google/generative-ai");

async function generateResearchReport(
  apiKey = "YOUR_API_KEY",
  model = "gemini-1.5-flash",
  researchQuestion =
    "What are the latest trends in autonomous vehicle sensors?",
) {
  // Gemini APIの初期化
  const genAI = new GoogleGenerativeAI(apiKey);

  // 研究計画の生成
  const planModel = genAI.getGenerativeModel({
    model: model,
    generationConfig: {
      temperature: 0.0,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8192,
    },
  });

  const planRequest =
    "以下の研究テーマについて、複数ステップの詳細な研究計画を立ててください：" +
    researchQuestion;

  const planResult = await planModel.generateContent(planRequest);
  const researchPlan = planResult.response.text();
  console.log("研究計画:", researchPlan);

  // Google検索接地機能を使った研究レポート生成
  const researchModel = genAI.getGenerativeModel({
    model: model,
    generationConfig: {
      temperature: 0.0,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8192,
    },
    tools: [{
      googleSearchRetrieval: {
        // 必要に応じてdynamicRetrievalConfigを設定できます
        dynamicRetrievalConfig: {
          disableDynamicRetrieval: false,
          dynamicRetrievalThreshold: 0.3, // 0から1の値、デフォルトは0.3
        },
      },
    }],
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ],
  });

  const researchRequest =
    "次の質問について包括的な調査を行い、引用付きの詳細なレポートを作成してください：" +
    researchQuestion;

  // 研究レポートの生成とgroundingの処理
  const result = await researchModel.generateContent(researchRequest);
  const response = result.response;

  // レポート本文の取得
  const reportContent = response.text();

  // groundingMetadataの取得（情報源など）
  const groundingMetadata = response.groundingMetadata;

  // Google検索提案の取得
  const searchQueries = [];
  if (groundingMetadata && groundingMetadata.googleSearchQueries) {
    groundingMetadata.googleSearchQueries.forEach((query) => {
      searchQueries.push(query.searchQuery);
    });
  }

  // 引用情報の取得
  const citations = [];
  if (groundingMetadata && groundingMetadata.webSearchCitations) {
    groundingMetadata.webSearchCitations.forEach((citation) => {
      citations.push({
        startIndex: citation.startIndex,
        endIndex: citation.endIndex,
        uri: citation.uri,
        title: citation.title,
      });
    });
  }

  // レポート結果とソース情報を返す
  return {
    report: reportContent,
    searchQueries: searchQueries,
    citations: citations,
    groundingMetadata: groundingMetadata,
  };
}

// 対話型研究アシスタントの実装例
async function interactiveResearchAssistant(
  apiKey = "YOUR_API_KEY",
  model = "gemini-1.5-flash",
  initialQuestion = "What are the latest trends in autonomous vehicle sensors?",
) {
  const genAI = new GoogleGenerativeAI(apiKey);

  // Google検索接地機能を有効にしたチャットセッションの開始
  const chatSession = genAI.startChat({
    model: model,
    generationConfig: {
      temperature: 0.2,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8192,
    },
    tools: [{
      googleSearchRetrieval: {},
    }],
    history: [],
  });

  // 初期質問の送信と研究の開始
  console.log("研究質問:", initialQuestion);
  const result = await chatSession.sendMessage(
    "あなたは研究アシスタントです。以下のテーマについて包括的な調査を行い、" +
      "引用付きの詳細なレポートを作成してください。最新の情報を活用し、" +
      "信頼性の高い情報源からの引用を含めてください：" + initialQuestion,
  );

  // レポートとgrounding情報の取得
  const reportContent = result.response.text();
  const groundingMetadata = result.response.groundingMetadata;

  console.log("研究レポート:", reportContent);
  console.log("情報源:", JSON.stringify(groundingMetadata, null, 2));

  // 対話を継続するためのセッションを返す
  return {
    chatSession,
    lastResponse: result.response,
  };
}

// 使用例
async function run() {
  require("dotenv").config(); // .envファイルから環境変数を読み込む
  const apiKey = process.env.GEMINI_API_KEY;

  try {
    // 単発の研究レポート生成
    const report = await generateResearchReport(
      apiKey,
      "gemini-1.5-flash",
      "自動運転車のセンサー技術の最新トレンドは何ですか？",
    );
    console.log("レポート本文:", report.report);
    console.log("検索クエリ:", report.searchQueries);
    console.log("引用情報:", report.citations);

    // または対話型研究アシスタントを開始
    const assistant = await interactiveResearchAssistant(
      apiKey,
      "gemini-1.5-flash",
      "宇宙開発における民間企業の役割について教えてください",
    );

    // 対話を継続する例
    const followUp = await assistant.chatSession.sendMessage(
      "SpaceXの最近の成果について詳しく教えてください",
    );
    console.log("フォローアップ回答:", followUp.response.text());
  } catch (error) {
    console.error("エラーが発生しました:", error);
  }
}

// run();
```

### 5.2 検討すべき技術的ポイント

1. **動的検索の閾値設定**
   - 動的検索（Dynamic Retrieval）の閾値を調整して、必要に応じた接地を制御
   - 閾値は0〜1の浮動小数点値で、高いほど検索されやすくなる（デフォルトは0.3）

2. **温度パラメータ（Temperature）**
   - 事実に基づくレポート生成には低い温度（0.0〜0.2）が推奨

3. **情報源の表示**
   - Grounding Google Searchを使用する場合、Google検索の提案表示が必須条件
   - 情報源を適切に表示する方法を実装する必要がある

4. **制限事項**
   - Grounding with Google SearchはGemini 1.5 Flashでのみ互換性がある点に注意
   - Gemini 2.0では、ツールとしての検索機能を使用する方法が推奨される

#### 5.3 @google/generative-aiライブラリの特徴

1. **公式ライブラリの利点**
   - Googleが提供する公式ライブラリで最新のAPI機能に対応
   - シンプルなインターフェースでGemini APIの機能にアクセス可能
   - チャットセッションの維持や対話型アプリケーションの構築が容易

2. **Grounding Google Searchの利用方法**
   - `tools` 配列に `googleSearchRetrieval` オブジェクトを含めることで有効化
   - `dynamicRetrievalConfig` を設定して検索の動作をカスタマイズ可能
   - `groundingMetadata` からの情報抽出により引用や情報源を適切に表示

3. **レスポンス処理**
   - `groundingMetadata` から検索クエリ、引用情報、信頼性スコアなどを取得可能
   - 引用情報は `startIndex` と `endIndex` で本文中の対応箇所を特定
   - 検索提案（`googleSearchQueries`）の表示は利用条件として必須

4. **セキュリティ設定**
   - `safetySettings` によりコンテンツの安全性をコントロール
   - 各種ハームカテゴリに対するしきい値を設定可能

## 6. 予算と費用

Grounding with Google Searchを使用したGemini
APIの利用には以下のコストが発生します：

- Google AI Studioで無料でテスト可能
- API利用時は有料プランが必要（1,000クエリあたり$35）
- 1日あたり100万クエリの上限あり

## 7. 実装例：DeepReによる実装方針

DeepReプロジェクトでGemini APIとGrounding Google Searchを活用したDeep
Research機能を実装する場合、以下の方針が考えられます：

1. **メインモジュール設計**
   - `src/gemini_research.ts`: Gemini APIとの通信を担当
   - `src/research_planner.ts`: 研究計画の生成と管理
   - `src/report_generator.ts`: 最終レポートの生成と整形

2. **インターフェース設計**
   - CLIインターフェース:
     `deno run -A src/main.ts research "研究テーマ" [オプション]`
   - レポート出力形式: マークダウン形式で出力し、引用と情報源を含める

3. **依存関係**
   - Google Cloud Vertex AI SDK（または直接REST API呼び出し）
   - 必要なDeno標準ライブラリ

## 8. 結論と次のステップ

Gemini APIとGrounding Google Searchを組み合わせることで、OpenAIのDeep
Researchに近い機能を持つ研究ツールの実装が可能です。この組み合わせにより、最新の情報を活用した包括的な調査レポートを自動生成できます。

### 次のステップ：

1. Gemini APIとGrounding Google Searchの動作検証
2. 基本的な研究計画生成機能の実装
3. 情報収集と反復的検索プロセスの実装
4. レポート生成と情報源表示機能の実装
5. ユーザーインターフェースの設計と実装

### 考慮事項：

- Grounding Google Searchの利用条件と制限を確認
- 情報源と検索提案の適切な表示方法を設計
- 反復的な情報収集プロセスを最適化するための戦略を検討

適切な設計と実装により、Gemini
APIの能力を最大限に活用し、高品質な研究支援ツールを構築することが可能です。
