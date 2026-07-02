import React, {useEffect, useMemo, useRef, useState} from 'react';
import {EditorContent, useEditor} from '@tiptap/react';
import {Theme} from '@astryxdesign/core/theme';
import {Card} from '@astryxdesign/core/Card';
import {getTheme, registerThemeIcons} from '../app/themes.js';
import {useControllableState} from '../hooks/useControllableState.js';
import {getAiCompletionSuggestions, getAutocompleteSuggestions, insertCompletion} from './completionUtils.js';
import {CompletionPanel} from './components/CompletionPanel.jsx';
import {EditorInspector} from './components/EditorInspector.jsx';
import {EditorToolbar} from './components/EditorToolbar.jsx';
import {DEFAULT_EDITOR_COMMENTS, DEFAULT_EDITOR_CONTENT} from './defaultContent.js';
import {createEditorSnapshot, getEditorStats} from './documentUtils.js';
import {createEditorExtensions} from './extensions.js';
import {applyWritingSuggestion, getWritingSuggestions} from './reviewUtils.js';

const DEFAULT_TITLE = 'Astryx Editor';
const DEFAULT_SUBTITLE = 'Progressive word editor artifact';

function contentChanged(editor, nextContent) {
  if (!editor || typeof nextContent !== 'string') return false;
  return editor.getHTML() !== nextContent;
}

function createCommentId() {
  return `comment-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
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
  const [inspectorView, setInspectorView] = useState('review');
  const [editorVersion, setEditorVersion] = useState(0);

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
  const writingSuggestions = useMemo(() => getWritingSuggestions(editor), [editor, editorVersion]);
  const autocompleteSuggestions = useMemo(() => getAutocompleteSuggestions(editor), [editor, editorVersion]);
  const aiSuggestions = useMemo(() => getAiCompletionSuggestions(editor), [editor, editorVersion]);

  const addComment = (seedNote) => {
    if (!editor || editor.state.selection.empty) {
      window.alert('Select text before adding a comment.');
      return;
    }
    const note = seedNote || window.prompt('Comment');
    if (!note) return;
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

  const resolveComment = (commentId) => {
    removeCommentMark(editor, commentId);
    setComments((items) => items.map((item) => item.id === commentId ? {...item, status: 'resolved'} : item));
  };

  const acceptSuggestion = (suggestion) => {
    applyWritingSuggestion(editor, suggestion);
  };

  const commentOnSuggestion = (suggestion) => {
    if (!editor || !suggestion) return;
    editor.commands.setTextSelection({from: suggestion.from, to: suggestion.to});
    addComment(`${suggestion.label}: ${suggestion.detail}`);
  };

  const insertSelectedCompletion = (completion) => {
    insertCompletion(editor, completion);
  };

  const openInspectorView = (view) => {
    setShowInspector(true);
    setInspectorView(view);
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
          title={title}
          subtitle={subtitle}
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
          onOpenInspectorView={openInspectorView}
          onInsertCompletion={insertSelectedCompletion}
          showThemeControls={showThemeControls}
          showKeyboardHints={showKeyboardHints}
        />
      ) : null}

      <main className="editor-stage">
        <section className="editor-workbench" aria-label="Document workbench">
          <div className="page-ruler" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
          <Card className="editor-page-card" padding={0}>
            <EditorContent editor={editor} />
          </Card>
          <footer className="document-status" aria-label="Document status">
            <span>{stats.words.toLocaleString()} words</span>
            <span>{stats.charactersNoSpaces.toLocaleString()} letters</span>
            <span>{stats.readingMinutes.toLocaleString()} min read</span>
          </footer>
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
            onAcceptSuggestion={acceptSuggestion}
            onCommentOnSuggestion={commentOnSuggestion}
          />
        ) : null}
      </main>
    </div>
  );

  return withTheme ? <Theme theme={activeTheme.theme} mode={resolvedMode}>{editorContent}</Theme> : editorContent;
}

export default WordEditor;
