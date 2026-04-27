import { ResponsibleUseNotice } from "@/app/components/responsible-use-notice";

export function Footer() {
  return (
    <footer className="mt-10 border-t border-line bg-background">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <ResponsibleUseNotice />
      </div>
    </footer>
  );
}
