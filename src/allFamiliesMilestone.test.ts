import {describe, expect, it} from 'vitest';
import {assignedFamilyCount, cost, monsters, start} from './engine';
import {activeFamilyOptions, FAMILY_DEFINITIONS, FAMILY_IDS} from './families';
import {CHARACTER_ART} from './MonsterArt';
import {initialTeam, isValidTeam, loadTeamSlots, recommendedTeams, saveTeamSlots} from './strategy';

const pureTeams = {
  beast: [12, 0, 2, 11, 13],
  nature: [14, 3, 6, 9, 10],
  dragon: [15, 5, 16, 17, 18],
  material: [19, 20, 21, 22, 23],
  slime: [24, 25, 26, 27, 28],
  demon: [29, 1, 8, 30, 31],
  undead: [32, 4, 33, 34, 35],
} as const;
const mixed = [36, 12, 2, 30, 26];

/** Roster/interaction coverage, not a win-rate or publication-completion claim. */
describe('bounded all-family local roster milestone', () => {
  it('represents exactly seven pure-team families plus one mixed-team core', () => {
    expect(monsters.map(monster => monster.id)).toEqual(Array.from({length: 37}, (_, id) => id));
    expect(activeFamilyOptions(monsters).map(([id]) => id)).toEqual(FAMILY_IDS);
    expect(FAMILY_IDS.filter(id => FAMILY_DEFINITIONS[id].teamStyle === 'pure')).toEqual(Object.keys(pureTeams));
    expect(monsters.filter(monster => monster.family === 'extraordinary').map(monster => monster.id)).toEqual([36]);
    expect(FAMILY_DEFINITIONS.extraordinary.teamStyle).toBe('mixed');
  });
  it.each(Object.entries(pureTeams))('%s has five distinct legal same-family members, a core and original core art', (family, ids) => {
    expect(new Set(ids).size).toBe(5);
    expect(isValidTeam([...ids])).toBe(true);
    expect(ids.every(id => monsters[id].family === family)).toBe(true);
    expect(cost([...ids])).toBe(family === 'nature' ? 15 : 17);
    expect(CHARACTER_ART[ids[0]]?.artUrl).toMatch(/^data:image\/svg\+xml/);
    expect(recommendedTeams.some(team => JSON.stringify(team.team) === JSON.stringify(ids))).toBe(true);
  });
  it('grants eight operationally different opening mechanics rather than cosmetic tags alone', () => {
    const cores = Object.values(pureTeams).map(ids => start([...ids], []).allies[0]);
    expect(cores[0].rally).toBe(2);
    expect(cores[1].ward).toBe(2);
    expect(cores[2].dragonCharge).toBe(0);
    expect(cores[3].repairReady).toBe(true);
    expect(cores[4].supplyReady).toBe(true);
    expect(cores[5].mpDamageBonus).toBe(4);
    expect(cores[6].poisonCashoutBonus).toBe(8);
    const party = start(mixed, []).allies;
    expect(assignedFamilyCount(party)).toBe(4);
    expect(party[0].responseReady).toBe(true);
    expect(isValidTeam(mixed)).toBe(true);
    expect(cost(mixed)).toBe(17);
    expect(CHARACTER_ART[36]?.portraitUrl).toMatch(/^data:image\/svg\+xml/);
  });
  it('offers the independently rechecked mixed example without a fifth-tag bonus', () => {
    const ids = [36,12,4,20,26];
    const party = start(ids, []).allies;
    expect(recommendedTeams.some(example => JSON.stringify(example.team) === JSON.stringify(ids))).toBe(true);
    expect(assignedFamilyCount(party)).toBe(5);
    expect(party[0].responseReady).toBe(true);
    expect(cost(ids)).toBe(17);
    expect(party[0].responseReady).toBe(start(mixed, []).allies[0].responseReady);
  });
  it('preserves the old save format, old team and legal new teams without a rarity or transformation requirement', () => {
    let stored = '';
    const storage = {getItem: () => stored, setItem: (_key: string, value: string) => {stored = value;}};
    const slots = [{team: initialTeam, rule: 'light'}, {team: [...pureTeams.undead], rule: 'standard'}, {team: mixed, rule: 'standard'}];
    expect(saveTeamSlots(storage, slots)).toBe(true);
    expect(loadTeamSlots(storage)).toEqual(slots);
    expect(isValidTeam(initialTeam, 15)).toBe(true);
    expect(monsters.every(monster => monster.skills.length <= 4 && monster.mp > 0)).toBe(true);
    expect(Object.keys(CHARACTER_ART).filter(id => Number(id) >= 12)).toHaveLength(25);
  });
});
