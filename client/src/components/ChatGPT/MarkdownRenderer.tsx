import { useEffect, useState, useRef } from "react";

interface MarkdownRendererProps {
  content: string;
}

// This is a markdown renderer with support for embedded HTML and scripts
const MarkdownRenderer = ({ content }: MarkdownRendererProps) => {
  const [formattedText, setFormattedText] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Function to safely execute scripts in the content
  const executeScripts = () => {
    if (!containerRef.current) return;
    
    // Find all script tags in the container
    const scripts = containerRef.current.querySelectorAll('script');
    
    // If there are no script tags but there's JavaScript code directly in the content
    if (scripts.length === 0 && content.includes('Cal(') && content.includes('function')) {
      try {
        // Create a wrapper for the calendar
        const calContainer = document.createElement('div');
        calContainer.id = 'my-cal-inline';
        calContainer.style.width = '100%';
        calContainer.style.height = '600px';
        calContainer.style.overflow = 'scroll';
        
        // First clear existing content and append the container
        if (containerRef.current.childNodes.length === 0) {
          containerRef.current.appendChild(calContainer);
          
          // Create and execute the script
          const scriptElement = document.createElement('script');
          scriptElement.type = 'text/javascript';
          scriptElement.textContent = content;
          document.head.appendChild(scriptElement);
        }
        return;
      } catch (error) {
        console.error("Error executing Cal.com script:", error);
      }
    }
    
    // Handle standard script tags
    scripts.forEach(oldScript => {
      // Create a new script element
      const newScript = document.createElement('script');
      
      // Copy all attributes from the old script to the new one
      Array.from(oldScript.attributes).forEach(attr => {
        newScript.setAttribute(attr.name, attr.value);
      });
      
      // Copy the content of the script
      newScript.textContent = oldScript.textContent;
      
      // Replace the old script with the new one to execute it
      oldScript.parentNode?.replaceChild(newScript, oldScript);
    });
  };

  useEffect(() => {
    // Function to convert markdown to HTML or preserve existing HTML
    const processContent = (content: string) => {
      // Special case for Cal.com calendar code which doesn't have HTML tags but should be handled as code
      if (content.includes('Cal(') && content.includes('function')) {
        // For Cal.com integration, create an empty div that will be filled by executeScripts
        console.log("Cal.com integration detected, special handling applied");
        return '<div id="my-cal-inline" style="width:100%;height:600px;overflow:scroll;"></div>';
      }
    
      // Check if the content contains HTML with iframes or scripts
      const containsComplexHTML = /<\/?(?:iframe|script|div)[\s\S]*?>/i.test(content);
      
      // If content already contains complex HTML elements, preserve it entirely
      if (containsComplexHTML) {
        console.log("Content contains complex HTML, preserving as is");
        return content;
      }
      
      // Otherwise process as markdown
      let html = content;

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
        if (m.match(/^<\/?(ul|ol|li|h|p|bl|code|iframe|script|div)/)) return m;
        return '<p>' + m + '</p>';
      });

      // Remove extra paragraphs around HTML elements
      html = html.replace(/<p><(ul|ol|li|h1|h2|h3|pre|iframe|script|div)/gim, '<$1');
      html = html.replace(/<\/(ul|ol|li|h1|h2|h3|pre|iframe|script|div)><\/p>/gim, '</$1>');

      // Fix newlines
      html = html.replace(/\n$/gim, '<br/>');

      return html;
    };

    setFormattedText(processContent(content));
  }, [content]);

  // Execute scripts when the content changes or after rendering
  useEffect(() => {
    executeScripts();
  }, [formattedText]);

  return (
    <div 
      ref={containerRef}
      className="text-base whitespace-pre-wrap markdown-content"
      dangerouslySetInnerHTML={{ __html: formattedText }}
    />
  );
};

export default MarkdownRenderer;
