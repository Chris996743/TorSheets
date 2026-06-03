import React from 'react';
import type { RollMessage } from '../types';

interface RollLogProps {
  isOpen: boolean;
  onClose: () => void;
  rolls: RollMessage[];
  onClear: () => void;
}

export const RollLog: React.FC<RollLogProps> = ({ isOpen, onClose, rolls, onClear }) => {
  const formatFeatDie = (val: number) => {
    if (val === 12) return 'G'; // Gandalf
    if (val === 11) return 'S'; // Sauron
    return val.toString();
  };

  return (
    <div className={`roll-log-overlay ${isOpen ? 'open' : ''}`}>
      <div className="log-header">
        <h3 className="log-title">Roll Log</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          {rolls.length > 0 && (
            <button 
              onClick={onClear} 
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-crimson)',
                cursor: 'pointer',
                fontSize: '0.75rem',
                textDecoration: 'underline'
              }}
            >
              Clear
            </button>
          )}
          <button className="close-drawer-btn" onClick={onClose}>×</button>
        </div>
      </div>
      <div className="log-list">
        {rolls.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '20px 10px', 
            fontFamily: 'var(--font-serif)',
            color: 'var(--color-charcoal-light)' 
          }}>
            No rolls recorded yet. Click a skill name to roll!
          </div>
        ) : (
          rolls.map((roll) => {
            const timeStr = new Date(roll.timestamp).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit', 
              second: '2-digit' 
            });
            
            return (
              <div 
                key={roll.id} 
                className="log-item"
                style={{ 
                  borderLeft: `3px solid ${roll.isSuccess ? 'var(--color-gold)' : 'var(--color-crimson)'}` 
                }}
              >
                <div className="log-item-meta">
                  <span>{roll.characterName} ({roll.playerName})</span>
                  <span>{timeStr}</span>
                </div>
                
                <div className="log-item-roll">
                  {roll.rollName} - {roll.isSuccess ? (
                    <span style={{ color: 'var(--color-gold)' }}>Success!</span>
                  ) : (
                    <span style={{ color: 'var(--color-crimson)' }}>Failure</span>
                  )}
                  {roll.specialSuccesses > 0 && (
                    <span style={{ color: 'var(--color-crimson)', fontSize: '0.8rem', marginLeft: '4px' }}>
                      (+{roll.specialSuccesses} Special)
                    </span>
                  )}
                </div>

                <div className="log-item-details">
                  Feat: [{roll.featDice.map(formatFeatDie).join(', ')}] 
                  {roll.successDice.length > 0 && ` | Success: [${roll.successDice.join(', ')}]`}
                  <br />
                  Total: {roll.featResult === 'Gandalf' ? 'Gandalf Rune (Auto-Success)' : `${roll.total}`} vs TN {roll.tn}
                  {roll.rollMode !== 'standard' && ` (${roll.rollMode})`}
                  {roll.isWeary && ' (Weary)'}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
