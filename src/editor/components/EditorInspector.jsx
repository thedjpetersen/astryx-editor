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

export function EditorInspector({
  editor,
  stats,
  comments = [],
  suggestions = [],
  view: controlledView,
  onViewChange,
  onResolveComment,
  onAcceptSuggestion,
  onCommentOnSuggestion,
}) {
  const [uncontrolledView, setUncontrolledView] = useState('review');
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
            <Token color={suggestions.length ? 'orange' : 'green'} label={`${suggestions.length} suggestions`} />
            <Token color={openComments.length ? 'purple' : 'green'} label={`${openComments.length} open comments`} />
          </div>
          {suggestions.length ? (
            <div className="suggestion-list">
              {suggestions.map((suggestion) => (
                <article key={suggestion.id} className={`suggestion-card severity-${suggestion.severity}`}>
                  <div className="suggestion-type">{suggestion.type.replace(/-/g, ' ')}</div>
                  <h3>{suggestion.label}</h3>
                  <p>{suggestion.detail}</p>
                  <div className="suggestion-actions">
                    <button type="button" disabled={suggestion.replacement === undefined} onClick={() => onAcceptSuggestion?.(suggestion)}>Apply</button>
                    <button type="button" onClick={() => onCommentOnSuggestion?.(suggestion)}>Comment</button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <Text type="supporting">No writing suggestions</Text>
          )}
        </div>
      ) : null}

      {view === 'comments' ? (
        <div className="inspector-panel comments-panel">
          {openComments.length ? (
            <div className="comment-list">
              {openComments.map((comment) => (
                <article key={comment.id} className="comment-card">
                  <div className="comment-meta">
                    <strong>{comment.author || 'Author'}</strong>
                    <span>{formatDate(comment.createdAt)}</span>
                  </div>
                  <p>{comment.note}</p>
                  <button type="button" onClick={() => onResolveComment?.(comment.id)}>Resolve</button>
                </article>
              ))}
            </div>
          ) : (
            <Text type="supporting">No open comments</Text>
          )}
          {resolvedComments.length ? (
            <details className="resolved-comments">
              <summary>{resolvedComments.length} resolved</summary>
              {resolvedComments.map((comment) => (
                <p key={comment.id}>{comment.note}</p>
              ))}
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
