/**
 * Renders markdown content with basic prose styling.
 *
 * Uses `react-markdown` with `remark-gfm` for GitHub Flavored Markdown
 * (tables, strikethrough, task lists, etc.).
 *
 * @param content - Raw markdown string
 */

"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface MarkdownViewerProps {
    content: string
}

export function MarkdownViewer({ content }: MarkdownViewerProps) {
    return (
        <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
    )
}
