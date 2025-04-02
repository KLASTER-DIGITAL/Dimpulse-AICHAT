import React, { useEffect, useRef } from 'react';
import { ExtendedMessage } from '@shared/schema';

interface CalRendererProps {
  message: ExtendedMessage;
}

const CalRenderer: React.FC<CalRendererProps> = ({ message }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const messageId = message.id;
  const calContainerId = `cal-container-${messageId}`;
  
  useEffect(() => {
    if (!containerRef.current || !message.content) return;
    
    // Parse the original content to extract important parts
    const divMatch = message.content.match(/<div[^>]*id="([^"]+)"[^>]*>/i);
    const originalDivId = divMatch ? divMatch[1] : 'my-cal-inline';
    
    // Extract all script content
    const scriptMatch = message.content.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
    
    if (!scriptMatch) {
      console.error('No script found in Cal.com embed code');
      return;
    }
    
    // Modify the original script content to use our container ID
    let scriptContent = scriptMatch[1];
    scriptContent = scriptContent.replace(new RegExp(originalDivId, 'g'), calContainerId);
    
    // Load the Cal.com script if it's not already loaded
    const loadCalScript = () => {
      return new Promise<void>((resolve) => {
        const existingScript = document.querySelector('script[src="https://app.cal.com/embed/embed.js"]');
        if (existingScript) {
          resolve();
          return;
        }
        
        const calScript = document.createElement('script');
        calScript.src = 'https://app.cal.com/embed/embed.js';
        calScript.async = true;
        calScript.onload = () => resolve();
        document.head.appendChild(calScript);
      });
    };
    
    // Execute our modified script content
    const executeCalScript = () => {
      try {
        console.log(`Initializing Cal.com for container: ${calContainerId}`);
        
        // Create and run a new script with our modified content
        const script = document.createElement('script');
        script.textContent = scriptContent;
        document.body.appendChild(script);
      } catch (error) {
        console.error('Error initializing Cal.com:', error);
      }
    };
    
    // Execute in sequence
    loadCalScript().then(() => {
      // Small delay to ensure everything is ready
      setTimeout(executeCalScript, 100);
    });
    
  }, [message.content, calContainerId]);
  
  return (
    <div className="cal-container w-full">
      <div 
        id={calContainerId} 
        ref={containerRef}
        style={{ 
          width: '100%', 
          height: '650px', 
          overflow: 'hidden'
        }}
      />
    </div>
  );
};

export default CalRenderer;