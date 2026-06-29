import React from 'react';
import {Heading} from '@astryxdesign/core/Heading';
import {Kbd} from '@astryxdesign/core/Kbd';
import {Selector} from '@astryxdesign/core/Selector';
import {Text} from '@astryxdesign/core/Text';
import {Token} from '@astryxdesign/core/Token';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Braces,
  BrushCleaning,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  Link,
  List,
  ListOrdered,
  MessageSquare,
  MessageSquarePlus,
  Moon,
  PanelRight,
  Pilcrow,
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

const iconProps = {size: 16, strokeWidth: 2, 'aria-hidden': true};

function icon(IconComponent, size = 16) {
  return <IconComponent {...iconProps} size={size} />;
}

function normalizeLink(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(text)) return text;
  return `https://${text}`;
}

function currentBlock(editor) {
  if (!editor) return 'paragraph';
  if (editor.isActive('heading', {level: 1})) return 'heading-1';
  if (editor.isActive('heading', {level: 2})) return 'heading-2';
  if (editor.isActive('heading', {level: 3})) return 'heading-3';
  if (editor.isActive('blockquote')) return 'blockquote';
  if (editor.isActive('codeBlock')) return 'code-block';
  return 'paragraph';
}

function applyBlock(editor, block) {
  if (!editor) return;
  const chain = editor.chain().focus();
  if (block === 'paragraph') chain.setParagraph().run();
  if (block === 'heading-1') chain.setHeading({level: 1}).run();
  if (block === 'heading-2') chain.setHeading({level: 2}).run();
  if (block === 'heading-3') chain.setHeading({level: 3}).run();
  if (block === 'blockquote') chain.toggleBlockquote().run();
  if (block === 'code-block') chain.toggleCodeBlock().run();
}

function setLink(editor) {
  if (!editor) return;
  const previous = editor.getAttributes('link').href || '';
  const input = window.prompt('Link URL', previous);
  if (input === null) return;
  const href = normalizeLink(input);
  if (!href) {
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    return;
  }
  editor.chain().focus().extendMarkRange('link').setLink({href}).run();
}

function RibbonGroup({label, children, className = ''}) {
  return (
    <section className={`editor-ribbon-group ${className}`} aria-label={label}>
      <div className="editor-ribbon-actions">{children}</div>
      <div className="editor-ribbon-label">{label}</div>
    </section>
  );
}

