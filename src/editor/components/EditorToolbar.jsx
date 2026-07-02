import React from 'react';
import {Kbd} from '@astryxdesign/core/Kbd';
import {Selector} from '@astryxdesign/core/Selector';
import {Text} from '@astryxdesign/core/Text';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Braces,
  BrushCleaning,
  Code2,
  Highlighter,
  Italic,
  Link,
  List,
  ListOrdered,
  MessageSquare,
  MessageSquarePlus,
  Moon,
  PanelRight,
  Quote,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Sparkles,
  Type,
  Underline,
  Undo2,
  Unlink,
  Wand2,
} from 'lucide-react';
import {THEME_OPTIONS} from '../../app/themes.js';
import {SHORTCUTS} from '../shortcuts.js';
import {AstryxMark} from './AstryxMark.jsx';

const iconProps = {size: 16, strokeWidth: 2, 'aria-hidden': true};
// Highlight uses the Astryx categorical token so applied marks follow the
// active theme and dark mode instead of freezing one palette.
const HIGHLIGHT_COLOR = 'var(--color-background-yellow)';

function icon(IconComponent, size = 16) {
  return <IconComponent {...iconProps} size={size} />;
}

export function currentBlock(editor) {
  if (!editor) return 'paragraph';
  if (editor.isActive('heading', {level: 1})) return 'heading-1';
  if (editor.isActive('heading', {level: 2})) return 'heading-2';
  if (editor.isActive('heading', {level: 3})) return 'heading-3';
  if (editor.isActive('blockquote')) return 'blockquote';
  if (editor.isActive('codeBlock')) return 'code-block';
  return 'paragraph';
}

export function applyBlock(editor, block) {
  if (!editor) return;
  const chain = editor.chain().focus();
  if (block === 'paragraph') chain.setParagraph().run();
  if (block === 'heading-1') chain.setHeading({level: 1}).run();
  if (block === 'heading-2') chain.setHeading({level: 2}).run();
  if (block === 'heading-3') chain.setHeading({level: 3}).run();
  if (block === 'blockquote') chain.toggleBlockquote().run();
  if (block === 'code-block') chain.toggleCodeBlock().run();
}

function RibbonGroup({label, children}) {
  return (
    <div className="editor-ribbon-group" role="group" aria-label={label}>
      {children}
    </div>
  );
}

function RibbonSep() {
  return <span className="editor-ribbon-sep" aria-hidden="true" />;
}

function CommandButton({label, buttonIcon, onClick, isActive = false, isDisabled = false, size = 'icon', badge, shortcut}) {
  const hasTooltip = Boolean(shortcut?.length);
  return (
    <button
      className={`editor-command ${size} ${isActive ? 'active' : ''}`}
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      title={hasTooltip ? undefined : label}
      aria-label={label}
      aria-pressed={isActive ? 'true' : undefined}>
      <span className="editor-command-icon">{buttonIcon}</span>
      {badge !== undefined && badge !== null ? <span className="editor-command-badge">{badge}</span> : null}
      {size === 'icon' ? null : <span className="editor-command-label">{label}</span>}
      {hasTooltip ? (
        <span className="editor-command-shortcut" role="tooltip">
          <span className="editor-command-shortcut-label">{label}</span>
          {shortcut.map((key) => <Kbd key={key} keys={key} />)}
        </span>
      ) : null}
    </button>
  );
}

function ToggleButton({label, buttonIcon, value, onChange, isDisabled = false}) {
  return (
    <button
      className={`editor-toggle-button ${value ? 'active' : ''}`}
      type="button"
      aria-label={label}
      aria-pressed={value ? 'true' : 'false'}
      disabled={isDisabled}
      onClick={() => onChange?.(!value)}>
      <span className="editor-toggle-icon">{buttonIcon}</span>
      <span>{label}</span>
    </button>
  );
}

const blockOptions = [
  {value: 'paragraph', label: 'Paragraph'},
  {value: 'heading-1', label: 'Heading 1'},
  {value: 'heading-2', label: 'Heading 2'},
  {value: 'heading-3', label: 'Heading 3'},
  {value: 'blockquote', label: 'Quote'},
  {value: 'code-block', label: 'Code'},
];

