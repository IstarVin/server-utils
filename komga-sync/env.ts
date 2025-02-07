import "@std/dotenv/load";

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
}
if (isInvalidEnv) {
  Deno.exit(1);
}
