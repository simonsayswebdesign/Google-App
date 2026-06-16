
import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface CodeViewerProps {
  code: string;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({ code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!code) return;

    try {
      // Primary Method: Modern Clipboard API
      await navigator.clipboard.writeText(code);
      triggerCopiedState();
    } catch (err) {
      console.warn('Clipboard API failed, attempting fallback...', err);
      
      // Fallback Method: textarea selection (legacy support)
      try {
        const textArea = document.createElement("textarea");
        textArea.value = code;
        
        // Ensure textarea is not visible but part of DOM
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
          triggerCopiedState();
        } else {
          throw new Error('Fallback copy command failed');
        }
      } catch (fallbackErr) {
        console.error('All copy methods failed', fallbackErr);
        alert('Could not auto-copy. Please manually select the code and press Ctrl+C.');
      }
    }
  };

  const triggerCopiedState = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative w-full h-full bg-[#1e1e1e] rounded-lg overflow-hidden flex flex-col font-mono text-sm border border-gray-700">
      <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-gray-700 shrink-0">
        <span className="text-gray-400 text-xs">Raw Snippet (Builder Ready)</span>
        <button 
          onClick={handleCopy}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border shadow-sm transition-all cursor-pointer ${
            copied 
              ? 'bg-green-500/10 text-green-400 border-green-500/20' 
              : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700 hover:text-white'
          }`}
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          <span className="text-xs font-bold uppercase tracking-wider">
            {copied ? 'All Copied' : 'Copy All Code'}
          </span>
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4 text-gray-300">
        <pre className="whitespace-pre-wrap break-all select-all">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};
