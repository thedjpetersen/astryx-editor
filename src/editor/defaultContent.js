export const DEFAULT_EDITOR_CONTENT = `
<h1>Project Brief: Astryx Editor</h1>
<p>A compact authoring surface for <span data-comment-id="comment-intro" data-comment-author="DJ" data-comment-note="This phrase anchors the first review thread.">drafting product briefs, release notes, technical plans, and long-form working documents</span>.</p>
<h2>Release Shape</h2>
<p>The first public package should feel useful as a complete editor while still exposing the core document primitives for embedded use.</p>
<ul>
  <li><p>Use Astryx themes for product chrome, commands, status, and document furniture.</p></li>
  <li><p>Keep the editing engine independent from the surrounding application shell.</p></li>
  <li><p>Make document state easy to serialize as HTML, JSON, and plain text.</p></li>
</ul>
<blockquote>
  <p>The package should start small, but every layer should be replaceable by a host application.</p>
</blockquote>
<h2>Draft Notes</h2>
<p>The editor surface uses a page canvas, outline-aware inspector, comment threads, writing suggestions, autocomplete, and a focused toolbar that can grow into block palettes, collaboration, comments, and persistence.</p>
<p>In order to validate review affordances, this draft includes teh kind of rough wording that is really useful during editing.</p>
<pre><code>status: draft
owner: editor package
surface: astryx + tiptap</code></pre>
`;

export const DEFAULT_EDITOR_COMMENTS = [
  {
    id: 'comment-intro',
    author: 'DJ',
    note: 'This phrase anchors the first review thread.',
    createdAt: '2026-06-28T18:00:00.000Z',
    status: 'open',
  },
];
