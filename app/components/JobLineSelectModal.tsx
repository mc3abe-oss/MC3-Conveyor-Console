'use client';

interface JobLineSelectModalProps {
  isOpen: boolean;
  availableJobLines: number[];
  referenceType: 'QUOTE' | 'SALES_ORDER';
  referenceBase: string;
  suffix: number | null;
  onSelect: (jobLine: number) => void;
  onClose: () => void;
}

export default function JobLineSelectModal({
  isOpen,
  availableJobLines,
  referenceType,
  referenceBase,
  suffix,
  onSelect,
  onClose,
}: JobLineSelectModalProps) {
  if (!isOpen) return null;

  const refPrefix = referenceType === 'QUOTE' ? 'Q' : 'SO';
  const refDisplay = suffix ? `${refPrefix}${referenceBase}.${suffix}` : `${refPrefix}${referenceBase}`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-sm w-full">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Select Line</h2>
            <p className="text-sm text-gray-500 mt-1">
              Multiple lines exist for {refDisplay}. Which one would you like to open?
            </p>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            <div className="space-y-2">
              {availableJobLines.map((line) => (
                <button
                  key={line}
                  onClick={() => onSelect(line)}
                  className="w-full p-3 text-left border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <span className="font-medium text-gray-900">Line {line}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
