import React, { useState, useEffect } from 'react';

const SequenceBuilder = ({ question, onSaveSequence }) => {
  const [sequence, setSequence] = useState(question?.reveal?.sequence || []);
  const [isBuilding, setIsBuilding] = useState(false);

  useEffect(() => {
    setSequence(question?.reveal?.sequence || []);
  }, [question?.reveal?.sequence]);

  if (!question) return null;

  const handleSquareClick = (squareNumber) => {
    if (sequence.includes(squareNumber)) {
      setSequence(sequence.filter(n => n !== squareNumber));
    } else {
      setSequence([...sequence, squareNumber]);
    }
  };

  const handleSave = () => {
    onSaveSequence(sequence.length > 0 ? sequence : null);
    setIsBuilding(false);
  };

  const handleClear = () => {
    setSequence([]);
  };

  const handleCancel = () => {
    setSequence(question?.reveal?.sequence || []);
    setIsBuilding(false);
  };

  const getSquareNumber = (squareNumber) => {
    const index = sequence.indexOf(squareNumber);
    return index >= 0 ? index + 1 : null;
  };

  const squares = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <div className="surface p-3 space-y-2">
      <div className="flex justify-between items-center">
        <h3 className="text-white font-bold text-sm">Sequence</h3>
        {!isBuilding && question.reveal.sequence && (
          <span className="text-cyan-200 text-xs font-bold">Set</span>
        )}
      </div>

      {!isBuilding ? (
        <button
          onClick={() => setIsBuilding(true)}
          className="w-full btn-secondary py-2 px-4 text-sm"
        >
          {question.reveal.sequence ? 'Edit' : 'Build Sequence'}
        </button>
      ) : (
        <div className="space-y-2">
          <div className="text-white/80 text-xs text-center">
            Click in reveal order. Partial sequences are allowed:
          </div>

          <div className="grid grid-cols-3 gap-2 bg-black/40 p-2 rounded-xl ring-1 ring-white/10">
            {squares.map((squareNumber) => {
              const sequenceNum = getSquareNumber(squareNumber);
              const isSelected = sequenceNum !== null;

              return (
                <button
                  key={squareNumber}
                  onClick={() => handleSquareClick(squareNumber)}
                  className={`
                    aspect-square flex items-center justify-center
                    text-xl font-bold rounded transition-all
                    ${isSelected
                      ? 'bg-cyan-200 text-black ring-1 ring-white/10'
                      : 'bg-white/10 text-white/70 hover:bg-white/15 ring-1 ring-white/15'
                    }
                  `}
                >
                  {isSelected ? sequenceNum : squareNumber}
                </button>
              );
            })}
          </div>

          <div className="text-white/60 text-center text-xs">
            {sequence.length} square{sequence.length === 1 ? '' : 's'} in sequence
          </div>

          <div className="flex gap-1">
            <button
              onClick={handleClear}
              className="flex-1 btn-secondary py-1 px-2 text-xs"
            >
              Clear
            </button>
            <button
              onClick={handleCancel}
              className="flex-1 btn-secondary py-1 px-2 text-xs"
            >
              Cancel
            </button>
          </div>

          <button
            onClick={handleSave}
            className="w-full btn-primary py-2 px-4 text-sm"
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
};

export default SequenceBuilder;
