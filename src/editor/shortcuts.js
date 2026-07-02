/**
 * Single source of truth for keyboard shortcuts. The command palette, the
 * toolbar tooltips, and the app-level key handler all read from this map so a
 * hint can never drift from its binding. Only list a shortcut here if
 * something actually handles it.
 */
export const SHORTCUTS = {
  palette: ['mod', 'k'],
  bold: ['mod', 'b'],
  italic: ['mod', 'i'],
  underline: ['mod', 'u'],
  strike: ['mod', 'shift', 's'],
  code: ['mod', 'e'],
  highlight: ['mod', 'shift', 'h'],
  undo: ['mod', 'z'],
  redo: ['mod', 'shift', 'z'],
  bulletList: ['mod', 'shift', '8'],
  orderedList: ['mod', 'shift', '7'],
  comment: ['mod', 'alt', 'm'],
  inspector: ['mod', '\\'],
};
