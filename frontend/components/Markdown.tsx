import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function Markdown({ children }: { children: string }) {
  return (
    <div className="text-cream/90 leading-relaxed max-w-[72ch] text-sm">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          strong: ({ children }) => <strong className="text-cream font-semibold">{children}</strong>,
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noreferrer" className="text-ochre hover:underline">
              {children}
            </a>
          ),
          ul: ({ children }) => <ul className="list-disc list-inside mb-3 flex flex-col gap-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside mb-3 flex flex-col gap-1">{children}</ol>,
          table: ({ children }) => (
            <div className="overflow-x-auto mb-3">
              <table className="w-full text-xs border-collapse">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="text-left border-b border-warm/50 px-2 py-1.5 text-warm font-normal">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-warm/20 px-2 py-1.5 align-top">{children}</td>
          ),
          code: ({ children }) => (
            <code className="bg-white/5 px-1 py-0.5 rounded-md text-xs">{children}</code>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
