// src/components/InfoPanel.tsx
import { useState } from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';

interface InfoPanelProps {
  title: string;
  sections: {
    title: string;
    content: string[];
  }[];
}

export function InfoPanel({ title, sections }: InfoPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg mb-8 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-blue-100 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <Info className="w-5 h-5 text-blue-600" />
          <span className="font-medium text-blue-900">{title}</span>
        </div>

        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-blue-600" />
        ) : (
          <ChevronDown className="w-5 h-5 text-blue-600" />
        )}
      </button>

      {isExpanded && (
        <div className="px-6 pb-6 pt-2 space-y-6 border-t border-blue-200 bg-white">
          {sections.map((section, index) => (
            <div key={index}>
              <h3 className="font-semibold text-gray-900 mb-2">{section.title}</h3>
              <ul className="space-y-2">
                {section.content.map((item, itemIndex) => (
                  <li key={itemIndex} className="text-sm text-gray-700 flex items-start">
                    <span className="inline-block w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}