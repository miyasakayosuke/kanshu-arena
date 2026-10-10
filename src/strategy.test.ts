import { describe, expect, it, vi } from 'vitest';
import { cost, leaderFor, MAX_TURNS, monsters, start } from './engine';
import {
  fixedDamageHint, initialTeam, isValidTeam, recommendedTeams, loadTeamSlots, monsterLore, monsterRole, opponentTeams,
  resultSummary, rules, saveTeamSlots, skillLore, type RuleId, type TeamSlot,
} from './strategy';

const key = 'kanshu-team-slots-v1';
const standard: TeamSlot = { team: [...initialTeam], rule: 'standard' };
const light: TeamSlot = { team: opponentTeams('light')[0], rule: 'light' };
const readStorage = (value: unknown) => ({ getItem: vi.fn(() => JSON.stringify(value)) });

describe('team rules and opponents', () => {
  it('keeps the starting team legal under both rules', () => {
    expect(initialTeam).toEqual([0, 2, 3, 4, 6]);
    expect(rules.standard).toMatchObject({ id: 'standard', name: '標準戦', budget: 17 });
    expect(rules.light).toMatchObject({ id: 'light', name: '軽量戦', budget: 15 });
    expect(isValidTeam(initialTeam)).toBe(true);
    expect(isValidTeam(initialTeam, rules.light.budget)).toBe(true);
  });

  it.each<RuleId>(['standard', 'light'])('provides distinct legal %s opponents', rule => {
    const teams = opponentTeams(rule);
    expect(teams).toHaveLength(rule === 'standard' ? 7 : 5);
    expect(new Set(teams.map(team => [...team].sort((a, b) => a - b).join(','))).size).toBe(teams.length);
    for (const team of teams) {
      expect(isValidTeam(team, rules[rule].budget)).toBe(true);
      expect(cost(team)).toBeLessThanOrEqual(rules[rule].budget);
      const skillKinds = new Set(team.flatMap(id => monsters[id].skills.map(skill => skill.kind)));
      expect(skillKinds.has('hit')).toBe(true);
      expect(skillKinds.size).toBeGreaterThanOrEqual(3);
    }
  });

  it('preserves standard opponents and protects them from preview mutations', () => {
    const expected = [[1, 5, 8, 10, 6], [11, 9, 4, 7, 10], [0, 3, 1, 6, 2], [12, 0, 2, 6, 10], [12, 0, 2, 11, 13], [14, 3, 6, 9, 10], [15, 5, 16, 17, 18]];
    expect(opponentTeams('standard')).toEqual(expected);
    const teams = opponentTeams('standard');
    teams[0][0] = 11;
    teams.pop();
    expect(opponentTeams('standard')).toEqual(expected);
  });

  it('appends legal full-family encounters without changing the original preset order', () => {
    const standard = opponentTeams('standard');
    const light = opponentTeams('light');
    expect(standard.slice(0, 4)).toEqual([[1, 5, 8, 10, 6], [11, 9, 4, 7, 10], [0, 3, 1, 6, 2], [12, 0, 2, 6, 10]]);
    expect(light.slice(0, 4)).toEqual([[1, 5, 8, 10, 2], [11, 9, 4, 3, 10], [0, 7, 2, 6, 10], [12, 0, 2, 6, 10]]);
    expect(standard.slice(4)).toEqual([[12, 0, 2, 11, 13], [14, 3, 6, 9, 10], [15, 5, 16, 17, 18]]);
    expect(light.slice(4)).toEqual([[14, 3, 6, 9, 10]]);
    const beast = standard[4];
    const nature = standard[5];
    expect(beast.every(id => monsters[id].family === 'beast')).toBe(true);
    expect(nature.every(id => monsters[id].family === 'nature')).toBe(true);
    expect(cost(beast)).toBe(17);
    expect(cost(nature)).toBe(15);
    expect(isValidTeam(beast, rules.standard.budget)).toBe(true);
    expect(isValidTeam(beast, rules.light.budget)).toBe(false);
    expect(isValidTeam(nature, rules.light.budget)).toBe(true);
  });

  it('appends the pure dragon team only to standard and gives legal reference examples', () => {
    const dragon = [15, 5, 16, 17, 18];
    expect(opponentTeams('standard').at(-1)).toEqual(dragon);
    expect(opponentTeams('light')).toEqual([[1, 5, 8, 10, 2], [11, 9, 4, 3, 10], [0, 7, 2, 6, 10], [12, 0, 2, 6, 10], [14, 3, 6, 9, 10]]);
    expect(cost(dragon)).toBe(17);
    expect(isValidTeam(dragon, 17)).toBe(true);
    expect(isValidTeam(dragon, 15)).toBe(false);
    for (const example of recommendedTeams) expect(isValidTeam([...example.team])).toBe(true);
    expect(cost([...recommendedTeams[3].team])).toBe(15);
  });

  it('validates exact size, unique roster IDs, integer IDs, and the selected budget', () => {
    const sixteenCost = [11, 9, 4, 7, 10];
    expect(isValidTeam(sixteenCost)).toBe(true);
    expect(isValidTeam(sixteenCost, 15)).toBe(false);
    const invalid: unknown[] = [null, undefined, {}, '0,2,3,4,6', [], [0, 2, 3, 4],
      [0, 2, 3, 4, 6, 8], [0, 2, 3, 4, 4], [0, 2, 3, 4, 99], [0, 2, 3, 4, -1],
      [0, 2, 3, 4, 6.5], [0, 2, 3, 4, '6'], [0, 2, 3, 4, NaN], [0, 2, 3, 4, Infinity],
      [0, 5, 7, 11, 2], new Array(5), [, 2, 3, 4, 6]];
    for (const value of invalid) expect(isValidTeam(value), JSON.stringify(value)).toBe(false);
    for (const budget of [14, -1, NaN, Infinity]) expect(isValidTeam(initialTeam, budget)).toBe(false);
  });
});

