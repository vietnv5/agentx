"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatMarkdownProps {
  content: string;
  className?: string;
  isDocumentStyle?: boolean;
}

export const ChatMarkdown = React.memo(({ content, className, isDocumentStyle = false }: ChatMarkdownProps) => {
  console.log("[ChatMarkdown] rendering content:", JSON.stringify(content));
  if (!content) return null;

  return (
    <div
      className={
        className ||
        (isDocumentStyle
          ? "prose dark:prose-invert max-w-none text-default-800 dark:text-default-200 font-sans break-words"
          : "prose dark:prose-invert max-w-none text-sm leading-relaxed break-words")
      }
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node, ...props }) => (
            <h1
              className={
                isDocumentStyle
                  ? "text-2xl font-bold text-default-900 dark:text-white mt-8 mb-4 border-b pb-2 tracking-tight"
                  : "text-2xl font-bold my-4 text-default-900 dark:text-default-50"
              }
              {...props}
            />
          ),
          h2: ({ node, ...props }) => (
            <h2
              className={
                isDocumentStyle
                  ? "text-xl font-semibold text-default-800 dark:text-default-100 mt-6 mb-3"
                  : "text-xl font-bold my-4 text-default-900 dark:text-default-50"
              }
              {...props}
            />
          ),
          h3: ({ node, ...props }) => (
            <h3
              className={
                isDocumentStyle
                  ? "text-lg font-medium text-default-800 dark:text-default-200 mt-5 mb-2.5"
                  : "text-lg font-bold my-3 text-default-800 dark:text-default-100"
              }
              {...props}
            />
          ),
          strong: ({ node, ...props }) => <strong className="font-bold text-default-900 dark:text-white" {...props} />,
          em: ({ node, ...props }) => <em className="italic" {...props} />,
          p: ({ node, ...props }) => (
            <p
              className={
                isDocumentStyle
                  ? "text-sm text-default-700 dark:text-default-300 my-3 leading-relaxed"
                  : "my-2 text-default-700 dark:text-default-300"
              }
              {...props}
            />
          ),
          a: ({ node, ...props }) => (
            <a
              className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium transition-all"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
          ul: ({ node, ...props }) => (
            <ul className="list-disc pl-5 my-2.5 space-y-1 text-default-700 dark:text-default-300" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal pl-5 my-2.5 space-y-1 text-default-700 dark:text-default-300" {...props} />
          ),
          li: ({ node, ...props }) => <li className="my-0.5 text-sm" {...props} />,
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto w-full border border-divider/60 rounded-xl my-5 bg-white/50 dark:bg-default-50/10 backdrop-blur-sm shadow-sm">
              <table className="min-w-full divide-y divide-default-200 dark:divide-default-800 text-xs sm:text-sm" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead className="bg-default-100/80 dark:bg-default-800/40 text-default-800 dark:text-default-200" {...props} />
          ),
          tbody: ({ node, ...props }) => <tbody className="divide-y divide-default-100 dark:divide-default-800/50" {...props} />,
          tr: ({ node, ...props }) => (
            <tr className="hover:bg-default-50/55 dark:hover:bg-default-800/10 transition-colors" {...props} />
          ),
          th: ({ node, ...props }) => (
            <th className="px-4 py-2.5 text-left font-semibold text-default-800 dark:text-default-100 border-b border-default-200 dark:border-default-800" {...props} />
          ),
          td: ({ node, ...props }) => <td className="px-4 py-2.5 text-default-600 dark:text-default-300 align-middle" {...props} />,
          code: (props) => {
            const { node, children, className, ...rest } = props;
            const match = /language-(\w+)/.exec(className || "");
            const isInline = !match && !String(children).includes("\n");
            return isInline ? (
              <code
                className="bg-default-100 dark:bg-default-800/50 px-1.5 py-0.5 rounded font-mono text-xs text-danger dark:text-danger-400 font-semibold"
                {...rest}
              >
                {children}
              </code>
            ) : (
              <pre className="bg-default-100 dark:bg-default-800/40 p-3 rounded-lg font-mono text-[11px] overflow-x-auto my-3 border border-default-200/60 text-foreground">
                <code className={className} {...rest}>
                  {children}
                </code>
              </pre>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});

ChatMarkdown.displayName = "ChatMarkdown";
