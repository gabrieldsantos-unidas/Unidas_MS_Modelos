import { useState } from 'react';
import { Code, ChevronDown, ChevronUp } from 'lucide-react';

interface QueryInfoProps {
  query: string;
  title: string;
}

export function QueryInfo({ query, title }: QueryInfoProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
      >
        <div className="flex items-center space-x-2">
          <Code className="w-5 h-5 text-slate-600" />
          <span className="font-medium text-slate-700">{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-slate-600" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-600" />
        )}
      </button>

      {isOpen && (
        <div className="mt-2 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <pre className="text-sm text-slate-700 whitespace-pre-wrap font-mono">
            {query}
          </pre>
        </div>
      )}
    </div>
  );
}
