import { describe, expect, it } from 'vitest';
import { initialTeam } from './strategy';
import { TEAM_WORKSHOP_KEY, assignDraftToTeam, currentTeam, loadTeamWorkshop, migrateTeamWorkshop, parseTeamWorkshop, restorePreviousTeam, saveTeamWorkshop, selectWorkshopTeam, updateCurrentTeam, useWorkshopDraft } from './teamWorkshop';
const active = { team: [...initialTeam], rule: 'standard' as const };
const saved = [
  { team: [2, 0, 3, 4, 6], rule: 'light' as const },
  { team: [1, 2, 3, 4, 6], rule: 'standard' as const },
  { team: [3, 2, 0, 4, 6], rule: 'light' as const },
];
const storage = (values: Record<string, string> = {}) => ({ getItem: (key: string) => values[key] ?? null, setItem: (key: string, value: string) => { values[key] = value; }, values });
describe('three-team autosaved workshop', () => {
  it('creates three real editable teams, with the active party and two empty teams', () => {
    const book = loadTeamWorkshop(storage());
    expect(book.selected).toBe(0); expect(book.teams.map(slot => slot.team)).toEqual([initialTeam, [], []]);
    expect(currentTeam(selectWorkshopTeam(book, 1)).team).toEqual([]);
  });
  it('keeps all old IDs and the separate active party intact when every saved slot is occupied', () => {
    const old = storage({ 'kanshu-team-slots-v1': JSON.stringify(saved), 'kanshu-workshop-v1': JSON.stringify(active) });
    const book = loadTeamWorkshop(old);
    expect(book.teams).toEqual(saved); expect(book.selected).toBeNull(); expect(currentTeam(book)).toEqual(active);
    expect(book.previous).toEqual(active);
    const switched = selectWorkshopTeam(book, 2);
    expect(currentTeam(switched)).toEqual(saved[2]); expect(currentTeam(restorePreviousTeam(switched))).toEqual(active);
    expect(saveTeamWorkshop(old, switched)).toBe(true);
    expect(loadTeamWorkshop(old)).toEqual(switched);
    expect(old.values['kanshu-team-slots-v1']).toBe(JSON.stringify(saved));
  });
  it('matches an identical active party without moving old indices and only fills an unused slot', () => {
    expect(migrateTeamWorkshop(saved[1], saved).selected).toBe(1);
    const partial = migrateTeamWorkshop(active, [saved[0], null, saved[2]]);
    expect(partial.selected).toBe(1); expect(partial.teams).toEqual([saved[0], active, saved[2]]);
  });
  it('autosaves incomplete, empty and over-light-budget edits independently across switching and reload', () => {
    const store = storage(); let book = loadTeamWorkshop(store);
    book = updateCurrentTeam(book, { rule: 'light' });
    book = selectWorkshopTeam(book, 1); book = updateCurrentTeam(book, { team: [15, 5, 16, 17, 18], rule: 'light' });
    book = selectWorkshopTeam(book, 2); book = updateCurrentTeam(book, { team: [12, 2] });
    saveTeamWorkshop(store, book); book = loadTeamWorkshop(store);
    expect(book.teams.map(slot => slot.team)).toEqual([initialTeam, [15, 5, 16, 17, 18], [12, 2]]);
    expect(book.teams.map(slot => slot.rule)).toEqual(['light', 'light', 'standard']);
    expect(book.selected).toBe(2); expect(updateCurrentTeam(book, { team: [12, 12] })).toBe(book);
  });
  it('keeps trial presets separate and explicitly assigns a draft only to its chosen slot', () => {
    const book = migrateTeamWorkshop(active, saved); const trial = { team: [24, 25, 26, 27, 28], rule: 'standard' as const };
    const next = useWorkshopDraft(book, trial); expect(next.teams).toEqual(saved);
    const assigned = assignDraftToTeam(next, 1); expect(assigned.teams).toEqual([saved[0], trial, saved[2]]);
    expect(assigned.previous).toEqual(active); expect(assigned.selected).toBe(1);
  });
  it('recovers good older saves from corrupt entries without throwing or mutating original storage', () => {
    const old = storage({ [TEAM_WORKSHOP_KEY]: '{', 'kanshu-workshop-v1': '{', 'kanshu-team-slots-v1': JSON.stringify([saved[0], { team: [999], rule: 'standard' }, saved[2]]) });
    const before = JSON.stringify(old.values); const book = loadTeamWorkshop(old);
    expect(book.teams).toEqual([saved[0], active, saved[2]]); expect(JSON.stringify(old.values)).toBe(before);
    for (const value of [null, [], { version: 2, teams: saved, selected: 7 }, { version: 2, teams: saved, selected: null }, { version: 2, teams: [saved[0], null, saved[2]], selected: 0 }]) expect(parseTeamWorkshop(value)).toBeNull();
  });
  it('salvages good v2 teams independently rather than replacing them with legacy slots', () => {
    const damaged = { version: 2, teams: [saved[0], {team: [999], rule: 'standard'}, saved[2]], selected: 0, draft: active, previous: active };
    const store = storage({ [TEAM_WORKSHOP_KEY]: JSON.stringify(damaged), 'kanshu-team-slots-v1': JSON.stringify([active, active, active]) });
    const recovered = loadTeamWorkshop(store);
    expect(recovered.teams).toEqual([saved[0], {team: [], rule: 'standard'}, saved[2]]);
    expect(recovered.selected).toBe(0); expect(recovered.previous).toEqual(active); expect(recovered.draft).toEqual(active);
    damaged.selected = 1; store.setItem(TEAM_WORKSHOP_KEY, JSON.stringify(damaged));
    expect(currentTeam(loadTeamWorkshop(store))).toEqual(active);
  });
  it('reports quota/access failure while keeping every in-memory edit available', () => {
    const denied = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('quota'); } };
    const book = updateCurrentTeam(loadTeamWorkshop(denied), { team: [12, 2] });
    expect(saveTeamWorkshop(denied, book)).toBe(false); expect(currentTeam(book).team).toEqual([12, 2]);
  });
});