describe('local team slots', () => {
  it('returns exactly three empty slots for missing, malformed, or blocked storage', () => {
    const storageCases = [
      { getItem: () => null }, { getItem: () => '{bad json' },
      { getItem: () => { throw new Error('blocked'); } },
      ...[null, 3, {}, { slots: [standard] }, 'hello'].map(readStorage),
    ];
    for (const storage of storageCases) expect(loadTeamSlots(storage)).toEqual([null, null, null]);
  });

  it('salvages valid slots in place and fills missing positions', () => {
    const storage = readStorage([standard, { team: [1, 1, 1, 1, 1], rule: 'standard' }, light]);
    expect(loadTeamSlots(storage)).toEqual([standard, null, light]);
    expect(storage.getItem).toHaveBeenCalledWith(key);
    expect(loadTeamSlots(readStorage([light]))).toEqual([light, null, null]);
    expect(loadTeamSlots(readStorage([null, standard, null, light]))).toEqual([null, standard, null]);
  });

  it('loads old IDs without migration and round-trips all new dragon IDs', () => {
    const old = { team: [5, 1, 4, 8, 6], rule: 'standard' } as const;
    const dragon = { team: [15, 5, 16, 17, 18], rule: 'standard' } as const;
    const saved = [old, dragon, null];
    let serialized = JSON.stringify(saved);
    const storage = { getItem: () => serialized, setItem: (_key: string, value: string) => { serialized = value; } };
    expect(loadTeamSlots(storage)).toEqual(saved);
    expect(saveTeamSlots(storage, saved)).toBe(true);
    expect(loadTeamSlots(storage)).toEqual(saved);
  });

  it('rejects unknown rules, incomplete teams, and saved teams over their own rule budget', () => {
    for (const invalid of [
      { team: initialTeam, rule: 'future' }, { team: initialTeam }, initialTeam,
      { rule: 'standard' }, { team: [0, 2], rule: 'light' },
      { team: [11, 9, 4, 7, 10], rule: 'light' },
    ]) expect(loadTeamSlots(readStorage([invalid, standard, null]))).toEqual([null, standard, null]);
  });

  it('round-trips all slots using only the versioned local-storage key', () => {
    let saved: string | null = null;
    const storage = {
      getItem: vi.fn(() => saved),
      setItem: vi.fn((_key: string, value: string) => { saved = value; }),
    };
    expect(saveTeamSlots(storage, [standard, null, light])).toBe(true);
    expect(storage.setItem).toHaveBeenCalledExactlyOnceWith(key, JSON.stringify([standard, null, light]));
    expect(loadTeamSlots(storage)).toEqual([standard, null, light]);
    expect(saveTeamSlots(storage, [null, null, null])).toBe(true);
    expect(loadTeamSlots(storage)).toEqual([null, null, null]);
  });

  it('does not mutate input or return shared team arrays', () => {
    const input = Object.freeze([Object.freeze({ team: Object.freeze([...initialTeam]), rule: 'standard' }), null, null]);
    const storage = readStorage(input);
    const loaded = loadTeamSlots(storage);
    loaded[0]!.team[0] = 11;
    expect(loadTeamSlots(storage)).toEqual(input);
    expect(saveTeamSlots({ setItem: vi.fn() }, input)).toBe(true);
    expect(input[0]?.team).toEqual(initialTeam);
  });

  it('refuses invalid saves before writing anything', () => {
    const setItem = vi.fn();
    for (const invalid of [null, {}, [], [standard], [standard, null, null, light],
      [standard, undefined, null], new Array(3),
      [standard, { team: [0], rule: 'standard' }, null],
      [{ team: [11, 9, 4, 7, 10], rule: 'light' }, null, null],
    ]) expect(saveTeamSlots({ setItem }, invalid)).toBe(false);
    expect(setItem).not.toHaveBeenCalled();
  });

  it('reports failed writes without throwing', () => {
    const storage = { setItem: () => { throw new Error('QuotaExceededError'); } };
    expect(saveTeamSlots(storage, [standard, null, light])).toBe(false);
  });
});

