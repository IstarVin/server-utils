import { basename, dirname } from "@std/path";
import { envs } from "./env.ts";
import { chapterSync, syncToKomga } from "./komga.ts";
import { getTachidesk, updateCovers } from "./tachidesk.ts";

async function syncTachideskKomga() {
  const mangasDirWatcher = Deno.watchFs(envs.mangasDir);

  console.log(`Watching`, envs.mangasDir);

  for await (const event of mangasDirWatcher) {
    if (event.kind === "create") {
      for (const path of event.paths) {
        if (basename(dirname(dirname(path))) === "mangas") {
          console.log(path, "added");

          const manga = basename(path);
          const mangaDetails = await getTachidesk(manga);

          if (!mangaDetails) {
            console.log("error getting tachidesk info", manga);
            continue;
          }

          await updateCovers(
            new URL(envs.tachideskUrl).origin + mangaDetails.thumbnailUrl,
            path,
          );

          await syncToKomga(mangaDetails);

          chapterSync.daemon();

          console.log("Synced", mangaDetails.title);
        }
      }
    }
  }
}

await syncTachideskKomga();
