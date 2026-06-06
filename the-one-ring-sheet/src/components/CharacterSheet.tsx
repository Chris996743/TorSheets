import React, { useEffect } from 'react';
import type { CharacterData, SkillState } from '../types';

interface CharacterSheetProps {
  data: CharacterData;
  onChange: (newData: CharacterData) => void;
  onRollTriggered: (
    rollName: string,
    successDiceCount: number,
    tn: number,
    isFavoured: boolean,
    rollType: 'skill' | 'attribute' | 'combat',
    autoRoll?: boolean
  ) => void;
}

const CULTURES = ['Bardings', 'Men of Bree', 'Dwarves of Durin\'s Folk', 'Elves of Lindon', 'Hobbits of the Shire', 'Rangers of the North'];
const CULTURE_BASES = {
  'Bardings': { strength: 4, heart: 2, wits: 2 },
  'Men of Bree': { strength: 2, heart: 3, wits: 3 },
  'Dwarves of Durin\'s Folk': { strength: 5, heart: 1, wits: 2 },
  'Elves of Lindon': { strength: 2, heart: 2, wits: 4 },
  'Hobbits of the Shire': { strength: 2, heart: 4, wits: 2 },
  'Rangers of the North': { strength: 3, heart: 2, wits: 3 },
};

// Cultural Blessings – each culture has a unique blessing per the rulebook
const CULTURAL_BLESSINGS: Record<string, { name: string; effect: string; attr: string }> = {
  'Bardings': { name: 'Bardings Redoubtable', effect: 'Spend 1 Hope to add Valour to Strength rolls', attr: 'strength' },
  'Men of Bree': { name: 'Bree-blood', effect: 'Spend 1 Hope to add Wisdom to a Persuade, Riddle, or Courtesy roll', attr: 'heart' },
  "Dwarves of Durin's Folk": { name: 'A Stiff-necked People', effect: 'Cannot be magically forced to act', attr: 'strength' },
  'Elves of Lindon': { name: 'Elven-skill', effect: 'Gain +1d on any favoured skill roll', attr: 'wits' },
  'Hobbits of the Shire': { name: 'Hobbit-sense', effect: 'Spend 1 Hope to ask the Loremaster one question per session', attr: 'heart' },
  'Rangers of the North': { name: 'Royalty Revealed', effect: 'Spend 1 Hope to be recognised and command authority', attr: 'wits' },
};

// Mechanical bonus mapping used when editing attribute ratings.
// Your UI stores blessing as a string (data.blessing), so we key off that.
const BLESSING_EFFECTS: Record<
  string,
  { strengthBonus: number; heartBonus: number; witsBonus: number }
> = {
  'Bardings Redoubtable': { strengthBonus: 1, heartBonus: 0, witsBonus: 0 },
  'Bree-blood': { strengthBonus: 0, heartBonus: 1, witsBonus: 0 },
  "A Stiff-necked People": { strengthBonus: 1, heartBonus: 0, witsBonus: 0 },
  'Elven-skill': { strengthBonus: 0, heartBonus: 0, witsBonus: 1 },
  'Hobbit-sense': { strengthBonus: 0, heartBonus: 1, witsBonus: 0 },
  'Royalty Revealed': { strengthBonus: 0, heartBonus: 0, witsBonus: 1 },
};


// Callings data – favoured skill keys correspond to keys in CharacterData.skills
const CALLINGS = {
  "Captain": {
    favouredSkills: ["battle", "enhearten", "persuade"],
    distinctiveFeature: "Leadership",
    shadowPath: "Lure of Power",
  },
  "Champion": {
    favouredSkills: ["athletics", "awe", "hunting"],
    distinctiveFeature: "Enemy‑Lore",
    shadowPath: "Curse of Vengeance",
  },
  "Messenger": {
    favouredSkills: ["courtesy", "song", "travel"],
    distinctiveFeature: "Folk‑Lore",
    shadowPath: "Wandering‑Madness",
  },
  "Scholar": {
    favouredSkills: ["craft", "lore", "riddle"],
    distinctiveFeature: "Rhymes of Lore",
    shadowPath: "Lure of Secrets",
  },
  "Treasure Hunter": {
    favouredSkills: ["explore", "scan", "stealth"],
    distinctiveFeature: "Burglary",
    shadowPath: "Dragon‑Sickness",
  },
  "Warden": {
    favouredSkills: ["awareness", "healing", "insight"],
    distinctiveFeature: "Shadow‑Lore",
    shadowPath: "Path of Despair",
  },
};
// Patrons list – choose from core rulebook
const PATRONS = ['Balin, son of Fundin', 'Bilbo Baggins', "Círdan the Shipwright", "Gandalf the Grey", "Gilraen the Fair", "Tom Bombadil and Lady Goldberry"];
// Helper to check if a skill is allowed as favoured for the current calling
const isSkillAllowedForCalling = (calling: string, skillKey: string): boolean => {
  const entry = CALLINGS[calling as keyof typeof CALLINGS];
  if (!entry) return false; // No calling selected – don't allow any favoured toggling
  return entry.favouredSkills.includes(skillKey);
};

