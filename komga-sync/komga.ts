import { envs } from "./env.ts";
import { retry } from "@mr/retry";
import { sleep } from "@117/sleep";
import { z } from "zod";
import { MangaSchema, StatusType } from "./models.ts";
import { getDownloadStatus } from "./tachidesk.ts";

const headers = {
  "Content-Type": "application/json",
  Authorization: "Basic " + btoa(`${envs.komgaUser}:${envs.komgaPass}`),
};

export const komgaLibraryScan = retry(
  async () => {
    const res = await fetch(`${envs.komgaUrl}/api/v1/libraries`, {
      method: "GET",
      headers,
    });

    const libraries = (await res.json()) as { id: string }[];
    libraries.forEach(async ({ id }) => {
      await fetch(`${envs.komgaUrl}/api/v1/libraries/${id}/scan`, {
        method: "POST",
        headers,
      });
    });
    await sleep(10000);
  },
  { attempts: 20 }
);

const searchForManga = retry(
  async (title: string) => {
    await komgaLibraryScan();
    const searchResponse = await fetch(`${envs.komgaUrl}/api/v1/series/list`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        fullTextSearch: title,
      }),
    });

    const searchZ = z.object({
      content: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
        })
      ),
    });

    const searchJson = await searchResponse.json();

    const searchRes = searchZ.parse(searchJson);

    const pickedManga = searchRes.content.at(0);
    if (!pickedManga) {
      if (envs.verbose) {
        console.log(title, "Not found");
      }

      throw Error();
    }
    return pickedManga;
  },
  { attempts: 20 }
);

export async function syncToKomga(manga: MangaSchema) {
  const mangaDetails = await searchForManga(manga.title);

  const statusMap: Map<StatusType, string> = new Map();
  statusMap.set("COMPLETED", "ENDED");
  statusMap.set("DROPPED", "ABANDONED");

  const body = JSON.stringify({
    title: manga.title,
    titleLock: true,
    summary: manga.description,
    summaryLock: true,
    status: statusMap.get(manga.status) ?? manga.status,
    genres: manga.genre,
    genresLock: true,
  });

  const res = await fetch(
    `${envs.komgaUrl}/api/v1/series/${mangaDetails.id}/metadata`,
    {
      method: "PATCH",
      headers,
      body,
    }
  );

  if (res.status === 204) {
    console.log("Added", manga.title, "details to komga");
  } else {
    console.log(res.statusText, manga.title);
  }
}

export async function chapterSync() {
  let timeToSleep = 60000; // 1 Minute

  while (true) {
    if ((await getDownloadStatus()) === "STARTED") {
      timeToSleep = 60000;
      await komgaLibraryScan();
      console.log("Library Scan");
    } else {
      timeToSleep = 120000;
    }

    await sleep(timeToSleep);
  }
}
