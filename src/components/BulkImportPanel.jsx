import React from 'react';

const BulkImportPanel = ({ isOpen, value, onChange, onApply, onClose, importCount }) => {
  if (!isOpen) return null;

  return (
    <div className="surface p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-white font-black text-base">Bulk Import Questions</h3>
          <p className="text-white/60 text-sm">
            Paste one media URL per line or CSV rows using:
            {' '}
            <code className="text-white/80">title,answer,category,kind,url,startTime,duration</code>
          </p>
        </div>
        <button type="button" className="btn-secondary px-3 py-2 text-sm" onClick={onClose}>
          Close
        </button>
      </div>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={8}
        className="field font-mono text-sm"
        placeholder="https://example.com/question-1.jpg"
      />

      <div className="flex items-center justify-between gap-3">
        <div className="text-white/60 text-sm">
          {importCount > 0 ? `Ready to add ${importCount} question${importCount === 1 ? '' : 's'}.` : 'Add at least one valid row or URL.'}
        </div>
        <button type="button" className="btn-primary px-4 py-3 text-sm" onClick={onApply} disabled={importCount === 0}>
          Add Imported Questions
        </button>
      </div>
    </div>
  );
};

export default BulkImportPanel;
