import { useState, useEffect } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import type { CharacterData, RollMessage } from './types';
import { createDefaultCharacter, loadCharacterData, METADATA_KEY } from './utils/characterHelper';
import { CharacterSheet } from './components/CharacterSheet';
import { DiceRoller } from './components/DiceRoller';
import { RollLog } from './components/RollLog';

type Mode = 'loading' | 'owlbear' | 'standalone';

function App() {
  const [mode, setMode] = useState<Mode>('loading');
  const [playerName, setPlayerName] = useState('Player');
  
  // Owlbear State
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [selectedTokenName, setSelectedTokenName] = useState<string | null>(null);
  
  // Standalone State
  const [standaloneTokens, setStandaloneTokens] = useState<string[]>(['Aragorn', 'Legolas', 'Gimli']);
  const [activeStandaloneToken, setActiveStandaloneToken] = useState('Aragorn');
  
  // Character Data State
  const [characterData, setCharacterData] = useState<CharacterData | null>(null);
  
  // UI States
  const [logOpen, setLogOpen] = useState(false);
  const [rolls, setRolls] = useState<RollMessage[]>([]);
  const [rollerOpen, setRollerOpen] = useState(false);
  const [rollConfig, setRollConfig] = useState<{
    name: string;
    successDice: number;
    tn: number;
    favoured: boolean;
    type: 'skill' | 'attribute' | 'combat';
    autoRoll: boolean;
  }>({
    name: 'Strength',
    successDice: 0,
    tn: 14,
    favoured: false,
    type: 'attribute',
    autoRoll: false,
  });

  // 1. Detect Mode & Initialize SDK
  useEffect(() => {
    let initialized = false;

    // Timeout fallback for standalone browser view
    const timeoutId = setTimeout(() => {
      if (!initialized) {
        setMode('standalone');
        loadStandaloneData('Aragorn');
      }
    }, 1200);

    OBR.onReady(async () => {
      initialized = true;
      clearTimeout(timeoutId);
      setMode('owlbear');
      
      try {
        const name = await OBR.player.getName();
        setPlayerName(name || 'Player');
        
        // Listen for current selection changes
        OBR.player.onChange((player) => {
          const selection = player.selection;
          if (selection && selection.length > 0) {
            setSelectedTokenId(selection[0]);
          } else {
            setSelectedTokenId(null);
            setCharacterData(null);
            setSelectedTokenName(null);
          }
        });
        
        // Initial load of selection
        const initialSelection = await OBR.player.getSelection();
        if (initialSelection && initialSelection.length > 0) {
          setSelectedTokenId(initialSelection[0]);
        }

        // Subscribe to broadcast messages for dice rolls
        OBR.broadcast.onMessage('com.onering.charactersheet/roll-broadcast', (event) => {
          const roll = event.data as RollMessage;
          if (roll) {
            setRolls((prev) => [roll, ...prev].slice(0, 50));
            // Automatically open log if someone else rolls, so players see it
            setLogOpen(true);
          }
        });

      } catch (e) {
        console.error('Failed initializing Owlbear Rodeo SDK', e);
        setMode('standalone');
        loadStandaloneData('Aragorn');
      }
    });

    return () => clearTimeout(timeoutId);
  }, []);

  // 2. Owlbear Mode: Listen for Scene Changes to load selected token's metadata
  useEffect(() => {
    if (mode !== 'owlbear' || !selectedTokenId) return;

    // Fetch initial item properties
    const loadItem = async () => {
      try {
        const items = await OBR.scene.items.getItems([selectedTokenId]);
        if (items.length > 0) {
          const item = items[0];
          setSelectedTokenName(item.name);
          const data = loadCharacterData(item.metadata);
          setCharacterData(data);
        }
      } catch (e) {
        console.error('Failed to get selected scene item', e);
      }
    };
    loadItem();

    // Subscribe to updates of items on scene
    const unsubscribe = OBR.scene.items.onChange((items) => {
      const item = items.find((i) => i.id === selectedTokenId);
      if (item) {
        setSelectedTokenName(item.name);
        const data = loadCharacterData(item.metadata);
        setCharacterData(data);
      } else {
        setSelectedTokenId(null);
        setSelectedTokenName(null);
        setCharacterData(null);
      }
    });

    return () => unsubscribe();
  }, [selectedTokenId, mode]);

  // 3. Standalone Mode helpers
  const loadStandaloneData = (tokenName: string) => {
    const saved = localStorage.getItem(`tor_sheet_${tokenName}`);
    if (saved) {
      try {
        setCharacterData(JSON.parse(saved));
      } catch (e) {
        setCharacterData(createDefaultCharacter(tokenName));
      }
    } else {
      setCharacterData(createDefaultCharacter(tokenName));
    }
  };

  const handleStandaloneTokenChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setActiveStandaloneToken(val);
    loadStandaloneData(val);
  };

  const handleAddStandaloneToken = () => {
    const newName = prompt('Enter name of new character:');
    if (newName && !standaloneTokens.includes(newName)) {
      const updated = [...standaloneTokens, newName];
      setStandaloneTokens(updated);
      setActiveStandaloneToken(newName);
      setCharacterData(createDefaultCharacter(newName));
    }
  };

  // 4. Handles data editing (auto-saves to token metadata or localStorage)
  const handleSheetChange = (newData: CharacterData) => {
    setCharacterData(newData);
    
    if (mode === 'owlbear' && selectedTokenId) {
      OBR.scene.items.updateItems([selectedTokenId], (items) => {
        for (const item of items) {
          item.metadata = {
            ...item.metadata,
            [METADATA_KEY]: newData
          };
        }
      });
    } else if (mode === 'standalone') {
      localStorage.setItem(`tor_sheet_${activeStandaloneToken}`, JSON.stringify(newData));
    }
  };

  // 5. Handles initial setup of character data for a token
  const handleInitializeSheet = () => {
    const defaultName = selectedTokenName || 'New Hero';
    const defaultData = createDefaultCharacter(defaultName);
    handleSheetChange(defaultData);
  };

  // 6. Triggers Dice Roller overlay
  const handleRollTriggered = (
    rollName: string,
    successDiceCount: number,
    tn: number,
    isFavoured: boolean,
    rollType: 'skill' | 'attribute' | 'combat',
    autoRoll: boolean = false
  ) => {
    setRollConfig({
      name: rollName,
      successDice: successDiceCount,
      tn,
      favoured: isFavoured,
      type: rollType,
      autoRoll
    });
    setRollerOpen(true);
  };

  // 7. Roll completion handler (broadcasting results)
  const handleRollCompleted = (roll: RollMessage) => {
    setRolls((prev) => [roll, ...prev].slice(0, 50));
    setLogOpen(true);

    if (mode === 'owlbear') {
      OBR.broadcast.sendMessage('com.onering.charactersheet/roll-broadcast', roll);
    }
  };

  const characterName = characterData?.name || selectedTokenName || activeStandaloneToken;

  return (
    <div className="app-container">
      
      {/* Scrollable Parchment Sheet Wrapper */}
      <div className="parchment-container">
        
        {/* Standalone Mode Banner & Selection */}
        {mode === 'standalone' && (
          <div style={{
            backgroundColor: 'rgba(197, 155, 39, 0.15)',
            borderBottom: '1px solid var(--color-gold)',
            padding: '8px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.85rem'
          }}>
            <span style={{ fontWeight: 'bold', color: 'var(--color-crimson)' }}>
              ✦ DEMO STANDALONE MODE ✦
            </span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select value={activeStandaloneToken} onChange={handleStandaloneTokenChange}>
                {standaloneTokens.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <button onClick={handleAddStandaloneToken} style={{ fontSize: '0.75rem' }}>+ New</button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {mode === 'loading' && (
          <div className="welcome-screen">
            <div className="welcome-logo">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="var(--color-crimson)" strokeWidth="4" />
              </svg>
            </div>
            <h2 className="welcome-title">Loading Sheet...</h2>
          </div>
        )}

        {/* Owlbear Mode: No token selected */}
        {mode === 'owlbear' && !selectedTokenId && (
          <div className="welcome-screen">
            <div className="welcome-logo">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="var(--color-crimson)" strokeWidth="4" />
                <path d="M 50 15 L 50 25 M 50 75 L 50 85 M 15 50 L 25 50 M 75 50 L 85 50" stroke="var(--color-crimson)" strokeWidth="2" />
              </svg>
            </div>
            <h2 className="welcome-title">Select a Character Token</h2>
            <p className="welcome-desc">
              To view or edit a character sheet, please select a character token on the map.
            </p>
            <p className="welcome-instruction">
              GM: Select any player's token to edit their sheet or roll on their behalf.
            </p>
          </div>
        )}

        {/* Selected token has NO character sheet metadata */}
        {mode === 'owlbear' && selectedTokenId && !characterData && (
          <div className="welcome-screen">
            <h2 className="welcome-title">{selectedTokenName || 'Hero Token'}</h2>
            <p className="welcome-desc">
              No character sheet data is initialized for this token.
            </p>
            <button className="init-button" onClick={handleInitializeSheet}>
              Initialize The One Ring Sheet
            </button>
          </div>
        )}

        {/* Render Character Sheet */}
        {characterData && (
          <>
            <button className="roll-log-trigger" onClick={() => setLogOpen(!logOpen)}>
              Roll Log ({rolls.length})
            </button>
            
            <CharacterSheet 
              data={characterData}
              onChange={handleSheetChange}
              onRollTriggered={handleRollTriggered}
            />
          </>
        )}
      </div>

      {/* Floating Dice Roller Drawer */}
      <DiceRoller
        isOpen={rollerOpen}
        onClose={() => setRollerOpen(false)}
        characterName={characterName}
        playerName={playerName}
        rollName={rollConfig.name}
        rollType={rollConfig.type}
        baseSuccessDice={rollConfig.successDice}
        tn={rollConfig.tn}
        isWeary={characterData?.weary || false}
        isMiserable={characterData?.miserable || false}
        isFavoured={rollConfig.favoured}
        autoRoll={rollConfig.autoRoll}
        onRollCompleted={handleRollCompleted}
      />

      {/* Floating Roll Log Sidebar */}
      <RollLog
        isOpen={logOpen}
        onClose={() => setLogOpen(false)}
        rolls={rolls}
        onClear={() => setRolls([])}
      />

    </div>
  );
}

export default App;
