import React from 'react';

const ResetConfirm = ({ isOpen, onConfirm, onCancel, title, message }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="surface-strong p-6 max-w-md w-full">
        <h3 className="text-white font-black text-xl mb-3">{title}</h3>
        <p className="text-white/70 mb-6">{message}</p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 btn-secondary py-3 px-6"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 btn-danger py-3 px-6"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResetConfirm;
