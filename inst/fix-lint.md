# Lint エラー修正手順書

## 目的

- TypeScriptコードの品質向上
- Denoの標準に準拠したコードの一貫性確保
- 型安全性の担保

## エラーチェックコマンド

### 1. 個別チェック

```bash
# Lintエラーの確認
deno task lint

# タイプチェックエラーの確認
deno task check

# コードフォーマットの確認
deno task fmt
```

### 2. 一括チェック

```bash
# lint、check、fmt、testを一括実行
deno task check-all
```

## コーディング規約

### 命名規則

- 変数・メソッド名: `camelCase`
  ```typescript
  const userName = "john";
  function calculateTotal() {}
  ```
- インターフェース/クラス名: `PascalCase`
  ```typescript
  interface UserProfile {}
  class DataManager {}
  ```
- 定数: `UPPER_SNAKE_CASE`
  ```typescript
  const MAX_RETRY_COUNT = 3;
  ```

### 型定義

- インターフェースを優先的に使用
  ```typescript
  // Good
  interface Config {
     timeout: number;
     retries: number;
  }

  // Avoid
  type Config = {
     timeout: number;
     retries: number;
  };
  ```

### 非同期処理

- `async/await`を使用
  ```typescript
  // Good
  async function fetchData() {
     try {
        const response = await fetch(url);
        return await response.json();
     } catch (error) {
        throw new Error(`データの取得に失敗: ${error.message}`);
     }
  }

  // Avoid
  function fetchData() {
     return fetch(url)
        .then((response) => response.json())
        .catch((error) => {
           throw new Error(`データの取得に失敗: ${error.message}`);
        });
  }
  ```

### エラーハンドリング

- 具体的なエラーメッセージを日本語で提供
- エラーの種類に応じて適切なエラークラスを使用
  ```typescript
  // Good
  try {
     await processFile(path);
  } catch (error) {
     if (error instanceof Deno.errors.NotFound) {
        throw new Error(`ファイルが見つかりません: ${path}`);
     }
     throw new Error(`ファイル処理中にエラーが発生: ${error.message}`);
  }
  ```

### ドキュメント

- JSDocを使用して関数とクラスを文書化
  ```typescript
  /**
   * ユーザーデータを処理します
   * @param userId - ユーザーID
   * @param options - 処理オプション
   * @returns 処理済みのユーザーデータ
   * @throws {Error} ユーザーが見つからない場合
   */
  async function processUser(
     userId: string,
     options: ProcessOptions,
  ): Promise<UserData> {
     // 実装
  }
  ```

## エラー修正の優先順位

1. 型エラー（`deno check`）
   - 型の不一致
   - 未定義の変数/関数
   - 必要なimportの不足

2. Lintエラー（`deno lint`）
   - 未使用の変数/import
   - コーディング規約違反
   - 潜在的なバグ

3. フォーマットエラー（`deno fmt`）
   - インデント
   - 空白
   - 改行

## 完了条件

- [ ] `deno task check-all`が成功
- [ ] すべてのファイルがDenoの標準フォーマットに準拠
- [ ] 型定義が適切に行われている
- [ ] エラーハンドリングが適切に実装されている
