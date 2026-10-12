import { cost, monsters } from './engine';
import { initialTeam, loadTeamSlots, type RuleId, type TeamSlot } from './strategy';

export const TEAM_WORKSHOP_KEY = 'kanshu-team-workshop-v2';
export type TeamWorkshop = {
  version: 2;
  teams: [TeamSlot, TeamSlot, TeamSlot];
  selected: number | null;
  draft: TeamSlot | null;
  previous: TeamSlot | null;
};
type Reader = Pick<Storage, 'getItem'>;
const clone = (slot: TeamSlot): TeamSlot => ({ team: [...slot.team], rule: slot.rule });
const empty = (): TeamSlot => ({ team: [], rule: 'standard' });
export function readTeamDraft(value: unknown): TeamSlot | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<TeamSlot>;
  if (candidate.rule !== 'standard' && candidate.rule !== 'light') return null;
  const team = candidate.team;
  if (!Array.isArray(team) || team.length > 5 || new Set(team).size !== team.length || !team.every(id => Number.isInteger(id) && monsters[id]) || cost(team) > 17) return null;
  // Incomplete and light-rule over-budget drafts must survive a reload, too.
  return { team: [...team], rule: candidate.rule };
}
const readJSON = (storage: Reader, key: string): unknown => {
  try { return JSON.parse(storage.getItem(key) ?? 'null'); } catch { return null; }
};
export function currentTeam(workshop: TeamWorkshop): TeamSlot {
  return workshop.selected === null ? workshop.draft! : workshop.teams[workshop.selected];
}
export function migrateTeamWorkshop(active: TeamSlot, saved: (TeamSlot | null)[]): TeamWorkshop {
  const teams = Array.from({ length: 3 }, (_, index) => saved[index] ? clone(saved[index]!) : empty()) as TeamWorkshop['teams'];
  let selected = saved.findIndex(slot => slot?.rule === active.rule && slot.team.join(',') === active.team.join(','));
  if (selected < 0) {
    selected = saved.findIndex(slot => !slot);
    if (selected >= 0) teams[selected] = clone(active);
  }
  // All three old slots stay at their original indices. A fourth distinct
  // active party remains active and recoverable until the user chooses a tab.
  const draft = selected < 0 ? clone(active) : null;
  return { version: 2, teams, selected: selected < 0 ? null : selected, draft, previous: draft && clone(draft) };
}
export function parseTeamWorkshop(value: unknown): TeamWorkshop | null {
  const raw = value as Partial<TeamWorkshop> | null;
  if (raw?.version === 2 && Array.isArray(raw.teams) && raw.teams.length === 3) {
    const teams = raw.teams.map(readTeamDraft);
    const draft = readTeamDraft(raw.draft);
    const selected = raw.selected;
    if (teams.every(Boolean) && (selected === null ? !!draft : Number.isInteger(selected) && selected! >= 0 && selected! < 3)) {
      return { version: 2, teams: teams as TeamWorkshop['teams'], selected: selected!, draft, previous: readTeamDraft(raw.previous) };
    }
  }
  return null;
}
export function loadTeamWorkshop(storage: Reader): TeamWorkshop {
  const raw = readJSON(storage, TEAM_WORKSHOP_KEY) as Partial<TeamWorkshop> | null;
  const saved = parseTeamWorkshop(raw);
  if (saved) return saved;
  let active = readTeamDraft(readJSON(storage, 'kanshu-workshop-v1'));
  if (!active) {
    const legacy = readTeamDraft({ team: readJSON(storage, 'kanshu-team'), rule: 'standard' });
    active = legacy?.team.length === 5 ? legacy : { team: [...initialTeam], rule: 'standard' };
  }
  if (raw?.version === 2 && Array.isArray(raw.teams)) {
    // Recover each valid newer team independently. Never replace good v2 teams
    // with stale legacy slots just because a different team is damaged.
    const teams = Array.from({ length: 3 }, (_, index) => readTeamDraft(raw.teams![index]) ?? empty()) as TeamWorkshop['teams'];
    const selected = Number.isInteger(raw.selected) && raw.selected! >= 0 && raw.selected! < 3 && readTeamDraft(raw.teams[raw.selected!]) ? raw.selected! : null;
    return { version: 2, teams, selected, draft: readTeamDraft(raw.draft) ?? clone(active), previous: readTeamDraft(raw.previous) };
  }
  return migrateTeamWorkshop(active, loadTeamSlots(storage));
}
export function updateCurrentTeam(workshop: TeamWorkshop, patch: Partial<TeamSlot>): TeamWorkshop {
  const next = readTeamDraft({ ...currentTeam(workshop), ...patch });
  if (!next) return workshop;
  if (workshop.selected === null) return { ...workshop, draft: next };
  const teams = [...workshop.teams] as TeamWorkshop['teams'];
  teams[workshop.selected] = next;
  return { ...workshop, teams };
}
export function selectWorkshopTeam(workshop: TeamWorkshop, index: number): TeamWorkshop {
  if (!Number.isInteger(index) || index < 0 || index > 2) return workshop;
  return { ...workshop, selected: index };
}
export function useWorkshopDraft(workshop: TeamWorkshop, draft: TeamSlot): TeamWorkshop {
  if (!readTeamDraft(draft)) return workshop;
  return { ...workshop, selected: null, draft: clone(draft) };
}
export function restorePreviousTeam(workshop: TeamWorkshop): TeamWorkshop {
  return workshop.previous ? useWorkshopDraft(workshop, workshop.previous) : workshop;
}
export function assignDraftToTeam(workshop: TeamWorkshop, index: number): TeamWorkshop {
  if (workshop.selected !== null || !workshop.draft || !Number.isInteger(index) || index < 0 || index > 2) return workshop;
  const teams = [...workshop.teams] as TeamWorkshop['teams'];
  teams[index] = clone(workshop.draft);
  return { ...workshop, teams, selected: index };
}
export function saveTeamWorkshop(storage: Pick<Storage, 'setItem'>, workshop: TeamWorkshop): boolean {
  try { storage.setItem(TEAM_WORKSHOP_KEY, JSON.stringify(workshop)); return true; } catch { return false; }
}
