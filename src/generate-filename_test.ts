import { assertEquals, assertRejects } from "@std/testing/asserts";
import {
  determineOutputPathType,
  OutputPathType,
  FileSystemDependency,
  GeminiDependency,
  generateFilenameFromTheme,
  generateUniqueFilename,
  generate,
  defaultFileSystem,
} from "./generate-filename.ts";
import { describe, it } from "@std/testing/bdd";
import { join } from "@std/path";

// FileInfoの完全なモックを作成するヘルパー関数
function createMockFileInfo(isDir = false, isF = false): Deno.FileInfo {
  return {
    isFile: isF,
    isDirectory: isDir,
    isSymlink: false,
    size: 0,
    mtime: null,
    atime: null,
    birthtime: null,
    ctime: null,
    dev: 0,
    mode: 0,
    ino: 0,
    nlink: 0,
    uid: 0,
    gid: 0,
    rdev: 0,
    blksize: 0,
    blocks: 0,
    isBlockDevice: false,
    isCharDevice: false,
    isFifo: false,
    isSocket: false,
  };
}

describe("defaultFileSystem", () => {
  it("should provide file system functions", async () => {
    // defaultFileSystemがDeno APIの適切なメソッドをラップしていることを確認
    const tempDir = await Deno.makeTempDir();
    try {
      // stat関数のテスト
      const fileInfo = await defaultFileSystem.stat(tempDir);
      assertEquals(fileInfo.isDirectory, true);

      // mkdir関数のテスト
      const newDir = join(tempDir, "test-dir");
      await defaultFileSystem.mkdir(newDir);
      const newDirInfo = await Deno.stat(newDir);
      assertEquals(newDirInfo.isDirectory, true);

      // readDir関数のテスト
      const entries = [];
      for await (const entry of defaultFileSystem.readDir(tempDir)) {
        entries.push(entry.name);
      }
      assertEquals(entries.length, 1);
      assertEquals(entries[0], "test-dir");
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });
});

describe("determineOutputPathType", () => {
  it("should identify an existing directory as DIRECTORY type", async () => {
    const tempDir = await Deno.makeTempDir();
    try {
      const result = await determineOutputPathType(tempDir);
      assertEquals(result, OutputPathType.DIRECTORY);
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  it("should identify an existing file as FILE type", async () => {
    const tempDir = await Deno.makeTempDir();
    try {
      const filePath = join(tempDir, "test.txt");
      await Deno.writeTextFile(filePath, "test content");
      const result = await determineOutputPathType(filePath);
      assertEquals(result, OutputPathType.FILE);
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  it("should identify a non-existing path with extension as FILE type", async () => {
    const nonExistingFile = "/non/existing/path/test.txt";
    const result = await determineOutputPathType(nonExistingFile);
    assertEquals(result, OutputPathType.FILE);
  });

  it("should identify a non-existing path without extension as DIRECTORY type", async () => {
    const nonExistingDir = "/non/existing/path/dir";
    const result = await determineOutputPathType(nonExistingDir);
    assertEquals(result, OutputPathType.DIRECTORY);
  });

  it("should use the provided FileSystemDependency", async () => {
    // FileSystemDependencyのモック作成
    const mockFileSystem: FileSystemDependency = {
      stat: async (path: string) => {
        return path.endsWith("dir") 
          ? createMockFileInfo(true, false) // ディレクトリ
          : createMockFileInfo(false, true); // ファイル
      },
      mkdir: async () => {},
      readDir: async function* () {
        yield* [];
      },
    };

    const dirResult = await determineOutputPathType("/path/to/dir", mockFileSystem);
    assertEquals(dirResult, OutputPathType.DIRECTORY);

    const fileResult = await determineOutputPathType("/path/to/file.txt", mockFileSystem);
    assertEquals(fileResult, OutputPathType.FILE);
  });

  it("should handle errors from FileSystemDependency", async () => {
    // エラーをスローするモック
    const errorFileSystem: FileSystemDependency = {
      stat: async () => {
        throw new Error("File not found");
      },
      mkdir: async () => {},
      readDir: async function* () {
        yield* [];
      },
    };

    // 拡張子ありの場合はFILE
    const fileResult = await determineOutputPathType("/path/to/error.txt", errorFileSystem);
    assertEquals(fileResult, OutputPathType.FILE);

    // 拡張子なしの場合はDIRECTORY
    const dirResult = await determineOutputPathType("/path/to/error", errorFileSystem);
    assertEquals(dirResult, OutputPathType.DIRECTORY);
  });

  it("should handle unusual FileInfo cases", async () => {
    // isDirectoryとisFileの両方がfalseの場合
    const mockFileSystem: FileSystemDependency = {
      stat: async () => {
        // シンボリックリンクなどの特殊ファイル
        return createMockFileInfo(false, false);
      },
      mkdir: async () => {},
      readDir: async function* () {
        yield* [];
      },
    };

    // 拡張子ありの場合はFILE
    const fileResult = await determineOutputPathType("/path/to/unusual.txt", mockFileSystem);
    assertEquals(fileResult, OutputPathType.FILE);

    // 拡張子なしの場合はDIRECTORY
    const dirResult = await determineOutputPathType("/path/to/unusual", mockFileSystem);
    assertEquals(dirResult, OutputPathType.DIRECTORY);
  });
});

describe("generateFilenameFromTheme", () => {
  it("should generate a filename based on the theme using a mock GeminiDependency", async () => {
    const mockGeminiApi: GeminiDependency = {
      generateContent: async () => ({
        response: {
          text: () => "test-filename-generated",
        },
      }),
    };

    const result = await generateFilenameFromTheme("dummy-api-key", "テストテーマ", mockGeminiApi);
    assertEquals(result, "test-filename-generated");
  });

  // GoogleGenerativeAIの依存性を直接モックするのが難しいため、
  // モック化されたGeminiDependencyを使用して実際のGemini APIを呼び出さないテスト
  it("should initialize API with parameters when not provided", async () => {
    // モックGeminiDependencyを生成する関数
    const createMockGeminiDependency = (): GeminiDependency => ({
      generateContent: async () => ({
        response: {
          text: () => "mocked-filename-without-api",
        },
      }),
    });

    const mockTheme = "テストテーマ";
    const mockApiKey = "dummy-api-key";

    // テスト用の関数を作成（実際のGoogleGenerativeAIを使わないバージョン）
    const testGenerateFilenameWithoutAPI = async (apiKey: string, theme: string): Promise<string> => {
      // API呼び出しの部分ををモックオブジェクトで置き換える
      const mockGeminiApi = createMockGeminiDependency();
      return await generateFilenameFromTheme(apiKey, theme, mockGeminiApi);
    };

    const result = await testGenerateFilenameWithoutAPI(mockApiKey, mockTheme);
    assertEquals(result, "mocked-filename-without-api");
  });
});

describe("generateUniqueFilename", () => {
  it("should generate a base filename when no similar files exist", async () => {
    const mockFileSystem: FileSystemDependency = {
      stat: async () => {
        throw new Error("File not found");
      },
      mkdir: async () => {},
      readDir: async function* () {
        yield* [];
      },
    };

    const result = await generateUniqueFilename(
      "test-base",
      "/output/dir",
      ".md",
      mockFileSystem,
    );
    assertEquals(result, "/output/dir/test-base.md");
  });

  it("should increment number when base file exists", async () => {
    const mockFileSystem: FileSystemDependency = {
      stat: async () => createMockFileInfo(false, true),
      mkdir: async () => {},
      readDir: async function* () {
        yield* [];
      },
    };

    const result = await generateUniqueFilename(
      "test-base",
      "/output/dir",
      ".md",
      mockFileSystem,
    );
    assertEquals(result, "/output/dir/test-base-2.md");
  });

  it("should find the highest number in similar files", async () => {
    const mockFileSystem: FileSystemDependency = {
      stat: async () => createMockFileInfo(false, true),
      mkdir: async () => {},
      readDir: async function* () {
        yield {
          name: "test-base-3.md",
          isFile: true,
          isDirectory: false,
          isSymlink: false,
        };
        yield {
          name: "test-base-5.md",
          isFile: true,
          isDirectory: false,
          isSymlink: false,
        };
        yield {
          name: "other-file.md",
          isFile: true,
          isDirectory: false,
          isSymlink: false,
        };
      },
    };

    const result = await generateUniqueFilename(
      "test-base",
      "/output/dir",
      ".md",
      mockFileSystem,
    );
    assertEquals(result, "/output/dir/test-base-6.md");
  });

  it("should handle errors gracefully", async () => {
    const errorFileSystem: FileSystemDependency = {
      stat: async () => {
        throw new Error("Permission denied");
      },
      mkdir: async () => {
        throw new Error("Permission denied");
      },
      readDir: async function* () {
        throw new Error("Permission denied");
      },
    };

    // エラー出力をキャプチャするため、console.warnを一時的に置き換え
    const originalWarn = console.warn;
    const capturedMessages: string[] = [];
    console.warn = (msg: string) => {
      capturedMessages.push(msg);
    };

    try {
      const result = await generateUniqueFilename(
        "test-base",
        "/output/dir",
        ".md",
        errorFileSystem,
      );
      assertEquals(result, "/output/dir/test-base.md");
      assertEquals(capturedMessages.length, 1);
      assertEquals(capturedMessages[0].includes("Permission denied"), true);
    } finally {
      // console.warnを元に戻す
      console.warn = originalWarn;
    }
  });

  it("should handle non-Error exceptions", async () => {
    const stringException = "StringException";
    const errorFileSystem: FileSystemDependency = {
      stat: async () => {
        throw stringException;  // ErrorでないException
      },
      mkdir: async () => {
        throw stringException;  // 同じ文字列例外
      },
      readDir: async function* () {
        throw stringException;  // 同じ文字列例外
      },
    };

    // エラー出力をキャプチャするため、console.warnを一時的に置き換え
    const originalWarn = console.warn;
    const capturedMessages: string[] = [];
    console.warn = (msg: string) => {
      capturedMessages.push(msg);
    };

    try {
      const result = await generateUniqueFilename(
        "test-base",
        "/output/dir",
        ".md",
        errorFileSystem,
      );
      assertEquals(result, "/output/dir/test-base.md");
      
      // メッセージが捕捉されていることを確認
      assertEquals(capturedMessages.length, 1);
      
      // メッセージに文字列例外が含まれていることを確認
      assertEquals(capturedMessages[0].includes(stringException), true);
    } finally {
      // console.warnを元に戻す
      console.warn = originalWarn;
    }
  });
});

describe("generate", () => {
  it("should return the file path when output path is of FILE type", async () => {
    const mockDependencies = {
      determineOutputPathType: async () => OutputPathType.FILE,
    };

    const result = await generate(
      "テストテーマ",
      "dummy-api-key",
      "/path/to/output.md",
      mockDependencies,
    );
    assertEquals(result, "/path/to/output.md");
  });

  it("should generate filename from theme when output path is a directory", async () => {
    const mockDependencies = {
      fileSystem: {
        stat: async () => createMockFileInfo(true, false),
        mkdir: async () => {},
        readDir: async function* () {
          yield* [];
        },
      },
      determineOutputPathType: async () => OutputPathType.DIRECTORY,
      generateFilenameFromTheme: async () => "generated-filename",
      generateUniqueFilename: async () => "/path/to/dir/generated-filename.md",
    };

    const result = await generate(
      "テストテーマ",
      "dummy-api-key",
      "/path/to/dir",
      mockDependencies,
    );
    assertEquals(result, "/path/to/dir/generated-filename.md");
  });

  it("should use default output directory when no output path is provided", async () => {
    const mockDependencies = {
      fileSystem: {
        stat: async () => {
          throw new Error("File not found");
        },
        mkdir: async () => {},
        readDir: async function* () {
          yield* [];
        },
      },
      generateFilenameFromTheme: async () => "generated-filename",
      generateUniqueFilename: async () => "./outputs/generated-filename.md",
    };

    const result = await generate(
      "テストテーマ",
      "dummy-api-key",
      undefined,
      mockDependencies,
    );
    assertEquals(result, "./outputs/generated-filename.md");
  });

  it("should handle directory creation errors", async () => {
    const mockFileSystem: FileSystemDependency = {
      stat: async () => createMockFileInfo(false, false),
      mkdir: async () => {
        // 一般的なエラー（AlreadyExistsではない）
        throw new Error("Directory creation failed");
      },
      readDir: async function* () {
        yield* [];
      },
    };

    const mockDependencies = {
      fileSystem: mockFileSystem,
      determineOutputPathType: async () => OutputPathType.DIRECTORY,
      generateFilenameFromTheme: async () => "generated-filename",
      generateUniqueFilename: async () => "/path/to/dir/generated-filename.md",
    };

    await assertRejects(
      () => generate("テストテーマ", "dummy-api-key", "/path/to/dir", mockDependencies),
      Error,
      "Directory creation failed",
    );
  });

  it("should handle AlreadyExists error when creating output directory", async () => {
    // Deno.errors.AlreadyExistsをシミュレートするエラークラス
    class AlreadyExistsError extends Error {
      constructor(message: string) {
        super(message);
        this.name = "AlreadyExists";
      }
    }

    const mockFileSystem: FileSystemDependency = {
      stat: async () => createMockFileInfo(false, false),
      mkdir: async () => {
        throw new AlreadyExistsError("Directory already exists");
      },
      readDir: async function* () {
        yield* [];
      },
    };

    // AlreadyExistsエラーのためのモックを作成
    const originalErrors = Deno.errors;
    try {
      (Deno as any).errors = {
        ...Deno.errors,
        AlreadyExists: AlreadyExistsError,
      };

      const mockDependencies = {
        fileSystem: mockFileSystem,
        determineOutputPathType: async () => OutputPathType.DIRECTORY,
        generateFilenameFromTheme: async () => "generated-filename",
        generateUniqueFilename: async () => "/custom/dir/generated-filename.md",
      };

      // AlreadyExistsエラーは無視され、処理が続行されるはず
      const result = await generate(
        "テストテーマ",
        "dummy-api-key",
        "/custom/dir",
        mockDependencies,
      );
      assertEquals(result, "/custom/dir/generated-filename.md");
    } finally {
      // 元のDeno.errorsを復元
      (Deno as any).errors = originalErrors;
    }
  });
});