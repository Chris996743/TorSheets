import React, { useState, useEffect, useRef } from 'react';
import { performTorRoll } from '../utils/torDice';
import type { RollOptions } from '../utils/torDice';
import type { RollMessage } from '../types';

interface DiceRollerProps {
  isOpen: boolean;
  onClose: () => void;
  characterName: string;
  playerName: string;
  rollName: string;
  rollType: 'skill' | 'attribute' | 'combat' | 'custom';
  baseSuccessDice: number;
  tn: number;
  isWeary: boolean;
  isMiserable: boolean;
  isFavoured: boolean;
  autoRoll?: boolean;
  onRollCompleted: (roll: RollMessage) => void;
}

export const DiceRoller: React.FC<DiceRollerProps> = ({
  isOpen,
  onClose,
  characterName,
  playerName,
  rollName,
  rollType,
  baseSuccessDice,
  tn,
  isWeary,
  isMiserable,
  isFavoured,
  autoRoll = false,
  onRollCompleted,
}) => {
  const [successDiceCount, setSuccessDiceCount] = useState(baseSuccessDice);
  const [rollMode, setRollMode] = useState<'standard' | 'favoured' | 'ill-favoured'>('standard');
  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState<RollMessage | null>(null);
  
  // Animation frames for rolling dice
  const [animFeatDice, setAnimFeatDice] = useState<number[]>([1]);
  const [animSuccessDice, setAnimSuccessDice] = useState<number[]>([]);

  // Track if we have already auto-rolled for the current session to avoid infinite loops
  const autoRolledRef = useRef(false);

  // Update dice count and mode when props change
  useEffect(() => {
    setSuccessDiceCount(baseSuccessDice);
    setRollMode(isFavoured ? 'favoured' : 'standard');
    setResult(null);
    autoRolledRef.current = false;
  }, [baseSuccessDice, isFavoured, rollName, isOpen]);

  // Handle dice roll animation loop
  useEffect(() => {
    let intervalId: any;
    if (rolling) {
      intervalId = setInterval(() => {
        // Randomize feat dice (1 or 2 depending on mode)
        const featCount = rollMode === 'standard' ? 1 : 2;
        setAnimFeatDice(Array.from({ length: featCount }, () => Math.floor(Math.random() * 12) + 1));
        
        // Randomize success dice
        setAnimSuccessDice(Array.from({ length: successDiceCount }, () => Math.floor(Math.random() * 6) + 1));
      }, 80);
    }
    return () => clearInterval(intervalId);
  }, [rolling, rollMode, successDiceCount]);

  const handleRoll = () => {
    if (rolling) return;
    setRolling(true);
    setResult(null);

    // Roll animation lasts for 600ms
    setTimeout(() => {
      setRolling(false);
      const rollOptions: RollOptions = {
        playerName,
        characterName,
        rollType,
        rollName,
        successDiceCount,
        tn,
        weary: isWeary,
        miserable: isMiserable,
        mode: rollMode
      };
      
      const finalRoll = performTorRoll(rollOptions);
      setResult(finalRoll);
      onRollCompleted(finalRoll);
    }, 700);
  };

  // Trigger autoRoll if flag is set and we haven't already rolled for this open event
  useEffect(() => {
    if (isOpen && autoRoll && !rolling && !result && !autoRolledRef.current) {
      autoRolledRef.current = true;
      handleRoll();
    }
  }, [isOpen, autoRoll, rolling, result]);

  const getFeatDieClass = (val: number) => {
    if (val === 12) return 'die-result feat gandalf';
    if (val === 11) return 'die-result feat sauron';
    return 'die-result feat';
  };

  const getFeatDieLabel = (val: number) => {
    if (val === 12) return '᚛'; // Gandalf Rune symbol
    if (val === 11) return '👁'; // Sauron Eye symbol
    return val.toString();
  };

  return (
    <div className={`dice-roller-drawer ${isOpen ? 'open' : ''}`}>
      <div className="roller-header">
        <span className="roller-title">
          Roll: {rollName} ({rollType.toUpperCase()}) {isMiserable ? ' [Miserable]' : ''}
        </span>
        <button className="close-drawer-btn" onClick={onClose}>×</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          {/* Success Dice Count Selector */}
          <div className="dice-modifier">
            <span style={{ fontSize: '0.85rem', fontFamily: 'var(--font-title)' }}>Success Dice:</span>
            <button onClick={() => setSuccessDiceCount(Math.max(0, successDiceCount - 1))}>-</button>
            <span style={{ fontWeight: 'bold', width: '20px', textAlign: 'center' }}>{successDiceCount}</span>
            <button onClick={() => setSuccessDiceCount(Math.min(6, successDiceCount + 1))}>+</button>
          </div>

          {/* Roll Mode Select */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['standard', 'favoured', 'ill-favoured'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setRollMode(mode)}
                style={{
                  padding: '4px 8px',
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-title)',
                  backgroundColor: rollMode === mode ? 'var(--color-crimson)' : 'var(--color-parchment)',
                  color: rollMode === mode ? 'white' : 'var(--color-charcoal)',
                  border: `1px solid var(--color-crimson)`,
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {mode.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Roll Button */}
          <button 
            className="roll-btn" 
            onClick={handleRoll} 
            disabled={rolling}
            style={{ opacity: rolling ? 0.7 : 1 }}
          >
            {rolling ? 'ROLLING...' : 'ROLL DICE'}
          </button>
        </div>

        {/* Display animation area or result */}
        <div className="dice-animation-area">
          {rolling && (
            <>
              {animFeatDice.map((val, idx) => (
                <div key={`anim-feat-${idx}`} className="rolling-die feat">
                  {val === 12 ? '᚛' : val === 11 ? '👁' : val}
                </div>
              ))}
              {animSuccessDice.map((val, idx) => (
                <div key={`anim-succ-${idx}`} className="rolling-die">
                  {val}
                </div>
              ))}
            </>
          )}

          {!rolling && result && (
            <>
              {result.featDice.map((val, idx) => {
                const isSelectedFeat = (result.featResult === 'Gandalf' && val === 12) ||
                                       (result.featResult === 'Sauron' && val === 11) ||
                                       (result.featResult === val);
                
                return (
                  <div 
                    key={`res-feat-${idx}`} 
                    className={getFeatDieClass(val)}
                    style={{ 
                      opacity: result.featDice.length > 1 && !isSelectedFeat ? 0.4 : 1,
                      border: isSelectedFeat ? '3px solid var(--color-gold)' : '2px solid var(--color-crimson)'
                    }}
                    title={isSelectedFeat ? "Chosen Feat Die" : "Discarded Feat Die"}
                  >
                    {getFeatDieLabel(val)}
                  </div>
                );
              })}
              
              {result.successDice.map((val, idx) => {
                let className = "die-result";
                if (val === 6) className += " success-six";
                if (result.isWeary && val <= 3) className += " weary-zero";
                
                return (
                  <div key={`res-succ-${idx}`} className={className}>
                    {val}
                  </div>
                );
              })}
            </>
          )}

          {!rolling && !result && (
            <div style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-charcoal-light)' }}>
              Click Roll to test vs TN {tn} {isWeary ? '(Weary)' : ''} {isMiserable ? '(Miserable)' : ''}
            </div>
          )}
        </div>

        {/* Display final outcome text */}
        {!rolling && result && (
          <div className={`roll-outcome ${result.isSuccess ? 'success' : 'failure'}`}>
            <h4 className={`outcome-title ${result.isSuccess ? 'success' : 'failure'}`}>
              {result.isSuccess ? '★ SUCCESS ★' : '❌ FAILURE ❌'}
              {result.specialSuccesses > 0 && result.isSuccess && (
                <span> (with {result.specialSuccesses} Special Success)</span>
              )}
            </h4>
            <p className="outcome-detail">
              {result.featResult === 'Gandalf' ? (
                <span>Gandalf Rune rolled! Automatic Success.</span>
              ) : result.featResult === 'Sauron' ? (
                <span>
                  Sauron Eye rolled! {result.isMiserable ? 'Miserable condition triggers automatic Failure!' : `Total is ${result.total} vs TN ${result.tn}.`}
                </span>
              ) : (
                <span>Total: {result.total} (Feat {result.featResult} + Success {result.successSum}) vs TN {result.tn}.</span>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
