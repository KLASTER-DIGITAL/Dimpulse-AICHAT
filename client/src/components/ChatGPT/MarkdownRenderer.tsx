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
    
    // Generate a unique ID for this instance of Cal.com
    const uniqueId = `cal-markdown-${Math.random().toString(36).substring(2, 10)}`;
    
    // Find all script tags in the container
    const scripts = containerRef.current.querySelectorAll('script');
    
    // First, handle case where content has Cal.com embed with HTML comments
    if (content.includes('<!-- Cal inline embed code begins -->')) {
      console.log("Cal.com embed with HTML comments detected");
      
      // Ensure Cal.com external script is loaded first
      const calExternalScript = document.createElement('script');
      calExternalScript.type = 'text/javascript';
      calExternalScript.src = 'https://app.cal.com/embed/embed.js';
      document.head.appendChild(calExternalScript);
      
      // Find all div elements with id="my-cal-inline"
      const calContainers = containerRef.current.querySelectorAll('div[id="my-cal-inline"]');
      if (calContainers.length > 0) {
        // Update each container with a unique ID
        calContainers.forEach((container, index) => {
          const newId = `${uniqueId}-${index}`;
          console.log(`Updating Cal.com container ID from 'my-cal-inline' to '${newId}'`);
          container.id = newId;
          
          // Create a script that will initialize this specific container
          const initScript = document.createElement('script');
          initScript.type = 'text/javascript';
          initScript.textContent = `
            (function (C, A, L) { 
              let p = function (a, ar) { a.q.push(ar); }; 
              let d = C.document; 
              C.Cal = C.Cal || function () { 
                let cal = C.Cal; 
                let ar = arguments; 
                if (!cal.loaded) { 
                  cal.ns = {}; 
                  cal.q = cal.q || []; 
                  d.head.appendChild(d.createElement("script")).src = A; 
                  cal.loaded = true; 
                } 
                if (ar[0] === L) { 
                  const api = function () { p(api, arguments); }; 
                  const namespace = ar[1]; 
                  api.q = api.q || []; 
                  if(typeof namespace === "string"){
                    cal.ns[namespace] = cal.ns[namespace] || api;
                    p(cal.ns[namespace], ar);
                    p(cal, ["initNamespace", namespace]);
                  } else p(cal, ar); 
                  return;
                } 
                p(cal, ar); 
              }; 
            })(window, "https://app.cal.com/embed/embed.js", "init");
            
            Cal("init", "${newId}", {origin:"https://cal.com"});
            
            Cal.ns["${newId}"]("inline", {
              elementOrSelector:"#${newId}",
              config: {"layout":"month_view","theme":"dark"},
              calLink: "dimpulse/30min",
            });
            
            Cal.ns["${newId}"]("ui", {"theme":"dark","hideEventTypeDetails":false,"layout":"month_view"});
          `;
          
          // Add the script to the document to execute it
          document.body.appendChild(initScript);
        });
      }
    } 
    // If no scripts were found but we're expecting one (for Cal), add it manually
    else if (scripts.length === 0 && content.includes('Cal(') && content.includes('function')) {
      console.log("No script tags found but Cal detected - creating and injecting Cal.com script");
      
      // Create Cal.com embed script
      const calScript = document.createElement('script');
      calScript.type = 'text/javascript';
      calScript.src = 'https://app.cal.com/embed/embed.js';
      document.head.appendChild(calScript);
      
      // Create initialization script
      const initScript = document.createElement('script');
      initScript.type = 'text/javascript';
      initScript.textContent = `
        (function (C, A, L) { 
          let p = function (a, ar) { a.q.push(ar); }; 
          let d = C.document; 
          C.Cal = C.Cal || function () { 
            let cal = C.Cal; 
            let ar = arguments; 
            if (!cal.loaded) { 
              cal.ns = {}; 
              cal.q = cal.q || []; 
              d.head.appendChild(d.createElement("script")).src = A; 
              cal.loaded = true; 
            } 
            if (ar[0] === L) { 
              const api = function () { p(api, arguments); }; 
              const namespace = ar[1]; 
              api.q = api.q || []; 
              if(typeof namespace === "string"){
                cal.ns[namespace] = cal.ns[namespace] || api;
                p(cal.ns[namespace], ar);
                p(cal, ["initNamespace", namespace]);
              } else p(cal, ar); 
              return;
            } 
            p(cal, ar); 
          }; 
        })(window, "https://app.cal.com/embed/embed.js", "init");
        
        Cal("init", "${uniqueId}", {origin:"https://cal.com"});
        
        Cal.ns["${uniqueId}"]("inline", {
          elementOrSelector:"#${uniqueId}",
          config: {"layout":"month_view","theme":"dark"},
          calLink: "dimpulse/30min",
        });
        
        Cal.ns["${uniqueId}"]("ui", {"theme":"dark","hideEventTypeDetails":false,"layout":"month_view"});
      `;
      
      // Create the target container if needed
      if (!document.getElementById(uniqueId)) {
        const calContainer = document.createElement('div');
        calContainer.id = uniqueId;
        calContainer.style.width = '100%';
        calContainer.style.height = '600px';
        calContainer.style.overflow = 'auto';
        containerRef.current.appendChild(calContainer);
      }
      
      // Append initialization script after container is ready
      document.body.appendChild(initScript);
    } 
    // Otherwise execute all scripts normally
    else if (scripts.length > 0) {
      console.log(`Found ${scripts.length} script tags to execute`);
      
      // Ensure Cal.com script is loaded if needed
      if (content.includes('Cal(') || content.includes('cal.com')) {
        const calScript = document.createElement('script');
        calScript.type = 'text/javascript';
        calScript.src = 'https://app.cal.com/embed/embed.js';
        document.head.appendChild(calScript);
      }
      
      // Handle standard script tags
      scripts.forEach((oldScript, index) => {
        try {
          // Create a new script element
          const newScript = document.createElement('script');
          
          // Copy all attributes from the old script to the new one
          Array.from(oldScript.attributes).forEach(attr => {
            newScript.setAttribute(attr.name, attr.value);
          });
          
          // Copy the content of the script
          let scriptContent = oldScript.textContent || '';
          
          // If this is a Cal.com script, update the element selector
          if (scriptContent.includes('Cal(') && scriptContent.includes('my-cal-inline')) {
            console.log(`Updating Cal.com script to use unique ID: ${uniqueId}`);
            scriptContent = scriptContent.replace(/my-cal-inline/g, uniqueId);
            
            // Also update any container divs if they exist
            if (containerRef.current) {
              try {
                const calContainers = containerRef.current.querySelectorAll('div[id="my-cal-inline"]');
                if (calContainers.length > 0) {
                  calContainers.forEach(container => {
                    container.id = uniqueId;
                  });
                }
              } catch (err) {
                console.error("Error updating Cal.com container IDs:", err);
              }
            }
          }
          
          newScript.textContent = scriptContent;
          
          // If this is an external script (with src), handle loading
          if (oldScript.src) {
            console.log(`Processing external script ${index + 1}: ${oldScript.src}`);
          } else {
            console.log(`Processing inline script ${index + 1}, length: ${scriptContent.length} chars`);
          }
          
          // Replace the old script with the new one to execute it
          if (oldScript.parentNode) {
            oldScript.parentNode.replaceChild(newScript, oldScript);
          } else {
            console.warn("Script has no parent node, appending to document body");
            document.body.appendChild(newScript);
          }
        } catch (error) {
          console.error(`Error executing script ${index}:`, error);
        }
      });
    }
  };

  useEffect(() => {
    // Function to convert markdown to HTML or preserve existing HTML
    const processContent = (content: string) => {
      // Generate a unique ID for this Cal container
      const uniqueId = `cal-markdown-${Math.random().toString(36).substring(2, 10)}`;
      
      // Special case for HTML with Cal.com embed code
      if (content.includes('<!-- Cal inline embed code begins -->')) {
        console.log("Cal.com embed with HTML comment detected, preserving as is");
        // Keep original format but use a unique container ID
        return content.replace('id="my-cal-inline"', `id="${uniqueId}"`);
      }
      
      // Special case for Cal.com calendar code which doesn't have HTML tags but should be handled as code
      if (content.includes('Cal(') && content.includes('function')) {
        // For Cal.com integration, use the exact code structure requested by the user but with a unique ID for this instance
        console.log("Cal.com integration detected, using exact code structure from user example");
        return `
<!-- Cal inline embed code begins -->
<div style="width:100%;height:100%;overflow:scroll" id="${uniqueId}"></div>
<script type="text/javascript">
  (function (C, A, L) { let p = function (a, ar) { a.q.push(ar); }; let d = C.document; C.Cal = C.Cal || function () { let cal = C.Cal; let ar = arguments; if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; d.head.appendChild(d.createElement("script")).src = A; cal.loaded = true; } if (ar[0] === L) { const api = function () { p(api, arguments); }; const namespace = ar[1]; api.q = api.q || []; if(typeof namespace === "string"){cal.ns[namespace] = cal.ns[namespace] || api;p(cal.ns[namespace], ar);p(cal, ["initNamespace", namespace]);} else p(cal, ar); return;} p(cal, ar); }; })(window, "https://app.cal.com/embed/embed.js", "init");
Cal("init", "30min", {origin:"https://cal.com"});

  Cal.ns["30min"]("inline", {
    elementOrSelector:"#${uniqueId}",
    config: {"layout":"month_view","theme":"dark"},
    calLink: "dimpulse/30min",
  });

  Cal.ns["30min"]("ui", {"theme":"dark","hideEventTypeDetails":false,"layout":"month_view"});
</script>
<!-- Cal inline embed code ends -->
        `;
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
    // Add a timeout to ensure DOM has fully updated before executing scripts
    const timer = setTimeout(() => {
      console.log("Executing scripts with delay");
      executeScripts();
    }, 500);
    
    return () => clearTimeout(timer);
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
