import React from 'react';
import MediaStage from './MediaStage';
import SequenceBuilder from './SequenceBuilder';
import StatusBadge from './StatusBadge';

const QuestionEditorCard = ({
  question,
  index,
  errors,
  onChange,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  onProbe,
  totalQuestions
}) => {
  const setField = (field, value) => {
    onChange(index, {
      ...question,
      [field]: value
    });
  };

  const setMedia = (field, value) => {
    onChange(index, {
      ...question,
      media: {
        ...question.media,
        [field]: value
      }
    });
  };

  return (
    <div className="surface p-4 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-white/50 text-xs uppercase tracking-[0.2em]">Question {index + 1}</div>
          <h3 className="text-white font-black text-lg">{question.title || 'Untitled question'}</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={question.assetStatus.state} />
          <button type="button" className="btn-secondary px-3 py-2 text-sm" onClick={() => onProbe(index)}>
            Check Asset
          </button>
          <button type="button" className="btn-secondary px-3 py-2 text-sm" onClick={() => onDuplicate(index)}>
            Duplicate
          </button>
          <button type="button" className="btn-secondary px-3 py-2 text-sm" onClick={() => onMoveUp(index)} disabled={index === 0}>
            Up
          </button>
          <button type="button" className="btn-secondary px-3 py-2 text-sm" onClick={() => onMoveDown(index)} disabled={index === totalQuestions - 1}>
            Down
          </button>
          <button type="button" className="btn-danger px-3 py-2 text-sm" onClick={() => onDelete(index)} disabled={totalQuestions === 1}>
            Delete
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr),minmax(280px,0.9fr)]">
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-white/70 text-sm font-bold">Title</span>
              <input className="field" value={question.title} onChange={(event) => setField('title', event.target.value)} />
            </label>
            <label className="space-y-2">
              <span className="text-white/70 text-sm font-bold">Answer</span>
              <input className="field" value={question.answer} onChange={(event) => setField('answer', event.target.value)} />
            </label>
            <label className="space-y-2">
              <span className="text-white/70 text-sm font-bold">Category</span>
              <input className="field" value={question.category} onChange={(event) => setField('category', event.target.value)} />
            </label>
            <label className="space-y-2">
              <span className="text-white/70 text-sm font-bold">Round</span>
              <input className="field" value={question.roundLabel} onChange={(event) => setField('roundLabel', event.target.value)} />
            </label>
          </div>

          <label className="space-y-2 block">
            <span className="text-white/70 text-sm font-bold">Host Notes</span>
            <textarea
              className="field"
              rows={3}
              value={question.hostNotes}
              onChange={(event) => setField('hostNotes', event.target.value)}
            />
          </label>

          <div className="grid gap-3 md:grid-cols-[120px,minmax(0,1fr),100px,100px,120px]">
            <label className="space-y-2">
              <span className="text-white/70 text-sm font-bold">Kind</span>
              <select className="field" value={question.media.kind} onChange={(event) => setMedia('kind', event.target.value)}>
                <option value="image">Image</option>
                <option value="video">Video</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-white/70 text-sm font-bold">Media URL</span>
              <input className="field" value={question.media.src} onChange={(event) => setMedia('src', event.target.value)} />
            </label>

            <label className="space-y-2">
              <span className="text-white/70 text-sm font-bold">Start</span>
              <input
                className="field"
                type="number"
                min="0"
                value={question.media.startTime}
                onChange={(event) => setMedia('startTime', event.target.value)}
              />
            </label>

            <label className="space-y-2">
              <span className="text-white/70 text-sm font-bold">Duration</span>
              <input
                className="field"
                type="number"
                min="0"
                value={question.media.duration}
                onChange={(event) => setMedia('duration', event.target.value)}
              />
            </label>

            <label className="space-y-2">
              <span className="text-white/70 text-sm font-bold">Fit</span>
              <select className="field" value={question.media.fitMode} onChange={(event) => setMedia('fitMode', event.target.value)}>
                <option value="cover">Cover</option>
                <option value="contain">Contain</option>
              </select>
            </label>
          </div>

          {errors.length > 0 && (
            <div className="surface-soft rounded-2xl p-3 text-sm text-rose-100">
              {errors.map((message) => (
                <div key={message}>{message}</div>
              ))}
            </div>
          )}

          {question.assetStatus.message && (
            <div className="text-white/60 text-sm">{question.assetStatus.message}</div>
          )}
        </div>

        <div className="space-y-3">
          <div className="surface-soft rounded-2xl overflow-hidden min-h-[220px]">
            <div className="relative h-[220px]">
              <MediaStage media={question.media} alt={question.title || `Question ${index + 1}`} />
            </div>
          </div>

          <SequenceBuilder question={question} onSaveSequence={(sequence) => onChange(index, {
            ...question,
            reveal: {
              ...question.reveal,
              sequence
            }
          })} />
        </div>
      </div>
    </div>
  );
};

export default QuestionEditorCard;
