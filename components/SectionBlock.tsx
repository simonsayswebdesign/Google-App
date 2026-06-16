
import React, { useState } from 'react';
import { Trash2, ArrowUp, ArrowDown, Code, Check, X, Copy, Eraser } from 'lucide-react';
import { GeneratedSection } from '../types';

interface SectionBlockProps {
  section: GeneratedSection;
  idx: number; 
  onDelete: (id: string) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
  onUpdate: (id: string, newHtml: string) => void;
  onCopy: (id: string, html: string) => void;
  onToggleTransparency: (id: string) => void;
  isFirst: boolean;
  isLast: boolean;
  copiedId: string | null;
  themeColor?: string;
}

export const SectionBlock: React.FC<SectionBlockProps> = ({ 
  section, 
  idx,
  onDelete, 
  onMove, 
  onUpdate,
  onCopy,
  onToggleTransparency,
  isFirst, 
  isLast,
  copiedId,
  themeColor = 'indigo'
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editHtml, setEditHtml] = useState(section.html);

  const handleSave = () => {
    onUpdate(section.id, editHtml);
    setIsEditing(false);
  };

  return (
    <div className={`flex items-center bg-[#1a1a1e] border border-[#2a2a2e] rounded-lg overflow-hidden group hover:border-${themeColor}-500/50 transition-colors w-full md:mb-0 shrink-0 md:shrink`}>
      <div className="px-3 py-3 border-r border-[#2a2a2e] bg-[#222226]/50 self-stretch flex items-center">
        <span className={`text-[10px] font-black text-gray-500 group-hover:text-${themeColor}-400`}>{(idx + 1).toString().padStart(2, '0')}</span>
      </div>
      <div className="px-3 py-2 flex items-center justify-between flex-1 min-w-0">
         <span className="text-xs font-bold text-gray-300 truncate mr-2">{section.name}</span>
         
         <div className="flex items-center space-x-1 border-l border-[#2a2a2e] pl-2 ml-1 shrink-0">
            {/* Move Controls */}
            <div className="flex flex-col mr-1">
                 <button onClick={() => onMove(section.id, 'up')} disabled={isFirst} className={`p-0.5 text-gray-500 hover:text-${themeColor}-400 disabled:opacity-20`}><ArrowUp className="w-3 h-3"/></button>
                 <button onClick={() => onMove(section.id, 'down')} disabled={isLast} className={`p-0.5 text-gray-500 hover:text-${themeColor}-400 disabled:opacity-20`}><ArrowDown className="w-3 h-3"/></button>
            </div>

            {/* Transparency Toggle */}
            <button 
                onClick={() => onToggleTransparency(section.id)}
                className={`p-1.5 rounded transition-colors group/ghost relative ${section.isTransparent ? `bg-${themeColor}-600/20 text-${themeColor}-400` : 'text-gray-500 hover:text-white hover:bg-[#333]'}`}
                title="Toggle Transparency (Strip Background)"
            >
                <Eraser className="w-3.5 h-3.5"/>
            </button>

            <button 
              onClick={() => onDelete(section.id)}
              className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-[#333] rounded transition-colors"
              title="Delete"
            >
              <X className="w-3.5 h-3.5"/>
            </button>
         </div>
      </div>
    </div>
  );
};
