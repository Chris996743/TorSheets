export interface AttributeState {
  rating: number;
  tn: number;
  maxSecondary: number; // Endurance for Strength, Hope for Heart, Parry for Wits
}

export interface SkillState {
  rank: number;
  favoured: boolean;
  item: boolean;
}

export interface CombatState {
  rank: number;
}

export interface GearItem {
  name: string;
  dmg: string;
  inj: string;
  load: number;
}

export interface ArmorItem {
  name: string;
  protection: string;
  load: number;
}

export interface ShieldItem {
  name: string;
  parry: number;
  load: number;
}

export interface UsefulItem {
  name: string;
  description: string;
}

export interface MarvelousArtifact {
  name: string;
  description: string;
}

export interface MountData {
  name: string;
  vigour: number;
  description: string;
}

export interface CharacterData {
  age: number;

  // Ownership / Locking
  ownerPlayerId: string;
  ownerPlayerName: string;
  finalized: boolean;
  gmUnlocked: boolean;

  // General Info
  name: string;

  culture: string;

  blessing: string;
  calling: string;
  shadowPath: string;
  patron: string;
  features: string;
  flaws: string;
  
  // Resources
  treasure: number;
  standardOfLiving: string;
  fellowshipFocus: string;
  adventurePoints: number;
  skillPoints: number;
  fellowshipPoints: number;
  
  // Attributes
  strength: AttributeState;
  heart: AttributeState;
  wits: AttributeState;
  
  // Skills
  skills: {
    awe: SkillState;
    athletics: SkillState;
    awareness: SkillState;
    hunting: SkillState;
    song: SkillState;
    craft: SkillState;
    
    enhearten: SkillState;
    travel: SkillState;
    insight: SkillState;
    healing: SkillState;
    courtesy: SkillState;
    battle: SkillState;
    
    persuade: SkillState;
    stealth: SkillState;
    scan: SkillState;
    explore: SkillState;
    riddle: SkillState;
    lore: SkillState;
  };

  // Combat Skill Ranks
  combat: {
    axes: CombatState;
    bows: CombatState;
    spears: CombatState;
    swords: CombatState;
  };
  
  // Advancement
  valour: number;
  wisdom: number;
  rewards: string[];
  virtues: string[];
  
  // War Gear & Inventory
  warGear: GearItem[];
  armour: ArmorItem;
  helm: ArmorItem;
  shield: ShieldItem;
  usefulItems: UsefulItem[];
  marvelousArtifacts: MarvelousArtifact[];
  mount: MountData;
  equipment: string;

  // Status & Health
  load: number;
  fatigue: number;
  currentHope: number;
  currentEndurance: number;
  shadow: number;
  scars: number;

  // Derived condition boxes (still editable for now)
  weary: boolean;
  miserable: boolean;
  wounded: boolean;
  injury: string;
}

export interface RollMessage {
  specialSuccessEffects?: string[];
  id: string;
  playerName: string;
  characterName: string;
  rollType: 'skill' | 'attribute' | 'combat' | 'custom';
  rollName: string; // e.g. "Athletics", "Heart", "Axes"
  featDice: number[]; // Roll results (1-12)
  successDice: number[]; // Roll results (1-6)
  featResult: 'Gandalf' | 'Sauron' | number;
  successSum: number;
  total: number;
  tn: number;
  isSuccess: boolean;
  specialSuccesses: number;
  isWeary: boolean;
  isMiserable: boolean;
  rollMode: 'standard' | 'favoured' | 'ill-favoured';
  timestamp: number;
}

