import type { CharacterData, SkillState, CombatState } from '../types';

export const METADATA_KEY = 'com.onering.charactersheet/sheet-data';

const createDefaultSkill = (): SkillState => ({
  rank: 0,
  favoured: false,
  item: false,
});

const createDefaultCombat = (): CombatState => ({
  rank: 0,
});

export function createDefaultCharacter(name: string): CharacterData {
  const defaultAge = 33;
  return {
    ownerPlayerId: '',
    ownerPlayerName: '',
    finalized: false,
    gmUnlocked: false,

    name: name || 'New Character',
    age: defaultAge,
    culture: '',

    blessing: '',
    calling: '',
    shadowPath: '',
    patron: '',
    features: '',
    flaws: '',

    treasure: 0,
    standardOfLiving: '',
    fellowshipFocus: '',
    adventurePoints: 0,
    skillPoints: 0,
    fellowshipPoints: 0,

    strength: { rating: 0, tn: 14, maxSecondary: 20 },
    heart: { rating: 0, tn: 14, maxSecondary: 15 },
    wits: { rating: 0, tn: 14, maxSecondary: 10 },

    skills: {
      awe: createDefaultSkill(),
      athletics: createDefaultSkill(),
      awareness: createDefaultSkill(),
      hunting: createDefaultSkill(),
      song: createDefaultSkill(),
      craft: createDefaultSkill(),

      enhearten: createDefaultSkill(),
      travel: createDefaultSkill(),
      insight: createDefaultSkill(),
      healing: createDefaultSkill(),
      courtesy: createDefaultSkill(),
      battle: createDefaultSkill(),

      persuade: createDefaultSkill(),
      stealth: createDefaultSkill(),
      scan: createDefaultSkill(),
      explore: createDefaultSkill(),
      riddle: createDefaultSkill(),
      lore: createDefaultSkill(),
    },

    combat: {
      axes: createDefaultCombat(),
      bows: createDefaultCombat(),
      spears: createDefaultCombat(),
      swords: createDefaultCombat(),
    },

    valour: 1,
    wisdom: 1,
    rewards: [],
    virtues: [],

    warGear: [
      { name: '', dmg: '', inj: '', load: 0 },
      { name: '', dmg: '', inj: '', load: 0 },
      { name: '', dmg: '', inj: '', load: 0 },
      { name: '', dmg: '', inj: '', load: 0 },
    ],
    armour: { name: '', protection: '', load: 0 },
    helm: { name: '', protection: '', load: 0 },
    shield: { name: '', parry: 0, load: 0 },
    usefulItems: [],
    marvelousArtifacts: [],
    mount: { name: '', vigour: 0, description: '' },
    equipment: '',

    load: 0,
    fatigue: 0,
    currentHope: 15,
    currentEndurance: 20,
    shadow: 0,
    scars: 0,

    weary: false,
    miserable: false,
    wounded: false,
    injury: '',
  };
}

export function loadCharacterData(metadata: any): CharacterData | null {
  if (!metadata || !metadata[METADATA_KEY]) {
    return null;
  }

  try {
    const data = metadata[METADATA_KEY];
    // If it's a string, parse it. Owlbear Rodeo SDK usually handles JS objects natively.
    if (typeof data === 'string') {
      return JSON.parse(data) as CharacterData;
    }
    return data as CharacterData;
  } catch (e) {
    console.error('Failed to parse character data from metadata', e);
    return null;
  }
}

