import type { RollMessage } from '../types';

// The One Ring 2e Feat Die value comparison helper
// Hierarchy from best to worst:
// 12 (Gandalf) > 10 > 9 > 8 > 7 > 6 > 5 > 4 > 3 > 2 > 1 > 11 (Sauron / 0)
export function getFeatDieRank(value: number): number {
  if (value === 12) return 12; // Gandalf is the best
  if (value === 11) return 0;  // Sauron is the worst (0)
  return value;                // 1 to 10
}

export function rollFeatDie(): number {
  return Math.floor(Math.random() * 12) + 1;
}

export function rollSuccessDie(): number {
  return Math.floor(Math.random() * 6) + 1;
}

export interface RollOptions {
  playerName: string;
  characterName: string;
  rollType: 'skill' | 'attribute' | 'combat' | 'custom';
  rollName: string;
  successDiceCount: number;
  tn: number;
  weary: boolean;
  miserable: boolean;
  mode: 'standard' | 'favoured' | 'ill-favoured';
}

export function performTorRoll(options: RollOptions): RollMessage {
  const {
    playerName,
    characterName,
    rollType,
    rollName,
    successDiceCount,
    tn,
    weary,
    miserable,
    mode
  } = options;

  // 1. Roll Feat Dice
  const featDice: number[] = [];
  featDice.push(rollFeatDie());
  if (mode !== 'standard') {
    featDice.push(rollFeatDie());
  }

  // Choose the feat die based on mode
  let chosenFeatDie = featDice[0];
  if (mode === 'favoured' && featDice.length > 1) {
    const rank1 = getFeatDieRank(featDice[0]);
    const rank2 = getFeatDieRank(featDice[1]);
    chosenFeatDie = rank1 >= rank2 ? featDice[0] : featDice[1];
  } else if (mode === 'ill-favoured' && featDice.length > 1) {
    const rank1 = getFeatDieRank(featDice[0]);
    const rank2 = getFeatDieRank(featDice[1]);
    chosenFeatDie = rank1 <= rank2 ? featDice[0] : featDice[1];
  }

  // Translate chosen feat die to result representation
  let featResult: 'Gandalf' | 'Sauron' | number;
  let featValueForSum = 0;
  if (chosenFeatDie === 12) {
    featResult = 'Gandalf';
    featValueForSum = 0; // Automatic success, numeric sum is secondary
  } else if (chosenFeatDie === 11) {
    featResult = 'Sauron';
    featValueForSum = 0; // Sauron counts as 0
  } else {
    featResult = chosenFeatDie;
    featValueForSum = chosenFeatDie;
  }

  // 2. Roll Success Dice
  const successDice: number[] = [];
  for (let i = 0; i < successDiceCount; i++) {
    successDice.push(rollSuccessDie());
  }

  // Calculate success dice values
  let successSum = 0;
  let specialSuccesses = 0;

  for (const die of successDice) {
    // If Weary, 1s, 2s, and 3s are ignored (count as 0)
    const activeValue = weary && die <= 3 ? 0 : die;
    successSum += activeValue;

    if (die === 6) {
      specialSuccesses++;
    }
  }

  // Calculate total and outcome
  const total = featValueForSum + successSum;
  
  // Under Miserable, Sauron is an automatic failure.
  // Otherwise it counts as 0, meaning we can succeed if successSum >= tn.
  const isSuccess = featResult === 'Gandalf' || 
    (featResult === 'Sauron' ? (!miserable && total >= tn) : (total >= tn));

  return {
    id: Math.random().toString(36).substring(2, 9),
    playerName,
    characterName,
    rollType,
    rollName,
    featDice,
    successDice,
    featResult,
    successSum,
    total,
    tn,
    isSuccess,
    specialSuccesses,
    isWeary: weary,
    isMiserable: miserable,
    rollMode: mode,
    timestamp: Date.now()
  };
}