export function EditorToolbar({
  editor,
  documentName,
  onDocumentNameChange,
  stats,
  themeName,
  onThemeNameChange,
  darkMode,
  onDarkModeChange,
  activeTheme,
  compactMode,
  onCompactModeChange,
  showInspector,
  onShowInspectorChange,
  showCompletions,
  onShowCompletionsChange,
  commentCount = 0,
  suggestionCount = 0,
  aiSuggestions = [],
  onAddComment,
  onEditLink,
  onOpenInspectorView,
  onInsertCompletion,
  onOpenPalette,
  showThemeControls = true,
  showKeyboardHints = true,
}) {
  const isReady = Boolean(editor);
  const canUndo = Boolean(editor?.can().undo());
  const canRedo = Boolean(editor?.can().redo());
  const hint = (name) => (showKeyboardHints ? SHORTCUTS[name] : null);

  return (
    <header className="editor-topbar">
      <div className="editor-brand-mark" title="Astryx Editor"><AstryxMark size={20} /></div>
      <div className="editor-title">
        <input
          className="editor-doc-title"
          value={documentName}
          aria-label="Document name"
          spellCheck={false}
          onChange={(event) => onDocumentNameChange?.(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === 'Escape') event.currentTarget.blur();
          }}
        />
        <Text type="supporting" display="block">Draft</Text>
      </div>
      <div className="editor-stats" aria-label="Document stats">
        <Text type="supporting">{stats.words.toLocaleString()} words · {stats.readingMinutes.toLocaleString()} min read</Text>
        {onOpenPalette ? (
          <button className="palette-hint" type="button" aria-label="Open command palette" onClick={onOpenPalette}>
            <Kbd keys="mod" /><Kbd keys="k" />
          </button>
        ) : null}
      </div>
      <div className="editor-ribbon-tools" aria-label="Editor commands">
        <RibbonGroup label="History">
          <CommandButton label="Undo" buttonIcon={icon(Undo2)} onClick={() => editor?.chain().focus().undo().run()} isDisabled={!canUndo} shortcut={hint('undo')} />
          <CommandButton label="Redo" buttonIcon={icon(Redo2)} onClick={() => editor?.chain().focus().redo().run()} isDisabled={!canRedo} shortcut={hint('redo')} />
        </RibbonGroup>
        <RibbonSep />

        <RibbonGroup label="Block">
          <Selector
            label="Block style"
            isLabelHidden
            options={blockOptions}
            value={currentBlock(editor)}
            onChange={(value) => applyBlock(editor, value)}
            size="sm"
            width={150}
          />
        </RibbonGroup>
        <RibbonSep />

        <RibbonGroup label="Text">
          <CommandButton label="Bold" buttonIcon={icon(Bold)} onClick={() => editor?.chain().focus().toggleBold().run()} isActive={editor?.isActive('bold')} isDisabled={!isReady} shortcut={hint('bold')} />
          <CommandButton label="Italic" buttonIcon={icon(Italic)} onClick={() => editor?.chain().focus().toggleItalic().run()} isActive={editor?.isActive('italic')} isDisabled={!isReady} shortcut={hint('italic')} />
          <CommandButton label="Underline" buttonIcon={icon(Underline)} onClick={() => editor?.chain().focus().toggleUnderline().run()} isActive={editor?.isActive('underline')} isDisabled={!isReady} shortcut={hint('underline')} />
          <CommandButton label="Strikethrough" buttonIcon={icon(Strikethrough)} onClick={() => editor?.chain().focus().toggleStrike().run()} isActive={editor?.isActive('strike')} isDisabled={!isReady} shortcut={hint('strike')} />
          <CommandButton label="Inline code" buttonIcon={icon(Code2)} onClick={() => editor?.chain().focus().toggleCode().run()} isActive={editor?.isActive('code')} isDisabled={!isReady} shortcut={hint('code')} />
          <CommandButton label="Highlight" buttonIcon={icon(Highlighter)} onClick={() => editor?.chain().focus().toggleHighlight({color: HIGHLIGHT_COLOR}).run()} isActive={editor?.isActive('highlight')} isDisabled={!isReady} shortcut={hint('highlight')} />
          <CommandButton label="Clear formatting" buttonIcon={icon(RemoveFormatting)} onClick={() => editor?.chain().focus().unsetAllMarks().run()} isDisabled={!isReady} />
          <CommandButton label="Clear blocks" buttonIcon={icon(BrushCleaning)} onClick={() => editor?.chain().focus().clearNodes().run()} isDisabled={!isReady} />
        </RibbonGroup>
        <RibbonSep />

        <RibbonGroup label="Structure">
          <CommandButton label="Bullet list" buttonIcon={icon(List)} onClick={() => editor?.chain().focus().toggleBulletList().run()} isActive={editor?.isActive('bulletList')} isDisabled={!isReady} shortcut={hint('bulletList')} />
          <CommandButton label="Ordered list" buttonIcon={icon(ListOrdered)} onClick={() => editor?.chain().focus().toggleOrderedList().run()} isActive={editor?.isActive('orderedList')} isDisabled={!isReady} shortcut={hint('orderedList')} />
          <CommandButton label="Quote" buttonIcon={icon(Quote)} onClick={() => editor?.chain().focus().toggleBlockquote().run()} isActive={editor?.isActive('blockquote')} isDisabled={!isReady} />
          <CommandButton label="Code block" buttonIcon={icon(Braces)} onClick={() => editor?.chain().focus().toggleCodeBlock().run()} isActive={editor?.isActive('codeBlock')} isDisabled={!isReady} />
        </RibbonGroup>
        <RibbonSep />

        <RibbonGroup label="Align">
          <CommandButton label="Align left" buttonIcon={icon(AlignLeft)} onClick={() => editor?.chain().focus().setTextAlign('left').run()} isActive={editor?.isActive({textAlign: 'left'})} isDisabled={!isReady} />
          <CommandButton label="Align center" buttonIcon={icon(AlignCenter)} onClick={() => editor?.chain().focus().setTextAlign('center').run()} isActive={editor?.isActive({textAlign: 'center'})} isDisabled={!isReady} />
          <CommandButton label="Align right" buttonIcon={icon(AlignRight)} onClick={() => editor?.chain().focus().setTextAlign('right').run()} isActive={editor?.isActive({textAlign: 'right'})} isDisabled={!isReady} />
          <CommandButton label="Justify" buttonIcon={icon(AlignJustify)} onClick={() => editor?.chain().focus().setTextAlign('justify').run()} isActive={editor?.isActive({textAlign: 'justify'})} isDisabled={!isReady} />
        </RibbonGroup>
        <RibbonSep />

        <RibbonGroup label="Link">
          <CommandButton label="Set link" buttonIcon={icon(Link)} onClick={onEditLink} isActive={editor?.isActive('link')} isDisabled={!isReady} />
          <CommandButton label="Remove link" buttonIcon={icon(Unlink)} onClick={() => editor?.chain().focus().extendMarkRange('link').unsetLink().run()} isDisabled={!editor?.isActive('link')} />
        </RibbonGroup>
        <RibbonSep />

        <RibbonGroup label="Review">
          <CommandButton label="Comment" buttonIcon={icon(MessageSquarePlus)} onClick={onAddComment} isDisabled={!isReady} shortcut={hint('comment')} />
          <CommandButton label={`${suggestionCount} suggestions`} buttonIcon={icon(Wand2)} onClick={() => onOpenInspectorView?.('review')} isDisabled={!isReady} badge={suggestionCount} />
          <CommandButton label={`${commentCount} comments`} buttonIcon={icon(MessageSquare)} onClick={() => onOpenInspectorView?.('comments')} isDisabled={!isReady} badge={commentCount} />
          <CommandButton label="AI draft" buttonIcon={icon(Sparkles)} onClick={() => onInsertCompletion?.(aiSuggestions[0])} isDisabled={!isReady || !aiSuggestions.length} />
        </RibbonGroup>

        <span className="editor-toolbar-spacer" aria-hidden="true" />

        {showThemeControls ? (
          <RibbonGroup label="View">
            <div className="editor-options-group" aria-label="View options">
              <Selector label="Theme" isLabelHidden options={THEME_OPTIONS} value={themeName} onChange={onThemeNameChange} size="sm" width={150} />
              <ToggleButton label="Dark mode" buttonIcon={icon(Moon)} value={activeTheme.forceDark || darkMode} onChange={onDarkModeChange} isDisabled={activeTheme.forceDark} />
              <ToggleButton label="Compact" buttonIcon={icon(Type)} value={compactMode} onChange={onCompactModeChange} />
              <ToggleButton label="Inspector" buttonIcon={icon(PanelRight)} value={showInspector} onChange={onShowInspectorChange} />
              <ToggleButton label="Completions" buttonIcon={icon(Sparkles)} value={showCompletions} onChange={onShowCompletionsChange} />
            </div>
          </RibbonGroup>
        ) : null}
      </div>
    </header>
  );
}
