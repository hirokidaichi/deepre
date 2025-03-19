// リダイレクト先のURLを取得するスクリプト

// 指定されたURLのリダイレクト先を1段階だけ追跡する
export async function revealRedirect(initialUrl: string): Promise<string> {
  try {
    const response = await fetch(initialUrl, {
      method: "HEAD",
      redirect: "manual",
    });

    const location = response.headers.get("Location");
    if (location) {
      return location;
    }
    return response.url;
  } catch (error) {
    console.error("エラーが発生しました:", error);
    return initialUrl; // エラー時は初期URLを返す
  }
}
