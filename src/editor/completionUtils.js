const COMPLETION_WORDS = [
  'architecture',
  'collaboration',
  'comments',
  'completion',
  'documentation',
  'editor',
  'implementation',
  'inspector',
  'iteration',
  'persistence',
  'progressive',
  'review',
  'selection',
  'suggestion',
  'workflow',
  'writing',
];

function getSelectionContext(editor) {
  if (!editor?.state?.selection?.empty) return null;
  const {from} = editor.state.selection;
  const start = Math.max(0, from - 180);
  const textBefore = editor.state.doc.textBetween(start, from, '\n', '\n');
  const prefix = textBefore.match(/([A-Za-z][A-Za-z-]{1,})$/)?.[1] || '';
  return {
    from,
    textBefore,
    prefix,
    replaceFrom: from - prefix.length,
    replaceTo: from,
  };
}

export function getAutocompleteSuggestions(editor, {limit = 5} = {}) {
  const context = getSelectionContext(editor);
  if (!context?.prefix || context.prefix.length < 2) return [];
  const lowerPrefix = context.prefix.toLowerCase();
  return COMPLETION_WORDS
    .filter((word) => word.startsWith(lowerPrefix) && word !== lowerPrefix)
    .slice(0, limit)
    .map((word) => ({
      id: `word-${word}`,
      kind: 'word',
      label: word,
      text: word,
      detail: 'Complete current word',
      replaceFrom: context.replaceFrom,
      replaceTo: context.replaceTo,
    }));
}

export function getAiCompletionSuggestions(editor) {
  const context = getSelectionContext(editor);
  if (!context) return [];
  const recent = context.textBefore.trim().toLowerCase();
  const suggestions = [];

  if (!recent || recent.endsWith(':')) {
    suggestions.push({
      id: 'ai-bullets',
      kind: 'ai',
      label: 'Draft next bullets',
      text: '\n- Define the smallest useful editing surface.\n- Add review loops before persistence.\n- Keep host integration points explicit.',
      detail: 'Continue with structured notes',
    });
  }

  if (recent.includes('release') || recent.includes('package')) {
    suggestions.push({
      id: 'ai-release',
      kind: 'ai',
      label: 'Continue release plan',
      text: ' The next release should focus on comment persistence, document import/export, and a provider hook for hosted AI completions.',
      detail: 'Product planning continuation',
    });
  }

  if (recent.includes('comment') || recent.includes('review')) {
    suggestions.push({
      id: 'ai-review',
      kind: 'ai',
      label: 'Expand review workflow',
      text: ' Reviewers can leave anchored comments, accept writing suggestions, and convert unresolved feedback into follow-up tasks.',
      detail: 'Review-focused continuation',
    });
  }

  suggestions.push({
    id: 'ai-general',
    kind: 'ai',
    label: 'Continue paragraph',
    text: ' This keeps the document useful during early drafting while leaving enough structure for richer collaboration later.',
    detail: 'Offline AI-style draft',
  });

  return suggestions.slice(0, 3);
}

export function insertCompletion(editor, completion) {
  if (!editor || !completion) return false;
  if (completion.kind === 'word') {
    editor.chain().focus().insertContentAt({from: completion.replaceFrom, to: completion.replaceTo}, completion.text).run();
    return true;
  }
  editor.chain().focus().insertContent(completion.text).run();
  return true;
}
