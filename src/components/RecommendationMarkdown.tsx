import type { ReactNode } from "react";

function inline(text: string): ReactNode[] {
  const tokens = text.split(/(\[[^\]]+\]\(https?:\/\/[^)]+\)|\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return tokens.map((token, index) => {
    const link = token.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);
    if (link) return <a key={index} href={link[2]} target="_blank" rel="noreferrer" className="font-medium text-emerald-900 underline decoration-emerald-800/40 underline-offset-4 hover:decoration-emerald-900">{link[1]} ↗</a>;
    if (token.startsWith("**")) return <strong key={index} className="font-semibold text-stone-900">{token.slice(2, -2)}</strong>;
    if (token.startsWith("`")) return <code key={index} className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[0.9em]">{token.slice(1, -1)}</code>;
    return token;
  });
}

export default function RecommendationMarkdown({ content }: { content: string }) {
  const lines = content.trim().split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;
  let key = 0;
  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) { index++; continue; }
    if (line.startsWith("```")) {
      const code: string[] = [];
      index++;
      while (index < lines.length && !lines[index].trim().startsWith("```")) code.push(lines[index++]);
      index++;
      blocks.push(<pre key={key++} className="my-5 overflow-x-auto rounded-2xl bg-[#101a17] p-5 text-sm leading-7 text-emerald-50"><code>{code.join("\n")}</code></pre>);
      continue;
    }
    const heading = line.match(/^(#{2,3})\s+(.+)$/);
    if (heading) {
      const Tag = heading[1].length === 2 ? "h2" : "h3";
      blocks.push(<Tag key={key++} className={heading[1].length === 2 ? "mb-3 mt-10 text-2xl font-semibold tracking-tight text-stone-950" : "mb-2 mt-7 text-lg font-semibold text-stone-900"}>{inline(heading[2])}</Tag>);
      index++;
      continue;
    }
    if (line.startsWith("> ")) {
      blocks.push(<blockquote key={key++} className="my-5 border-l-4 border-emerald-800/40 pl-5 text-lg leading-8 text-stone-700">{inline(line.slice(2))}</blockquote>);
      index++;
      continue;
    }
    if (/^-\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*-\s+/.test(lines[index])) items.push(lines[index++].replace(/^\s*-\s+/, ""));
      blocks.push(<ul key={key++} className="my-4 list-disc space-y-2 pl-6 text-base leading-7 text-stone-700">{items.map((item, itemIndex) => <li key={itemIndex}>{inline(item)}</li>)}</ul>);
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index])) items.push(lines[index++].replace(/^\s*\d+\.\s+/, ""));
      blocks.push(<ol key={key++} className="my-4 list-decimal space-y-3 pl-6 text-base leading-7 text-stone-700">{items.map((item, itemIndex) => <li key={itemIndex} className="pl-1">{inline(item)}</li>)}</ol>);
      continue;
    }
    const paragraph = [line];
    index++;
    while (index < lines.length && lines[index].trim() && !/^(#{2,3})\s|^```|^> |^-\s|^\d+\.\s/.test(lines[index].trim())) paragraph.push(lines[index++].trim());
    blocks.push(<p key={key++} className="my-4 text-base leading-8 text-stone-700">{inline(paragraph.join(" "))}</p>);
  }
  return <div>{blocks}</div>;
}
