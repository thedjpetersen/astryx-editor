import React from 'react';
import {Sparkles, Wand2} from 'lucide-react';

const iconProps = {size: 16, strokeWidth: 2, 'aria-hidden': true};

export function CompletionPanel({autocompleteSuggestions, aiSuggestions, onInsert}) {
  const hasAutocomplete = autocompleteSuggestions.length > 0;
  const hasAi = aiSuggestions.length > 0;
  if (!hasAutocomplete && !hasAi) return null;

  return (
    <section className="completion-panel" aria-label="Writing completions">
      {hasAutocomplete ? (
        <div className="completion-lane">
          <div className="completion-lane-label"><Wand2 {...iconProps} />Autocomplete</div>
          <div className="completion-chips">
            {autocompleteSuggestions.map((item) => (
              <button key={item.id} type="button" onClick={() => onInsert(item)}>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {hasAi ? (
        <div className="completion-lane ai">
          <div className="completion-lane-label"><Sparkles {...iconProps} />AI draft</div>
          <div className="completion-cards">
            {aiSuggestions.map((item) => (
              <button key={item.id} type="button" onClick={() => onInsert(item)}>
                <span className="completion-card-label">{item.label}</span>
                <span className="completion-card-detail">{item.detail}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
