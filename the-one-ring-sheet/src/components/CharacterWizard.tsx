import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { CharacterData, SkillState } from '../types';
import './CharacterWizard.css';

// ─── Props ───────────────────────────────────────────────────────────

interface CharacterWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: CharacterData) => void;
  existingData?: CharacterData | null;
  ownerPlayerId?: string;
  ownerPlayerName?: string;
}


// ─── Static Data ─────────────────────────────────────────────────────

type SkillName = keyof CharacterData['skills'];

interface CultureInfo {
  name: string;
  description: string;
  standardOfLiving: string;
  blessing: string;
  blessingDesc: string;
  str: number;
  hrt: number;
  wit: number;
}

const CULTURES: CultureInfo[] = [
  {
    name: 'Bardings',
    description: 'Men from Dale and the surrounding lands. Fierce warriors with a strong sense of loyalty.',
    standardOfLiving: 'Prosperous',
    blessing: 'Bardings Redoubtable',
    blessingDesc: 'Strength +1 bonus',
    str: 4, hrt: 2, wit: 2,
  },
  {
    name: 'Men of Bree',
    description: 'Simple folk from the crossroads village of Bree. Hospitable and practical.',
    standardOfLiving: 'Common',
    blessing: 'Bree-blood',
    blessingDesc: 'Heart +1 bonus',
    str: 2, hrt: 3, wit: 3,
  },
  {
    name: 'Dwarves of Durin\'s Folk',
    description: 'Proud and resilient Dwarves, miners and smiths.',
    standardOfLiving: 'Prosperous',
    blessing: 'A Stiff-necked People',
    blessingDesc: 'Strength +1 bonus',
    str: 5, hrt: 1, wit: 2,
  },
  {
    name: 'Elves of Lindon',
    description: 'Ancient and wise Elves from the western shores.',
    standardOfLiving: 'Frugal',
    blessing: 'Elven-skill',
    blessingDesc: 'Wits +1 bonus',
    str: 2, hrt: 2, wit: 4,
  },
  {
    name: 'Hobbits of the Shire',
    description: 'Small, resourceful folk who love comfort but can surprise.',
    standardOfLiving: 'Common',
    blessing: 'Hobbit-sense',
    blessingDesc: 'Heart +1 bonus',
    str: 2, hrt: 4, wit: 2,
  },
  {
    name: 'Rangers of the North',
    description: 'Secretive wanderers, heirs to a lost kingdom.',
    standardOfLiving: 'Frugal',
    blessing: 'Royalty Revealed',
    blessingDesc: 'Wits +1 bonus',
    str: 3, hrt: 2, wit: 3,
  },
];

interface CallingInfo {
  name: string;
  description: string;
  favouredSkills: SkillName[];
  feature: string;
  shadowPath: string;
}

const CALLINGS: CallingInfo[] = [
  {
    name: 'Captain',
    description: 'Leaders who inspire others.',
    favouredSkills: ['battle', 'enhearten', 'persuade'],
    feature: 'Leadership',
    shadowPath: 'Lure of Power',
  },
  {
    name: 'Champion',
    description: 'Warriors who fight evil.',
    favouredSkills: ['athletics', 'awe', 'hunting'],
    feature: 'Enemy-Lore',
    shadowPath: 'Curse of Vengeance',
  },
  {
    name: 'Messenger',
    description: 'Travelers who carry news.',
    favouredSkills: ['courtesy', 'song', 'travel'],
    feature: 'Folk-Lore',
    shadowPath: 'Wandering-Madness',
  },
  {
    name: 'Scholar',
    description: 'Seekers of knowledge.',
    favouredSkills: ['craft', 'lore', 'riddle'],
    feature: 'Rhymes of Lore',
    shadowPath: 'Lure of Secrets',
  },
  {
    name: 'Treasure Hunter',
    description: 'Seekers of lost riches.',
    favouredSkills: ['explore', 'scan', 'stealth'],
    feature: 'Burglary',
    shadowPath: 'Dragon-Sickness',
  },
  {
    name: 'Warden',
    description: 'Protectors of the innocent.',
    favouredSkills: ['awareness', 'healing', 'insight'],
    feature: 'Shadow-Lore',
    shadowPath: 'Path of Despair',
  },
];