export const CharacterSheet: React.FC<CharacterSheetProps> = ({
  data,
  onChange,
  onRollTriggered,
}) => {
  // Helper to update top-level fields
  const updateField = (key: keyof CharacterData, value: any) => {
    onChange({
      ...data,
      [key]: value,
    });
  };

  // Helper to update nested attribute fields
  const updateAttribute = (attr: 'strength' | 'heart' | 'wits', key: 'rating' | 'tn' | 'maxSecondary', value: number) => {
    const updatedAttr = {
      ...data[attr],
      [key]: value,
    };

    // Auto-calculate Target Number (TN) as 20 - rating when rating is modified
    // Also auto-calculate maxSecondary (Endurance, Hope, Parry) based on rating and culture base
    if (key === 'rating') {
      updatedAttr.tn = Math.max(1, 20 - value);
      const cultureBases = CULTURE_BASES[data.culture as keyof typeof CULTURE_BASES] || { strength: 0, heart: 0, wits: 0 };
      if (attr === 'strength') {
        updatedAttr.maxSecondary = value + cultureBases.strength + (BLESSING_EFFECTS[data.blessing]?.strengthBonus || 0);
      } else if (attr === 'heart') {
        updatedAttr.maxSecondary = value + cultureBases.heart + (BLESSING_EFFECTS[data.blessing]?.heartBonus || 0);
      } else if (attr === 'wits') {
        updatedAttr.maxSecondary = value + cultureBases.wits + (BLESSING_EFFECTS[data.blessing]?.witsBonus || 0);
      }
    }

    onChange({
      ...data,
      [attr]: updatedAttr,
    });
  };

  const handleCultureChange = (newCulture: string) => {
    const bases = CULTURE_BASES[newCulture as keyof typeof CULTURE_BASES] || { strength: 0, heart: 0, wits: 0 };
    const blessing = CULTURAL_BLESSINGS[newCulture];
    onChange({
      ...data,
      culture: newCulture,
      blessing: blessing?.name || '',
      strength: { ...data.strength, rating: bases.strength, tn: 20 - bases.strength, maxSecondary: bases.strength * 2 },
      heart: { ...data.heart, rating: bases.heart, tn: 20 - bases.heart, maxSecondary: bases.heart * 2 },
      wits: { ...data.wits, rating: bases.wits, tn: 20 - bases.wits, maxSecondary: bases.wits * 2 },
    });
  };

  // Recalculate derived status values when relevant fields change
  useEffect(() => {
    const enduranceBase = data.strength.maxSecondary;
    const hopeBase = data.heart.maxSecondary;
    // Gear load contributes to Endurance penalty but not Hope
    const gearLoad = data.warGear.reduce((sum, item) => sum + (parseInt(String(item.load)) || 0), 0);
    const endurancePenalty = (data.fatigue || 0) + (data.scars || 0) + gearLoad;
    const hopePenalty = (data.fatigue || 0) + (data.shadow || 0) + (data.scars || 0);
    const newCurrentEndurance = Math.max(0, enduranceBase - endurancePenalty);
    const newCurrentHope = Math.max(0, hopeBase - hopePenalty);
    if (newCurrentEndurance !== data.currentEndurance) {
      updateField('currentEndurance', newCurrentEndurance);
    }
    if (newCurrentHope !== data.currentHope) {
      updateField('currentHope', newCurrentHope);
    }
  }, [
    data.strength.maxSecondary,
    data.heart.maxSecondary,
    data.fatigue,
    data.shadow,
    data.scars,
    data.warGear,
  ]);


  // Helper to update a skill's state
  const updateSkill = (skillKey: keyof CharacterData['skills'], key: keyof SkillState, value: any) => {
    onChange({
      ...data,
      skills: {
        ...data.skills,
        [skillKey]: {
          ...data.skills[skillKey],
          [key]: value,
        },
      },
    });
  };

  // Helper to update combat ranks
  const updateCombat = (combatKey: keyof CharacterData['combat'], value: number) => {
    onChange({
      ...data,
      combat: {
        ...data.combat,
        [combatKey]: {
          rank: value,
        },
      },
    });
  };

  // Helper for lists (Rewards and Virtues)
  const addListItem = (type: 'rewards' | 'virtues') => {
    const list = [...data[type], ''];
    updateField(type, list);
  };

  const updateListItem = (type: 'rewards' | 'virtues', index: number, value: string) => {
    const list = [...data[type]];
    list[index] = value;
    updateField(type, list);
  };

  const removeListItem = (type: 'rewards' | 'virtues', index: number) => {
    const list = data[type].filter((_, i) => i !== index);
    updateField(type, list);
  };

  // Helper for War Gear rows
  const updateWarGear = (index: number, field: 'name' | 'dmg' | 'inj' | 'load', value: any) => {
    const newGear = [...data.warGear];
    newGear[index] = {
      ...newGear[index],
      [field]: value,
    };
    updateField('warGear', newGear);
  };

  // Helper to draw the 6 success dice checkboxes
  const renderDiceTrack = (currentRank: number, onSelect: (rank: number) => void) => {
    return (
      <div className="dice-rank-track">
        {Array.from({ length: 6 }).map((_, i) => {
          const rankValue = i + 1;
          const isFilled = rankValue <= currentRank;
          return (
            <div
              key={i}
              className={`rank-box ${isFilled ? 'filled' : ''}`}
              onClick={() => onSelect(isFilled && rankValue === currentRank ? rankValue - 1 : rankValue)}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      
      {/* 1. Header Information */}
      <div className="sheet-header">
        <div className="header-top-row">
          {/* Left Block */}
          <div className="header-column">
            <div className="form-group">
              <label>Name</label>
              <input 
                type="text" 
                value={data.name} 
                onChange={(e) => updateField('name', e.target.value)} 
                placeholder="Character Name"
              />
            </div>
            <div className="form-group">
              <label>Culture</label>
              <select value={data.culture} onChange={(e) => handleCultureChange(e.target.value)}>
                {CULTURES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Blessing</label>
              <input 
                type="text" 
                readOnly
                value={data.blessing}
                title={CULTURAL_BLESSINGS[data.culture]?.effect || ''}
                style={{ cursor: 'default', backgroundColor: 'rgba(197,155,39,0.08)' }}
              />
            </div>
<div className="form-group">
  <label>Calling</label>
  <select value={data.calling} onChange={(e) => {
    const newCalling = e.target.value;
    onChange({
      ...data,
      calling: newCalling,
      shadowPath: CALLINGS[newCalling as keyof typeof CALLINGS]?.shadowPath || '',
    });
  }}>
    <option value="">Select a Calling</option>
    {Object.keys(CALLINGS).map((c) => (
      <option key={c} value={c}>{c}</option>
    ))}
  </select>
</div>
          {/* Distinctive Feature (read‑only) */}
          <div className="form-group">
            <label>Distinctive Feature</label>
            <input
              type="text"
              readOnly
              value={CALLINGS[data.calling as keyof typeof CALLINGS]?.distinctiveFeature || ''}
            />
          </div>
            
            <div className="form-group">
              <label>Shadow Path</label>
              <input 
                type="text" 
                value={data.shadowPath} 
                onChange={(e) => updateField('shadowPath', e.target.value)} 
              />
            </div>
          </div>

          {/* Decorative Ring Center */}
          <div className="header-center">
            <div className="header-ring">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="var(--color-crimson)" strokeWidth="3" />
                <circle cx="50" cy="50" r="37" fill="none" stroke="var(--color-crimson)" strokeWidth="1" strokeDasharray="3 2" />
                <path d="M 50 10 L 50 18 M 50 82 L 50 90 M 10 50 L 18 50 M 82 50 L 90 50" stroke="var(--color-crimson)" strokeWidth="1.5" />
              </svg>
            </div>
            <h1 className="sheet-title-text">THE ONE RING</h1>
          </div>

          {/* Right Block */}
          <div className="header-column">
            <div className="form-group">
              <label>Patron</label>
              <select value={data.patron} onChange={(e) => updateField('patron', e.target.value)}>
                {PATRONS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Features</label>
              <input 
                type="text" 
                value={data.features} 
                onChange={(e) => updateField('features', e.target.value)} 
              />
            </div>
            <div className="form-group">
              <label>Flaws</label>
              <input 
                type="text" 
                value={data.flaws} 
                onChange={(e) => updateField('flaws', e.target.value)} 
              />
            </div>
            <div className="form-group">
              <label>Treasure</label>
              <input 
                type="text" 
                style={{ flex: 'none', width: '60px', textAlign: 'center' }}
                value={data.treasure} 
                onChange={(e) => updateField('treasure', parseInt(e.target.value) || 0)} 
              />
              <label style={{ minWidth: 'auto', marginLeft: '10px' }}>Standard of Living</label>
              <input 
                type="text" 
                value={data.standardOfLiving} 
                onChange={(e) => updateField('standardOfLiving', e.target.value)} 
              />
            </div>
          </div>
        </div>

        {/* Adventure / Skill / Fellowship Point Trackers */}
        <div className="trackers-row">
          <div className="diamond-tracker">
            <span className="diamond-tracker-label">Adventure Pts</span>
            <div className="diamond-box">
              <input 
                type="text" 
                value={data.adventurePoints} 
                onChange={(e) => updateField('adventurePoints', parseInt(e.target.value) || 0)} 
              />
            </div>
          </div>
          <div className="diamond-tracker">
            <span className="diamond-tracker-label">Skill Pts</span>
            <div className="diamond-box">
              <input 
                type="text" 
                value={data.skillPoints} 
                onChange={(e) => updateField('skillPoints', parseInt(e.target.value) || 0)} 
              />
            </div>
          </div>
          <div className="diamond-tracker">
            <span className="diamond-tracker-label">Fellowship Pts</span>
            <div className="diamond-box">
              <input 
                type="text" 
                value={data.fellowshipPoints} 
                onChange={(e) => updateField('fellowshipPoints', parseInt(e.target.value) || 0)} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Core Attributes: Strength, Heart, Wits */}
      <div className="attributes-container">
        {/* STRENGTH */}
        <div className="attribute-block">
          <span className="attribute-name">STRENGTH</span>
          <div className="attribute-diamonds">
            <div className="attribute-diamond-wrapper">
              <div className="diamond-large">
                <input 
                  type="text" 
                  value={data.strength.rating} 
                  onChange={(e) => updateAttribute('strength', 'rating', parseInt(e.target.value) || 0)} 
                />
              </div>
              <span>Rating</span>
            </div>
            
            <div className="attribute-diamond-wrapper">
              <div className="diamond-large" style={{ backgroundColor: 'var(--color-crimson-light)' }}>
                <input 
                  type="text" 
                  value={data.strength.tn} 
                  onChange={(e) => updateAttribute('strength', 'tn', parseInt(e.target.value) || 0)} 
                />
              </div>
              <span>TN</span>
            </div>

            <div className="attribute-diamond-wrapper">
              <div className="diamond-large">
                <input 
                  type="text" 
                  value={data.strength.maxSecondary} 
                  onChange={(e) => updateAttribute('strength', 'maxSecondary', parseInt(e.target.value) || 0)} 
                />
              </div>
              <span>Endurance</span>
            </div>
          </div>
          <button 
            className="add-btn" 
            style={{ width: '100%' }}
            onClick={() => onRollTriggered('Strength', 0, data.strength.tn, false, 'attribute')}
          >
            Roll Strength Attribute
          </button>
        </div>

        {/* HEART */}
        <div className="attribute-block">
          <span className="attribute-name">HEART</span>
          <div className="attribute-diamonds">
            <div className="attribute-diamond-wrapper">
              <div className="diamond-large">
                <input 
                  type="text" 
                  value={data.heart.rating} 
                  onChange={(e) => updateAttribute('heart', 'rating', parseInt(e.target.value) || 0)} 
                />
              </div>
              <span>Rating</span>
            </div>
            
            <div className="attribute-diamond-wrapper">
              <div className="diamond-large" style={{ backgroundColor: 'var(--color-crimson-light)' }}>
                <input 
                  type="text" 
                  value={data.heart.tn} 
                  onChange={(e) => updateAttribute('heart', 'tn', parseInt(e.target.value) || 0)} 
                />
              </div>
              <span>TN</span>
            </div>

            <div className="attribute-diamond-wrapper">
              <div className="diamond-large">
                <input 
                  type="text" 
                  value={data.heart.maxSecondary} 
                  onChange={(e) => updateAttribute('heart', 'maxSecondary', parseInt(e.target.value) || 0)} 
                />
              </div>
              <span>Hope</span>
            </div>
          </div>
          <button 
            className="add-btn" 
            style={{ width: '100%' }}
            onClick={() => onRollTriggered('Heart', 0, data.heart.tn, false, 'attribute')}
          >
            Roll Heart Attribute
          </button>
        </div>

        {/* WITS */}
        <div className="attribute-block">
          <span className="attribute-name">WITS</span>
          <div className="attribute-diamonds">
            <div className="attribute-diamond-wrapper">
              <div className="diamond-large">
                <input 
                  type="text" 
                  value={data.wits.rating} 
                  onChange={(e) => updateAttribute('wits', 'rating', parseInt(e.target.value) || 0)} 
                />
              </div>
              <span>Rating</span>
            </div>
            
            <div className="attribute-diamond-wrapper">
              <div className="diamond-large" style={{ backgroundColor: 'var(--color-crimson-light)' }}>
                <input 
                  type="text" 
                  value={data.wits.tn} 
                  onChange={(e) => updateAttribute('wits', 'tn', parseInt(e.target.value) || 0)} 
                />
              </div>
              <span>TN</span>
            </div>

            <div className="attribute-diamond-wrapper">
              <div className="diamond-large">
                <input 
                  type="text" 
                  value={data.wits.maxSecondary} 
                  onChange={(e) => updateAttribute('wits', 'maxSecondary', parseInt(e.target.value) || 0)} 
                />
              </div>
              <span>Parry</span>
            </div>
          </div>
          <button 
            className="add-btn" 
            style={{ width: '100%' }}
            onClick={() => onRollTriggered('Wits', 0, data.wits.tn, false, 'attribute')}
          >
            Roll Wits Attribute
          </button>
        </div>
      </div>

      {/* 3. Skills Matrix Section */}
      <div className="skills-section">
        <h2 className="section-title">SKILLS</h2>
        <div className="skills-grid">
          
          {/* Strength Skills */}
          <div className="skills-column">
            {[
              { label: 'Awe', key: 'awe' },
              { label: 'Athletics', key: 'athletics' },
              { label: 'Awareness', key: 'awareness' },
              { label: 'Hunting', key: 'hunting' },
              { label: 'Song', key: 'song' },
              { label: 'Craft', key: 'craft' }
            ].map((sk) => {
              const skillKey = sk.key as keyof CharacterData['skills'];
              const skill = data.skills[skillKey];
              return (
                <div key={sk.key} className="skill-row">
                  <div className="skill-left">
                    <div 
                      className={`pentagon-fav ${skill.favoured ? 'active' : ''}`}
                      onClick={() => { if (isSkillAllowedForCalling(data.calling, skillKey)) { updateSkill(skillKey, 'favoured', !skill.favoured); } }}
                      title="Toggle Favoured"
                    />
                    <button 
                      className="skill-name-btn"
                      onClick={() => onRollTriggered(sk.label, skill.rank, data.strength.tn, skill.favoured, 'skill', false)}
                    >
                      {sk.label}
                    </button>
                    <span 
                      className="roll-icon"
                      onClick={() => onRollTriggered(sk.label, skill.rank, data.strength.tn, skill.favoured, 'skill', true)}
                      title="Quick Roll"
                    >
                      🎲
                    </span>
                  </div>
                  <div className="skill-right">
                    {renderDiceTrack(skill.rank, (val) => updateSkill(skillKey, 'rank', val))}
                    <div 
                      className={`item-check ${skill.item ? 'filled' : ''}`}
                      onClick={() => updateSkill(skillKey, 'item', !skill.item)}
                      title="Item bonus toggle"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Heart Skills */}
          <div className="skills-column">
            {[
              { label: 'Enhearten', key: 'enhearten' },
              { label: 'Travel', key: 'travel' },
              { label: 'Insight', key: 'insight' },
              { label: 'Healing', key: 'healing' },
              { label: 'Courtesy', key: 'courtesy' },
              { label: 'Battle', key: 'battle' }
            ].map((sk) => {
              const skillKey = sk.key as keyof CharacterData['skills'];
              const skill = data.skills[skillKey];
              return (
                <div key={sk.key} className="skill-row">
                  <div className="skill-left">
                    <div 
                      className={`pentagon-fav ${skill.favoured ? 'active' : ''}`}
                      onClick={() => updateSkill(skillKey, 'favoured', !skill.favoured)}
                      title="Toggle Favoured"
                    />
                    <button 
                      className="skill-name-btn"
                      onClick={() => onRollTriggered(sk.label, skill.rank, data.heart.tn, skill.favoured, 'skill', false)}
                    >
                      {sk.label}
                    </button>
                    <span 
                      className="roll-icon"
                      onClick={() => onRollTriggered(sk.label, skill.rank, data.heart.tn, skill.favoured, 'skill', true)}
                      title="Quick Roll"
                    >
                      🎲
                    </span>
                  </div>
                  <div className="skill-right">
                    {renderDiceTrack(skill.rank, (val) => updateSkill(skillKey, 'rank', val))}
                    <div 
                      className={`item-check ${skill.item ? 'filled' : ''}`}
                      onClick={() => updateSkill(skillKey, 'item', !skill.item)}
                      title="Item bonus toggle"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Wits Skills */}
          <div className="skills-column">
            {[
              { label: 'Persuade', key: 'persuade' },
              { label: 'Stealth', key: 'stealth' },
              { label: 'Scan', key: 'scan' },
              { label: 'Explore', key: 'explore' },
              { label: 'Riddle', key: 'riddle' },
              { label: 'Lore', key: 'lore' }
            ].map((sk) => {
              const skillKey = sk.key as keyof CharacterData['skills'];
              const skill = data.skills[skillKey];
              return (
                <div key={sk.key} className="skill-row">
                  <div className="skill-left">
                    <div 
                      className={`pentagon-fav ${skill.favoured ? 'active' : ''}`}
                      onClick={() => updateSkill(skillKey, 'favoured', !skill.favoured)}
                      title="Toggle Favoured"
                    />
                    <button 
                      className="skill-name-btn"
                      onClick={() => onRollTriggered(sk.label, skill.rank, data.wits.tn, skill.favoured, 'skill', false)}
                    >
                      {sk.label}
                    </button>
                    <span 
                      className="roll-icon"
                      onClick={() => onRollTriggered(sk.label, skill.rank, data.wits.tn, skill.favoured, 'skill', true)}
                      title="Quick Roll"
                    >
                      🎲
                    </span>
                  </div>
                  <div className="skill-right">
                    {renderDiceTrack(skill.rank, (val) => updateSkill(skillKey, 'rank', val))}
                    <div 
                      className={`item-check ${skill.item ? 'filled' : ''}`}
                      onClick={() => updateSkill(skillKey, 'item', !skill.item)}
                      title="Item bonus toggle"
                    />
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>

      {/* 4. Combat Skills & Advancement */}
      <div className="combat-adv-section">
        {/* Combat Skills */}
        <div className="combat-block">
          <h3 className="section-title" style={{ fontSize: '1.1rem', marginBottom: '8px' }}>COMBAT</h3>
          {[
            { label: 'Axes', key: 'axes' },
            { label: 'Bows', key: 'bows' },
            { label: 'Spears', key: 'spears' },
            { label: 'Swords', key: 'swords' }
          ].map((c) => {
            const combatKey = c.key as keyof CharacterData['combat'];
            const rank = data.combat[combatKey].rank;
            return (
              <div key={c.key} className="combat-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button 
                    className="combat-name-btn"
                    onClick={() => onRollTriggered(c.label, rank, data.strength.tn, false, 'combat', false)}
                  >
                    {c.label}
                  </button>
                  <span 
                    className="roll-icon"
                    onClick={() => onRollTriggered(c.label, rank, data.strength.tn, false, 'combat', true)}
                    title="Quick Roll"
                  >
                    🎲
                  </span>
                </div>
                {renderDiceTrack(rank, (val) => updateCombat(combatKey, val))}
              </div>
            );
          })}
        </div>

        {/* Rewards Block */}
        <div className="rewards-block">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="section-title" style={{ fontSize: '1.1rem', marginBottom: '8px', textAlign: 'left' }}>REWARDS</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-title)' }}>Valour</span>
              <div className="diamond-box" style={{ width: '22px', height: '22px', margin: 0 }}>
                <input 
                  type="text" 
                  style={{ fontSize: '0.75rem' }} 
                  value={data.valour} 
                  onChange={(e) => updateField('valour', parseInt(e.target.value) || 0)} 
                />
              </div>
            </div>
          </div>
          <div className="list-container">
            {data.rewards.map((reward, idx) => (
              <div key={idx} className="list-item-row">
                <input 
                  type="text" 
                  value={reward} 
                  onChange={(e) => updateListItem('rewards', idx, e.target.value)} 
                  placeholder="Reward details..."
                />
                <button className="delete-btn" onClick={() => removeListItem('rewards', idx)}>×</button>
              </div>
            ))}
            <button className="add-btn" onClick={() => addListItem('rewards')}>+ Add Reward</button>
          </div>
        </div>

        {/* Virtues Block */}
        <div className="virtues-block">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="section-title" style={{ fontSize: '1.1rem', marginBottom: '8px', textAlign: 'left' }}>VIRTUES</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-title)' }}>Wisdom</span>
              <div className="diamond-box" style={{ width: '22px', height: '22px', margin: 0 }}>
                <input 
                  type="text" 
                  style={{ fontSize: '0.75rem' }} 
                  value={data.wisdom} 
                  onChange={(e) => updateField('wisdom', parseInt(e.target.value) || 0)} 
                />
              </div>
            </div>
          </div>
          <div className="list-container">
            {data.virtues.map((virtue, idx) => (
              <div key={idx} className="list-item-row">
                <input 
                  type="text" 
                  value={virtue} 
                  onChange={(e) => updateListItem('virtues', idx, e.target.value)} 
                  placeholder="Virtue details..."
                />
                <button className="delete-btn" onClick={() => removeListItem('virtues', idx)}>×</button>
              </div>
            ))}
            <button className="add-btn" onClick={() => addListItem('virtues')}>+ Add Virtue</button>
          </div>
        </div>
      </div>

      {/* 5. War Gear & Status Trackers */}
      <div className="gear-status-section">
        {/* War Gear Block */}
        <div className="gear-block">
          <h3 className="section-title" style={{ fontSize: '1.1rem', marginBottom: '8px', textAlign: 'left' }}>WAR GEAR</h3>
          <table className="gear-table">
            <thead>
              <tr>
                <th style={{ width: '50%' }}>Item Name</th>
                <th style={{ width: '15%' }}>dmg.</th>
                <th style={{ width: '15%' }}>inj.</th>
                <th style={{ width: '20%' }}>load</th>
              </tr>
            </thead>
            <tbody>
              {data.warGear.map((item, idx) => (
                <tr key={idx}>
                  <td>
                    <input 
                      type="text" 
                      value={item.name} 
                      onChange={(e) => updateWarGear(idx, 'name', e.target.value)} 
                      placeholder="e.g. Broadsword"
                    />
                  </td>
                  <td>
                    <input 
                      type="text" 
                      value={item.dmg} 
                      onChange={(e) => updateWarGear(idx, 'dmg', e.target.value)} 
                      placeholder="e.g. 5"
                    />
                  </td>
                  <td>
                    <input 
                      type="text" 
                      value={item.inj} 
                      onChange={(e) => updateWarGear(idx, 'inj', e.target.value)} 
                      placeholder="e.g. 16"
                    />
                  </td>
                  <td>
                    <input 
                      type="text" 
                      value={item.load} 
                      onChange={(e) => updateWarGear(idx, 'load', parseInt(e.target.value) || 0)} 
                      placeholder="e.g. 2"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Defense Gear */}
          <div className="defense-gear-section">
            <h4 className="section-title" style={{ fontSize: '0.95rem', marginBottom: '8px', textAlign: 'left' }}>DEFENCE</h4>
            <table className="gear-table">
              <thead>
                <tr>
                  <th style={{ width: '15%' }}>Type</th>
                  <th style={{ width: '35%' }}>Name</th>
                  <th style={{ width: '25%' }}>Prot./Parry</th>
                  <th style={{ width: '25%' }}>Load</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><span style={{ fontFamily: 'var(--font-title)', fontSize: '0.8rem', color: 'var(--color-crimson)' }}>Armour</span></td>
                  <td>
                    <input 
                      type="text" 
                      value={data.armour.name} 
                      onChange={(e) => updateField('armour', { ...data.armour, name: e.target.value })} 
                      placeholder="e.g. Leather Corslet"
                    />
                  </td>
                  <td>
                    <input 
                      type="text" 
                      value={data.armour.protection} 
                      onChange={(e) => updateField('armour', { ...data.armour, protection: e.target.value })} 
                      placeholder="prot."
                    />
                  </td>
                  <td>
                    <input 
                      type="text" 
                      value={data.armour.load} 
                      onChange={(e) => updateField('armour', { ...data.armour, load: parseInt(e.target.value) || 0 })} 
                      placeholder="load"
                    />
                  </td>
                </tr>
                <tr>
                  <td><span style={{ fontFamily: 'var(--font-title)', fontSize: '0.8rem', color: 'var(--color-crimson)' }}>Helm</span></td>
                  <td>
                    <input 
                      type="text" 
                      value={data.helm.name} 
                      onChange={(e) => updateField('helm', { ...data.helm, name: e.target.value })} 
                      placeholder="e.g. Iron Cap"
                    />
                  </td>
                  <td>
                    <input 
                      type="text" 
                      value={data.helm.protection} 
                      onChange={(e) => updateField('helm', { ...data.helm, protection: e.target.value })} 
                      placeholder="prot."
                    />
                  </td>
                  <td>
                    <input 
                      type="text" 
                      value={data.helm.load} 
                      onChange={(e) => updateField('helm', { ...data.helm, load: parseInt(e.target.value) || 0 })} 
                      placeholder="load"
                    />
                  </td>
                </tr>
                <tr>
                  <td><span style={{ fontFamily: 'var(--font-title)', fontSize: '0.8rem', color: 'var(--color-crimson)' }}>Shield</span></td>
                  <td>
                    <input 
                      type="text" 
                      value={data.shield.name} 
                      onChange={(e) => updateField('shield', { ...data.shield, name: e.target.value })} 
                      placeholder="e.g. Round Shield"
                    />
                  </td>
                  <td>
                    <input 
                      type="text" 
                      value={data.shield.parry} 
                      onChange={(e) => updateField('shield', { ...data.shield, parry: parseInt(e.target.value) || 0 })} 
                      placeholder="parry"
                    />
                  </td>
                  <td>
                    <input 
                      type="text" 
                      value={data.shield.load} 
                      onChange={(e) => updateField('shield', { ...data.shield, load: parseInt(e.target.value) || 0 })} 
                      placeholder="load"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Status / Trackers Block */}
        <div className="status-block">
          <h3 className="section-title" style={{ fontSize: '1.1rem', marginBottom: '4px', textAlign: 'left' }}>STATUS</h3>
          
          {/* Conditions Weary / Miserable / Wounded */}
          <div className="condition-checkboxes">
            <div className="condition-check" onClick={() => updateField('weary', !data.weary)}>
              <div className={`checkbox-square ${data.weary ? 'checked' : ''}`} />
              <span>WEARY</span>
            </div>
            <div className="condition-check" onClick={() => updateField('miserable', !data.miserable)}>
              <div className={`checkbox-square ${data.miserable ? 'checked' : ''}`} />
              <span>MISERABLE</span>
            </div>
            <div className="condition-check" onClick={() => updateField('wounded', !data.wounded)}>
              <div className={`checkbox-square ${data.wounded ? 'checked' : ''}`} />
              <span>WOUNDED</span>
            </div>
          </div>

          <div className="form-group">
            <label style={{ minWidth: 'auto' }}>Injury Detail</label>
            <input 
              type="text" 
              value={data.injury} 
              onChange={(e) => updateField('injury', e.target.value)} 
              placeholder="Wounded details/recovery..."
            />
          </div>

          {/* Grid of status diamonds */}
          <div className="status-grid">
            <div className="status-diamond-item">
              <label>Current Hope</label>
              <div className="diamond-box active">
                <input 
                  type="text" 
                  value={data.currentHope} 
                  onChange={(e) => updateField('currentHope', parseInt(e.target.value) || 0)} 
                />
              </div>
            </div>

            <div className="status-diamond-item">
              <label>Endurance</label>
              <div className="diamond-box active" style={{ borderColor: 'var(--color-gold)' }}>
                <input 
                  type="text" 
                  value={data.currentEndurance} 
                  onChange={(e) => updateField('currentEndurance', parseInt(e.target.value) || 0)} 
                />
              </div>
            </div>

            <div className="status-diamond-item">
              <label>Total Load</label>
              <div className="diamond-box">
                <input 
                  type="text" 
                  value={data.load} 
                  onChange={(e) => updateField('load', parseInt(e.target.value) || 0)} 
                />
              </div>
            </div>

            <div className="status-diamond-item">
              <label>Fatigue</label>
              <div className="diamond-box">
                <input 
                  type="text" 
                  value={data.fatigue} 
                  onChange={(e) => updateField('fatigue', parseInt(e.target.value) || 0)} 
                />
              </div>
            </div>

            <div className="status-diamond-item">
              <label>Shadow</label>
              <div className="diamond-box">
                <input 
                  type="text" 
                  value={data.shadow} 
                  onChange={(e) => updateField('shadow', parseInt(e.target.value) || 0)} 
                />
              </div>
            </div>

            <div className="status-diamond-item">
              <label>Scars</label>
              <div className="diamond-box">
                <input 
                  type="text" 
                  value={data.scars} 
                  onChange={(e) => updateField('scars', parseInt(e.target.value) || 0)} 
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Useful Items & Marvelous Artifacts */}
      <div className="gear-status-section">
        {/* Useful Items */}
        <div className="gear-block">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="section-title" style={{ fontSize: '1.1rem', marginBottom: '8px', textAlign: 'left' }}>USEFUL ITEMS</h3>
          </div>
          <div className="list-container">
            {(data.usefulItems || []).map((item, idx) => (
              <div key={idx} className="list-item-row">
                <input 
                  type="text" 
                  value={item.name} 
                  onChange={(e) => {
                    const updated = [...(data.usefulItems || [])];
                    updated[idx] = { ...updated[idx], name: e.target.value };
                    updateField('usefulItems', updated);
                  }} 
                  placeholder="Item name…"
                  style={{ flex: '0 0 40%' }}
                />
                <input 
                  type="text" 
                  value={item.description} 
                  onChange={(e) => {
                    const updated = [...(data.usefulItems || [])];
                    updated[idx] = { ...updated[idx], description: e.target.value };
                    updateField('usefulItems', updated);
                  }} 
                  placeholder="Description / effect…"
                  style={{ flex: 1 }}
                />
                <button className="delete-btn" onClick={() => {
                  const updated = (data.usefulItems || []).filter((_, i) => i !== idx);
                  updateField('usefulItems', updated);
                }}>×</button>
              </div>
            ))}
            <button className="add-btn" onClick={() => {
              const updated = [...(data.usefulItems || []), { name: '', description: '' }];
              updateField('usefulItems', updated);
            }}>+ Add Useful Item</button>
          </div>
        </div>

        {/* Marvelous Artifacts */}
        <div className="gear-block">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="section-title" style={{ fontSize: '1.1rem', marginBottom: '8px', textAlign: 'left' }}>MARVELOUS ARTIFACTS</h3>
          </div>
          <div className="list-container">
            {(data.marvelousArtifacts || []).map((item, idx) => (
              <div key={idx} className="list-item-row">
                <input 
                  type="text" 
                  value={item.name} 
                  onChange={(e) => {
                    const updated = [...(data.marvelousArtifacts || [])];
                    updated[idx] = { ...updated[idx], name: e.target.value };
                    updateField('marvelousArtifacts', updated);
                  }} 
                  placeholder="Artifact name…"
                  style={{ flex: '0 0 40%' }}
                />
                <input 
                  type="text" 
                  value={item.description} 
                  onChange={(e) => {
                    const updated = [...(data.marvelousArtifacts || [])];
                    updated[idx] = { ...updated[idx], description: e.target.value };
                    updateField('marvelousArtifacts', updated);
                  }} 
                  placeholder="Powers / description…"
                  style={{ flex: 1 }}
                />
                <button className="delete-btn" onClick={() => {
                  const updated = (data.marvelousArtifacts || []).filter((_, i) => i !== idx);
                  updateField('marvelousArtifacts', updated);
                }}>×</button>
              </div>
            ))}
            <button className="add-btn" onClick={() => {
              const updated = [...(data.marvelousArtifacts || []), { name: '', description: '' }];
              updateField('marvelousArtifacts', updated);
            }}>+ Add Artifact</button>
          </div>
        </div>
      </div>

      {/* Mount Section */}
      <div className="skills-section" style={{ borderTop: '2px solid var(--color-crimson)', padding: '16px' }}>
        <h3 className="section-title" style={{ fontSize: '1.1rem', marginBottom: '8px', textAlign: 'left' }}>MOUNT</h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 2, minWidth: '120px' }}>
            <label>Mount Name</label>
            <input 
              type="text" 
              value={data.mount?.name || ''} 
              onChange={(e) => updateField('mount', { ...(data.mount || { name: '', vigour: 0, description: '' }), name: e.target.value })} 
              placeholder="e.g. Shadowfax"
            />
          </div>
          <div className="form-group" style={{ flex: 0, minWidth: '80px' }}>
            <label>Vigour</label>
            <div className="diamond-box" style={{ width: '36px', height: '36px', margin: 0 }}>
              <input 
                type="text" 
                value={data.mount?.vigour || 0} 
                onChange={(e) => updateField('mount', { ...(data.mount || { name: '', vigour: 0, description: '' }), vigour: parseInt(e.target.value) || 0 })} 
              />
            </div>
          </div>
          <div className="form-group" style={{ flex: 3, minWidth: '180px' }}>
            <label>Description / Notes</label>
            <input 
              type="text" 
              value={data.mount?.description || ''} 
              onChange={(e) => updateField('mount', { ...(data.mount || { name: '', vigour: 0, description: '' }), description: e.target.value })} 
              placeholder="Breed, abilities, etc."
            />
          </div>
        </div>
      </div>

      {/* Equipment (Back Side details) */}
      <div className="skills-section" style={{ borderTop: '2px solid var(--color-crimson)', padding: '16px' }}>
        <h3 className="section-title" style={{ fontSize: '1.1rem', marginBottom: '8px', textAlign: 'left' }}>BACKPACK & EQUIPMENT</h3>
        <textarea
          value={data.equipment}
          onChange={(e) => updateField('equipment', e.target.value)}
          placeholder="Lined equipment notes or general background information..."
          style={{
            width: '100%',
            height: '80px',
            backgroundColor: 'transparent',
            border: '1px dashed var(--color-parchment-border)',
            fontFamily: 'var(--font-serif)',
            fontSize: '1.05rem',
            color: 'var(--color-charcoal)',
            padding: '8px',
            outline: 'none',
            resize: 'vertical',
            boxSizing: 'border-box'
          }}
        />
      </div>

    </div>
  );
};