describe('original roster and skill lore', () => {
  it('provides distinct concise lore for every monster', () => {
    const stories = monsters.map(monster => monsterLore(monster.id));
    expect(new Set(stories).size).toBe(monsters.length);
    for (const story of stories) {
      expect(story.length).toBeGreaterThan(10);
      expect(story.length).toBeLessThan(90);
      expect(story).not.toBe(monsterLore(-1));
    }
  });

  it('covers all named specials, universal commands, and counter skills', () => {
    const names = new Set([
      ...monsters.flatMap(monster => monster.skills.map(skill => skill.name)),
      '通常攻撃', 'ぼうぎょ', '守護の誓い', '蛇鱗の庇護', '清めの鈴', '潮騒の浄化', '破城の拳', '冥府の断罪',
    ]);
    for (const name of names) {
      expect(skillLore(name).length, name).toBeGreaterThan(8);
      expect(skillLore(name), name).not.toBe(skillLore('unknown'));
    }
    expect(monsterLore(999)).toBeTruthy();
    expect(skillLore('unknown')).toBeTruthy();
  });
});

describe('truthful character roles and tradeoffs', () => {
  it('gives every monster a distinct compact job with a strength and limitation', () => {
    const roles = monsters.map(monster => monsterRole(monster.id));
    expect(new Set(roles.map(role => role.name)).size).toBe(monsters.length);
    for (const role of roles) {
      expect(role).not.toEqual(monsterRole(-1));
      expect(role.name.length).toBeGreaterThan(3);
      expect(role.name.length).toBeLessThanOrEqual(12);
      for (const line of [role.strength, role.tradeoff]) {
        expect(line.length).toBeGreaterThan(10);
        expect(line.length).toBeLessThanOrEqual(50);
        expect(line).not.toMatch(/蘇生|魅了|恐怖|回避|身代わり|引き受け/);
      }
    }
    const unknown = monsterRole(-1);
    expect(Object.values(unknown).every(Boolean)).toBe(true);
    unknown.name = 'changed';
    expect(monsterRole(-1).name).toBe('未知の役割');
    const known = monsterRole(0);
    known.strength = 'changed';
    expect(monsterRole(0).strength).not.toBe('changed');
  });

  it('grounds inexpensive guardian and finisher roles in actual stats and skills', () => {
    const naga = monsters[10];
    const garuda = monsters[6];
    expect(naga.cost).toBe(2);
    expect(naga.skills.some(skill => skill.kind === 'protect')).toBe(true);
    expect(naga.skills.some(skill => skill.kind === 'poison' && skill.all)).toBe(true);
    expect(monsterRole(naga.id).strength).toContain('COST2');
    expect(monsterRole(naga.id).tradeoff).toContain('同時に使えない');
    expect(garuda.cost).toBe(2);
    expect(garuda.speed).toBe(Math.max(...monsters.map(monster => monster.speed)));
    expect(garuda.hp).toBeLessThan(monsters[0].hp);
    expect(monsterRole(garuda.id).strength).toContain('撃破');
    expect(monsterRole(garuda.id).tradeoff).toContain('HPは低く');
    expect(monsters[0].atk).toBeGreaterThan(garuda.atk);
    expect(monsters[0].skills[0]!.power).toBeGreaterThan(garuda.skills[0]!.power);
    expect(monsters[1].hp).toBe(Math.max(...monsters.map(monster => monster.hp)));
    expect(monsterRole(1).tradeoff).toContain('守護を選ぶターンは攻撃できず');
  });

  it('distinguishes the two healers by cost, bulk, and speed rather than invented effects', () => {
    const bastet = monsters[2];
    const selkie = monsters[7];
    expect(bastet.cost).toBe(3);
    expect(selkie.cost).toBe(4);
    expect(selkie.hp).toBeGreaterThan(bastet.hp);
    expect(selkie.speed).toBeGreaterThan(bastet.speed);
    for (const kind of ['heal', 'cleanse']) {
      expect(selkie.skills.find(skill => skill.kind === kind)?.power)
        .toBe(bastet.skills.find(skill => skill.kind === kind)?.power);
    }
    expect(monsterRole(bastet.id).strength).toContain('COST3');
    expect(monsterRole(selkie.id).tradeoff).toContain('効果はバステトと同じ');
  });

  it('distinguishes poison leaders and accurately identifies the armor breaker', () => {
    expect(leaderFor(4).stat).toBe('atk');
    expect(leaderFor(9).stat).toBe('speed');
    expect(monsters[9].speed).toBeGreaterThan(monsters[4].speed);
    expect(monsterRole(4).strength).toContain('攻撃リーダー');
    expect(monsterRole(9).strength).toContain('素早さリーダー');
    const anubis = monsters[11];
    expect(anubis.atk).toBe(Math.max(...monsters.map(monster => monster.atk)));
    expect(anubis.skills.find(skill => skill.breaksGuard)?.priority).toBe(0);
    expect(monsterRole(anubis.id).tradeoff).toContain('防御解除は先制技ではない');
  });
});

