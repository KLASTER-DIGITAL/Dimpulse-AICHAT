import { useEffect, useState, useRef } from "react";

interface MarkdownRendererProps {
  content: string;
}

// This is a simple markdown renderer without external dependencies
const MarkdownRenderer = ({ content }: MarkdownRendererProps) => {
  const [formattedText, setFormattedText] = useState("");
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const previousContentRef = useRef<string>("");

  // Function to convert markdown to HTML
  const convertMarkdownToHtml = (markdown: string) => {
    let html = markdown;

    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-lg font-medium mt-4 mb-2">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-xl font-medium mt-4 mb-2">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-medium mt-4 mb-2">$1</h1>');

    // Bold
    html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
    html = html.replace(/__(.*?)__/gim, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');
    html = html.replace(/_(.*?)_/gim, '<em>$1</em>');

    // Code blocks
    html = html.replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>');

    // Inline code
    html = html.replace(/`([^`]+)`/gim, '<code>$1</code>');

    // Lists
    // Unordered lists
    html = html.replace(/^\* (.*$)/gim, '<ul><li>$1</li></ul>');
    html = html.replace(/^- (.*$)/gim, '<ul><li>$1</li></ul>');
    // Combine consecutive list items
    html = html.replace(/<\/ul>\s*<ul>/gim, '');

    // Ordered lists
    html = html.replace(/^\d+\. (.*$)/gim, '<ol><li>$1</li></ol>');
    // Combine consecutive list items
    html = html.replace(/<\/ol>\s*<ol>/gim, '');

    // Paragraphs
    html = html.replace(/^\s*(\n)?(.+)/gim, function(m) {
      if (m.match(/^<\/?(ul|ol|li|h|p|bl|code)/)) return m;
      return '<p>' + m + '</p>';
    });

    // Remove extra paragraphs around list items and headers
    html = html.replace(/<p><(ul|ol|li|h1|h2|h3|pre)/gim, '<$1');
    html = html.replace(/<\/(ul|ol|li|h1|h2|h3|pre)><\/p>/gim, '</$1>');

    // Fix newlines
    html = html.replace(/\n$/gim, '<br/>');

    return html;
  };

  // Преобразование контента в HTML
  useEffect(() => {
    const isNewMessage = content !== previousContentRef.current;
    previousContentRef.current = content;
    
    const html = convertMarkdownToHtml(content);
    setFormattedText(html);
    
    // Если это новое сообщение, запускаем эффект печатания
    if (isNewMessage && content.length > 0) {
      setIsTyping(true);
      setDisplayedText('');
      
      // Симуляция эффекта печатания
      let i = 0;
      const strippedHtml = html.replace(/<[^>]*>/g, ''); // Убираем HTML-теги для подсчета символов
      
      // Вычисляем скорость печатания в зависимости от длины текста
      const typingSpeed = Math.max(10, Math.min(30, 300 / strippedHtml.length));
      
      const typeWriter = () => {
        if (i < html.length) {
          // Находим следующий HTML-тег
          if (html[i] === '<') {
            const closingTagIndex = html.indexOf('>', i);
            if (closingTagIndex !== -1) {
              setDisplayedText(prevText => prevText + html.substring(i, closingTagIndex + 1));
              i = closingTagIndex + 1;
            } else {
              i++;
            }
          } else {
            setDisplayedText(prevText => prevText + html[i]);
            i++;
          }
          
          setTimeout(typeWriter, typingSpeed);
        } else {
          setIsTyping(false);
        }
      };
      
      typeWriter();
    } else {
      // Если это не новое сообщение или пустое, показываем всё сразу
      setDisplayedText(html);
      setIsTyping(false);
    }
  }, [content]);

  return (
    <div 
      className="text-base whitespace-pre-wrap"
      dangerouslySetInnerHTML={{ __html: isTyping ? displayedText : formattedText }}
    />
  );
};

export default MarkdownRenderer;
