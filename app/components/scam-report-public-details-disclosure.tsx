"use client";

import { useId, useState, type ReactNode } from "react";

type ScamReportPublicDetailsDisclosureProps = {
  label: string;
  children: ReactNode;
};

export function ScamReportPublicDetailsDisclosure({
  label,
  children,
}: ScamReportPublicDetailsDisclosureProps) {
  const [isOpen, setIsOpen] = useState(false);
  const contentId = useId();

  return (
    <div className="rounded-md border border-line bg-surface p-3">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={() => setIsOpen((current) => !current)}
        className="text-sm font-semibold text-foreground"
      >
        {label}
      </button>
      <div id={contentId} hidden={!isOpen} className="mt-3 grid gap-3">
        {children}
      </div>
    </div>
  );
}
