import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styled from "styled-components";

export function Markdown({ children }: { children: string }) {
	return (
		<MarkdownContent>
			<ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
		</MarkdownContent>
	);
}

const MarkdownContent = styled.div`
	font-size: 14px;
	line-height: 1.75;
	overflow-wrap: anywhere;
	> :first-child { margin-top: 0; }
	> :last-child { margin-bottom: 0; }
	h1 { font-size: 24px; }
	h2 { font-size: 20px; }
	h3 { font-size: 16px; }
	pre { overflow-x: auto; padding: 12px; border-radius: 8px; background: rgb(0 0 0 / 5%); }
	code { padding: 2px 5px; border-radius: 4px; background: rgb(0 0 0 / 5%); }
	pre code { padding: 0; background: transparent; }
	blockquote { margin-left: 0; padding-left: 12px; border-left: 3px solid currentColor; opacity: 0.7; }
	table { width: 100%; border-collapse: collapse; }
	th, td { padding: 6px 8px; border: 1px solid rgb(0 0 0 / 12%); }
	img { max-width: 100%; }
`;
