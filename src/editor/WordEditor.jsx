import React, {useEffect, useMemo, useRef, useState} from 'react';
import {EditorContent, useEditor} from '@tiptap/react';
import {Theme} from '@astryxdesign/core/theme';
import {Card} from '@astryxdesign/core/Card';
import {getTheme, registerThemeIcons} from '../app/themes.js';
import {useControllableState} from '../hooks/useControllableState.js';
import {getAiCompletionSuggestions, getAutocompleteSuggestions, insertCompletion} from './completionUtils.js';
import {CommandPalette} from './components/CommandPalette.jsx';
import {CompletionPanel} from './components/CompletionPanel.jsx';
import {EditorInspector} from './components/EditorInspector.jsx';
import {applyBlock, EditorToolbar} from './components/EditorToolbar.jsx';
import {InputDialog} from './components/InputDialog.jsx';
import {DEFAULT_EDITOR_COMMENTS, DEFAULT_EDITOR_CONTENT} from './defaultContent.js';
import {createEditorSnapshot, getEditorStats} from './documentUtils.js';
import {createEditorExtensions} from './extensions.js';
import {applyAllWritingSuggestions, applyWritingSuggestion, getWritingSuggestions} from './reviewUtils.js';
import {SHORTCUTS} from './shortcuts.js';

const DEFAULT_TITLE = 'Astryx Editor';
const DEFAULT_SUBTITLE = 'Progressive word editor artifact';
const DEFAULT_DOCUMENT_NAME = 'Project brief';

function contentChanged(editor, nextContent) {
  if (!editor || typeof nextContent !== 'string') return false;
  return editor.getHTML() !== nextContent;
}

function normalizeLink(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(text)) return text;
  return `https://${text}`;
}

