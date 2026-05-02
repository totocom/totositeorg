import { siteDescriptionNoticeText } from "@/app/data/site-description-notice";

export function SiteDescriptionNotice() {
  return (
    <div className="mt-3 rounded-lg border border-line bg-background px-3 py-2 text-xs leading-5 text-muted">
      {siteDescriptionNoticeText}
    </div>
  );
}
