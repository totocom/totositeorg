"use client";

import {
  type ChangeEvent,
  type ClipboardEvent,
  type DragEvent,
  useRef,
  useState,
} from "react";
import { supabase } from "@/lib/supabase/client";

type ScreenshotUploadControlProps = {
  value: string;
  onChange: (url: string) => void;
  onMessage?: (message: string) => void;
  onError?: (message: string) => void;
  accept?: string;
  buttonLabel?: string;
  description?: string;
  placeholder?: string;
  successMessage?: string;
};

function getImageFile(files: FileList | File[]) {
  return Array.from(files).find((file) => file.type.startsWith("image/")) ?? null;
}

export function ScreenshotUploadControl({
  value,
  onChange,
  onMessage,
  onError,
  accept = "image/png,image/jpeg,image/webp",
  buttonLabel = "이미지 업로드",
  description = "캡처가 막힌 경우 이미지 파일을 선택하거나, 이 영역을 클릭한 뒤 클립보드 이미지를 붙여넣어 업로드할 수 있습니다. PNG, JPG, WEBP 형식을 지원합니다.",
  placeholder = "Supabase Storage 이미지 URL",
  successMessage = "수동 이미지가 업로드되었습니다.",
}: ScreenshotUploadControlProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  async function uploadImage(file: File | null) {
    if (!file) {
      onError?.("업로드할 이미지 파일을 선택해주세요.");
      return;
    }

    setIsUploading(true);
    onMessage?.("");
    onError?.("");

    const { data: sessionResult } = await supabase.auth.getSession();
    const token = sessionResult.session?.access_token;

    if (!token) {
      setIsUploading(false);
      onError?.("관리자 로그인 세션을 확인하지 못했습니다.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/admin/sites/screenshot", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    const result = (await response.json().catch(() => null)) as
      | {
          ok?: boolean;
          screenshotUrl?: string;
          error?: string;
        }
      | null;

    setIsUploading(false);

    if (!response.ok || !result?.ok || !result.screenshotUrl) {
      onError?.(result?.error ?? "이미지를 업로드하지 못했습니다.");
      return;
    }

    onChange(result.screenshotUrl);
    onMessage?.(successMessage);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    uploadImage(getImageFile(event.target.files ?? []));
    event.target.value = "";
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    const file = getImageFile(event.clipboardData.files);

    if (!file) {
      return;
    }

    event.preventDefault();
    uploadImage(file);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    uploadImage(getImageFile(event.dataTransfer.files));
  }

  return (
    <div className="grid gap-2">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 rounded-md border border-line px-3 text-sm"
          placeholder={placeholder}
        />
        <button
          type="button"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
          className="h-11 rounded-md border border-line px-4 text-sm font-semibold transition hover:bg-background disabled:opacity-50"
        >
          {isUploading ? "업로드 중..." : buttonLabel}
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFileChange}
      />
      <div
        role="button"
        tabIndex={0}
        onPaste={handlePaste}
        onDrop={handleDrop}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        className={`rounded-md border border-dashed px-4 py-3 text-sm transition ${
          isDragging
            ? "border-accent bg-accent-soft text-accent"
            : "border-line bg-background text-muted"
        }`}
      >
        {description}
      </div>
    </div>
  );
}