describe('result summaries', () => {
  it('summarizes an untouched match as full HP and zero completed turns', () => {
    expect(resultSummary(start(initialTeam, opponentTeams('standard')[0]))).toEqual({
      remainingAllies: 5, remainingEnemies: 5, allyHpPercent: 100, enemyHpPercent: 100, turns: 0,
    });
  });

  it('normalizes each unit against its own full HP, including defeated units', () => {
    const state = start(initialTeam, opponentTeams('standard')[0]);
    [1, 0.5, 0.25, 0, 0].forEach((ratio, index) => { state.allies[index].hp *= ratio; });
    [0, 1, 0.5, 0, 0.5].forEach((ratio, index) => { state.enemies[index].hp *= ratio; });
    state.turn = 8;
    state.winner = 'lose';
    const snapshot = structuredClone(state);
    expect(resultSummary(state)).toEqual({
      remainingAllies: 3, remainingEnemies: 3, allyHpPercent: 35, enemyHpPercent: 40, turns: 7,
    });
    expect(state).toEqual(snapshot);
  });

  it('caps completed turns at the engine limit and handles empty sides', () => {
    const state = start([], []);
    state.turn = MAX_TURNS + 1;
    expect(resultSummary(state)).toEqual({
      remainingAllies: 0, remainingEnemies: 0, allyHpPercent: 0, enemyHpPercent: 0, turns: MAX_TURNS,
    });
    state.turn = MAX_TURNS + 10;
    expect(resultSummary(state).turns).toBe(MAX_TURNS);
    state.turn = 0;
    expect(resultSummary(state).turns).toBe(0);
  });

  it('uses battle-time maximum HP after leader boosts', () => {
    const state = start([1, 2, 3, 4, 6], [2, 5, 8, 10, 6], 42, { leaders: true });
    expect(state.allies[0].monster.hp).toBeGreaterThan(monsters[1].hp);
    expect(resultSummary(state).allyHpPercent).toBe(100);
    expect(resultSummary(state).enemyHpPercent).toBe(100);
    state.allies.forEach(unit => { unit.hp = unit.monster.hp / 2; });
    expect(resultSummary(state).allyHpPercent).toBe(50);
  });

  it('rounds percentage readouts to one decimal place', () => {
    const state = start([0], [1]);
    state.allies[0].hp = 1;
    state.enemies[0].hp = 1;
    expect(resultSummary(state).allyHpPercent).toBe(0.7);
    expect(resultSummary(state).enemyHpPercent).toBe(0.4);
  });
});

describe('fixed-basis skill copy', () => {
  it('uses engine values and distinguishes legacy breaths', () => {
    const state = start([15, 16, 18, 2, 6], [1]);
    state.allies[0].dragonCharge = 3;
    const finisher = monsters[15].skills.find(skill => skill.dragonChargeFinisher)!;
    expect(fixedDamageHint(finisher)).toContain('10＋竜気×18');
    expect(fixedDamageHint(finisher, state.allies[0])).toContain('固定基礎64（現在の竜気3）');
    expect(fixedDamageHint(monsters[18].skills[0]!)).toBe('1体あたり固定基礎68');
    expect(fixedDamageHint(monsters[5].skills[1]!)).toBe('');
  });
});