function CommandButton({label, buttonIcon, onClick, isActive = false, isDisabled = false, size = 'icon', badge, shortcut}) {
  return (
    <button
      className={`editor-command ${size} ${isActive ? 'active' : ''}`}
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      title={label}
      aria-label={label}
      aria-pressed={isActive ? 'true' : undefined}>
      <span className="editor-command-icon">{buttonIcon}</span>
      {badge !== undefined && badge !== null ? <span className="editor-command-badge">{badge}</span> : null}
      {size === 'icon' ? null : <span className="editor-command-label">{label}</span>}
      {shortcut?.length ? (
        <span className="editor-command-shortcut" role="tooltip">
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
  title,
  subtitle,
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
  onOpenInspectorView,
  onInsertCompletion,
  showThemeControls = true,
  showKeyboardHints = true,
}) {
  const isReady = Boolean(editor);
  const canUndo = Boolean(editor?.can().undo());
  const canRedo = Boolean(editor?.can().redo());

  return (
    <header className="editor-topbar">
      <div className="editor-brand-mark">A</div>
      <div className="editor-title">
        <Heading level={1}>{title}</Heading>
        {subtitle ? <Text type="supporting" display="block">{subtitle}</Text> : null}
      </div>
      <div className="editor-stats" aria-label="Document stats">
        <Token color="green" label={`${stats.words.toLocaleString()} words`} />
        <Token color="blue" label={`${stats.blocks.toLocaleString()} blocks`} />
        <Token color="purple" label={`${stats.readingMinutes.toLocaleString()} min`} />
      </div>
      <div className="editor-ribbon-tabs" role="tablist" aria-label="Ribbon tabs">
        <button className="editor-ribbon-tab active" type="button">Home</button>
        <button className="editor-ribbon-tab" type="button">Insert</button>
        <button className="editor-ribbon-tab" type="button">Review</button>
        <button className="editor-ribbon-tab" type="button">View</button>
      </div>
      <div className="editor-ribbon-tools" aria-label="Editor commands">
        <RibbonGroup label="History">
          <CommandButton label="Undo" buttonIcon={icon(Undo2)} onClick={() => editor?.chain().focus().undo().run()} isDisabled={!canUndo} />
          <CommandButton label="Redo" buttonIcon={icon(Redo2)} onClick={() => editor?.chain().focus().redo().run()} isDisabled={!canRedo} />
        </RibbonGroup>

        <RibbonGroup label="Block" className="editor-ribbon-group-block">
          <div className="block-style-select">
            <Selector
              label="Block style"
              isLabelHidden
              options={blockOptions}
              value={currentBlock(editor)}
              onChange={(value) => applyBlock(editor, value)}
              size="sm"
              width={150}
            />
          </div>
          <CommandButton label="Paragraph" buttonIcon={icon(Pilcrow)} onClick={() => applyBlock(editor, 'paragraph')} isDisabled={!isReady} />
          <CommandButton label="Heading 1" buttonIcon={icon(Heading1)} onClick={() => applyBlock(editor, 'heading-1')} isActive={editor?.isActive('heading', {level: 1})} isDisabled={!isReady} />
          <CommandButton label="Heading 2" buttonIcon={icon(Heading2)} onClick={() => applyBlock(editor, 'heading-2')} isActive={editor?.isActive('heading', {level: 2})} isDisabled={!isReady} />
          <CommandButton label="Heading 3" buttonIcon={icon(Heading3)} onClick={() => applyBlock(editor, 'heading-3')} isActive={editor?.isActive('heading', {level: 3})} isDisabled={!isReady} />
        </RibbonGroup>

        <RibbonGroup label="Text">
          <CommandButton label="Bold" buttonIcon={icon(Bold)} onClick={() => editor?.chain().focus().toggleBold().run()} isActive={editor?.isActive('bold')} isDisabled={!isReady} shortcut={showKeyboardHints ? ['mod', 'b'] : null} />
          <CommandButton label="Italic" buttonIcon={icon(Italic)} onClick={() => editor?.chain().focus().toggleItalic().run()} isActive={editor?.isActive('italic')} isDisabled={!isReady} />
          <CommandButton label="Underline" buttonIcon={icon(Underline)} onClick={() => editor?.chain().focus().toggleUnderline().run()} isActive={editor?.isActive('underline')} isDisabled={!isReady} />
          <CommandButton label="Strike" buttonIcon={icon(Strikethrough)} onClick={() => editor?.chain().focus().toggleStrike().run()} isActive={editor?.isActive('strike')} isDisabled={!isReady} />
          <CommandButton label="Inline code" buttonIcon={icon(Code2)} onClick={() => editor?.chain().focus().toggleCode().run()} isActive={editor?.isActive('code')} isDisabled={!isReady} />
          <CommandButton label="Highlight" buttonIcon={icon(Highlighter)} onClick={() => editor?.chain().focus().toggleHighlight({color: '#fef08a'}).run()} isActive={editor?.isActive('highlight')} isDisabled={!isReady} />
        </RibbonGroup>

        <RibbonGroup label="Clear">
          <CommandButton label="Clear marks" buttonIcon={icon(RemoveFormatting)} onClick={() => editor?.chain().focus().unsetAllMarks().run()} isDisabled={!isReady} />
          <CommandButton label="Clear nodes" buttonIcon={icon(BrushCleaning)} onClick={() => editor?.chain().focus().clearNodes().run()} isDisabled={!isReady} />
        </RibbonGroup>

        <RibbonGroup label="Structure">
          <CommandButton label="Bullet list" buttonIcon={icon(List)} onClick={() => editor?.chain().focus().toggleBulletList().run()} isActive={editor?.isActive('bulletList')} isDisabled={!isReady} />
          <CommandButton label="Ordered list" buttonIcon={icon(ListOrdered)} onClick={() => editor?.chain().focus().toggleOrderedList().run()} isActive={editor?.isActive('orderedList')} isDisabled={!isReady} />
          <CommandButton label="Quote" buttonIcon={icon(Quote)} onClick={() => editor?.chain().focus().toggleBlockquote().run()} isActive={editor?.isActive('blockquote')} isDisabled={!isReady} />
          <CommandButton label="Code block" buttonIcon={icon(Braces)} onClick={() => editor?.chain().focus().toggleCodeBlock().run()} isActive={editor?.isActive('codeBlock')} isDisabled={!isReady} />
        </RibbonGroup>

        <RibbonGroup label="Align">
          <CommandButton label="Align left" buttonIcon={icon(AlignLeft)} onClick={() => editor?.chain().focus().setTextAlign('left').run()} isActive={editor?.isActive({textAlign: 'left'})} isDisabled={!isReady} />
          <CommandButton label="Align center" buttonIcon={icon(AlignCenter)} onClick={() => editor?.chain().focus().setTextAlign('center').run()} isActive={editor?.isActive({textAlign: 'center'})} isDisabled={!isReady} />
          <CommandButton label="Align right" buttonIcon={icon(AlignRight)} onClick={() => editor?.chain().focus().setTextAlign('right').run()} isActive={editor?.isActive({textAlign: 'right'})} isDisabled={!isReady} />
          <CommandButton label="Justify" buttonIcon={icon(AlignJustify)} onClick={() => editor?.chain().focus().setTextAlign('justify').run()} isActive={editor?.isActive({textAlign: 'justify'})} isDisabled={!isReady} />
        </RibbonGroup>

        <RibbonGroup label="Link">
          <CommandButton label="Set link" buttonIcon={icon(Link)} onClick={() => setLink(editor)} isActive={editor?.isActive('link')} isDisabled={!isReady} />
          <CommandButton label="Unset link" buttonIcon={icon(Unlink)} onClick={() => editor?.chain().focus().extendMarkRange('link').unsetLink().run()} isDisabled={!editor?.isActive('link')} />
        </RibbonGroup>

        <RibbonGroup label="Review" className="editor-ribbon-group-review">
          <CommandButton label="Comment" buttonIcon={icon(MessageSquarePlus)} onClick={onAddComment} isDisabled={!isReady} />
          <CommandButton label={`${suggestionCount} suggestions`} buttonIcon={icon(Wand2)} onClick={() => onOpenInspectorView?.('review')} isDisabled={!isReady} badge={suggestionCount} />
          <CommandButton label={`${commentCount} comments`} buttonIcon={icon(MessageSquare)} onClick={() => onOpenInspectorView?.('comments')} isDisabled={!isReady} badge={commentCount} />
          <CommandButton label="AI draft" buttonIcon={icon(Sparkles)} onClick={() => onInsertCompletion?.(aiSuggestions[0])} isDisabled={!isReady || !aiSuggestions.length} />
        </RibbonGroup>

        <span className="editor-toolbar-spacer" aria-hidden="true" />

        {showThemeControls ? (
          <RibbonGroup label="View" className="editor-ribbon-group-view">
            <div className="editor-options-group" aria-label="View options">
              <Selector label="Theme" isLabelHidden options={THEME_OPTIONS} value={themeName} onChange={onThemeNameChange} size="sm" width={150} />
              <ToggleButton label="Dark" buttonIcon={icon(Moon)} value={activeTheme.forceDark || darkMode} onChange={onDarkModeChange} isDisabled={activeTheme.forceDark} />
              <ToggleButton label="Compact" buttonIcon={icon(Type)} value={compactMode} onChange={onCompactModeChange} />
              <ToggleButton label="Inspector" buttonIcon={icon(PanelRight)} value={showInspector} onChange={onShowInspectorChange} />
              <ToggleButton label="Complete" buttonIcon={icon(Sparkles)} value={showCompletions} onChange={onShowCompletionsChange} />
            </div>
          </RibbonGroup>
        ) : null}
      </div>
    </header>
  );
}
