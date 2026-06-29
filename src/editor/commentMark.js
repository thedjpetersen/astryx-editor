import {Mark, mergeAttributes} from '@tiptap/core';

export const CommentMark = Mark.create({
  name: 'documentComment',
  inclusive: false,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-comment-id'),
        renderHTML: (attributes) => attributes.id ? {'data-comment-id': attributes.id} : {},
      },
      author: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-comment-author') || '',
        renderHTML: (attributes) => attributes.author ? {'data-comment-author': attributes.author} : {},
      },
      note: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-comment-note') || '',
        renderHTML: (attributes) => attributes.note ? {'data-comment-note': attributes.note} : {},
      },
    };
  },

  parseHTML() {
    return [{tag: 'span[data-comment-id]'}];
  },

  renderHTML({HTMLAttributes}) {
    return ['span', mergeAttributes(HTMLAttributes, {class: 'word-comment-mark'}), 0];
  },

  addCommands() {
    return {
      setDocumentComment: (attributes) => ({commands}) => commands.setMark(this.name, attributes),
      unsetDocumentComment: () => ({commands}) => commands.unsetMark(this.name),
    };
  },
});
