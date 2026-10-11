import { describe, expect, it, vi } from 'vitest';
import { cost, monsters, start } from './engine';
import { FAMILY_IDS } from './families';
import { familyEncounterForSeed, familyTrialPresets, pureFamilyOpponentPresets } from './familyTrials';
import { isValidTeam, recommendedTeams, rules, type RuleId } from './strategy';

describe('family trial recommendations', () => {
  it('reuses seven pure leader-first recommendations and one explicitly mixed Janus example', () => {
    expect(familyTrialPresets.map(preset => preset.id)).toEqual(FAMILY_IDS);
    for (const preset of familyTrialPresets) {
      const original = recommendedTeams.find(candidate => candidate.name === preset.name)!;
      expect(original).toBeDefined();
      expect(preset.team).toEqual(original.team);
      expect(preset.team).not.toBe(original.team);
      expect(preset.note).toBe(original.note);
      expect(monsters[preset.team[0]].family).toBe(preset.family);
      expect(isValidTeam(preset.team)).toBe(true);
      expect(new Set(preset.team.map(id => monsters[id].family)).size).toBe(preset.kind === 'pure' ? 1 : 5);
    }
    expect(familyTrialPresets.filter(preset => preset.kind === 'pure')).toHaveLength(7);
    expect(familyTrialPresets.filter(preset => preset.kind === 'mixed')).toMatchObject([
      { id: 'extraordinary', family: 'extraordinary', team: [36, 12, 4, 20, 26], name: '超常の攻防混成' },
    ]);
    expect(familyTrialPresets.at(-1)!.note).toContain('混成');
  });

  it.each(['standard', 'light'] as const)('offers only unique, pure, legal five-member opponents for %s', rule => {
    const pool = pureFamilyOpponentPresets(rule);
    expect(pool.map(preset => preset.family)).toEqual(rule === 'standard' ? FAMILY_IDS.slice(0, 7) : ['nature']);
    for (const preset of pool) {
      expect(preset.kind).toBe('pure');
      expect(preset.team).toHaveLength(5);
      expect(new Set(preset.team).size).toBe(5);
      expect(preset.team.every(id => monsters[id].family === preset.family)).toBe(true);
      expect(cost([...preset.team])).toBeLessThanOrEqual(rules[rule].budget);
      expect(isValidTeam(preset.team, rules[rule].budget)).toBe(true);
    }
    expect(pool.some(preset => preset.family === 'extraordinary')).toBe(false);
  });

  it('protects presets and never returns a mutable shared encounter array', () => {
    expect(Object.isFrozen(familyTrialPresets)).toBe(true);
    expect(familyTrialPresets.every(preset => Object.isFrozen(preset) && Object.isFrozen(preset.team))).toBe(true);
    const pool = pureFamilyOpponentPresets('standard');
    expect(pool).not.toBe(pureFamilyOpponentPresets('standard'));
    const first = familyEncounterForSeed('standard', 7);
    const second = familyEncounterForSeed('standard', 7);
    const original = structuredClone(second);
    expect(first).not.toBe(second);
    expect(first.enemy).not.toBe(second.enemy);
    expect(first.enemy).not.toBe(pool.find(preset => preset.family === first.family)!.team);
    first.enemy.reverse(); first.enemy[0] = -1; first.seed = 99;
    expect(second).toEqual(original);
    expect(familyEncounterForSeed('standard', 7)).toEqual(original);
  });
});

describe('seeded pure-family encounters', () => {
  it.each(['standard', 'light'] as const)('is deterministic, legal and leader-first for every sampled %s seed', rule => {
    for (const seed of [0, 1, 2, 7, 42, 20261008, 0x7fffffff, 0xffffffff]) {
      const encounter = familyEncounterForSeed(rule, seed);
      expect(encounter).toEqual(familyEncounterForSeed(rule, seed));
      expect(encounter).toMatchObject({ seed, rule });
      expect(encounter.enemy).toEqual(pureFamilyOpponentPresets(rule).find(preset => preset.family === encounter.family)!.team);
      expect(start([0, 2, 3, 4, 6], encounter.enemy, encounter.seed).seed).toBe(seed);
    }
  });

  it('reaches every standard family with an even distribution across nearby seeds', () => {
    const counts = new Map(FAMILY_IDS.slice(0, 7).map(family => [family, 0]));
    for (let seed = 0; seed < 7000; seed++) {
      const family = familyEncounterForSeed('standard', seed).family;
      counts.set(family, counts.get(family)! + 1);
    }
    expect(counts.size).toBe(7);
    for (const count of counts.values()) {
      expect(count).toBeGreaterThanOrEqual(990);
      expect(count).toBeLessThanOrEqual(1010);
    }
  });

  it('normalizes uint32 seeds like the engine, without calling any random source', () => {
    const random = vi.spyOn(Math, 'random');
    try {
      for (const rule of ['standard', 'light'] as RuleId[]) {
        expect(familyEncounterForSeed(rule, -1)).toEqual(familyEncounterForSeed(rule, 0xffffffff));
        expect(familyEncounterForSeed(rule, 0x100000000)).toEqual(familyEncounterForSeed(rule, 0));
      }
      expect(random).not.toHaveBeenCalled();
    } finally { random.mockRestore(); }
  });
});
