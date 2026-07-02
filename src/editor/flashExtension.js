import {Extension} from '@tiptap/core';
import {Plugin, PluginKey} from '@tiptap/pm/state';
import {Decoration, DecorationSet} from '@tiptap/pm/view';

export const fixFlashKey = new PluginKey('fixFlash');

/**
 * Transient inline decoration used to pulse a text range after a writing
 * suggestion is applied or a "jump to" action lands, so the user sees the
 * causal thread between the panel action and the document change.
 */
export const FixFlash = Extension.create({
  name: 'fixFlash',

  addCommands() {
    return {
      flashRange: ({from, to}) => ({tr, dispatch}) => {
        if (dispatch) dispatch(tr.setMeta(fixFlashKey, {from, to}));
        return true;
      },
      clearFlash: () => ({tr, dispatch}) => {
        if (dispatch) dispatch(tr.setMeta(fixFlashKey, {clear: true}));
        return true;
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: fixFlashKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, set) {
            set = set.map(tr.mapping, tr.doc);
            const meta = tr.getMeta(fixFlashKey);
            if (meta?.clear) return DecorationSet.empty;
            if (meta?.from != null) {
              const from = Math.max(0, Math.min(meta.from, tr.doc.content.size));
              const to = Math.max(from, Math.min(meta.to, tr.doc.content.size));
              if (from === to) return DecorationSet.empty;
              return DecorationSet.create(tr.doc, [Decoration.inline(from, to, {class: 'fix-flash'})]);
            }
            return set;
          },
        },
        props: {
          decorations(state) {
            return fixFlashKey.getState(state);
          },
        },
      }),
    ];
  },
});
