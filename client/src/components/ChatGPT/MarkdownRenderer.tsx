import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Link } from 'wouter';
import { fileSchema } from '@shared/schema';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { LucideFileText, LucideImage, LucideFile } from 'lucide-react';

interface MarkdownRendererProps {
  markdown: string;
  files?: z.infer<typeof fileSchema>[];
  className?: string;
}

const MarkdownRenderer = memo(({ markdown, files, className }: MarkdownRendererProps) => {
  return (
    <div className={cn("markdown-content", className)}>
      {files && files.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {files.map((file, index) => (
            <a
              key={index}
              href={file.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center p-2 bg-secondary rounded-md hover:bg-secondary/80 transition-colors"
            >
              {file.type.startsWith('image/') ? (
                <LucideImage className="mr-2 h-4 w-4" />
              ) : file.type === 'application/pdf' || file.type.includes('document') ? (
                <LucideFileText className="mr-2 h-4 w-4" />
              ) : (
                <LucideFile className="mr-2 h-4 w-4" />
              )}
              <span className="text-sm truncate max-w-[150px]">{file.name}</span>
            </a>
          ))}
        </div>
      )}
      
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          a: ({ node, ...props }) => {
            const href = props.href || '';
            
            // Внутренние ссылки
            if (href.startsWith('/')) {
              return <Link to={href} {...props} />;
            }
            
            // Внешние ссылки - открываем в новом окне
            return (
              <a
                target="_blank"
                rel="noreferrer"
                {...props}
                className="text-primary hover:underline"
              />
            );
          }
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
});

export default MarkdownRenderer;
