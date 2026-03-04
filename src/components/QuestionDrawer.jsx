import React, { useMemo, useState } from 'react';
import { buildQuestionLabel } from '../lib/quizSchema';
import StatusBadge from './StatusBadge';

const QuestionDrawer = ({ questions, currentIndex, onJump }) => {
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    const filtered = questions.filter((question, index) => {
      const haystack = [
        buildQuestionLabel(question, index),
        question.answer,
        question.category,
        question.roundLabel
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query.trim().toLowerCase());
    });

    return filtered.reduce((accumulator, question) => {
      const round = question.roundLabel || 'Ungrouped';
      if (!accumulator[round]) accumulator[round] = [];
      accumulator[round].push(question);
      return accumulator;
    }, {});
  }, [questions, query]);

  return (
    <div className="surface p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-white font-black text-base">Question Drawer</h3>
          <p className="text-white/60 text-sm">Search by title, answer, category, or round label.</p>
        </div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search questions"
          className="field max-w-xs"
        />
      </div>

      <div className="space-y-4">
        {Object.entries(groups).map(([groupName, groupQuestions]) => (
          <div key={groupName} className="space-y-2">
            <div className="text-white/50 text-xs uppercase tracking-[0.2em]">{groupName}</div>
            <div className="grid gap-2">
              {groupQuestions.map((question) => {
                const index = questions.findIndex((item) => item.id === question.id);
                const revealedCount = question.reveal.revealedSquares.length;
                const isCurrent = index === currentIndex;
                return (
                  <button
                    key={question.id}
                    type="button"
                    onClick={() => onJump(index)}
                    className={`surface-soft rounded-2xl p-3 text-left transition ${isCurrent ? 'ring-2 ring-cyan-300/70' : 'ring-1 ring-white/10 hover:ring-white/20'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-white font-bold">
                          {index + 1}
                          .
                          {' '}
                          {buildQuestionLabel(question, index)}
                        </div>
                        <div className="text-white/55 text-sm">
                          {revealedCount}/9 revealed
                          {question.answer ? ` • Answer: ${question.answer}` : ''}
                        </div>
                      </div>
                      <StatusBadge status={question.assetStatus.state} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuestionDrawer;
