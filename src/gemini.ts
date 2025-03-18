// Gemini APIを利用するためのモジュール
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Response } from "./citations.ts";

// Gemini API設定用インターフェース
export interface GenerationConfig {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
}

export interface Result {
  response: Response;
}

// Geminiクライアントを生成するファクトリー関数
export function createGeminiClient(
  apiKey: string,
  model = "gemini-2.0-flash",
) {
  const genAI = new GoogleGenerativeAI(apiKey);

  // 通常のGeminiモデルの作成
  const createModel = () =>
    genAI.getGenerativeModel({
      model: model,
      generationConfig: {
        temperature: 0.2,
        topP: 0.7,
        topK: 40,
        maxOutputTokens: 8192,
      },
    });

  // 計画生成用の低温度モデルの作成
  const createPlanModel = () =>
    genAI.getGenerativeModel({
      model: model,
      generationConfig: {
        temperature: 0.0, // 決定論的な出力
        topP: 0.95,
        topK: 1,
        maxOutputTokens: 4096,
      },
    });

  // 検索機能付きモデルの作成
  const createResearchModel = () => {
    // @ts-ignore Gemini 2.0の検索機能は型定義が追いついていない
    return genAI.getGenerativeModel({
      model: model,
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
  };

  return {
    createModel,
    createPlanModel,
    createResearchModel,
  };
}