function createCommentId() {
  return `comment-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function findCommentRange(editor, commentId) {
  const markType = editor?.schema?.marks?.documentComment;
  if (!editor || !markType || !commentId) return null;
  let range = null;
  editor.state.doc.descendants((node, pos) => {
    if (!node.isText) return;
    const hasComment = node.marks.some((mark) => mark.type === markType && mark.attrs.id === commentId);
    if (!hasComment) return;
    if (!range) range = {from: pos, to: pos + node.text.length};
    else range.to = pos + node.text.length;
  });
  return range;
}

function removeCommentMark(editor, commentId) {
  const markType = editor?.schema?.marks?.documentComment;
  if (!editor || !markType || !commentId) return false;
  let transaction = editor.state.tr;
  editor.state.doc.descendants((node, pos) => {
    if (!node.isText) return;
    const hasComment = node.marks.some((mark) => mark.type === markType && mark.attrs.id === commentId);
    if (hasComment) transaction = transaction.removeMark(pos, pos + node.text.length, markType);
  });
  if (!transaction.docChanged) return false;
  editor.view.dispatch(transaction);
  return true;
}

export function WordEditor({
  title = DEFAULT_TITLE,
  subtitle = DEFAULT_SUBTITLE,
  defaultDocumentName = DEFAULT_DOCUMENT_NAME,
  documentName: controlledDocumentName,
  onDocumentNameChange,
  content,
  defaultContent = DEFAULT_EDITOR_CONTENT,
  comments: controlledComments,
  defaultComments = DEFAULT_EDITOR_COMMENTS,
  onCommentsChange,
  placeholder = 'Start writing...',
  editable = true,
  defaultThemeName = 'astryx',
  themeName: controlledThemeName,
  onThemeNameChange,
  defaultDarkMode = false,
  darkMode: controlledDarkMode,
  onDarkModeChange,
  defaultCompactMode = false,
  compactMode: controlledCompactMode,
  onCompactModeChange,
  defaultShowInspector = true,
  showInspector: controlledShowInspector,
  onShowInspectorChange,
  defaultShowCompletions = true,
  showCompletions: controlledShowCompletions,
  onShowCompletionsChange,
  showToolbar = true,
  showThemeControls = true,
  showKeyboardHints = true,
  withTheme = true,
  className = '',
  onDocumentChange,
}) {
  const initialContentRef = useRef(content ?? defaultContent);
  const onDocumentChangeRef = useRef(onDocumentChange);
  onDocumentChangeRef.current = onDocumentChange;

  const [themeName, setThemeName] = useControllableState({
    value: controlledThemeName,
    defaultValue: defaultThemeName,
    onChange: onThemeNameChange,
  });
  const [darkMode, setDarkMode] = useControllableState({
    value: controlledDarkMode,
    defaultValue: defaultDarkMode,
    onChange: onDarkModeChange,
  });
  const [compactMode, setCompactMode] = useControllableState({
    value: controlledCompactMode,
    defaultValue: defaultCompactMode,
    onChange: onCompactModeChange,
  });
  const [showInspector, setShowInspector] = useControllableState({
    value: controlledShowInspector,
    defaultValue: defaultShowInspector,
    onChange: onShowInspectorChange,
  });
  const [showCompletions, setShowCompletions] = useControllableState({
    value: controlledShowCompletions,
    defaultValue: defaultShowCompletions,
    onChange: onShowCompletionsChange,
  });
  const [comments, setComments] = useControllableState({
    value: controlledComments,
    defaultValue: initialContentRef.current === DEFAULT_EDITOR_CONTENT ? defaultComments : [],
    onChange: onCommentsChange,
  });
  const commentsRef = useRef(comments);
  commentsRef.current = comments;
  const [documentName, setDocumentName] = useControllableState({
    value: controlledDocumentName,
    defaultValue: defaultDocumentName,
    onChange: onDocumentNameChange,
  });
  const [inspectorView, setInspectorView] = useState('review');
  const [editorVersion, setEditorVersion] = useState(0);
  const [dismissedSuggestionIds, setDismissedSuggestionIds] = useState(() => new Set());
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const showToast = (message) => {
    setToast(message);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2200);
  };

  const extensions = useMemo(() => createEditorExtensions({placeholder}), [placeholder]);
  const editor = useEditor({
    extensions,
    content: initialContentRef.current,
    editable,
    editorProps: {
      attributes: {
        class: 'word-document',
        spellcheck: 'true',
      },
    },
    onUpdate: ({editor: currentEditor}) => {
      const suggestions = getWritingSuggestions(currentEditor);
      onDocumentChangeRef.current?.(createEditorSnapshot(currentEditor, {
        comments: commentsRef.current,
        writingSuggestions: suggestions,
      }));
    },
  });

  const activeTheme = getTheme(themeName);
  const resolvedMode = activeTheme.forceDark || darkMode ? 'dark' : 'light';
  const stats = useMemo(() => getEditorStats(editor), [editor, editorVersion]);
  const allWritingSuggestions = useMemo(() => getWritingSuggestions(editor), [editor, editorVersion]);
  const writingSuggestions = useMemo(
    () => allWritingSuggestions.filter((suggestion) => !dismissedSuggestionIds.has(suggestion.id)),
    [allWritingSuggestions, dismissedSuggestionIds],
  );
  const autocompleteSuggestions = useMemo(() => getAutocompleteSuggestions(editor), [editor, editorVersion]);
  const aiSuggestions = useMemo(() => getAiCompletionSuggestions(editor), [editor, editorVersion]);

  const createComment = (note) => {
    if (!editor || !note) return;
    const comment = {
      id: createCommentId(),
      author: 'Author',
      note,
      createdAt: new Date().toISOString(),
      status: 'open',
    };
    editor.chain().focus().setDocumentComment({
      id: comment.id,
      author: comment.author,
      note: comment.note,
    }).run();
    setComments((items) => [...items, comment]);
    setShowInspector(true);
    setInspectorView('comments');
  };

  const addComment = (seedNote) => {
    if (!editor || editor.state.selection.empty) {
      showToast('Select text to comment on first');
      return;
    }
    if (seedNote) {
      createComment(seedNote);
      return;
    }
    setDialog({kind: 'comment'});
  };

  const editLink = () => {
    if (!editor) return;
    setDialog({kind: 'link', initial: editor.getAttributes('link').href || ''});
  };

  const submitLink = (value) => {
    const href = normalizeLink(value);
    if (!href) {
      editor?.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor?.chain().focus().extendMarkRange('link').setLink({href}).run();
  };

  const resolveComment = (commentId) => {
    removeCommentMark(editor, commentId);
    setComments((items) => items.map((item) => item.id === commentId ? {...item, status: 'resolved'} : item));
  };

  const reopenComment = (commentId) => {
    setComments((items) => items.map((item) => item.id === commentId ? {...item, status: 'open'} : item));
  };

  const deleteComment = (commentId) => {
    removeCommentMark(editor, commentId);
    setComments((items) => items.filter((item) => item.id !== commentId));
  };

  const replyToComment = (commentId, note) => {
    const text = String(note || '').trim();
    if (!text) return;
    const reply = {
      id: createCommentId(),
      author: 'Author',
      note: text,
      createdAt: new Date().toISOString(),
    };
    setComments((items) => items.map((item) =>
      item.id === commentId ? {...item, replies: [...(item.replies || []), reply]} : item));
  };

  const flashTimerRef = useRef(null);
  const flashRange = (from, to) => {
    if (!editor) return;
    editor.commands.flashRange({from, to});
    if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
    flashTimerRef.current = window.setTimeout(() => editor?.commands.clearFlash(), 700);
  };

  const locateComment = (commentId) => {
    const range = findCommentRange(editor, commentId);
    if (!range) return;
    editor.chain().focus().setTextSelection(range).scrollIntoView().run();
    flashRange(range.from, range.to);
  };

  const acceptSuggestion = (suggestion) => {
    if (!applyWritingSuggestion(editor, suggestion)) return;
    const to = suggestion.from + (suggestion.replacement?.length || (suggestion.to - suggestion.from));
    if (to > suggestion.from) flashRange(suggestion.from, to);
  };

  const acceptAllSuggestions = () => {
    const applied = applyAllWritingSuggestions(editor, writingSuggestions);
    if (applied) showToast(`Applied ${applied} ${applied === 1 ? 'fix' : 'fixes'}`);
  };

  const dismissSuggestion = (suggestion) => {
    setDismissedSuggestionIds((ids) => new Set(ids).add(suggestion.id));
  };

  const restoreDismissedSuggestions = () => {
    setDismissedSuggestionIds(new Set());
  };

  const locateSuggestion = (suggestion) => {
    if (!editor || !suggestion) return;
    editor.chain().focus().setTextSelection({from: suggestion.from, to: suggestion.to}).scrollIntoView().run();
    flashRange(suggestion.from, suggestion.to);
  };

  const commentOnSuggestion = (suggestion) => {
    if (!editor || !suggestion) return;
    editor.commands.setTextSelection({from: suggestion.from, to: suggestion.to});
    addComment(`${suggestion.label}: ${suggestion.detail}`);
  };

  const insertSelectedCompletion = (completion) => {
    insertCompletion(editor, completion);
    editor?.commands.focus();
  };

  const openInspectorView = (view) => {
    setShowInspector(true);
    setInspectorView(view);
  };

  const fixableCount = writingSuggestions.filter((item) => item.replacement !== undefined).length;
  const chain = (fn) => () => { if (editor) fn(editor.chain().focus()).run(); };
  const paletteCommands = [
    {id: 'bold', group: 'Text', label: 'Bold', shortcut: SHORTCUTS.bold, run: chain((c) => c.toggleBold())},
    {id: 'italic', group: 'Text', label: 'Italic', shortcut: SHORTCUTS.italic, run: chain((c) => c.toggleItalic())},
    {id: 'underline', group: 'Text', label: 'Underline', shortcut: SHORTCUTS.underline, run: chain((c) => c.toggleUnderline())},
    {id: 'strike', group: 'Text', label: 'Strikethrough', shortcut: SHORTCUTS.strike, run: chain((c) => c.toggleStrike())},
    {id: 'code', group: 'Text', label: 'Inline code', shortcut: SHORTCUTS.code, run: chain((c) => c.toggleCode())},
    {id: 'highlight', group: 'Text', label: 'Highlight', shortcut: SHORTCUTS.highlight, run: chain((c) => c.toggleHighlight({color: 'var(--color-background-yellow)'}))},
    {id: 'block-paragraph', group: 'Block', label: 'Turn into paragraph', run: () => applyBlock(editor, 'paragraph')},
    {id: 'block-h1', group: 'Block', label: 'Turn into heading 1', run: () => applyBlock(editor, 'heading-1')},
    {id: 'block-h2', group: 'Block', label: 'Turn into heading 2', run: () => applyBlock(editor, 'heading-2')},
    {id: 'block-h3', group: 'Block', label: 'Turn into heading 3', run: () => applyBlock(editor, 'heading-3')},
    {id: 'block-quote', group: 'Block', label: 'Toggle quote', run: () => applyBlock(editor, 'blockquote')},
    {id: 'block-code', group: 'Block', label: 'Toggle code block', run: () => applyBlock(editor, 'code-block')},
    {id: 'bullet-list', group: 'Block', label: 'Bullet list', shortcut: SHORTCUTS.bulletList, run: chain((c) => c.toggleBulletList())},
    {id: 'ordered-list', group: 'Block', label: 'Ordered list', shortcut: SHORTCUTS.orderedList, run: chain((c) => c.toggleOrderedList())},
    {id: 'link', group: 'Insert', label: 'Add or edit link', run: editLink},
    {id: 'unlink', group: 'Insert', label: 'Remove link', run: chain((c) => c.extendMarkRange('link').unsetLink())},
    {id: 'comment', group: 'Review', label: 'Comment on selection', shortcut: SHORTCUTS.comment, run: () => addComment()},
    ...(fixableCount ? [{id: 'apply-all', group: 'Review', label: `Apply ${fixableCount} safe ${fixableCount === 1 ? 'fix' : 'fixes'}`, run: acceptAllSuggestions}] : []),
    {id: 'go-review', group: 'Go to', label: 'Review suggestions', run: () => openInspectorView('review')},
    {id: 'go-comments', group: 'Go to', label: 'Comments', run: () => openInspectorView('comments')},
    {id: 'go-outline', group: 'Go to', label: 'Outline', run: () => openInspectorView('outline')},
    {id: 'go-stats', group: 'Go to', label: 'Stats', run: () => openInspectorView('stats')},
    {id: 'go-source', group: 'Go to', label: 'Source', run: () => openInspectorView('source')},
    {id: 'toggle-dark', group: 'View', label: darkMode ? 'Switch to light mode' : 'Switch to dark mode', run: () => setDarkMode(!darkMode)},
    {id: 'toggle-compact', group: 'View', label: compactMode ? 'Disable compact mode' : 'Enable compact mode', run: () => setCompactMode(!compactMode)},
    {id: 'toggle-inspector', group: 'View', label: showInspector ? 'Hide inspector' : 'Show inspector', shortcut: SHORTCUTS.inspector, run: () => setShowInspector(!showInspector)},
    {id: 'toggle-completions', group: 'View', label: showCompletions ? 'Hide completions' : 'Show completions', run: () => setShowCompletions(!showCompletions)},
  ];

  const globalHandlersRef = useRef(null);
  globalHandlersRef.current = {
    openPalette: () => setPaletteOpen(true),
    toggleInspector: () => setShowInspector(!showInspector),
    addComment: () => addComment(),
    hasOverlay: paletteOpen || Boolean(dialog),
  };

  useEffect(() => {
    registerThemeIcons(themeName);
  }, [themeName]);

  useEffect(() => {
    if (!editor) return undefined;
    const bump = () => setEditorVersion((version) => version + 1);
    editor.on('transaction', bump);
    editor.on('selectionUpdate', bump);
    editor.on('update', bump);
    return () => {
      editor.off('transaction', bump);
      editor.off('selectionUpdate', bump);
      editor.off('update', bump);
    };
  }, [editor]);

  useEffect(() => {
    editor?.setEditable(editable);
  }, [editable, editor]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const handlers = globalHandlersRef.current;
      if (!handlers) return;
      const mod = event.metaKey || event.ctrlKey;
      if (!mod || handlers.hasOverlay) return;
      if (event.code === 'KeyK' && !event.altKey && !event.shiftKey) {
        event.preventDefault();
        handlers.openPalette();
      } else if (event.key === '\\') {
        event.preventDefault();
        handlers.toggleInspector();
      } else if (event.altKey && event.code === 'KeyM') {
        event.preventDefault();
        handlers.addComment();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!editor || content === undefined || !contentChanged(editor, content)) return;
    editor.commands.setContent(content, false);
  }, [content, editor]);

  const appClassName = [
    'editor-app',
    `theme-${themeName}`,
    compactMode ? 'compact-mode' : '',
    showToolbar ? '' : 'toolbar-hidden',
    showInspector ? '' : 'inspector-hidden',
    className,
  ].filter(Boolean).join(' ');

  const editorContent = (
    <div className={appClassName} data-theme={resolvedMode} data-astryx-theme={themeName}>
      {showToolbar ? (
        <EditorToolbar
          editor={editor}
          documentName={documentName}
          onDocumentNameChange={setDocumentName}
          stats={stats}
          themeName={themeName}
          onThemeNameChange={setThemeName}
          darkMode={darkMode}
          onDarkModeChange={setDarkMode}
          activeTheme={activeTheme}
          compactMode={compactMode}
          onCompactModeChange={setCompactMode}
          showInspector={showInspector}
          onShowInspectorChange={setShowInspector}
          showCompletions={showCompletions}
          onShowCompletionsChange={setShowCompletions}
          commentCount={comments.filter((comment) => comment.status !== 'resolved').length}
          suggestionCount={writingSuggestions.length}
          aiSuggestions={aiSuggestions}
          onAddComment={() => addComment()}
          onEditLink={editLink}
          onOpenInspectorView={openInspectorView}
          onInsertCompletion={insertSelectedCompletion}
          onOpenPalette={() => setPaletteOpen(true)}
          showThemeControls={showThemeControls}
          showKeyboardHints={showKeyboardHints}
        />
      ) : null}

      <main className="editor-stage">
        <section className="editor-workbench" aria-label="Document workbench">
          <Card className="editor-page-card" padding={0}>
            <EditorContent editor={editor} />
          </Card>
          {showCompletions ? (
            <CompletionPanel
              autocompleteSuggestions={autocompleteSuggestions}
              aiSuggestions={aiSuggestions}
              onInsert={insertSelectedCompletion}
            />
          ) : null}
        </section>
        {showInspector ? (
          <EditorInspector
            editor={editor}
            stats={stats}
            comments={comments}
            suggestions={writingSuggestions}
            view={inspectorView}
            onViewChange={setInspectorView}
            onResolveComment={resolveComment}
            onReopenComment={reopenComment}
            onDeleteComment={deleteComment}
            onReplyToComment={replyToComment}
            onLocateComment={locateComment}
            onAddComment={() => addComment()}
            onAcceptSuggestion={acceptSuggestion}
            onAcceptAllSuggestions={acceptAllSuggestions}
            onDismissSuggestion={dismissSuggestion}
            dismissedSuggestionCount={dismissedSuggestionIds.size}
            onRestoreDismissedSuggestions={restoreDismissedSuggestions}
            onLocateSuggestion={locateSuggestion}
            onCommentOnSuggestion={commentOnSuggestion}
          />
        ) : null}
      </main>

      {paletteOpen ? (
        <CommandPalette
          commands={paletteCommands}
          onClose={() => {
            setPaletteOpen(false);
            editor?.commands.focus();
          }}
        />
      ) : null}
      {dialog?.kind === 'link' ? (
        <InputDialog
          title={dialog.initial ? 'Edit link' : 'Add link'}
          placeholder="example.com"
          initialValue={dialog.initial}
          submitLabel={dialog.initial ? 'Update' : 'Add link'}
          allowEmpty
          onSubmit={submitLink}
          onClose={() => {
            setDialog(null);
            editor?.commands.focus();
          }}
        />
      ) : null}
      {dialog?.kind === 'comment' ? (
        <InputDialog
          title="New comment"
          placeholder="Share a thought on the selection..."
          submitLabel="Comment"
          onSubmit={createComment}
          onClose={() => {
            setDialog(null);
            editor?.commands.focus();
          }}
        />
      ) : null}
      <div className="editor-toast-region" role="status" aria-live="polite">
        {toast ? <div className="editor-toast">{toast}</div> : null}
      </div>
    </div>
  );

  return withTheme ? <Theme theme={activeTheme.theme} mode={resolvedMode}>{editorContent}</Theme> : editorContent;
}

export default WordEditor;
