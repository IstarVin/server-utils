import "@std/dotenv/load";

async function checkUrl(url: string) {
  const res = await fetch(url);

  return res.status;
}

export const envs = {
  tachideskUrl: Deno.env.get("TACHIDESK_GRAPHQL_URL") ?? "",
  komgaUrl: Deno.env.get("KOMGA_URL") ?? "",
  komgaUser: Deno.env.get("KOMGA_USER") ?? "",
  komgaPass: Deno.env.get("KOMGA_PASS") ?? "",
  mangasDir: Deno.env.get("MANGAS_DIR") ?? "",
  verbose: Deno.env.get("VERBOSE") === "true",
};

let isInvalidEnv = false;
for (const [key, value] of Object.entries(envs)) {
  if (!value && key !== "verbose") {
    console.log(`${key} is required`);
    isInvalidEnv = true;
  }
  if (key.includes("URL") && typeof value === "string") {
    if (!(await checkUrl(value))) {
      console.log(value, "cannot be accessed");

      isInvalidEnv = true;
    }
  }
}

if (isInvalidEnv) {
  Deno.exit(1);
}
