import ReactMarkdown, { type Components } from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

const REMARK_PLUGINS = [remarkGfm, remarkBreaks];

const COMPONENTS: Components = {
	h1: ({ children }) => <h1 className="text-base font-semibold mt-3 mb-2">{children}</h1>,
	h2: ({ children }) => <h2 className="text-sm font-semibold mt-3 mb-2">{children}</h2>,
	h3: ({ children }) => <h3 className="text-sm font-medium mt-2 mb-1">{children}</h3>,
	p: ({ children }) => <p className="leading-relaxed mb-2 last:mb-0">{children}</p>,
	ul: ({ children }) => <ul className="list-disc pl-4 my-2 space-y-1">{children}</ul>,
	ol: ({ children }) => <ol className="list-decimal pl-4 my-2 space-y-1">{children}</ol>,
	pre: ({ children }) => <pre className="overflow-x-auto my-2 text-xs font-mono">{children}</pre>,
};

interface MessageMarkdownProps {
	content: string;
}

export function MessageMarkdown({ content }: MessageMarkdownProps) {
	return (
		<div className="min-w-0 overflow-x-auto break-words text-sm">
			<ReactMarkdown remarkPlugins={REMARK_PLUGINS} components={COMPONENTS}>
				{content}
			</ReactMarkdown>
		</div>
	);
}
