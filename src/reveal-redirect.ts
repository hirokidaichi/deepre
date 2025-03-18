// リダイレクト先のURLを取得するスクリプト

// 指定されたURLのリダイレクト先を追跡し、最終的なURLを表示する
export async function revealRedirect(initialUrl: string): Promise<string> {
  try {
    console.log(`初期URL: ${initialUrl}`);
    let response = await fetch(initialUrl, {
      method: "HEAD",
      redirect: "manual",
    });
    let location = response.headers.get("Location");

    while (location) {
      console.log(`リダイレクト: ${location}`);
      response = await fetch(location, { method: "HEAD", redirect: "manual" });
      location = response.headers.get("Location");
    }

    console.log(`最終URL: ${response.url}`);
    return response.url;
  } catch (error) {
    console.error("エラーが発生しました:", error);
    return initialUrl; // エラー時は初期URLを返す
  }
}
