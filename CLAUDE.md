# Deepre CLI プロジェクトガイドライン

## ビルド・リント・テストコマンド

- `deno task lint` - リント実行
- `deno task check` - 型チェック実行
- `deno task fmt` - コード整形
- `deno task test` - 全テスト実行
- `deno task test src/formatter.test.ts` - 単一テスト実行
- `deno task check-all` - 全チェック（lint, check, fmt, test）
- `deno task deepre` - アプリケーション実行

## コードスタイルガイドライン

1. **インポートルール**:
   - 外部依存関係は `src/deps.ts`、テスト用依存関係は `src/deps_test.ts` に集約
   - プロジェクト内は相対パスでインポート
   - JSRパッケージは `jsr:@package/name@^version` 形式で指定

2. **型定義**:
   - 共通型は `src/types.ts`、モジュール固有型はモジュール内に定義
   - インターフェース、Enum積極活用

3. **命名規則**:
   - クラス/インターフェース/型: PascalCase
   - 変数/関数/メソッド: camelCase
   - ファイル名: kebab-case、テストは `.test.ts` サフィックス

4. **エラー処理**:
   - 日本語エラーメッセージ
   - try/catch で適切にエラーをハンドリング

5. **コメント**:
   - 日本語コメント
   - JSDocスタイル推奨
   - インデントはスペース2文字
