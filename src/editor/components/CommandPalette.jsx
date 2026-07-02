import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Kbd} from '@astryxdesign/core/Kbd';

/**
 * Cmd+K command palette. Commands are plain {id, group, label, shortcut, run}
 * objects supplied by the host, so the palette can never drift from the
 * toolbar — both call the same handlers. Escape ladder: a non-empty query
 * clears first; a second Escape closes and returns focus to the document.
 */
export function CommandPalette({commands, onClose}) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef(null);

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return commands;
    return commands.filter((command) =>
      `${command.group} ${command.label}`.toLowerCase().includes(text));
  }, [commands, query]);

  const active = filtered[Math.min(activeIndex, filtered.length - 1)];

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    const option = listRef.current?.querySelector('[aria-selected="true"]');
    option?.scrollIntoView({block: 'nearest'});
  }, [activeIndex, filtered]);

  const runCommand = (command) => {
    onClose();
    command.run();
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Tab') {
      event.preventDefault();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, filtered.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (active) runCommand(active);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      if (query) setQuery('');
      else onClose();
    }
  };

  let lastGroup = null;

  return (
    <div
      className="palette-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}>
      <div className="palette" role="dialog" aria-modal="true" aria-label="Commands" onKeyDown={handleKeyDown}>
        <input
          className="palette-input"
          value={query}
          placeholder="Type a command..."
          aria-label="Search commands"
          autoFocus
          spellCheck={false}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="palette-list" role="listbox" aria-label="Commands" ref={listRef}>
          {filtered.length ? filtered.map((command) => {
            const header = command.group !== lastGroup ? command.group : null;
            lastGroup = command.group;
            return (
              <React.Fragment key={command.id}>
                {header ? <div className="palette-group" aria-hidden="true">{header}</div> : null}
                <div
                  id={`palette-${command.id}`}
                  className="palette-option"
                  role="option"
                  aria-selected={command === active}
                  onMouseEnter={() => setActiveIndex(filtered.indexOf(command))}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => runCommand(command)}>
                  <span className="palette-label">{command.label}</span>
                  {command.shortcut?.length ? (
                    <span className="palette-keys">
                      {command.shortcut.map((key) => <Kbd key={key} keys={key} />)}
                    </span>
                  ) : null}
                </div>
              </React.Fragment>
            );
          }) : (
            <div className="palette-empty">No matching commands</div>
          )}
        </div>
        <div className="palette-footer" aria-hidden="true">↑↓ navigate · ↵ run · esc close</div>
      </div>
    </div>
  );
}
