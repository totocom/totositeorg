import { responsibleUseNotice } from "@/app/data/sites";

export function ResponsibleUseNotice() {
  return (
    <section>
      <h2 className="text-xs font-bold uppercase tracking-wide text-white/40">
        책임 있는 이용 안내
      </h2>
      <ul className="mt-2 grid gap-1 text-xs leading-6 text-white/30">
        {responsibleUseNotice.map((notice) => (
          <li key={notice}>{notice}</li>
        ))}
      </ul>
    </section>
  );
}
