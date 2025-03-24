# Lint エラー修正手順書

## 目的

- TypeScript コード内の lint
  エラーとタイプチェックエラーを修正し、コードの品質を向上させる
- Deno の標準に従ったコードの一貫性を確保する

## 手順

1. エラーの確認
   ```bash
   deno task lint      # lint エラーの確認
   deno task check     # タイプチェックエラーの確認
   ```

2. 修正の検証
   ```bash
   deno task check-all  # lint、check、fmt、test を一括実行
   ```

3. コードスタイルのガイドライン
   - TypeScript インターフェースを型定義に使用
   - 非同期コードには async/await を使用
   - エラーは try/catch ブロックで処理し、意味のあるエラーメッセージを提供
   - 変数とメソッドには camelCase、インターフェース/クラスには PascalCase を使用
   - JSDoc コメントでドキュメント化
   - Deno の標準フォーマットに従う
