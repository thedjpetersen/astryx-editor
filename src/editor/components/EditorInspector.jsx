import React, {useMemo, useState} from 'react';
import {Text} from '@astryxdesign/core/Text';
import {Token} from '@astryxdesign/core/Token';
import {getDocumentOutline} from '../documentUtils.js';

function countNodes(node) {
  if (!node) return 0;
  return 1 + (node.content || []).reduce((total, child) => total + countNodes(child), 0);
}

function formatDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat(undefined, {month: 'short', day: 'numeric'}).format(new Date(value));
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
        <strong>{comment.author || 'Author'}</strong>
        <span>{formatDate(comment.createdAt)}</span>
      </div>
      <p>{comment.note}</p>
      {comment.replies?.length ? (
        <div className="comment-replies">
          {comment.replies.map((item) => (
            <div key={item.id} className="comment-reply">
              <div className="comment-meta">
                <strong>{item.author || 'Author'}</strong>
                <span>{formatDate(item.createdAt)}</span>
              </div>
              <p>{item.note}</p>
            </div>
          ))}
        </div>
      ) : null}
      {resolved ? (
        <div className="comment-actions">
          <button type="button" onClick={() => onReopen?.(comment.id)}>Reopen</button>
          <button type="button" onClick={() => onDelete?.(comment.id)}>Delete</button>
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
            <button type="submit" disabled={!reply.trim()}>Reply</button>
          </form>
          <div className="comment-actions">
            <button type="button" onClick={() => onLocate?.(comment.id)}>Jump to text</button>
            <button type="button" onClick={() => onResolve?.(comment.id)}>Resolve</button>
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
  const view = controlledView || uncontrolledView;
  const setView = (nextView) => {
    setUncontrolledView(nextView);
    onViewChange?.(nextView);
  };
  const outline = useMemo(() => getDocumentOutline(editor), [editor, stats.blocks, stats.headings]);
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

  return (
    <aside className="editor-inspector" aria-label="Document inspector">
      <div className="inspector-tabs" role="tablist" aria-label="Inspector views">
        <button className={view === 'review' ? 'active' : ''} type="button" onClick={() => setView('review')}>Review</button>
        <button className={view === 'comments' ? 'active' : ''} type="button" onClick={() => setView('comments')}>Comments</button>
        <button className={view === 'outline' ? 'active' : ''} type="button" onClick={() => setView('outline')}>Outline</button>
        <button className={view === 'stats' ? 'active' : ''} type="button" onClick={() => setView('stats')}>Stats</button>
        <button className={view === 'source' ? 'active' : ''} type="button" onClick={() => setView('source')}>Source</button>
      </div>

      {view === 'review' ? (
        <div className="inspector-panel review-panel">
          <div className="panel-summary">
            <Token color={severityCount('high') ? 'red' : 'green'} label={`${severityCount('high')} high`} />
            <Token color={severityCount('medium') ? 'orange' : 'green'} label={`${severityCount('medium')} medium`} />
            <Token color={severityCount('low') ? 'blue' : 'green'} label={`${severityCount('low')} low`} />
          </div>
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
          {fixableCount > 1 || dismissedSuggestionCount ? (
            <div className="panel-actions">
              {fixableCount > 1 ? (
                <button className="panel-action primary" type="button" onClick={onAcceptAllSuggestions}>
                  Apply {fixableCount} safe fixes
                </button>
              ) : null}
              {dismissedSuggestionCount ? (
                <button className="panel-action" type="button" onClick={onRestoreDismissedSuggestions}>
                  Restore {dismissedSuggestionCount} dismissed
                </button>
              ) : null}
            </div>
          ) : null}
          {filteredSuggestions.length ? (
            <div className="suggestion-list">
              {filteredSuggestions.map((suggestion) => (
                <article
                  key={suggestion.id}
                  className={`suggestion-card severity-${suggestion.severity}`}
                  tabIndex={0}
                  role="button"
                  aria-label={`Show "${suggestion.label}" in the document`}
                  onClick={() => onLocateSuggestion?.(suggestion)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    onLocateSuggestion?.(suggestion);
                  }}>
                  <div className="suggestion-type">{suggestion.type.replace(/-/g, ' ')}</div>
                  <h3>{suggestion.label}</h3>
                  <p>{suggestion.detail}</p>
                  <div className="suggestion-actions">
                    <button type="button" disabled={suggestion.replacement === undefined} onClick={(event) => { event.stopPropagation(); onAcceptSuggestion?.(suggestion); }}>Apply</button>
                    <button type="button" onClick={(event) => { event.stopPropagation(); onCommentOnSuggestion?.(suggestion); }}>Comment</button>
                    <button type="button" onClick={(event) => { event.stopPropagation(); onDismissSuggestion?.(suggestion); }}>Dismiss</button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <Text type="supporting">
              {suggestions.length ? 'No suggestions match this filter' : 'No writing suggestions'}
            </Text>
          )}
        </div>
      ) : null}

      {view === 'comments' ? (
        <div className="inspector-panel comments-panel">
          <div className="panel-summary">
            <Token color={openComments.length ? 'purple' : 'green'} label={`${openComments.length} open`} />
            {resolvedComments.length ? <Token color="gray" label={`${resolvedComments.length} resolved`} /> : null}
            <button className="panel-action" type="button" onClick={onAddComment}>New comment</button>
          </div>
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
            <Text type="supporting">No open comments — select text and choose New comment</Text>
          )}
          {resolvedComments.length ? (
            <details className="resolved-comments">
              <summary>{resolvedComments.length} resolved</summary>
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
                  onClick={() => editor?.commands.focus()}>
                  <span>{item.text}</span>
                </button>
              ))}
            </nav>
          ) : (
            <Text type="supporting">No headings</Text>
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
