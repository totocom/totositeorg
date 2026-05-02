export const aiGenerationJobStaleAfterMs = 20 * 60 * 1000;

export type AiGenerationJobStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed";

export function isActiveAiGenerationJobStale({
  status,
  createdAt,
  startedAt,
  now,
  staleAfterMs = aiGenerationJobStaleAfterMs,
}: {
  status: AiGenerationJobStatus;
  createdAt: string;
  startedAt?: string | null;
  now: Date;
  staleAfterMs?: number;
}) {
  if (status !== "queued" && status !== "running") {
    return false;
  }

  const referenceDate = new Date(startedAt ?? createdAt);
  const referenceTime = referenceDate.getTime();
  const nowTime = now.getTime();

  if (!Number.isFinite(referenceTime) || !Number.isFinite(nowTime)) {
    return false;
  }

  return nowTime - referenceTime >= staleAfterMs;
}
