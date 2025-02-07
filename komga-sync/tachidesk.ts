import { retry } from "@mr/retry";
import { MangaSchema } from "./models.ts";
import { envs } from "./env.ts";
import { join } from "@std/path";

export async function updateCovers(thumbnailUrl: string, mangaPath: string) {
  const mimeExtensionMap: Record<string, string> = {
    "image/png": "png",
    "image/gif": "gif",
    "image/bmp": "bmp",
    "image/webp": "webp",
    "image/tiff": "tiff",
    "image/svg+xml": "svg",
    "image/jpeg": "jpg",
  };

  for (const dir of Deno.readDirSync(mangaPath)) {
    if (dir.name.includes("cover")) {
      return;
    }
  }

  const tachideskUrlObj = new URL(envs.tachideskUrl);
  const thumbnailUrlAbs = tachideskUrlObj.origin + thumbnailUrl;

  const response = await fetch(thumbnailUrl);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${thumbnailUrlAbs}: ${response.statusText}`
    );
  }

  let fileExtension: string = "jpg";
  const contentType = response.headers.get("content-type");
  if (contentType) {
    fileExtension = mimeExtensionMap[contentType] || "jpg";
  }

  const filePath = join(mangaPath, "cover");

  const fileData = new Uint8Array(await response.arrayBuffer());
  await Deno.writeFile(filePath + "." + fileExtension, fileData);
}

export const getTachidesk = retry(
  async (title: string) => {
    type MangaSchemaGraphQL = {
      data: {
        mangas: {
          nodes: MangaSchema[];
        };
      };
    };
    const query = `
    query mangas($title: String) {
      mangas(filter: {title: {includesInsensitive:$title}, inLibrary: {equalTo: true}}) {
        nodes {
          title
          artist
          author
          description
          genre
          status
          thumbnailUrl
        }
      }
    }
  `;
    const data = {
      query,
      variables: {
        title,
      },
    };

    const res = await fetch(envs.tachideskUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const mangaData = (await res.json()) as MangaSchemaGraphQL;

    return mangaData.data.mangas.nodes.at(0);
  },
  { attempts: 20 }
);

export const getMangaChapterInfo = retry(
  async (title: string) => {
    type ChapterInfoGraphQL = {
      data: {
        mangas: {
          nodes: { downloadCount: number; chapters: { totalCount: number } }[];
        };
      };
    };
    const query = `
    query mangas($title: String) {
      mangas(filter: {title: {includesInsensitive:$title}, inLibrary: {equalTo: true}}) {
        nodes {
          downloadCount
          chapters {
            totalCount
          }
        }
      }
    }
  `;
    const data = {
      query,
      variables: {
        title,
      },
    };

    const res = await fetch(envs.tachideskUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const chapterData = (await res.json()) as ChapterInfoGraphQL;

    const pickedManga = chapterData.data.mangas.nodes.at(0);

    if (!pickedManga) {
      return;
    }

    return [pickedManga.downloadCount, pickedManga.chapters.totalCount];
  },
  { attempts: 20 }
);

export const getDownloadStatus = retry(
  async () => {
    type DownloadStatusGraphQL = {
      data: {
        downloadStatus: {
          state: "STOPPED" | "STARTED";
        };
      };
    };
    const query = `
    query AllCategories {
      downloadStatus {
        state
      }
    }
  `;
    const res = await fetch(envs.tachideskUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    const downloadStatus = (await res.json()) as DownloadStatusGraphQL;

    return downloadStatus.data.downloadStatus.state;
  },
  { attempts: 20 }
);
