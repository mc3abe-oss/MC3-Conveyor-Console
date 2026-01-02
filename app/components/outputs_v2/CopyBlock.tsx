'use client';

import { useState, useCallback } from 'react';
import clsx from 'clsx';

interface CopyBlockProps {
  content: string;
  label?: string;
  className?: string;
  maxHeight?: string;
}

/**
 * CopyBlock - Displays content with a copy-to-clipboard button
 */
export default function CopyBlock({ content, label, className, maxHeight = '400px' }: CopyBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [content]);

  return (
    <div className={clsx('relative', className)}>
      {label && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <button
            onClick={handleCopy}
            className={clsx(
              'px-3 py-1 text-xs font-medium rounded transition-colors',
              copied
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}
      <pre
        className="bg-gray-50 border border-gray-200 rounded-md p-3 text-xs font-mono overflow-auto"
        style={{ maxHeight }}
      >
        {content}
      </pre>
      {!label && (
        <button
          onClick={handleCopy}
          className={clsx(
            'absolute top-2 right-2 px-2 py-1 text-xs font-medium rounded transition-colors',
            copied
              ? 'bg-green-100 text-green-700'
              : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
          )}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      )}
    </div>
  );
}