const PATRONS = [
  'Balin, son of Fundin',
  'Bilbo Baggins',
  'Círdan the Shipwright',
  'Gandalf the Grey',
  'Gilraen the Fair',
  'Tom Bombadil and Lady Goldberry',
];

const STEP_LABELS = ['Culture', 'Calling', 'Skills', 'Details', 'Review'];

const STRENGTH_SKILLS: { key: SkillName; label: string }[] = [
  { key: 'awe', label: 'Awe' },
  { key: 'athletics', label: 'Athletics' },
  { key: 'awareness', label: 'Awareness' },
  { key: 'hunting', label: 'Hunting' },
  { key: 'song', label: 'Song' },
  { key: 'craft', label: 'Craft' },
];

const HEART_SKILLS: { key: SkillName; label: string }[] = [
  { key: 'enhearten', label: 'Enhearten' },
  { key: 'travel', label: 'Travel' },
  { key: 'insight', label: 'Insight' },
  { key: 'healing', label: 'Healing' },
  { key: 'courtesy', label: 'Courtesy' },
  { key: 'battle', label: 'Battle' },
];

const WITS_SKILLS: { key: SkillName; label: string }[] = [
  { key: 'persuade', label: 'Persuade' },
  { key: 'stealth', label: 'Stealth' },
  { key: 'scan', label: 'Scan' },
  { key: 'explore', label: 'Explore' },
  { key: 'riddle', label: 'Riddle' },
  { key: 'lore', label: 'Lore' },
];

const ALL_SKILLS = [...STRENGTH_SKILLS, ...HEART_SKILLS, ...WITS_SKILLS];

const MAX_SKILL_POINTS = 10;
const MAX_SKILL_RANK = 3;

// ─── Helper ──────────────────────────────────────────────────────────

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function createDefaultSkill(): SkillState {
  return { rank: 0, favoured: false, item: false };
}

// ─── Component ───────────────────────────────────────────────────────

