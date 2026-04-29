import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const pageSize = 100;
const thumbWidth = 480;
const thumbHeight = 270;

function loadEnvFile(filePath = ".env.local") {
  if (!existsSync(filePath)) return;

  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] ??= value;
  }
}

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

async function fetchImageBytes(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (compatible; TotositeImageBackfill/1.0; +https://totosite.org)",
      accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`download failed with HTTP ${response.status}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function uploadThumbnail(supabase, bucket, siteId, bytes) {
  const thumbBytes = await sharp(bytes)
    .resize(thumbWidth, thumbHeight, {
      fit: "cover",
      withoutEnlargement: true,
    })
    .webp({ quality: 74 })
    .toBuffer();
  const filePath = `capture-thumbs/${siteId}-${randomUUID()}.webp`;
  const { error } = await supabase.storage.from(bucket).upload(filePath, thumbBytes, {
    contentType: "image/webp",
    upsert: false,
  });

  if (error) {
    throw new Error(`storage upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
}

async function main() {
  loadEnvFile();

  const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "site-screenshots";
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const force = process.argv.includes("--force");
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.replace("--limit=", "")) : Infinity;
  let offset = 0;
  let scanned = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  while (scanned < limit) {
    const to = offset + pageSize - 1;
    const { data, error } = await supabase
      .from("sites")
      .select("id,name,screenshot_url,screenshot_thumb_url")
      .not("screenshot_url", "is", null)
      .range(offset, to);

    if (error) {
      throw new Error(
        `Could not read sites. Confirm screenshot_thumb_url exists in Supabase. ${error.message}`,
      );
    }

    if (!data || data.length === 0) break;

    for (const site of data) {
      if (scanned >= limit) break;
      scanned += 1;

      if (!force && site.screenshot_thumb_url) {
        skipped += 1;
        continue;
      }

      try {
        const bytes = await fetchImageBytes(site.screenshot_url);
        const publicUrl = await uploadThumbnail(supabase, bucket, site.id, bytes);
        const { error: updateError } = await supabase
          .from("sites")
          .update({ screenshot_thumb_url: publicUrl })
          .eq("id", site.id);

        if (updateError) {
          throw new Error(`database update failed: ${updateError.message}`);
        }

        updated += 1;
        console.log(`updated ${site.name ?? site.id}`);
      } catch (error) {
        failed += 1;
        console.error(
          `failed ${site.name ?? site.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    offset += pageSize;
  }

  console.log(
    `done scanned=${scanned} updated=${updated} skipped=${skipped} failed=${failed}`,
  );

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
