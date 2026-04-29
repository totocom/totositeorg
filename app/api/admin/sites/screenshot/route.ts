import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";

export const runtime = "nodejs";

const maxImageBytes = 8 * 1024 * 1024;
const allowedImageTypes = new Set([
  "image/x-icon",
  "image/vnd.microsoft.icon",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function getSupabaseEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "site-screenshots";

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    throw new Error("Supabase 환경변수가 설정되지 않았습니다.");
  }

  return { supabaseUrl, supabaseAnonKey, serviceRoleKey, bucket };
}

async function getAdminUser(token: string) {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const { data: userResult, error: userError } = await supabase.auth.getUser(token);
  const email = userResult.user?.email;

  if (userError || !email) {
    return false;
  }

  const { data: adminRow, error: adminError } = await supabase
    .from("admin_users")
    .select("id")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  return !adminError && Boolean(adminRow);
}

function getExtension(contentType: string) {
  if (contentType === "image/x-icon") return "ico";
  if (contentType === "image/vnd.microsoft.icon") return "ico";
  return "webp";
}

function isIconType(contentType: string) {
  return contentType === "image/x-icon" || contentType === "image/vnd.microsoft.icon";
}

async function getUploadImage(file: File) {
  const imageBytes = Buffer.from(await file.arrayBuffer());

  if (isIconType(file.type)) {
    return {
      bytes: imageBytes,
      contentType: file.type,
    };
  }

  return {
    bytes: await sharp(imageBytes).webp({ quality: 82 }).toBuffer(),
    contentType: "image/webp",
  };
}

async function uploadImage(
  supabase: SupabaseClient,
  bucket: string,
  filePath: string,
  bytes: Uint8Array | Buffer,
  contentType: string,
) {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(filePath, bytes, {
      contentType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Supabase Storage 업로드 실패: ${error.message}`);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!token || !(await getAdminUser(token))) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "업로드할 이미지 파일을 선택해주세요." },
      { status: 400 },
    );
  }

  if (!allowedImageTypes.has(file.type)) {
    return NextResponse.json(
      { error: "PNG, JPG, WEBP 이미지만 업로드할 수 있습니다." },
      { status: 400 },
    );
  }

  if (file.size > maxImageBytes) {
    return NextResponse.json(
      { error: "이미지는 8MB 이하로 업로드해주세요." },
      { status: 400 },
    );
  }

  try {
    const { supabaseUrl, serviceRoleKey, bucket } = getSupabaseEnv();
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const extension = getExtension(file.type);
    const filePath = `manual/${randomUUID()}.${extension}`;
    const uploadImageData = await getUploadImage(file);
    const screenshotUrl = await uploadImage(
      supabase,
      bucket,
      filePath,
      uploadImageData.bytes,
      uploadImageData.contentType,
    );
    const screenshotThumbUrl = isIconType(file.type)
      ? screenshotUrl
      : await uploadImage(
          supabase,
          bucket,
          `manual-thumbs/${randomUUID()}.webp`,
          await sharp(uploadImageData.bytes)
            .resize(480, 270, {
              fit: "cover",
              withoutEnlargement: true,
            })
            .webp({ quality: 74 })
            .toBuffer(),
          "image/webp",
        );

    return NextResponse.json({
      ok: true,
      screenshotUrl,
      screenshotThumbUrl,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "이미지 업로드 중 문제가 발생했습니다.",
      },
      { status: 400 },
    );
  }
}