const CharacterWizard: React.FC<CharacterWizardProps> = ({
  isOpen,
  onClose,
  onComplete,
  existingData,
  ownerPlayerId,
  ownerPlayerName,
}) => {
  // Wizard state
  const [step, setStep] = useState(0);

  // Step 1
  const [charName, setCharName] = useState('');
  const [selectedCulture, setSelectedCulture] = useState<CultureInfo | null>(null);

  // Step 2
  const [selectedCalling, setSelectedCalling] = useState<CallingInfo | null>(null);
  const [chosenFavouredSkills, setChosenFavouredSkills] = useState<SkillName[]>([]);

  // Step 3
  const [skillRanks, setSkillRanks] = useState<Record<SkillName, number>>(() => {
    const init: Partial<Record<SkillName, number>> = {};
    ALL_SKILLS.forEach(s => { init[s.key] = 0; });
    return init as Record<SkillName, number>;
  });

  // Step 4
  const [patron, setPatron] = useState('');
  const [features, setFeatures] = useState('');
  const [flaws, setFlaws] = useState('');

  // Pre-fill from existing data when editing
  useEffect(() => {
    if (existingData) {
      setCharName(existingData.name || '');
      const culture = CULTURES.find(c => c.name === existingData.culture) || null;
      setSelectedCulture(culture);
      const calling = CALLINGS.find(c => c.name === existingData.calling) || null;
      setSelectedCalling(calling);
      setPatron(existingData.patron || '');
      setFeatures(existingData.features || '');
      setFlaws(existingData.flaws || '');

      // Restore favoured skills
      if (calling) {
        const favoured: SkillName[] = [];
        calling.favouredSkills.forEach(sk => {
          if (existingData.skills[sk]?.favoured) {
            favoured.push(sk);
          }
        });
        setChosenFavouredSkills(favoured);
      }

      // Restore skill ranks
      const ranks: Partial<Record<SkillName, number>> = {};
      ALL_SKILLS.forEach(s => {
        ranks[s.key] = existingData.skills[s.key]?.rank ?? 0;
      });
      setSkillRanks(ranks as Record<SkillName, number>);
    }
  }, [existingData]);

  // Derived values
  const spentSkillPoints = useMemo(
    () => Object.values(skillRanks).reduce((sum, r) => sum + r, 0),
    [skillRanks],
  );
  const remainingSkillPoints = MAX_SKILL_POINTS - spentSkillPoints;

  // ── Navigation ──

  const canGoNext = useCallback((): boolean => {
    switch (step) {
      case 0: return charName.trim().length > 0 && selectedCulture !== null;
      case 1: return selectedCalling !== null && chosenFavouredSkills.length === 2;
      case 2: return remainingSkillPoints >= 0; // allow leaving some unspent
      case 3: return patron.length > 0;
      case 4: return true;
      default: return false;
    }
  }, [step, charName, selectedCulture, selectedCalling, chosenFavouredSkills, remainingSkillPoints, patron]);

  const goNext = () => { if (canGoNext() && step < 4) setStep(s => s + 1); };
  const goPrev = () => { if (step > 0) setStep(s => s - 1); };

  // ── Skill point handlers ──

  const incrementSkill = (key: SkillName) => {
    setSkillRanks(prev => {
      if (prev[key] >= MAX_SKILL_RANK) return prev;
      const total = Object.values(prev).reduce((s, r) => s + r, 0);
      if (total >= MAX_SKILL_POINTS) return prev;
      return { ...prev, [key]: prev[key] + 1 };
    });
  };

  const decrementSkill = (key: SkillName) => {
    setSkillRanks(prev => {
      if (prev[key] <= 0) return prev;
      return { ...prev, [key]: prev[key] - 1 };
    });
  };

  // ── Favoured skill toggle ──

  const toggleFavouredSkill = (skill: SkillName) => {
    setChosenFavouredSkills(prev => {
      if (prev.includes(skill)) {
        return prev.filter(s => s !== skill);
      }
      if (prev.length >= 2) return prev; // max 2
      return [...prev, skill];
    });
  };

  // ── When calling changes, reset favoured picks ──
  const handleCallingSelect = (calling: CallingInfo) => {
    setSelectedCalling(calling);
    setChosenFavouredSkills([]);
  };

  // ── Build final CharacterData ──

  const buildCharacterData = (): CharacterData => {
    const culture = selectedCulture!;
    const calling = selectedCalling!;

    // Attribute ratings are the culture base values
    const strRating = culture.str;
    const hrtRating = culture.hrt;
    const witRating = culture.wit;

    // Build skills record
    const skills: CharacterData['skills'] = {
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
    };

    // Apply ranks
    ALL_SKILLS.forEach(s => {
      skills[s.key].rank = skillRanks[s.key];
    });

    // Apply favoured
    chosenFavouredSkills.forEach(sk => {
      skills[sk].favoured = true;
    });

    const endurance = strRating + culture.str;
    const hope = hrtRating + culture.hrt;
    const parry = witRating + culture.wit;

    return {
      ownerPlayerId: ownerPlayerId || '',
      ownerPlayerName: ownerPlayerName || '',
      finalized: false,
      gmUnlocked: false,

      age: 33,
      name: charName.trim(),
      culture: culture.name,
      blessing: culture.blessing,
      calling: calling.name,
      shadowPath: calling.shadowPath,
      patron,
      features,
      flaws,


      treasure: 0,
      standardOfLiving: culture.standardOfLiving,
      fellowshipFocus: '',
      adventurePoints: 0,
      skillPoints: 0,
      fellowshipPoints: 0,


      strength: { rating: strRating, tn: 20 - strRating, maxSecondary: endurance },
      heart: { rating: hrtRating, tn: 20 - hrtRating, maxSecondary: hope },
      wits: { rating: witRating, tn: 20 - witRating, maxSecondary: parry },

      skills,

      combat: {
        axes: { rank: 0 },
        bows: { rank: 0 },
        spears: { rank: 0 },
        swords: { rank: 0 },
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
      currentEndurance: endurance,
      currentHope: hope,
      shadow: 0,
      scars: 0,

      weary: false,
      miserable: false,
      wounded: false,
      injury: '',
    };
  };

  const handleComplete = () => {
    const data = buildCharacterData();
    // Finalize and assign ownership at creation time.
    data.finalized = true;
    data.ownerPlayerId = ownerPlayerId || '';
    data.ownerPlayerName = ownerPlayerName || '';
    data.gmUnlocked = false;
    onComplete(data);
  };

  // ── Don't render if not open ──

  if (!isOpen) return null;

  // ──────────────────────────────────────────────────────────────────
  // RENDER STEPS
  // ──────────────────────────────────────────────────────────────────

  const renderStep0 = () => (
    <div className="wizard-step-content" key="step-0">
      <h3 className="wizard-step-title">Name &amp; Heroic Culture</h3>

      <div className="wizard-input-group">
        <label htmlFor="wizard-name">Character Name</label>
        <input
          id="wizard-name"
          className="wizard-text-input"
          type="text"
          placeholder="Enter your character's name…"
          value={charName}
          onChange={e => setCharName(e.target.value)}
          autoFocus
        />
      </div>

      <div className="wizard-input-group">
        <label>Heroic Culture</label>
        <div className="wizard-card-grid">
          {CULTURES.map(culture => (
            <div
              key={culture.name}
              className={`wizard-option-card ${selectedCulture?.name === culture.name ? 'selected' : ''}`}
              onClick={() => setSelectedCulture(culture)}
              role="button"
              tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setSelectedCulture(culture); }}
            >
              <p className="wizard-option-card-name">{culture.name}</p>
              <p className="wizard-option-card-desc">{culture.description}</p>
            </div>
          ))}
        </div>
      </div>

      {selectedCulture && (
        <div className="wizard-info-box">
          <h4>Cultural Blessing</h4>
          <p>
            <span className="blessing-tag">{selectedCulture.blessing}</span>
            <span className="sol-tag">{selectedCulture.standardOfLiving}</span>
          </p>
          <p>{selectedCulture.blessingDesc}</p>
          <div className="wizard-attributes-preview">
            <span className="wizard-attr-chip"><strong>STR</strong> {selectedCulture.str}</span>
            <span className="wizard-attr-chip"><strong>HRT</strong> {selectedCulture.hrt}</span>
            <span className="wizard-attr-chip"><strong>WIT</strong> {selectedCulture.wit}</span>
          </div>
        </div>
      )}
    </div>
  );

  const renderStep1 = () => (
    <div className="wizard-step-content" key="step-1">
      <h3 className="wizard-step-title">Choose Your Calling</h3>

      <div className="wizard-card-grid">
        {CALLINGS.map(calling => (
          <div
            key={calling.name}
            className={`wizard-calling-card ${selectedCalling?.name === calling.name ? 'selected' : ''}`}
            onClick={() => handleCallingSelect(calling)}
            role="button"
            tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleCallingSelect(calling); }}
          >
            <p className="wizard-calling-card-header">{calling.name}</p>
            <p className="wizard-calling-card-body">{calling.description}</p>
            <div className="wizard-calling-tags">
              {calling.favouredSkills.map(sk => (
                <span key={sk} className="wizard-calling-tag">{capitalize(sk)}</span>
              ))}
              <span className="wizard-calling-tag feature">⚙ {calling.feature}</span>
              <span className="wizard-calling-tag shadow">☽ {calling.shadowPath}</span>
            </div>
          </div>
        ))}
      </div>

      {selectedCalling && (
        <div className="wizard-favoured-skills">
          <h4>Choose 2 Favoured Skills</h4>
          <p>Select exactly 2 of {selectedCalling.name}'s 3 favoured skills:</p>
          <div className="wizard-favoured-list">
            {selectedCalling.favouredSkills.map(sk => {
              const isChecked = chosenFavouredSkills.includes(sk);
              const isDisabled = !isChecked && chosenFavouredSkills.length >= 2;
              return (
                <label
                  key={sk}
                  className="wizard-favoured-item"
                  onClick={e => { e.preventDefault(); if (!isDisabled) toggleFavouredSkill(sk); }}
                >
                  <span className={`wizard-favoured-checkbox ${isChecked ? 'checked' : ''} ${isDisabled ? 'disabled' : ''}`} />
                  {capitalize(sk)}
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  const renderSkillColumn = (
    title: string,
    skills: { key: SkillName; label: string }[],
  ) => (
    <div className="wizard-skills-column">
      <h4 className="wizard-skills-column-title">{title}</h4>
      {skills.map(({ key, label }) => {
        const rank = skillRanks[key];
        const isFavoured = chosenFavouredSkills.includes(key);
        return (
          <div key={key} className="wizard-skill-row">
            <span className={`wizard-skill-name ${isFavoured ? 'favoured' : ''}`}>
              {label}
            </span>
            <div className="wizard-skill-controls">
              <button
                className="wizard-skill-btn"
                onClick={() => decrementSkill(key)}
                disabled={rank <= 0}
                aria-label={`Decrease ${label}`}
              >−</button>
              <span className="wizard-skill-rank">{rank}</span>
              <button
                className="wizard-skill-btn"
                onClick={() => incrementSkill(key)}
                disabled={rank >= MAX_SKILL_RANK || remainingSkillPoints <= 0}
                aria-label={`Increase ${label}`}
              >+</button>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderStep2 = () => (
    <div className="wizard-step-content" key="step-2">
      <h3 className="wizard-step-title">Attributes &amp; Skills</h3>

      {selectedCulture && (
        <div className="wizard-attributes-section">
          <div className="wizard-attribute-box">
            <h4 className="wizard-attribute-name">Strength</h4>
            <div className="wizard-attribute-value">
              {selectedCulture.str} <span>(TN {20 - selectedCulture.str})</span>
            </div>
          </div>
          <div className="wizard-attribute-box">
            <h4 className="wizard-attribute-name">Heart</h4>
            <div className="wizard-attribute-value">
              {selectedCulture.hrt} <span>(TN {20 - selectedCulture.hrt})</span>
            </div>
          </div>
          <div className="wizard-attribute-box">
            <h4 className="wizard-attribute-name">Wits</h4>
            <div className="wizard-attribute-value">
              {selectedCulture.wit} <span>(TN {20 - selectedCulture.wit})</span>
            </div>
          </div>
        </div>
      )}

      <div className="wizard-pool-counter">
        Skill Points Remaining: <strong>{remainingSkillPoints}</strong> / {MAX_SKILL_POINTS}
      </div>

      <div className="wizard-skills-columns">
        {renderSkillColumn('Strength', STRENGTH_SKILLS)}
        {renderSkillColumn('Heart', HEART_SKILLS)}
        {renderSkillColumn('Wits', WITS_SKILLS)}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="wizard-step-content" key="step-3">
      <h3 className="wizard-step-title">Patron &amp; Details</h3>

      <div className="wizard-input-group">
        <label htmlFor="wizard-patron">Patron</label>
        <select
          id="wizard-patron"
          className="wizard-select"
          value={patron}
          onChange={e => setPatron(e.target.value)}
        >
          <option value="">— Select a Patron —</option>
          {PATRONS.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      <div className="wizard-input-group">
        <label htmlFor="wizard-features">Distinctive Features</label>
        <textarea
          id="wizard-features"
          className="wizard-textarea"
          placeholder="Bold, Cunning, Fair-spoken…"
          value={features}
          onChange={e => setFeatures(e.target.value)}
        />
      </div>

      <div className="wizard-input-group">
        <label htmlFor="wizard-flaws">Flaws</label>
        <textarea
          id="wizard-flaws"
          className="wizard-textarea"
          placeholder="Proud, Reckless…"
          value={flaws}
          onChange={e => setFlaws(e.target.value)}
        />
      </div>
    </div>
  );

  const renderStep4 = () => {
    const culture = selectedCulture!;
    const calling = selectedCalling!;
    const endurance = culture.str + culture.str;
    const hope = culture.hrt + culture.hrt;
    const parry = culture.wit + culture.wit;

    // Collect skills with ranks > 0 or favoured
    const allocatedSkills = ALL_SKILLS
      .filter(s => skillRanks[s.key] > 0 || chosenFavouredSkills.includes(s.key))
      .map(s => ({
        label: s.label,
        rank: skillRanks[s.key],
        favoured: chosenFavouredSkills.includes(s.key),
      }));

    return (
      <div className="wizard-step-content" key="step-4">
        <h3 className="wizard-step-title">Review Your Character</h3>

        <div className="wizard-review-section">
          <h4>Identity</h4>
          <div className="wizard-review-grid">
            <div className="wizard-review-item">
              <span className="wizard-review-label">Name:</span>
              <span className="wizard-review-value">{charName}</span>
            </div>
            <div className="wizard-review-item">
              <span className="wizard-review-label">Culture:</span>
              <span className="wizard-review-value">{culture.name}</span>
            </div>
            <div className="wizard-review-item">
              <span className="wizard-review-label">Calling:</span>
              <span className="wizard-review-value">{calling.name}</span>
            </div>
            <div className="wizard-review-item">
              <span className="wizard-review-label">Patron:</span>
              <span className="wizard-review-value">{patron}</span>
            </div>
            <div className="wizard-review-item">
              <span className="wizard-review-label">Blessing:</span>
              <span className="wizard-review-value">{culture.blessing}</span>
            </div>
            <div className="wizard-review-item">
              <span className="wizard-review-label">Shadow:</span>
              <span className="wizard-review-value">{calling.shadowPath}</span>
            </div>
            <div className="wizard-review-item">
              <span className="wizard-review-label">Living:</span>
              <span className="wizard-review-value">{culture.standardOfLiving}</span>
            </div>
          </div>
        </div>

        {(features || flaws) && (
          <div className="wizard-review-section">
            <h4>Traits</h4>
            <div className="wizard-review-grid">
              {features && (
                <div className="wizard-review-item">
                  <span className="wizard-review-label">Features:</span>
                  <span className="wizard-review-value">{features}</span>
                </div>
              )}
              {flaws && (
                <div className="wizard-review-item">
                  <span className="wizard-review-label">Flaws:</span>
                  <span className="wizard-review-value">{flaws}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="wizard-review-section">
          <h4>Attributes &amp; Derived Values</h4>
          <div className="wizard-review-computed">
            <div className="wizard-review-stat">
              <span className="wizard-review-stat-label">Strength (TN {20 - culture.str})</span>
              <span className="wizard-review-stat-value">{culture.str}</span>
            </div>
            <div className="wizard-review-stat">
              <span className="wizard-review-stat-label">Heart (TN {20 - culture.hrt})</span>
              <span className="wizard-review-stat-value">{culture.hrt}</span>
            </div>
            <div className="wizard-review-stat">
              <span className="wizard-review-stat-label">Wits (TN {20 - culture.wit})</span>
              <span className="wizard-review-stat-value">{culture.wit}</span>
            </div>
          </div>
          <div className="wizard-review-computed" style={{ marginTop: '8px' }}>
            <div className="wizard-review-stat">
              <span className="wizard-review-stat-label">Endurance</span>
              <span className="wizard-review-stat-value">{endurance}</span>
            </div>
            <div className="wizard-review-stat">
              <span className="wizard-review-stat-label">Hope</span>
              <span className="wizard-review-stat-value">{hope}</span>
            </div>
            <div className="wizard-review-stat">
              <span className="wizard-review-stat-label">Parry</span>
              <span className="wizard-review-stat-value">{parry}</span>
            </div>
          </div>
        </div>

        {allocatedSkills.length > 0 && (
          <div className="wizard-review-section">
            <h4>Skills</h4>
            <div className="wizard-review-skills-list">
              {allocatedSkills.map(s => (
                <span
                  key={s.label}
                  className={`wizard-review-skill-chip ${s.favoured ? 'favoured' : ''}`}
                >
                  {s.label} {s.rank > 0 ? `(${s.rank})` : ''}{s.favoured ? ' ★' : ''}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Main render ──

  const renderCurrentStep = () => {
    switch (step) {
      case 0: return renderStep0();
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      default: return null;
    }
  };

  return (
    <div className="wizard-overlay" onClick={onClose}>
      <div className="wizard-card" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="wizard-header">
          <button className="wizard-close-btn" onClick={onClose} aria-label="Close wizard">×</button>
          <h2 className="wizard-title">Create Your Hero</h2>

          {/* Progress */}
          <div className="wizard-progress">
            {STEP_LABELS.map((label, i) => (
              <React.Fragment key={label}>
                {i > 0 && (
                  <div className={`wizard-step-connector ${i <= step ? 'completed' : ''}`} />
                )}
                <div className="wizard-step-indicator">
                  <div
                    className={`wizard-step-dot ${i === step ? 'active' : ''} ${i < step ? 'completed' : ''}`}
                  >
                    {i < step ? '✓' : i + 1}
                  </div>
                  <span className={`wizard-step-label ${i === step ? 'active' : ''}`}>{label}</span>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="wizard-body">
          {renderCurrentStep()}
        </div>

        {/* Footer */}
        <div className="wizard-footer">
          <div>
            {step > 0 && (
              <button className="wizard-btn wizard-btn-prev" onClick={goPrev}>
                ← Previous
              </button>
            )}
          </div>
          <div>
            {step < 4 ? (
              <button
                className="wizard-btn wizard-btn-next"
                onClick={goNext}
                disabled={!canGoNext()}
              >
                Next →
              </button>
            ) : (
              <button
                className="wizard-btn wizard-btn-create"
                onClick={handleComplete}
              >
                ✦ Create Character
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CharacterWizard;
