import { revealRedirect } from "./reveal-redirect.ts";
import type { GroundingMetadata, GroundingSupport } from "./types.ts";

// 型を再エクスポート
export type { GroundingMetadata, GroundingSupport };

/**
 * グラウンディング情報を使用してレポートを加工するクラス
 */
export class GroundingProcessor {
  protected report: string;
  protected metadata: GroundingMetadata;

  constructor(report: string, metadata: GroundingMetadata) {
    this.report = report;
    this.metadata = metadata;
  }

  /**
   * レポートを処理し、リンクと参考文献を追加
   */
  async processReport(): Promise<string> {
    // 有効なチャンクとサポート情報がない場合は元のレポートを返す
    if (!this.hasValidGrounding()) {
      console.log("[WARNING] 有効なグラウンディング情報がありません");
      return this.report;
    }

    try {
      // リンクを収集（リダイレクト解決あり）
      const references = await this.collectReferences();

      // 参考文献の追加
      const finalReport = this.addReferences(this.report, references);

      return finalReport;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      console.error(
        `[ERROR] グラウンディング処理中にエラーが発生しました: ${errorMessage}`,
      );
      // エラーが発生した場合でも元のレポートを返す
      return this.report;
    }
  }

  /**
   * 有効なグラウンディング情報があるかチェック
   */
  protected hasValidGrounding(): boolean {
    return (
      this.metadata.groundingChunks?.length > 0 &&
      this.metadata.groundingSupports?.length > 0
    );
  }

  /**
   * 参考文献情報を収集
   */
  protected async collectReferences(): Promise<
    Map<string, { url: string; title: string }>
  > {
    const references = new Map<string, { url: string; title: string }>();

    for (const support of this.metadata.groundingSupports || []) {
      if (!support.segment || !support.groundingChunkIndices?.length) {
        continue;
      }

      // 最も信頼度の高いチャンクを特定
      const bestChunkIndex = this.findBestChunkIndex(support);
      if (bestChunkIndex === -1) {
        continue;
      }

      const chunk = this.metadata.groundingChunks[bestChunkIndex];
      if (!chunk.web?.uri) {
        continue;
      }

      const originalUrl = chunk.web.uri;
      if (!references.has(originalUrl)) {
        try {
          const resolvedUrl = await revealRedirect(originalUrl);
          references.set(originalUrl, {
            url: resolvedUrl,
            title: chunk.web.title || "参考文献",
          });
          console.log(
            `[INFO] リンクを解決しました: ${originalUrl} -> ${resolvedUrl}`,
          );
        } catch (error: unknown) {
          const errorMessage = error instanceof Error
            ? error.message
            : String(error);
          console.error(
            `[ERROR] リンク解決に失敗しました (${originalUrl}): ${errorMessage}`,
          );
          // リンク解決に失敗しても元のURLを使用
          references.set(originalUrl, {
            url: originalUrl,
            title: chunk.web.title || "参考文献",
          });
        }
      }
    }

    console.log(`[INFO] ${references.size}個の参考文献を収集しました`);
    return references;
  }

  /**
   * 最も信頼度の高いチャンクのインデックスを取得
   */
  protected findBestChunkIndex(support: GroundingSupport): number {
    if (!support.groundingChunkIndices?.length) {
      return -1;
    }

    // 信頼度スコアがある場合はそれを使用
    if (support.confidenceScores?.length) {
      let bestIndex = support.groundingChunkIndices[0];
      let bestScore = support.confidenceScores[0] || 0;

      for (let i = 1; i < support.groundingChunkIndices.length; i++) {
        const score = support.confidenceScores[i] || 0;
        if (score > bestScore) {
          bestScore = score;
          bestIndex = support.groundingChunkIndices[i];
        }
      }

      return bestIndex;
    }

    // 信頼度スコアがない場合は最初のチャンクインデックスを返す
    return support.groundingChunkIndices[0];
  }

  /**
   * 参考文献セクションを追加
   */
  protected addReferences(
    content: string,
    references: Map<string, { url: string; title: string }>,
  ): string {
    if (references.size === 0) {
      return content;
    }

    let referencesSection = "\n\n## 参考文献\n\n";
    let index = 1;

    for (const [_, ref] of references) {
      referencesSection += `${index}. ${ref.title}: ${ref.url}\n`;
      index++;
    }

    return content + referencesSection;
  }
}

export interface GroundingReportInput {
  report: string;
  metadata: GroundingMetadata;
}

export class GroundingReport {
  private report: string;
  private metadata: GroundingMetadata;

  constructor(input: GroundingReportInput) {
    this.report = input.report;
    this.metadata = input.metadata;
  }

  /**
   * レポートがGroundingを持っているかどうかを判定します
   * 信頼性スコアが0.5以上の場合にGroundingありと判定します
   */
  hasGrounding(): boolean {
    const score = this.getGroundingScore();
    return score >= 0.5;
  }

  /**
   * Groundingの信頼性スコアを計算します
   * 全てのGroundingSupportsのconfidenceScoresの平均値を返します
   */
  getGroundingScore(): number {
    const scores = (this.metadata.groundingSupports || []).flatMap(
      (support) => support.confidenceScores ?? [],
    );
    if (scores.length === 0) return 0;
    return scores.reduce((a, b) => (a ?? 0) + (b ?? 0), 0) / scores.length;
  }

  /**
   * Groundingで参照されているURLのリストを返します
   */
  getGroundingUrls(): string[] {
    return (this.metadata.groundingChunks || [])
      .map((chunk) => chunk.web?.uri)
      .filter((uri): uri is string => uri !== undefined);
  }
}
