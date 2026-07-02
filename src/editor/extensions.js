import {Extension} from '@tiptap/core';
import CharacterCount from '@tiptap/extension-character-count';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Typography from '@tiptap/extension-typography';
import Underline from '@tiptap/extension-underline';
import StarterKit from '@tiptap/starter-kit';
import {CommentMark} from './commentMark.js';
import {FixFlash} from './flashExtension.js';

// High priority so this binding beats the Highlight extension's own
// Mod-Shift-h, which would otherwise apply an unthemed highlight.
const AstryxShortcuts = Extension.create({
  name: 'astryxShortcuts',
  priority: 1000,
  addKeyboardShortcuts() {
    return {
      'Mod-Shift-h': () => this.editor.chain().focus().toggleHighlight({color: 'var(--color-background-yellow)'}).run(),
    };
  },
});

export function createEditorExtensions({placeholder = 'Start writing...'} = {}) {
  return [
    StarterKit.configure({
      heading: {levels: [1, 2, 3]},
      codeBlock: {
        HTMLAttributes: {
          class: 'word-code-block',
        },
      },
    }),
    Underline,
    Link.configure({
      autolink: true,
      linkOnPaste: true,
      openOnClick: false,
      HTMLAttributes: {
        class: 'word-link',
      },
    }),
    Highlight.configure({
      multicolor: true,
      HTMLAttributes: {
        class: 'word-highlight',
      },
    }),
    TextAlign.configure({
      types: ['heading', 'paragraph'],
    }),
    CommentMark,
    Typography,
    Placeholder.configure({placeholder}),
    CharacterCount,
    FixFlash,
    AstryxShortcuts,
  ];
}
