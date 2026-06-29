const TYPO_FIXES = new Map([
  ['teh', 'the'],
  ['recieve', 'receive'],
  ['seperate', 'separate'],
  ['definately', 'definitely'],
  ['occured', 'occurred'],
  ['adress', 'address'],
  ['acommodate', 'accommodate'],
  ['publically', 'publicly'],
  ['wich', 'which'],
  ['untill', 'until'],
]);

const WORDY_PHRASES = [
  {pattern: /\bin order to\b/gi, replacement: 'to'},
  {pattern: /\bdue to the fact that\b/gi, replacement: 'because'},
  {pattern: /\bat this point in time\b/gi, replacement: 'now'},
  {pattern: /\ba number of\b/gi, replacement: 'several'},
  {pattern: /\bfor the purpose of\b/gi, replacement: 'for'},
];

const HEDGE_WORDS = new Set(['actually', 'basically', 'clearly', 'fairly', 'just', 'maybe', 'probably', 'quite', 'really', 'simply', 'very']);

function suggestionId(type, from, text) {
  return `${type}-${from}-${String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 36)}`;
}

function collectTextNodes(editor) {
  const nodes = [];
  editor?.state?.doc?.descendants((node, pos) => {
    if (node.isText && node.text) {
      nodes.push({text: node.text, from: pos, to: pos + node.text.length});
    }
  });
  return nodes;
}

function pushSuggestion(suggestions, suggestion, limit) {
  if (suggestions.length >= limit) return;
  if (suggestions.some((item) => item.id === suggestion.id)) return;
  suggestions.push(suggestion);
}

export function getWritingSuggestions(editor, {limit = 12} = {}) {
  if (!editor) return [];
  const suggestions = [];

  for (const node of collectTextNodes(editor)) {
    const repeatedPattern = /\b([A-Za-z][A-Za-z'-]*)\s+\1\b/gi;
    for (const match of node.text.matchAll(repeatedPattern)) {
      const from = node.from + match.index;
      const word = match[1];
      pushSuggestion(suggestions, {
        id: suggestionId('repeat', from, match[0]),
        type: 'repeat',
        severity: 'high',
        label: `Repeated "${word}"`,
        detail: 'Remove one copy of the repeated word.',
        from,
        to: from + match[0].length,
        replacement: word,
      }, limit);
    }

    const typoPattern = /\b[A-Za-z]+\b/g;
    for (const match of node.text.matchAll(typoPattern)) {
      const replacement = TYPO_FIXES.get(match[0].toLowerCase());
      if (!replacement) continue;
      const from = node.from + match.index;
      pushSuggestion(suggestions, {
        id: suggestionId('typo', from, match[0]),
        type: 'typo',
        severity: 'high',
        label: `Possible typo: "${match[0]}"`,
        detail: `Replace with "${replacement}".`,
        from,
        to: from + match[0].length,
        replacement,
      }, limit);
    }

    for (const phrase of WORDY_PHRASES) {
      for (const match of node.text.matchAll(phrase.pattern)) {
        const from = node.from + match.index;
        pushSuggestion(suggestions, {
          id: suggestionId('wordy', from, match[0]),
          type: 'wordy',
          severity: 'medium',
          label: `Wordy phrase: "${match[0]}"`,
          detail: `Try "${phrase.replacement}".`,
          from,
          to: from + match[0].length,
          replacement: phrase.replacement,
        }, limit);
      }
    }

    const hedgePattern = /\b[A-Za-z]+\b/g;
    for (const match of node.text.matchAll(hedgePattern)) {
      const word = match[0].toLowerCase();
      if (!HEDGE_WORDS.has(word)) continue;
      const from = node.from + match.index;
      pushSuggestion(suggestions, {
        id: suggestionId('hedge', from, match[0]),
        type: 'hedge',
        severity: 'low',
        label: `Hedge word: "${match[0]}"`,
        detail: 'Remove it when the sentence is stronger without it.',
        from,
        to: from + match[0].length,
        replacement: '',
      }, limit);
    }

    const passivePattern = /\b(is|are|was|were|be|been|being)\s+[a-z]+ed\b/gi;
    for (const match of node.text.matchAll(passivePattern)) {
      const from = node.from + match.index;
      pushSuggestion(suggestions, {
        id: suggestionId('passive', from, match[0]),
        type: 'passive',
        severity: 'medium',
        label: `Passive voice: "${match[0]}"`,
        detail: 'Consider naming the actor or using a direct verb.',
        from,
        to: from + match[0].length,
      }, limit);
    }

    const sentencePattern = /[^.!?]+[.!?]+|[^.!?]+$/g;
    for (const match of node.text.matchAll(sentencePattern)) {
      const sentence = match[0].trim();
      const words = sentence ? sentence.split(/\s+/).length : 0;
      if (words < 34) continue;
      const from = node.from + match.index;
      pushSuggestion(suggestions, {
        id: suggestionId('long-sentence', from, sentence),
        type: 'long-sentence',
        severity: 'medium',
        label: `${words}-word sentence`,
        detail: 'Split long sentences to keep the draft easier to scan.',
        from,
        to: from + match[0].length,
      }, limit);
    }
  }

  return suggestions.slice(0, limit);
}

export function applyWritingSuggestion(editor, suggestion) {
  if (!editor || !suggestion || suggestion.replacement === undefined) return false;
  if (suggestion.replacement === '') {
    editor.chain().focus().deleteRange({from: suggestion.from, to: suggestion.to}).run();
    return true;
  }
  editor.chain().focus().insertContentAt({from: suggestion.from, to: suggestion.to}, suggestion.replacement).run();
  return true;
}
