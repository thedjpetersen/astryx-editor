function visitNode(node, visitor, depth = 0) {
  if (!node) return;
  visitor(node, depth);
  node.content?.forEach((child) => visitNode(child, visitor, depth + 1));
}

function nodeText(node) {
  if (!node) return '';
  if (node.text) return node.text;
  return (node.content || []).map(nodeText).join('');
}

export function getDocumentOutline(editor) {
  const outline = [];
  const json = editor?.getJSON?.();
  visitNode(json, (node) => {
    if (node.type !== 'heading') return;
    const text = nodeText(node).trim();
    if (!text) return;
    outline.push({
      id: `heading-${outline.length + 1}`,
      level: node.attrs?.level || 1,
      text,
    });
  });
  return outline;
}

export function getEditorStats(editor) {
  if (!editor) {
    return {words: 0, characters: 0, charactersNoSpaces: 0, blocks: 0, headings: 0, readingMinutes: 0};
  }

  const text = editor.getText();
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  let blocks = 0;
  let headings = 0;
  visitNode(editor.getJSON(), (node) => {
    if (['paragraph', 'heading', 'blockquote', 'bulletList', 'orderedList', 'codeBlock'].includes(node.type)) blocks += 1;
    if (node.type === 'heading') headings += 1;
  });

  return {
    words,
    characters: text.length,
    charactersNoSpaces: text.replace(/\s/g, '').length,
    blocks,
    headings,
    readingMinutes: words ? Math.max(1, Math.ceil(words / 225)) : 0,
  };
}

export function createEditorSnapshot(editor, extras = {}) {
  if (!editor) return {html: '', json: {type: 'doc', content: []}, text: '', stats: getEditorStats(null), outline: [], ...extras};
  return {
    html: editor.getHTML(),
    json: editor.getJSON(),
    text: editor.getText(),
    stats: getEditorStats(editor),
    outline: getDocumentOutline(editor),
    ...extras,
  };
}
