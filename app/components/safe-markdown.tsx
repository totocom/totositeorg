import type {
  SafeMarkdownBlock,
  SafeMarkdownInline,
} from "@/app/data/public-site-description";
import { getSafeMarkdownBlocks } from "@/app/data/public-site-description";

type SafeMarkdownProps = {
  value: string;
  blocks?: SafeMarkdownBlock[];
  className?: string;
  paragraphClassName?: string;
  maxBlocks?: number;
  includeHeadings?: boolean;
  includeLists?: boolean;
};

export function SafeMarkdown({
  value,
  blocks,
  className,
  paragraphClassName = "text-sm leading-7 text-foreground",
  maxBlocks,
  includeHeadings,
  includeLists,
}: SafeMarkdownProps) {
  const parsedBlocks =
    blocks ??
    getSafeMarkdownBlocks(value, {
      maxBlocks,
      includeHeadings,
      includeLists,
    });

  if (parsedBlocks.length === 0) return null;

  return (
    <div className={className}>
      {parsedBlocks.map((block, index) => {
        if (block.type === "heading") {
          const HeadingTag = `h${block.level}` as "h2" | "h3" | "h4";

          return (
            <HeadingTag
              key={`${block.type}-${index}`}
              className="mt-4 text-sm font-bold text-foreground first:mt-0"
            >
              <SafeMarkdownInlines inlines={block.inlines} />
            </HeadingTag>
          );
        }

        if (block.type === "list") {
          return (
            <ul
              key={`${block.type}-${index}`}
              className="mt-2 grid gap-1 pl-4 text-sm leading-7 text-foreground first:mt-0"
            >
              {block.items.map((item, itemIndex) => (
                <li key={`${item.text}-${itemIndex}`} className="list-disc">
                  <SafeMarkdownInlines inlines={item.inlines} />
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p
            key={`${block.type}-${index}`}
            className={`${paragraphClassName} ${index === 0 ? "" : "mt-3"}`.trim()}
          >
            <SafeMarkdownInlines inlines={block.inlines} />
          </p>
        );
      })}
    </div>
  );
}

function SafeMarkdownInlines({ inlines }: { inlines: SafeMarkdownInline[] }) {
  return (
    <>
      {inlines.map((inline, index) => {
        if (inline.type === "strong") {
          return <strong key={index}>{inline.text}</strong>;
        }

        if (inline.type === "emphasis") {
          return <em key={index}>{inline.text}</em>;
        }

        if (inline.type === "code") {
          return (
            <code key={index} className="rounded bg-surface px-1 py-0.5 text-xs">
              {inline.text}
            </code>
          );
        }

        if (inline.type === "link") {
          return (
            <a
              key={index}
              href={inline.href}
              rel="nofollow ugc noopener noreferrer"
              className="font-semibold text-accent underline"
            >
              {inline.text}
            </a>
          );
        }

        return <span key={index}>{inline.text}</span>;
      })}
    </>
  );
}
