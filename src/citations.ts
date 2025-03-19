import { revealRedirect } from "./reveal-redirect.ts";
import type { Citation, Response } from "./types.ts";
import { Throttler } from "./utils/throttle.ts";

/**
 * 引用情報を管理するクラス
 */
export class CitationManager {
  private citations: Citation[];
  private static throttler = new Throttler(10, 100); // 最大10並列、100ミリ秒間隔

  constructor(citations: Citation[] = []) {
    this.citations = [...citations]; // 不変性を保証するためにコピーを作成
  }

  /**
   * 新しい引用情報を追加
   */
  add(citation: Citation): CitationManager {
    return new CitationManager([...this.citations, citation]);
  }

  /**
   * 複数の引用情報を追加
   */
  addAll(newCitations: Citation[]): CitationManager {
    return new CitationManager([...this.citations, ...newCitations]);
  }

  /**
   * 重複する引用情報を削除
   */
  deduplicate(): CitationManager {
    const uniqueCitations = this.citations.filter((citation, index, self) =>
      self.findIndex((c) => c.uri === citation.uri) === index
    );
    return new CitationManager(uniqueCitations);
  }

  /**
   * 引用情報の配列を取得
   */
  getCitations(): Citation[] {
    return [...this.citations]; // 不変性を保証するためにコピーを返す
  }

  /**
   * インデックスベースの引用情報のみを取得
   */
  getIndexBasedCitations(): Citation[] {
    return this.citations.filter(
      (citation) =>
        typeof citation.startIndex === "number" &&
        typeof citation.endIndex === "number",
    );
  }

  /**
   * レポートに引用情報を追加
   */
  async addCitationsToReport(report: string): Promise<string> {
    if (this.citations.length === 0) {
      console.log(
        `[WARNING] 引用情報がありません。レポートをそのまま返します。`,
      );
      return report;
    }

    console.log(`[INFO] 引用情報の処理を開始: ${this.citations.length}件`);

    // 重複を除去した引用情報を取得
    const uniqueCitations = this.deduplicate().getCitations();
    console.log(`[INFO] 重複除去後の引用情報: ${uniqueCitations.length}件`);

    // 引用情報を記録するための配列
    const processedCitations: Citation[] = [];

    // 既存の [n] パターンを検出（Geminiが生成した引用番号）
    const citationPattern = /\[(\d+)\]/g;
    const matches = Array.from(report.matchAll(citationPattern));

    if (matches.length > 0) {
      console.log(`[INFO] レポート内で検出された引用番号: ${matches.length}件`);

      // 最大の引用番号を特定
      const maxNum = Math.max(...matches.map((m) => parseInt(m[1], 10)));

      // 使用された引用番号とCitationオブジェクトを対応付ける
      for (let i = 1; i <= maxNum && i <= uniqueCitations.length; i++) {
        processedCitations.push(uniqueCitations[i - 1]);
      }
    }

    // インデックスベースの引用を処理
    const indexBasedCitations = this.getIndexBasedCitations();
    if (indexBasedCitations.length > 0) {
      console.log(
        `[INFO] インデックスベースの引用: ${indexBasedCitations.length}件`,
      );

      // まだ処理されていない引用情報を追加
      for (const citation of indexBasedCitations) {
        if (!processedCitations.some((pc) => pc.uri === citation.uri)) {
          processedCitations.push(citation);
        }
      }
    }

    // まだ処理されていない引用情報を追加
    for (const citation of uniqueCitations) {
      if (!processedCitations.some((pc) => pc.uri === citation.uri)) {
        processedCitations.push(citation);
      }
    }

    // 参考文献リストを追加
    let result = report;
    if (processedCitations.length > 0) {
      result += "\n\n## 参考文献\n\n";

      // リダイレクト先のURLを並行して取得（スロットリング付き）
      const tasks = processedCitations.map((citation) => () =>
        citation.uri ? revealRedirect(citation.uri) : Promise.resolve("")
      );
      const finalUrls = await CitationManager.throttler.all(tasks);

      processedCitations.forEach((citation, index) => {
        result += `[${index + 1}] ${citation.title || "参考文献"}: ${
          finalUrls[index] || citation.uri
        }\n`;
      });
    }

    return result;
  }

  /**
   * レスポンスから引用情報を抽出して新しいCitationManagerを作成
   */
  static fromResponse(response: unknown): CitationManager {
    try {
      return CitationManager.fromGroundingMetadata(response as Response);
    } catch (error) {
      console.error("[ERROR] 引用情報の抽出中にエラーが発生しました:", error);
      return new CitationManager();
    }
  }

  /**
   * groundingMetadataから引用情報を抽出して新しいCitationManagerを作成
   */
  private static fromGroundingMetadata(response: Response): CitationManager {
    const citations: Citation[] = [];

    // レスポンスやcandidatesがない場合は空のマネージャーを返す
    if (!response?.candidates?.[0]?.groundingMetadata) {
      return new CitationManager();
    }

    try {
      const groundingMetadata = response.candidates[0].groundingMetadata;
      const chunks = groundingMetadata.groundingChunks || [];
      const supports = groundingMetadata.groundingSupports || [];

      // chunkがない、またはsupportsがない場合は空のマネージャーを返す
      if (chunks.length === 0 || supports.length === 0) {
        return new CitationManager();
      }
      console.log(JSON.stringify(groundingMetadata, null, 2));

      // groundingChunksからURLとタイトルの情報を取得
      const urlMap = new Map<number, { uri: string; title: string }>();
      for (let i = 0; i < chunks.length; i++) {
        const uri = chunks[i].web?.uri;
        if (uri) {
          urlMap.set(i, {
            uri,
            title: chunks[i].web?.title || "不明なタイトル",
          });
        }
      }

      // groundingSupportsからテキストの範囲情報を取得し、対応するURLと組み合わせる
      for (const support of supports) {
        if (!support.segment || !support.groundingChunkIndices) continue;

        // 最も信頼度の高いチャンクインデックスとその信頼度を特定
        let bestChunkIndex = -1;
        let bestConfidence = -1;

        for (let i = 0; i < support.groundingChunkIndices.length; i++) {
          const chunkIndex = support.groundingChunkIndices[i];
          const confidence = support.confidenceScores?.[i] || 0;

          if (confidence > bestConfidence && urlMap.has(chunkIndex)) {
            bestChunkIndex = chunkIndex;
            bestConfidence = confidence;
          }
        }

        // 有効なチャンクがない場合はスキップ
        if (bestChunkIndex < 0 || !urlMap.has(bestChunkIndex)) continue;

        // 引用情報を作成
        const urlInfo = urlMap.get(bestChunkIndex)!;
        const startIndex = support.segment.startIndex;
        const endIndex = support.segment.endIndex;

        if (typeof startIndex === "number" && typeof endIndex === "number") {
          citations.push({
            uri: urlInfo.uri,
            title: urlInfo.title,
            startIndex,
            endIndex,
          });
        }
      }

      if (citations.length > 0) {
        console.log(`[INFO] ${citations.length}件の引用情報を抽出しました`);
      }
    } catch (error) {
      console.error("[ERROR] 引用情報抽出中にエラーが発生しました:", error);
    }

    return new CitationManager(citations);
  }
}

// 型定義を再エクスポート
export type { Citation, Response } from "./types.ts";
