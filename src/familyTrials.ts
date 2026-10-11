import { monsters } from './engine';
import { FAMILY_DEFINITIONS, FAMILY_IDS, type Family } from './families';
import { isValidTeam, recommendedTeams, rules, type RuleId } from './strategy';

export type FamilyTrialPreset = {
  id: Family;
  name: string;
  family: Family;
  team: readonly number[];
  kind: 'pure' | 'mixed';
  note: string;
};

/** Reuse the existing leader-first recommendations, including their explanations. */
export const familyTrialPresets: readonly FamilyTrialPreset[] = Object.freeze(FAMILY_IDS.map(family => {
  const kind = FAMILY_DEFINITIONS[family].teamStyle;
  const recommendation = recommendedTeams.find(preset =>
    monsters[preset.team[0]].family === family &&
    (kind === 'mixed' || preset.team.every(id => monsters[id].family === family)),
  );
  if (!recommendation) throw new Error(`Missing family trial recommendation: ${family}`);
  return Object.freeze({
    id: family, family, kind, name: recommendation.name, note: recommendation.note,
    team: Object.freeze([...recommendation.team]),
  });
}));

/** COST15 currently has only nature; never substitute a mixed or over-budget team. */
export function pureFamilyOpponentPresets(rule: RuleId): readonly FamilyTrialPreset[] {
  return familyTrialPresets.filter(preset => preset.kind === 'pure' &&
    isValidTeam(preset.team, rules[rule].budget) &&
    preset.team.every(id => monsters[id].family === preset.family));
}

export type FamilyEncounter = { enemy: number[]; seed: number; rule: RuleId; family: Family };

/** A stateless draw from the seed, separate from the battle engine's RNG stream. */
export function familyEncounterForSeed(rule: RuleId, seed: number): FamilyEncounter {
  const pool = pureFamilyOpponentPresets(rule);
  if (!pool.length) throw new Error(`No legal pure family opponents for rule: ${rule}`);
  const battleSeed = seed >>> 0;
  // Odd multiplication permutes all uint32 values and spreads nearby seeds out.
  const draw = Math.imul(battleSeed, 2654435761) >>> 0;
  const preset = pool[Math.floor(draw / 0x100000000 * pool.length)];
  return { enemy: [...preset.team], seed: battleSeed, rule, family: preset.family };
}
