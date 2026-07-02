import React, {useMemo, useRef, useState} from 'react';
import {Text} from '@astryxdesign/core/Text';
import {Token} from '@astryxdesign/core/Token';
import {
  Check,
  CheckCircle2,
  ChevronRight,
  ListTree,
  LocateFixed,
  MessageSquare,
  MessageSquarePlus,
  RotateCcw,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import {getDocumentOutline} from '../documentUtils.js';

function countNodes(node) {
  if (!node) return 0;
  return 1 + (node.content || []).reduce((total, child) => total + countNodes(child), 0);
}

function formatDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat(undefined, {month: 'short', day: 'numeric'}).format(new Date(value));
}

function relativeTime(value) {
  if (!value) return '';
  const seconds = Math.max(0, (Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return 'now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return formatDate(value);
}

const SUGGESTION_TYPE_LABELS = {
  'typo': 'Typos',
  'repeat': 'Repeats',
  'wordy': 'Wordy',
  'hedge': 'Hedges',
  'passive': 'Passive',
  'long-sentence': 'Long',
};

function suggestionTypeLabel(type) {
  return SUGGESTION_TYPE_LABELS[type] || type.replace(/-/g, ' ');
}

const SUGGESTION_CARD_LABELS = {
  'typo': 'Typo',
  'repeat': 'Repeat',
  'wordy': 'Wordy',
  'hedge': 'Hedge',
  'passive': 'Passive',
  'long-sentence': 'Long sentence',
};

function AvatarChip({name}) {
  return <span className="avatar-chip" aria-hidden="true">{(name || 'A').trim()[0].toUpperCase()}</span>;
}

function PanelEmpty({icon: Icon, children, action}) {
  return (
    <div className="panel-empty">
      <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
      <p>{children}</p>
      {action}
    </div>
  );
}

function RowAction({label, icon: Icon, onClick, disabled = false}) {
  return (
    <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick}>
      <Icon size={14} strokeWidth={2} aria-hidden="true" />
    </button>
  );
}

function CommentThread({comment, resolved = false, onLocate, onResolve, onReopen, onDelete, onReply}) {
  const [reply, setReply] = useState('');
  const submitReply = (event) => {
    event.preventDefault();
    if (!reply.trim()) return;
    onReply?.(comment.id, reply);
    setReply('');
  };
  return (
    <article className={`comment-card ${resolved ? 'resolved' : ''}`}>
      <div className="comment-meta">
        <AvatarChip name={comment.author} />
        <strong>{comment.author || 'Author'}</strong>
        <time title={comment.createdAt ? new Date(comment.createdAt).toLocaleString() : undefined}>
          {relativeTime(comment.createdAt)}
        </time>
      </div>
      <p>{comment.note}</p>
      {comment.replies?.length ? (
        <div className="comment-replies">
          {comment.replies.map((item) => (
            <div key={item.id} className="comment-reply">
              <div className="comment-meta">
                <AvatarChip name={item.author} />
                <strong>{item.author || 'Author'}</strong>
                <time title={item.createdAt ? new Date(item.createdAt).toLocaleString() : undefined}>
                  {relativeTime(item.createdAt)}
                </time>
              </div>
              <p>{item.note}</p>
            </div>
          ))}
        </div>
      ) : null}
      {resolved ? (
        <div className="row-hover-actions">
          <RowAction label="Reopen" icon={RotateCcw} onClick={() => onReopen?.(comment.id)} />
          <RowAction label="Delete" icon={Trash2} onClick={() => onDelete?.(comment.id)} />
        </div>
      ) : (
        <>
          <form className="comment-reply-form" onSubmit={submitReply}>
            <input
              type="text"
              value={reply}
              placeholder="Reply..."
              aria-label={`Reply to ${comment.author || 'Author'}`}
              onChange={(event) => setReply(event.target.value)}
            />
            <button type="submit" className="panel-action" disabled={!reply.trim()}>Reply</button>
          </form>
          <div className="row-hover-actions">
            <RowAction label="Jump to text" icon={LocateFixed} onClick={() => onLocate?.(comment.id)} />
            <RowAction label="Resolve" icon={Check} onClick={() => onResolve?.(comment.id)} />
          </div>
        </>
      )}
    </article>
  );
}

export function EditorInspector({
  editor,
  stats,
  comments = [],
  suggestions = [],
  view: controlledView,
  onViewChange,
  onResolveComment,
  onReopenComment,
  onDeleteComment,
  onReplyToComment,
  onLocateComment,
  onAddComment,
  onAcceptSuggestion,
  onAcceptAllSuggestions,
  onDismissSuggestion,
  dismissedSuggestionCount = 0,
  onRestoreDismissedSuggestions,
  onLocateSuggestion,
  onCommentOnSuggestion,
}) {
  const [uncontrolledView, setUncontrolledView] = useState('review');
  const [suggestionFilter, setSuggestionFilter] = useState('all');
  // Suggestion ids leaving via the dismiss collapse. Dismissal never mutates
  // the document, so positions (and therefore ids) stay stable while the slot
  // animates closed; the actual dismissal commits on transitionend, with a
  // timeout fallback for browsers that don't transition grid-template-rows.
  const leavingRef = useRef(new Map());
  const [leavingIds, setLeavingIds] = useState(() => new Set());
  const view = controlledView || uncontrolledView;
  const setView = (nextView) => {
    setUncontrolledView(nextView);
    onViewChange?.(nextView);
  };
  const outline = useMemo(() => getDocumentOutline(editor), [editor, stats.blocks, stats.headings, stats.characters]);
  const snapshot = useMemo(() => editor?.getJSON?.() || {type: 'doc', content: []}, [editor, stats.characters, stats.blocks]);
  const html = useMemo(() => editor?.getHTML?.() || '', [editor, stats.characters, stats.blocks]);
  const nodeCount = useMemo(() => countNodes(snapshot), [snapshot]);
  const openComments = comments.filter((comment) => comment.status !== 'resolved');
  const resolvedComments = comments.filter((comment) => comment.status === 'resolved');

  const suggestionTypes = useMemo(() => {
    const counts = new Map();
    for (const suggestion of suggestions) {
      counts.set(suggestion.type, (counts.get(suggestion.type) || 0) + 1);
    }
    return [...counts.entries()];
  }, [suggestions]);
  const filteredSuggestions = suggestionFilter === 'all'
    ? suggestions
    : suggestions.filter((suggestion) => suggestion.type === suggestionFilter);
  const severityCount = (severity) => suggestions.filter((item) => item.severity === severity).length;
  const fixableCount = suggestions.filter((item) => item.replacement !== undefined).length;

  const commitDismiss = (suggestionId) => {
    const suggestion = leavingRef.current.get(suggestionId);
    if (!suggestion) return;
    leavingRef.current.delete(suggestionId);
    setLeavingIds((ids) => {
      const next = new Set(ids);
      next.delete(suggestionId);
      return next;
    });
    onDismissSuggestion?.(suggestion);
  };

  const beginDismiss = (suggestion) => {
    if (leavingRef.current.has(suggestion.id)) return;
    leavingRef.current.set(suggestion.id, suggestion);
    setLeavingIds((ids) => new Set(ids).add(suggestion.id));
    window.setTimeout(() => commitDismiss(suggestion.id), 400);
  };

  const traverseSuggestions = (event, delta) => {
    const cards = [...event.currentTarget.closest('.suggestion-list')?.querySelectorAll('.suggestion-card') || []];
    const next = cards[cards.indexOf(event.currentTarget) + delta];
    next?.focus();
  };

  const tabs = [
    {id: 'review', label: 'Review', count: suggestions.length},
    {id: 'comments', label: 'Comments', count: openComments.length},
    {id: 'outline', label: 'Outline'},
    {id: 'stats', label: 'Stats'},
    {id: 'source', label: 'Source'},
  ];

  return (
    <aside
      className="editor-inspector"
      aria-label="Document inspector"
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        event.stopPropagation();
        editor?.commands.focus();
      }}>
      <div className="inspector-tabs" aria-label="Inspector views">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={view === tab.id ? 'active' : ''}
            type="button"
            onClick={() => setView(tab.id)}>
            {tab.label}
            {tab.count ? <span className="tab-count">{tab.count}</span> : null}
          </button>
        ))}
      </div>

      {view === 'review' ? (
        <div className="inspector-panel review-panel">
          {suggestions.length ? (
            <header className="panel-header">
              <div className="panel-header-tokens">
                {severityCount('high') ? <Token color="red" label={`${severityCount('high')} high`} /> : null}
                {severityCount('medium') ? <Token color="orange" label={`${severityCount('medium')} medium`} /> : null}
                {severityCount('low') ? <Token color="blue" label={`${severityCount('low')} low`} /> : null}
              </div>
              {fixableCount > 1 ? (
                <button className="panel-action primary" type="button" onClick={onAcceptAllSuggestions}>
                  Apply {fixableCount} safe fixes
                </button>
              ) : null}
            </header>
          ) : null}
          {suggestionTypes.length > 1 ? (
            <div className="filter-chips" role="group" aria-label="Filter suggestions by type">
              <button
                className={suggestionFilter === 'all' ? 'active' : ''}
                type="button"
                onClick={() => setSuggestionFilter('all')}>
                All ({suggestions.length})
              </button>
              {suggestionTypes.map(([type, count]) => (
                <button
                  key={type}
                  className={suggestionFilter === type ? 'active' : ''}
                  type="button"
                  onClick={() => setSuggestionFilter(suggestionFilter === type ? 'all' : type)}>
                  {suggestionTypeLabel(type)} ({count})
                </button>
              ))}
            </div>
          ) : null}
          {dismissedSuggestionCount ? (
            <div className="panel-actions">
              <button className="panel-action" type="button" onClick={onRestoreDismissedSuggestions}>
                Restore {dismissedSuggestionCount} dismissed
              </button>
            </div>
          ) : null}
          {filteredSuggestions.length ? (
            <div className="suggestion-list">
              {filteredSuggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className={`suggestion-slot ${leavingIds.has(suggestion.id) ? 'leaving' : ''}`}
                  onTransitionEnd={(event) => {
                    if (event.propertyName !== 'grid-template-rows') return;
                    commitDismiss(suggestion.id);
                  }}>
                  <div className="suggestion-slot-inner">
                    <article
                      className={`suggestion-card severity-${suggestion.severity}`}
                      tabIndex={0}
                      aria-label={`Show "${suggestion.label}" in the document`}
                      onClick={() => onLocateSuggestion?.(suggestion)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onLocateSuggestion?.(suggestion);
                        } else if (event.key === 'ArrowDown') {
                          event.preventDefault();
                          traverseSuggestions(event, 1);
                        } else if (event.key === 'ArrowUp') {
                          event.preventDefault();
                          traverseSuggestions(event, -1);
                        }
                      }}>
                      <div className="suggestion-type">{SUGGESTION_CARD_LABELS[suggestion.type] || suggestion.type.replace(/-/g, ' ')}</div>
                      <h3>{suggestion.label}</h3>
                      <p>{suggestion.detail}</p>
                      <div className="row-hover-actions">
                        <RowAction
                          label="Apply fix"
                          icon={Check}
                          disabled={suggestion.replacement === undefined}
                          onClick={(event) => { event.stopPropagation(); onAcceptSuggestion?.(suggestion); }}
                        />
                        <RowAction
                          label="Comment"
                          icon={MessageSquarePlus}
                          onClick={(event) => { event.stopPropagation(); onCommentOnSuggestion?.(suggestion); }}
                        />
                        <RowAction
                          label="Dismiss"
                          icon={X}
                          onClick={(event) => { event.stopPropagation(); beginDismiss(suggestion); }}
                        />
                      </div>
                    </article>
                  </div>
                </div>
              ))}
            </div>
          ) : suggestions.length ? (
            <PanelEmpty
              icon={SlidersHorizontal}
              action={<button className="panel-action" type="button" onClick={() => setSuggestionFilter('all')}>Clear filter</button>}>
              No {suggestionTypeLabel(suggestionFilter).toLowerCase()} suggestions.
            </PanelEmpty>
          ) : (
            <PanelEmpty icon={CheckCircle2}>All clear. Nothing to review.</PanelEmpty>
          )}
        </div>
      ) : null}

      {view === 'comments' ? (
        <div className="inspector-panel comments-panel">
          {openComments.length ? (
            <header className="panel-header">
              <div className="panel-header-tokens">
                <Token color="purple" label={`${openComments.length} open`} />
              </div>
              <button className="panel-action" type="button" onClick={onAddComment}>New comment</button>
            </header>
          ) : null}
          {openComments.length ? (
            <div className="comment-list">
              {openComments.map((comment) => (
                <CommentThread
                  key={comment.id}
                  comment={comment}
                  onLocate={onLocateComment}
                  onResolve={onResolveComment}
                  onReply={onReplyToComment}
                />
              ))}
            </div>
          ) : (
            <PanelEmpty
              icon={MessageSquare}
              action={<button className="panel-action" type="button" onClick={onAddComment}>New comment</button>}>
              No comments yet. Select text to start a thread.
            </PanelEmpty>
          )}
          {resolvedComments.length ? (
            <details className="resolved-comments">
              <summary>
                <ChevronRight size={12} strokeWidth={2} aria-hidden="true" />
                Resolved
                <span className="tab-count">{resolvedComments.length}</span>
              </summary>
              <div className="comment-list">
                {resolvedComments.map((comment) => (
                  <CommentThread
                    key={comment.id}
                    comment={comment}
                    resolved
                    onReopen={onReopenComment}
                    onDelete={onDeleteComment}
                  />
                ))}
              </div>
            </details>
          ) : null}
        </div>
      ) : null}

      {view === 'outline' ? (
        <div className="inspector-panel">
          {outline.length ? (
            <nav className="outline-list" aria-label="Document outline">
              {outline.map((item) => (
                <button
                  key={item.id}
                  className={`outline-item level-${item.level}`}
                  type="button"
                  onClick={() => {
                    if (item.pos === undefined) {
                      editor?.commands.focus();
                      return;
                    }
                    editor?.chain().focus().setTextSelection(item.pos + 1).scrollIntoView().run();
                  }}>
                  <span>{item.text}</span>
                </button>
              ))}
            </nav>
          ) : (
            <PanelEmpty icon={ListTree}>No headings yet. Add a heading to build the outline.</PanelEmpty>
          )}
        </div>
      ) : null}

      {view === 'stats' ? (
        <div className="inspector-panel stats-panel">
          <div className="metric-grid">
            <div className="metric">
              <span className="metric-value">{stats.words.toLocaleString()}</span>
              <span className="metric-label">Words</span>
            </div>
            <div className="metric">
              <span className="metric-value">{stats.characters.toLocaleString()}</span>
              <span className="metric-label">Characters</span>
            </div>
            <div className="metric">
              <span className="metric-value">{stats.blocks.toLocaleString()}</span>
              <span className="metric-label">Blocks</span>
            </div>
            <div className="metric">
              <span className="metric-value">{nodeCount.toLocaleString()}</span>
              <span className="metric-label">Nodes</span>
            </div>
          </div>
          <div className="status-row">
            <Token color="green" label={`${stats.headings} headings`} />
            <Token color="blue" label={`${stats.readingMinutes} min read`} />
          </div>
        </div>
      ) : null}

      {view === 'source' ? (
        <div className="inspector-panel source-panel">
          <label className="source-label" htmlFor="editor-html-source">HTML</label>
          <textarea id="editor-html-source" readOnly value={html} />
          <label className="source-label" htmlFor="editor-json-source">JSON</label>
          <textarea id="editor-json-source" readOnly value={JSON.stringify(snapshot, null, 2)} />
        </div>
      ) : null}
    </aside>
  );
}
