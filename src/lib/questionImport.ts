import { createQuestion } from './quizSchema';

const splitCsvLine = (line: string) => {
  const output: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      output.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  output.push(current.trim());
  return output;
};

const looksLikeCsv = (text: string) => {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim());
  return Boolean(firstLine && firstLine.includes(','));
};

const toQuestionFromUrl = (url: string) =>
  createQuestion({
    title: '',
    answer: '',
    category: '',
    roundLabel: '',
    hostNotes: '',
    media: {
      kind: /youtu\.?be|youtube/i.test(url) || /\.mp4(\?|$)/i.test(url) ? 'video' : 'image',
      src: url,
      startTime: 0,
      duration: 10,
      fitMode: 'cover'
    }
  });

export const importQuestionsFromText = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed) return [];

  if (!looksLikeCsv(trimmed)) {
    return trimmed
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map(toQuestionFromUrl);
  }

  return trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [title = '', answer = '', category = '', kind = 'image', src = '', startTime = '0', duration = '10'] = splitCsvLine(line);
      if (index === 0 && title.toLowerCase() === 'title' && answer.toLowerCase() === 'answer') {
        return null;
      }
      return createQuestion({
        title,
        answer,
        category,
        media: {
          kind: kind === 'video' ? 'video' : 'image',
          src,
          startTime,
          duration,
          fitMode: 'cover'
        }
      });
    })
    .filter(Boolean);
};
