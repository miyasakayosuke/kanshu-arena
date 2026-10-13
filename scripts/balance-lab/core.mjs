/** Development-only lab. All turns resolve through the shipping combat engine. */
import { createHash } from 'node:crypto';
import {
  turnMpRecoveryAmount, advanceWithEvents, automaticOrders, autoOrders, chooseAutomaticOrder, chooseLegacyEnemyOrder, AUTO, battleSkill, baseDamage, poisonImpactScaleFor, leaderAppliesTo, leaderFor, BASIC_ATTACK,
  EXTRAORDINARY_CORE_ID, EXTRAORDINARY_RESPONSE, extraordinaryResponseEligible, isExtraordinaryResponse, skillUnavailableReason,
  UNDEAD_CORE_ID, UNDEAD_CASHOUT, undeadCashoutEligible, poisonCashoutPerTickFor, poisonTicksFor,
  DEMON_CORE_ID, DEMON_PRESSURE, demonPressureEligible, mpDamageFor, mpLossFor, directDamageScale, speedFor,
  DRAGON_CHARGE_CAP, DRAGON_CORE_ID, dragonChargeEligible,
  MATERIAL_CORE_ID, MATERIAL_REPAIR_PERCENT, materialRepairEligible,
  SLIME_CORE_ID, SLIME_SUPPLY, slimeSupplyEligible, supplyAmountFor,
  MAX_SPECIAL_SKILLS, MAX_TURNS, monsters, NATURE_WARD_PERCENT, OPENING_RALLY_TURNS, OPENING_WARD_TURNS, RALLY_PERCENT, start,
} from '../../src/engine.ts';
import { FAMILY_IDS } from '../../src/families.ts';

export const SCHEMA_VERSION = 1;
export const POLICY_ID = 'production-action-time-player-legacy-enemy-regen2-v5';
export const MAX_MATCHES = 20_000;
const clone = value => structuredClone(value);
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const fail = message => { throw new Error(message); };
const object = (value, path) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${path}: expected an object`);
};
const keys = (value, allowed, path) => {
  object(value, path);
  for (const key of Object.keys(value)) if (!allowed.includes(key)) fail(`${path}.${key}: unknown field`);
};
const integer = (value, min, max, path) => {
  if (!Number.isInteger(value) || value < min || value > max) fail(`${path}: expected integer ${min}..${max}`);
};
const number = (value, min, max, path) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) fail(`${path}: expected finite number ${min}..${max}`);
};
const text = (value, path) => {
  if (typeof value !== 'string' || !value.trim() || value.length > 2000) fail(`${path}: expected nonempty text (max 2000 characters)`);
};
const identifier = (value, path) => {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(value)) fail(`${path}: expected a short letter/number/dash/underscore ID`);
};
const boolean = (value, path) => { if (typeof value !== 'boolean') fail(`${path}: expected boolean`); };
const array = (value, min, max, path) => {
  if (!Array.isArray(value) || value.length < min || value.length > max) fail(`${path}: expected array length ${min}..${max}`);
};
const monsterExists = (id, path) => {
  if (!Number.isInteger(id) || !monsters.some(monster => monster.id === id)) fail(`${path}: unknown monster ${id}`);
};
const FAMILIES = FAMILY_IDS;
const validateSkill = (skill, path) => {
  keys(skill, ['name', 'power', 'priority', 'mpCost', 'kind', 'all', 'breaksGuard', 'randomHits', 'breaksGuardAfterHit', 'familyBonusHit', 'fixedDamage', 'dragonChargeFinisher', 'mpDamage', 'poisonCashout'], path);
  text(skill.name, `${path}.name`);
  if (['通常攻撃', 'ぼうぎょ'].includes(skill.name)) fail(`${path}.name: reserved universal-command name`);
  number(skill.power, 0, 10000, `${path}.power`);
  integer(skill.priority, -10, 10, `${path}.priority`);
  integer(skill.mpCost, 0, 10000, `${path}.mpCost`);
  if (!['hit', 'heal', 'guard', 'poison', 'protect', 'cleanse', 'restoreMp', 'responseCleanse', 'responseGuard'].includes(skill.kind)) fail(`${path}.kind: unsupported effect`);
  for (const field of ['all', 'breaksGuard', 'breaksGuardAfterHit', 'fixedDamage', 'dragonChargeFinisher']) if (own(skill, field)) boolean(skill[field], `${path}.${field}`);
  if (own(skill, 'randomHits')) integer(skill.randomHits, 1, 20, `${path}.randomHits`);
  if (skill.randomHits && (skill.kind !== 'hit' || skill.all)) fail(`${path}: randomHits requires single/random hit kind, not all`);
  if (own(skill, 'familyBonusHit') && (!FAMILIES.includes(skill.familyBonusHit) || skill.kind !== 'hit' || !skill.randomHits)) fail(`${path}.familyBonusHit: requires a known family and random hit kind`);
  if ((skill.breaksGuard || skill.breaksGuardAfterHit) && skill.kind !== 'hit') fail(`${path}: guard breaking requires hit kind`);
  if (skill.fixedDamage && skill.kind !== 'hit') fail(`${path}.fixedDamage: requires hit kind`);
  if (skill.dragonChargeFinisher && (skill.kind !== 'hit' || !skill.fixedDamage || !skill.all || skill.randomHits || skill.mpCost <= 0 || skill.priority >= 0)) fail(`${path}.dragonChargeFinisher: requires paid, fixed-damage, all-target anchor hit`);
  if (own(skill, 'mpDamage')) {
    integer(skill.mpDamage, 0, 30, `${path}.mpDamage`);
    if (skill.kind !== 'hit' || skill.mpCost <= 0 || skill.all || skill.randomHits || skill.fixedDamage || skill.breaksGuard || skill.breaksGuardAfterHit || skill.dragonChargeFinisher) fail(`${path}.mpDamage: requires paid, plain single-target hit`);
  }
  if (own(skill, 'poisonCashout')) {
    integer(skill.poisonCashout, 0, 30, `${path}.poisonCashout`);
    if (skill.kind !== 'hit' || skill.mpCost <= 0 || skill.all || own(skill, 'randomHits') || skill.fixedDamage || skill.breaksGuard || skill.breaksGuardAfterHit || skill.dragonChargeFinisher || own(skill, 'mpDamage')) fail(`${path}.poisonCashout: requires paid, plain single-target hit without MP damage`);
  }
  if (skill.kind === 'restoreMp' && (!skill.all || skill.mpCost !== 0 || skill.power !== SLIME_SUPPLY.amount)) fail(`${path}: restoreMp requires all:true, zero MP cost and stock descriptive power; tune slimeSupply.amount instead`);
  if (isExtraordinaryResponse(skill) && (!skill.all || skill.power !== 0 || skill.mpCost !== EXTRAORDINARY_RESPONSE.mpCost || skill.priority !== (skill.kind === 'responseGuard' ? 3 : 0) || ['randomHits','familyBonusHit','fixedDamage','dragonChargeFinisher','mpDamage','poisonCashout','breaksGuard','breaksGuardAfterHit'].some(field => own(skill, field)))) fail(`${path}: response requires exact stock all-own zero-power paid choice without attack modifiers`);
  if (skill.all && !['hit', 'poison', 'restoreMp', 'responseCleanse', 'responseGuard'].includes(skill.kind)) fail(`${path}: ally-wide support is not implemented`);
};
const validateLeader = (trait, path) => {
  keys(trait, ['name', 'stat', 'percent', 'description', 'family', 'secondary'], path);
  text(trait.name, `${path}.name`); text(trait.description, `${path}.description`);
  if (!['hp', 'mp', 'atk', 'speed'].includes(trait.stat)) fail(`${path}.stat: unsupported leader stat`);
  number(trait.percent, -90, 300, `${path}.percent`);
  if (own(trait, 'family') && !FAMILIES.includes(trait.family)) fail(`${path}.family: unsupported family`);
  if (own(trait, 'secondary')) {
    keys(trait.secondary, ['stat', 'percent'], `${path}.secondary`);
    if (!['atk', 'speed'].includes(trait.secondary.stat) || trait.secondary.stat === trait.stat) fail(`${path}.secondary.stat: must be a different atk/speed stat`);
    number(trait.secondary.percent, -90, 300, `${path}.secondary.percent`);
  }
};
export function validateOverrides(overrides = {}) {
  keys(overrides, ['monsters', 'leaders', 'openingRally', 'openingWard', 'dragonCharge', 'materialRepair', 'slimeSupply', 'demonPressure', 'undeadCashout', 'extraordinaryResponse', 'poisonImpactScale', 'reservePoison'], 'overrides');
  if (own(overrides, 'poisonImpactScale')) number(overrides.poisonImpactScale, 0, 1, 'overrides.poisonImpactScale');
  if (own(overrides, 'reservePoison')) boolean(overrides.reservePoison, 'overrides.reservePoison');
  if (own(overrides, 'monsters')) {
    object(overrides.monsters, 'overrides.monsters');
    for (const [id, patch] of Object.entries(overrides.monsters)) {
      if (!/^(0|[1-9]\d*)$/.test(id)) fail(`overrides.monsters.${id}: invalid ID`);
      monsterExists(Number(id), `overrides.monsters.${id}`);
      const path = `overrides.monsters.${id}`;
      keys(patch, ['hp', 'mp', 'atk', 'speed', 'cost', 'family', 'skills'], path);
      for (const field of ['hp', 'mp', 'atk', 'speed', 'cost']) if (own(patch, field)) integer(patch[field], ['hp', 'cost'].includes(field) ? 1 : 0, field === 'cost' ? 17 : 10000, `${path}.${field}`);
      if (own(patch, 'family') && patch.family !== null && !FAMILIES.includes(patch.family)) fail(`${path}.family: expected a shared FAMILY_IDS value or null`);
      if (own(patch, 'skills')) { array(patch.skills, 0, MAX_SPECIAL_SKILLS, `${path}.skills`); patch.skills.forEach((skill, i) => validateSkill(skill, `${path}.skills[${i}]`)); }
    }
  }
  if (own(overrides, 'leaders')) {
    object(overrides.leaders, 'overrides.leaders');
    for (const [id, trait] of Object.entries(overrides.leaders)) {
      if (!/^(0|[1-9]\d*)$/.test(id)) fail(`overrides.leaders.${id}: invalid ID`);
      monsterExists(Number(id), `overrides.leaders.${id}`); validateLeader(trait, `overrides.leaders.${id}`);
    }
  }
  for (const field of ['openingRally', 'openingWard']) if (own(overrides, field)) {
    const support = overrides[field];
    keys(support, ['enabled', 'percent', 'turns'], `overrides.${field}`);
    if (own(support, 'enabled')) boolean(support.enabled, `overrides.${field}.enabled`);
    if (own(support, 'percent')) number(support.percent, 0, 100, `overrides.${field}.percent`);
    if (own(support, 'turns')) integer(support.turns, 0, MAX_TURNS, `overrides.${field}.turns`);
  }
  if (own(overrides, 'dragonCharge')) {
    keys(overrides.dragonCharge, ['enabled', 'perPoint'], 'overrides.dragonCharge');
    if (own(overrides.dragonCharge, 'enabled')) boolean(overrides.dragonCharge.enabled, 'overrides.dragonCharge.enabled');
    if (own(overrides.dragonCharge, 'perPoint')) integer(overrides.dragonCharge.perPoint, 0, 100, 'overrides.dragonCharge.perPoint');
  }
  if (own(overrides, 'materialRepair')) {
    keys(overrides.materialRepair, ['enabled', 'percent'], 'overrides.materialRepair');
    if (own(overrides.materialRepair, 'enabled')) boolean(overrides.materialRepair.enabled, 'overrides.materialRepair.enabled');
    if (own(overrides.materialRepair, 'percent')) integer(overrides.materialRepair.percent, 0, 100, 'overrides.materialRepair.percent');
  }
  if (own(overrides, 'slimeSupply')) {
    keys(overrides.slimeSupply, ['enabled', 'amount'], 'overrides.slimeSupply');
    if (own(overrides.slimeSupply, 'enabled')) boolean(overrides.slimeSupply.enabled, 'overrides.slimeSupply.enabled');
    if (own(overrides.slimeSupply, 'amount')) integer(overrides.slimeSupply.amount, 0, 30, 'overrides.slimeSupply.amount');
  }
  if (own(overrides, 'demonPressure')) {
    keys(overrides.demonPressure, ['enabled', 'base', 'bonus'], 'overrides.demonPressure');
    if (own(overrides.demonPressure, 'enabled')) boolean(overrides.demonPressure.enabled, 'overrides.demonPressure.enabled');
    for (const field of ['base', 'bonus']) if (own(overrides.demonPressure, field)) integer(overrides.demonPressure[field], 0, 30, `overrides.demonPressure.${field}`);
  }
  if (own(overrides, 'undeadCashout')) {
    keys(overrides.undeadCashout, ['enabled', 'base', 'bonus'], 'overrides.undeadCashout');
    if (own(overrides.undeadCashout, 'enabled')) boolean(overrides.undeadCashout.enabled, 'overrides.undeadCashout.enabled');
    for (const field of ['base', 'bonus']) if (own(overrides.undeadCashout, field)) integer(overrides.undeadCashout[field], 0, 30, `overrides.undeadCashout.${field}`);
  }
  if (own(overrides, 'extraordinaryResponse')) {
    keys(overrides.extraordinaryResponse, ['enabled'], 'overrides.extraordinaryResponse');
    if (own(overrides.extraordinaryResponse, 'enabled')) boolean(overrides.extraordinaryResponse.enabled, 'overrides.extraordinaryResponse.enabled');
  }
  return overrides;
}
const patchedRoster = overrides => monsters.map(monster => {
  const result = { ...clone(monster), ...clone(overrides.monsters?.[monster.id] ?? {}) };
  if (result.family === null) delete result.family;
  // Disable every configured MP hit, including custom isolated skills, without touching the roster.
  if (overrides.demonPressure) result.skills = result.skills.map(skill => own(skill, 'mpDamage')
    ? { ...skill, mpDamage: overrides.demonPressure.enabled === false ? 0 : overrides.demonPressure.base ?? skill.mpDamage } : skill);
  if (overrides.undeadCashout) result.skills = result.skills.map(skill => own(skill, 'poisonCashout')
    ? { ...skill, poisonCashout: overrides.undeadCashout.enabled === false ? 0 : overrides.undeadCashout.base ?? skill.poisonCashout } : skill);
  return result;
});
const validateTeam = (ids, path, roster, costLimit) => {
  array(ids, 5, 5, path);
  ids.forEach((id, i) => monsterExists(id, `${path}[${i}]`));
  if (new Set(ids).size !== ids.length) fail(`${path}: duplicate monster`);
  if (ids.reduce((sum, id) => sum + roster.find(monster => monster.id === id).cost, 0) > costLimit) fail(`${path}: team cost exceeds ${costLimit}`);
};

export function validateConfig(config) {
  keys(config, ['schemaVersion', 'suiteId', 'seeds', 'costLimit', 'teams', 'scenarios', 'candidate', 'complaints', 'sampling'], 'config');
  if (config.schemaVersion !== SCHEMA_VERSION) fail('config.schemaVersion: unsupported schema');
  identifier(config.suiteId, 'config.suiteId');
  array(config.seeds, 1, 1000, 'config.seeds');
  config.seeds.forEach((seed, i) => integer(seed, 0, 0xffffffff, `config.seeds[${i}]`));
  if (new Set(config.seeds).size !== config.seeds.length) fail('config.seeds: duplicate seeds');
  if (![15, 17].includes(config.costLimit)) fail('config.costLimit: expected shipping cost limit 15 or 17');
  keys(config.candidate, ['id', 'label', 'overrides'], 'config.candidate');
  identifier(config.candidate.id, 'config.candidate.id'); text(config.candidate.label, 'config.candidate.label');
  object(config.candidate.overrides, 'config.candidate.overrides');
  validateOverrides(config.candidate.overrides);
  const candidateRoster = patchedRoster(config.candidate.overrides);
  array(config.teams, 1, 100, 'config.teams');
  const teamIds = new Set();
  config.teams.forEach((team, i) => {
    const path = `config.teams[${i}]`; keys(team, ['id', 'role', 'ids'], path); identifier(team.id, `${path}.id`); text(team.role, `${path}.role`);
    if (team.id.startsWith('sample-') || teamIds.has(team.id)) fail(`${path}.id: reserved or duplicate team ID`);
    teamIds.add(team.id); validateTeam(team.ids, `${path}.ids (baseline)`, monsters, config.costLimit); validateTeam(team.ids, `${path}.ids (candidate)`, candidateRoster, config.costLimit);
    // Catch invalid derived stats (for example HP rounded to zero) before any match runs.
    createBattle(team.ids, team.ids, config.seeds[0], config.candidate.overrides);
  });
  array(config.scenarios, 0, 300, 'config.scenarios');
  const scenarioIds = new Set();
  config.scenarios.forEach((scenario, i) => {
    const path = `config.scenarios[${i}]`; keys(scenario, ['id', 'a', 'b', 'complaintIds', 'keyUnitId'], path); identifier(scenario.id, `${path}.id`);
    if (scenario.id.startsWith('mirror-') || scenario.id.startsWith('sample-') || scenarioIds.has(scenario.id)) fail(`${path}.id: reserved or duplicate scenario ID`);
    scenarioIds.add(scenario.id);
    if (!teamIds.has(scenario.a) || !teamIds.has(scenario.b)) fail(`${path}: unknown team`);
    if (own(scenario, 'keyUnitId')) {
      monsterExists(scenario.keyUnitId, `${path}.keyUnitId`);
      if (!config.teams.find(team => team.id === scenario.a).ids.includes(scenario.keyUnitId)) fail(`${path}.keyUnitId: must appear in team A`);
    }
    if (own(scenario, 'complaintIds')) { array(scenario.complaintIds, 0, 100, `${path}.complaintIds`); scenario.complaintIds.forEach(id => identifier(id, `${path}.complaintIds`)); }
  });
  const complaintIds = new Set();
  if (own(config, 'complaints')) {
    array(config.complaints, 0, 100, 'config.complaints');
    for (const complaint of config.complaints) {
      keys(complaint, ['id', 'status', 'source', 'complaint', 'hypothesis', 'scenarioIds', 'metrics', 'limitations'], 'complaint');
      identifier(complaint.id, 'complaint.id');
      if (complaintIds.has(complaint.id)) fail('complaint.id: duplicate'); complaintIds.add(complaint.id);
      if (!['hypothesis', 'sourced'].includes(complaint.status)) fail('complaint.status: expected hypothesis or sourced');
      text(complaint.complaint, 'complaint.complaint'); text(complaint.hypothesis, 'complaint.hypothesis');
      if (complaint.source !== null) {
        keys(complaint.source, ['url', 'title', 'observedAt', 'scope'], 'complaint.source');
        for (const field of ['url', 'title', 'observedAt', 'scope']) text(complaint.source[field], `complaint.source.${field}`);
        try { if (!['http:', 'https:'].includes(new URL(complaint.source.url).protocol)) fail('invalid'); } catch { fail('complaint.source.url: expected http(s) URL'); }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(complaint.source.observedAt) || !Number.isFinite(Date.parse(complaint.source.observedAt)) || new Date(complaint.source.observedAt).toISOString().slice(0, 10) !== complaint.source.observedAt) fail('complaint.source.observedAt: expected date YYYY-MM-DD');
      } else if (complaint.status === 'sourced') fail('complaint.source: sourced complaint requires evidence URL');
      array(complaint.scenarioIds, 1, 300, 'complaint.scenarioIds');
      for (const id of complaint.scenarioIds) if (!scenarioIds.has(id)) fail(`complaint.scenarioIds: unknown scenario ${id}`);
      array(complaint.metrics, 1, 30, 'complaint.metrics');
      for (const metric of complaint.metrics) {
        keys(metric, ['name', 'direction', 'rationale'], 'complaint.metric');
        if (!Object.hasOwn(METRIC_DEFINITIONS, metric.name)) fail(`complaint.metric.name: unknown metric ${metric.name}`);
        if (!['increase', 'decrease', 'observe'].includes(metric.direction)) fail('complaint.metric.direction: invalid direction');
        text(metric.rationale, 'complaint.metric.rationale');
      }
      array(complaint.limitations, 1, 30, 'complaint.limitations'); complaint.limitations.forEach(value => text(value, 'complaint.limitations'));
    }
  }
  for (const scenario of config.scenarios) for (const id of scenario.complaintIds ?? []) if (!complaintIds.has(id)) fail(`scenario ${scenario.id}: unknown complaint ${id}`);
  if (own(config, 'sampling')) {
    keys(config.sampling, ['count', 'seed'], 'config.sampling'); integer(config.sampling.count, 0, 100, 'config.sampling.count'); integer(config.sampling.seed, 0, 0xffffffff, 'config.sampling.seed');
  }
  const scenarioCount = config.scenarios.length + (config.sampling?.count ?? 0) + config.teams.length + (config.sampling?.count ?? 0);
  if (scenarioCount * config.seeds.length * 4 > MAX_MATCHES) fail(`config: requested workload exceeds ${MAX_MATCHES} matches (including mirrors, swaps and two variants)`);
  return clone(config);
}

/** Defaults are byte-equivalent to start(..., { leaders: true }); overrides never touch shared data. */
export function createBattle(teamA, teamB, seed, overrides = {}) {
  validateOverrides(overrides);
  integer(seed, 0, 0xffffffff, 'seed');
  validateTeam(teamA, 'teamA', monsters, 17); validateTeam(teamB, 'teamB', monsters, 17);
  const state = clone(start(teamA, teamB, seed, { leaders: true, ...(own(overrides, 'poisonImpactScale') ? { poisonImpactScale: overrides.poisonImpactScale } : {}), ...(own(overrides, 'reservePoison') ? { reservePoison: overrides.reservePoison } : {}) }));
  if (!Object.keys(overrides).length) return state;
  const roster = patchedRoster(overrides);
  validateTeam(teamA, 'teamA (candidate)', roster, 17); validateTeam(teamB, 'teamB (candidate)', roster, 17);
  for (const [side, ids] of [['allies', teamA], ['enemies', teamB]]) {
    const trait = clone(overrides.leaders?.[ids[0]] ?? leaderFor(ids[0]));
    const rally = overrides.openingRally ?? {};
    const hasRally = rally.enabled !== false && ids.includes(12);
    const ward = overrides.openingWard ?? {};
    const hasWard = ward.enabled !== false && ids.includes(14);
    const charge = overrides.dragonCharge ?? {};
    const hasCharge = charge.enabled !== false && dragonChargeEligible(ids.map(id => ({ monster: roster.find(monster => monster.id === id) })));
    const repair = overrides.materialRepair ?? {};
    const hasRepair = repair.enabled !== false && materialRepairEligible(ids.map(id => ({ monster: roster.find(monster => monster.id === id) })));
    const supply = overrides.slimeSupply ?? {};
    const hasSupply = supply.enabled !== false && slimeSupplyEligible(ids.map(id => ({ monster: roster.find(monster => monster.id === id) })));
    const pressure = overrides.demonPressure ?? {};
    const hasPressure = pressure.enabled !== false && demonPressureEligible(ids.map(id => ({ monster: roster.find(monster => monster.id === id) })));
    const cashout = overrides.undeadCashout ?? {};
    const hasCashout = cashout.enabled !== false && undeadCashoutEligible(ids.map(id => ({ monster: roster.find(monster => monster.id === id) })));
    const hasResponse = overrides.extraordinaryResponse?.enabled !== false && extraordinaryResponseEligible(ids.map(id => ({ monster: roster.find(monster => monster.id === id) })));
    state[side] = ids.map((id, i) => {
      const source = roster.find(monster => monster.id === id);
      const monster = clone(source);
      if (leaderAppliesTo(trait, source)) {
        monster[trait.stat] = Math.round(source[trait.stat] * (1 + trait.percent / 100));
        if (trait.secondary) monster[trait.secondary.stat] = Math.round(source[trait.secondary.stat] * (1 + trait.secondary.percent / 100));
      }
      if (monster.hp < 1) fail(`candidate leader produces invalid HP for monster ${id}`);
      return { key: (side === 'allies' ? 'a' : 'e') + i, monster, hp: monster.hp, mp: monster.mp, guard: false, poison: 0,
        ...(hasRally && source.family === 'beast' ? { rally: rally.turns ?? OPENING_RALLY_TURNS, ...(rally.percent !== undefined ? { rallyPercent: rally.percent } : {}) } : {}),
        ...(hasWard && source.family === 'nature' ? { ward: ward.turns ?? OPENING_WARD_TURNS, ...(ward.percent !== undefined ? { wardPercent: ward.percent } : {}) } : {}),
        ...(hasCharge && id === DRAGON_CORE_ID ? { dragonCharge: 0, ...(charge.perPoint !== undefined ? { dragonChargePerPoint: charge.perPoint } : {}) } : {}),
        ...(hasRepair && id === MATERIAL_CORE_ID ? { repairReady: true, ...(repair.percent !== undefined ? { repairPercent: repair.percent } : {}) } : {}),
        ...(hasSupply && id === SLIME_CORE_ID ? { supplyReady: true, ...(supply.amount !== undefined ? { supplyAmount: supply.amount } : {}) } : {}),
        ...(hasPressure && id === DEMON_CORE_ID ? { mpDamageBonus: pressure.bonus ?? DEMON_PRESSURE.bonus } : {}),
        ...(hasCashout && id === UNDEAD_CORE_ID ? { poisonCashoutBonus: cashout.bonus ?? UNDEAD_CASHOUT.bonus } : {}),
        ...(hasResponse && id === EXTRAORDINARY_CORE_ID ? { responseReady: true } : {}),
        ...(own(overrides, 'poisonImpactScale') ? { poisonImpactScale: overrides.poisonImpactScale } : {}) };
    });
  }
  // Trial logs must not claim the stock leader or family-support values. Authoritative event traces follow.
  state.log = ['Balance lab trial: isolated roster/leader/opening-support overrides.', `Overrides: ${JSON.stringify(overrides)}`];
  return state;
}

export class MatchFailure extends Error {
  constructor(message, request, trace) { super(message); this.name = 'MatchFailure'; this.request = request; this.trace = trace; }
}
const unitSnapshot = state => [...state.allies, ...state.enemies].map(unit => ({
  key: unit.key, hp: unit.hp, mp: unit.mp, poison: unit.poison, guard: unit.guard,
  rally: unit.rally ?? 0, rallyPercent: unit.rallyPercent ?? RALLY_PERCENT,
  ward: unit.ward ?? 0, wardPercent: unit.wardPercent ?? NATURE_WARD_PERCENT,
  ...(unit.dragonCharge !== undefined ? { dragonCharge: unit.dragonCharge } : {}),
  ...(unit.dragonChargePerPoint !== undefined ? { dragonChargePerPoint: unit.dragonChargePerPoint } : {}),
  ...(unit.repairReady !== undefined ? { repairReady: unit.repairReady } : {}),
  ...(unit.repairPercent !== undefined ? { repairPercent: unit.repairPercent } : {}),
  ...(unit.supplyReady !== undefined ? { supplyReady: unit.supplyReady } : {}),
  ...(unit.supplyAmount !== undefined ? { supplyAmount: unit.supplyAmount } : {}),
  ...(unit.mpDamageBonus !== undefined ? { mpDamageBonus: unit.mpDamageBonus } : {}),
  ...(unit.poisonCashoutBonus !== undefined ? { poisonCashoutBonus: unit.poisonCashoutBonus } : {}),
  ...(unit.poisonImpactScale !== undefined ? { poisonImpactScale: unit.poisonImpactScale } : {}),
  ...(unit.responseReady !== undefined ? { responseReady: unit.responseReady } : {}),
}));
const supportResourcesValid = unit => ['rally', 'ward'].every(field =>
  Number.isInteger(unit[field] ?? 0) && (unit[field] ?? 0) >= 0 && (unit[field] ?? 0) <= MAX_TURNS
) && [[unit.rallyPercent ?? RALLY_PERCENT], [unit.wardPercent ?? NATURE_WARD_PERCENT]].every(([percent]) =>
  Number.isFinite(percent) && percent >= 0 && percent <= 100
);
const dragonResourcesValid = (unit, initial) => {
  const enabled = initial.dragonCharge !== undefined;
  return (unit.dragonCharge !== undefined) === enabled
    && (!enabled || (unit.monster.id === DRAGON_CORE_ID && Number.isInteger(unit.dragonCharge) && unit.dragonCharge >= 0 && unit.dragonCharge <= DRAGON_CHARGE_CAP && (unit.hp > 0 || unit.dragonCharge === 0)))
    && unit.dragonChargePerPoint === initial.dragonChargePerPoint;
};
const materialResourcesValid = (unit, initial, prior) => {
  const enabled = initial.repairReady !== undefined;
  return (unit.repairReady !== undefined) === enabled
    && (!enabled || (unit.monster.id === MATERIAL_CORE_ID && typeof unit.repairReady === 'boolean' && !unit.repairReady))
    && (prior.repairReady !== false || unit.repairReady === false)
    && unit.repairPercent === initial.repairPercent;
};
const slimeResourcesValid = (unit, initial, prior) => {
  const enabled = initial.supplyReady !== undefined;
  return (unit.supplyReady !== undefined) === enabled
    && (!enabled || (unit.monster.id === SLIME_CORE_ID && typeof unit.supplyReady === 'boolean' && (unit.hp > 0 || !unit.supplyReady)))
    && (prior.supplyReady !== false || unit.supplyReady === false)
    && unit.supplyAmount === initial.supplyAmount;
};
const responseResourcesValid = (unit, initial, prior) => {
  const enabled = initial.responseReady !== undefined;
  return (unit.responseReady !== undefined) === enabled
    && (!enabled || (unit.monster.id === EXTRAORDINARY_CORE_ID && typeof unit.responseReady === 'boolean' && (unit.hp > 0 || !unit.responseReady)))
    && (prior.responseReady !== false || unit.responseReady === false);
};
/** Definitions frozen with the systemic Lab extension. No resolver implementation. */
export const POISON_METRICS = [
  'poisonSelections', 'poisonCasts', 'poisonMpSpent', 'poisonDirectHp',
  'poisonTickHpTaken', 'poisonTickEventsTaken', 'poisonNewApplications',
  'poisonRedundantApplications', 'poisonRefreshApplications',
  'poisonReapplicationsAfterCleanse', 'poisonReapplicationsAfterCashout',
  'cleanseCasts', 'cleanseMpSpent', 'cleanseEvents', 'cleanseClearedTicks',
  'cleanseFuturePoisonNominal', 'cleanseEffectiveHealing', 'cleanseOverheal',
  'cleanseHealingCasts', 'cleanseZeroHealingCasts', 'cleanseResponseAllowanceSpent',
  'healPotential', 'overheal', 'guardProtectedHits', 'guardActualPrevented', 'deathsBeforeTurnAction',
];
export const POISON_DEFINITIONS = {
  deathsBeforeTurnAction: 'Units defeated before their original accepted queue slot began in the lethal turn; distinct from deaths before any cast over the whole battle.',
  poisonSelections: 'Accepted planning selections of the poison skill, including those whose actor is later defeated before executing.',
  poisonCasts: 'Actual executed poison casts; MP debits are separately reconciled.',
  poisonMpSpent: 'Actual MP expenditure on executed poison casts; stock cost remains16.',
  poisonDirectHp: 'Actual HP-clipped direct damage from poison casts, excluding later ticks; exactly zero at scale0.',
  poisonTickHpTaken: 'Actual HP-clipped actorless poison-tick damage received by this unit, after every action, before repair; it ignores guard/ward.',
  poisonTickEventsTaken: 'Actual poison tick damage events received, including a lethal last tick.',
  poisonNewApplications: 'Poison applications to a living target whose current poison was0 immediately before the application event; includes separately identified reapplications.',
  poisonRedundantApplications: 'Applications to an already-poisoned target with exactly3 remaining ticks (3→3); does not imply the direct hit was valueless.',
  poisonRefreshApplications: 'Applications that refresh remaining1 or2 ticks to3. Together with new and redundant they partition all poison applications.',
  poisonReapplicationsAfterCleanse: 'First later poison application to a target since an effective cleanse. The latest effective removal determines attribution, across turn boundaries; this is not proof the cleanser acted needlessly.',
  poisonReapplicationsAfterCashout: 'First later poison application to a target since a cashout consumed positive ticks, across turn boundaries.',
  cleanseCasts: 'Actual executed single-target or Janus whole-side cleanse casts. Skill ownership or selection is not execution.',
  cleanseMpSpent: 'Actual MP expenditure on executed cleanse casts, including Janus24MP, separately from MP pressure received.',
  cleanseEvents: 'Actual target-level cleanse events, including unpoisoned Janus recipients. Effective cleanses and removed ticks are separate.',
  cleanseClearedTicks: 'Current remaining poison ticks removed by executed cleanse events, not a count of future ticks guaranteed to have occurred.',
  cleanseFuturePoisonNominal: 'Removed ticks × floor(target maximum HP×6%); potential only, without future deaths, cashouts, refreshes, or other cleanses.',
  cleanseEffectiveHealing: 'Actual HP restored by the healing component of a single-target cleanse. Janus cleanse restores no HP.',
  cleanseOverheal: 'The single-target cleanse healing power not converted to restored HP because of the current maximum-HP cap.',
  cleanseHealingCasts: 'Executed cleanse casts whose healing component restored positive HP. Already-needed healing is not labeled a wasted forced action.',
  cleanseZeroHealingCasts: 'Executed cleanse casts without positive effective HP healing, including state-only Janus casts; no usefulness claim.',
  cleanseResponseAllowanceSpent: 'Actual one-time Janus allowances consumed by executed responseCleanse casts; never inferred from ownership.',
  healPotential: 'Potential healing budgets of actual heal events, including finite repair. Actual healing remains HP-clipped.',
  overheal: 'Potential heal amount not restored due to the current maximum-HP cap; includes healing components of cleanses and finite repair.',
  guardProtectedHits: 'Actual direct hit events on guarded targets. Poison ticks and nonexistent scale0 poison impacts are excluded.',
  guardActualPrevented: 'Target-attributed local same-impact incremental HP damage prevented by removing guard alone while retaining ward, same cast basis, RNG roll, floor and current HP clipping. It is not twice observed clipped damage and not a whole-battle counterfactual.',
};

export const RESPONSE_METRICS = ['responseEligible','responseSelections','responseCleanseSelections','responseGuardSelections','responseWithheldTurns','responseRejectedSelections','responseNoEffect','responseCancelledSelections','responseFallbacks','responseCasts','responseCleanseCasts','responseGuardCasts','responseMpSpent','responseSourceMpAtCast','responseMpAfterCast','responseRecipients','responseClearRecipients','responseClearedTicks','responseClearNominalPotential','responseLaterReapplications','responseGuardNewRecipients','responseGuardAlreadyRecipients','responseGuardProtectedHits','responseGuardHpDamageObserved','responseGuardActualPrevented','responseGuardStrippedRecipients','responseGuardIdleRecipients','responseGuardNoHitCasts','responseUnused','responseDeadWithUnused','responseSurvivedUnused'];
export const CASHOUT_METRICS = ['cashoutEligible', 'cashoutSelections', 'cashoutCasts', 'cashoutMpSpent', 'cashoutSourceMpAtCast', 'cashoutEvents', 'cashoutZeroPoison', 'cashoutTicksConsumed', 'cashoutAddedBasis', 'cashoutScaledAddition', 'cashoutActualAddedDamage', 'cashoutDirectDamage', 'cashoutFuturePoisonNominal', 'cashoutKills', 'cashoutDecisiveKills', 'cashoutKillsBeforeTargetAction', 'cashoutKillTurnSum', 'cashoutRetargets', 'cashoutLaterReapplications', 'cashoutSurvivingTargets', 'cashoutGuardedEvents', 'cashoutWardedEvents', 'hpDamageTaken', 'hpHealingReceived', 'finalMp'];
export const PRESSURE_METRICS = ['pressureSelections', 'pressureHpAttackSelections', 'pressureBasicSelections', 'pressureCasts', 'pressureMpSpent', 'pressureSourceMpAtCast', 'pressureTargetMpBefore', 'pressureTargetMpAfter', 'mpDamageEvents', 'mpDamageZeroEvents', 'mpDamageActual', 'mpDamageReceived', 'mpDamagePotential', 'mpDamageMitigated', 'mpDamageClipped', 'mpDamageKilledTargets', 'fallbackCasts'];
export const SUPPLY_METRICS = ['supplyEligible', 'supplySelections', 'supplyCasts', 'supplyGenerated', 'supplyReceived', 'supplyRecipients', 'supplyPotential', 'supplyWasted', 'supplyUnused', 'supplyDefeatedBeforeUse', 'supplyMpSpent', 'mpGenerated', 'turnMpRecovered', 'initialMp', 'maximumMp', 'peakMp'];
const freshMetric = unit => ({
  ...Object.fromEntries(POISON_METRICS.map(field => [field, 0])),
  ...Object.fromEntries([...PRESSURE_METRICS, ...CASHOUT_METRICS, ...RESPONSE_METRICS].map(field => [field, 0])),
  cashoutEligible: unit.poisonCashoutBonus !== undefined ? 1 : 0,
  responseEligible: unit.responseReady === true ? 1 : 0,
  key: unit.key, monsterId: unit.monster.id, casts: 0, specialCasts: 0, paidCasts: 0, directDamage: 0, healing: 0,
  guardApplications: 0, effectiveCleanses: 0, poisonApplications: 0, dispelApplications: 0, mpSpent: 0,
  aliveAtTurnStartTurns: 0, noAffordableSpecialTurns: 0, zeroMpTurns: 0, deathTurn: null, diedBeforeAnyCast: false,
  dragonChargeGenerated: 0, dragonChargeSpent: 0, dragonFinishers: 0, chargedDragonFinishers: 0, dragonFinisherDamage: 0, dragonChargeDispelled: 0, dragonChargeLostOnDefeat: 0, peakDragonCharge: unit.dragonCharge ?? 0,
  repairEligible: unit.repairReady === true ? 1 : 0, repairTriggers: 0, repairHealing: 0, repairReceived: 0, repairRecipients: 0, repairPotentialHealing: 0, repairUnusedHealing: 0,
  repairCancellations: 0, repairFailedBeforeTrigger: 0, repairDispelled: 0, repairDefeatedBeforeTrigger: 0, repairTriggerTurn: null, repairMpSpent: 0,
  supplyEligible: unit.supplyReady === true ? 1 : 0, supplySelections: 0, supplyCasts: 0, supplyGenerated: 0, supplyReceived: 0, supplyRecipients: 0,
  supplyPotential: 0, supplyWasted: 0, supplyUnused: 0, supplyDefeatedBeforeUse: 0, supplyMpSpent: 0, supplyTurn: null,
  mpGenerated: 0, turnMpRecovered: 0, initialMp: unit.mp, maximumMp: unit.monster.mp, peakMp: unit.mp,
  finalHp: unit.hp, finalMp: unit.mp,
});

// explicit-snapshot is an opt-in mechanic/fault-injection control only. The CLI
// config has no switch for it; every production suite uses deferred action-time AI.
export function runMatch({ teamA, teamB, seed, overrides = {}, trace: includeTrace = false, policy = 'action-time' }) {
  if (!['action-time', 'explicit-snapshot'].includes(policy)) fail('unknown match policy');
  const request = { teamA: clone(teamA), teamB: clone(teamB), seed, overrides: clone(overrides), ...(policy === 'explicit-snapshot' ? { policy } : {}) };
  let state = createBattle(teamA, teamB, seed, overrides);
  const trace = { initialState: clone(state), turns: [], ...(policy === 'explicit-snapshot' ? { policy } : {}) };
  const metrics = new Map([...state.allies, ...state.enemies].map(unit => [unit.key, freshMetric(unit)]));
  const initialUnits = new Map([...state.allies, ...state.enemies].map(unit => [unit.key, clone(unit)]));
  const countSelection = (order, unit) => {
    const selected = battleSkill(unit.monster, order.skill), metric = metrics.get(unit.key);
    if (selected.kind === 'poison') metric.poisonSelections++;
    if (own(selected, 'poisonCashout')) metric.cashoutSelections++;
    if (selected.kind === 'restoreMp') metric.supplySelections++;
    if (isExtraordinaryResponse(selected)) { metric.responseSelections++; metric[selected.kind === 'responseCleanse' ? 'responseCleanseSelections' : 'responseGuardSelections']++; }
    else if (unit.responseReady === true) metric.responseWithheldTurns++;
    if (unit.monster.id === DEMON_CORE_ID || unit.monster.skills.some(skill => own(skill, 'mpDamage'))) {
      if (own(selected, 'mpDamage')) metric.pressureSelections++;
      else if (order.skill === BASIC_ATTACK) metric.pressureBasicSelections++;
      else if (selected.kind === 'hit') metric.pressureHpAttackSelections++;
    }
  };
  let firstCastSide = null;
  const responseClearedTargets = new Map();
  const poisonDamageTaken = { allies: 0, enemies: 0 };
  const poisonRemovedTargets = new Map(); // Persist removal/reapplication accounting across turns.
  try {
    while (!state.winner && state.turn <= MAX_TURNS) {
      for (const unit of [...state.allies, ...state.enemies]) if (unit.hp > 0) {
        const metric = metrics.get(unit.key); metric.aliveAtTurnStartTurns++;
        if (unit.mp === 0) metric.zeroMpTurns++;
        const paidSkills = unit.monster.skills.filter(skill => skill.mpCost > 0);
        if (paidSkills.length && paidSkills.every(skill => skill.mpCost > unit.mp)) metric.noAffordableSpecialTurns++;
      }
      const orders = policy === 'action-time' ? automaticOrders(state) : autoOrders(state);
      const enemyOrders = policy === 'action-time' ? undefined : autoOrders(state, 'enemies');
      if (policy === 'explicit-snapshot') for (const order of [...orders, ...enemyOrders]) countSelection(order, [...state.allies, ...state.enemies].find(unit => unit.key === order.key));
      const before = clone(state);
      trace.activeAttempt = { turn: state.turn, seedBefore: state.seed, orders: clone(orders), ...(enemyOrders ? { enemyOrders: clone(enemyOrders) } : { enemyPolicy: 'legacy-pre-turn' }), unitsBefore: unitSnapshot(state) };
      const resolved = advanceWithEvents(state, orders, enemyOrders ? { enemyOrders } : undefined);
      const record = resolved.state.history.at(-1);
      trace.turns.push({ turn: state.turn, seedBefore: state.seed, seedAfter: resolved.state.seed, orders: clone(record.orders), events: clone(resolved.events), unitsAfter: unitSnapshot(resolved.state) });
      if (JSON.stringify(state) !== JSON.stringify(before)) fail('resolver mutated input state');
      for (const order of record.orders) if (!order.accepted && ['responseCleanse','responseGuard'].includes(order.skillKind)) metrics.get(order.key).responseRejectedSelections++;
      const expectedOrders = [...orders, ...(enemyOrders ?? state.enemies.filter(unit => unit.hp > 0).map(unit => ({key: unit.key, skill: AUTO})))];
      if (policy === 'action-time' && (record.orders.length !== expectedOrders.length || new Set(record.orders.map(order => order.key)).size !== expectedOrders.length || record.orders.some(order => order.source !== 'automatic' || !expectedOrders.some(expected => expected.key === order.key && expected.skill === AUTO)))) fail('resolved orders differ from shipping automatic actors');
      if (policy === 'explicit-snapshot') {
        if (record.orders.some(order => !order.accepted)) fail('same-policy AI selected an invalid order');
        if (record.orders.length !== expectedOrders.length || record.orders.some(order => order.source !== 'explicit' || !expectedOrders.some(expected => expected.key === order.key && expected.skill === order.skill && expected.target === order.target))) fail('accepted orders differ from explicit same-policy choices');
      }
      const bands = new Set([0, 1, ...[...state.allies, ...state.enemies].flatMap(unit => unit.monster.skills.map(skill => skill.priority))]);
      // Mirror authoritative turn-start cleanup before checking fixed CPU decisions.
      const planningState = clone(state);
      for (const unit of [...planningState.allies, ...planningState.enemies]) {
        unit.guard = false;
        if (unit.hp <= 0) { unit.poison = 0; for (const field of ['repairReady','supplyReady','responseReady']) if (unit[field]) unit[field] = false; }
      }
      const legacyEnemyPlan = policy === 'action-time' ? autoOrders(planningState, 'enemies') : [];
      if (policy === 'action-time') for (const order of record.orders.filter(order => order.side === 'enemies' && order.accepted)) countSelection(order, planningState.enemies.find(unit => unit.key === order.key));
      let queueSeed = state.seed;
      const queue = record.orders.map(order => {
        // Legacy CPU indexes the PRE-draw seed. It never adds a choice draw.
        const expectedEnemy = policy === 'action-time' && order.side === 'enemies' ? chooseLegacyEnemyOrder(planningState, order.key, queueSeed, legacyEnemyPlan) : undefined;
        queueSeed = rngStep(queueSeed);
        const unit = [...state.allies, ...state.enemies].find(unit => unit.key === order.key);
        const skill = battleSkill(unit.monster, order.skill);
        const deferred = policy === 'action-time' && order.side === 'allies';
        if (expectedEnemy && (!order.accepted || order.skill !== expectedEnemy.skill || order.target !== expectedEnemy.target || order.decisionPriority !== undefined || order.nativePriority !== undefined || order.skillName !== skill?.name || order.skillKind !== skill?.kind || order.skillPower !== skill?.power)) fail('legacy enemy pre-turn choice or fixed queue metadata differs');
        if (deferred && order.accepted) {
          if (order.skillName !== skill?.name || order.skillKind !== skill?.kind || order.skillPower !== skill?.power) fail('automatic skill metadata differs from its actual skill');
          if (order.nativePriority !== skill?.priority) fail('automatic native priority differs from its actual skill');
          if (!skill || !bands.has(order.decisionPriority) || skill.priority < order.decisionPriority || order.rejection !== undefined) fail('automatic choice has an invalid decision checkpoint');
        } else if (deferred) {
          const final = [...resolved.state.allies, ...resolved.state.enemies].find(unit => unit.key === order.key);
          const opponents = resolved.state[order.side === 'allies' ? 'enemies' : 'allies'];
          if (order.skill !== AUTO || order.skillName !== undefined || order.target !== undefined || order.decisionPriority !== undefined || order.nativePriority !== undefined || !['defeated', 'no-opponents'].includes(order.rejection) || (order.rejection === 'defeated' ? final.hp > 0 : opponents.some(unit => unit.hp > 0))) fail('unresolved automatic actor lacks a valid skip reason');
        }
        return { key: order.key, accepted: order.accepted, priority: deferred ? order.decisionPriority : skill.priority, speed: speedFor(unit, state.turn), tie: queueSeed };
      }).filter(action => action.accepted).sort((a, b) => b.priority - a.priority || b.speed - a.speed || a.tie - b.tie);
      if (JSON.stringify(resolved.events.filter(event => event.kind === 'phase' && event.phase === 'before-action').map(event => event.actor)) !== JSON.stringify(queue.map(action => action.key))) fail('automatic checkpoint order, fixed speed/tie or once-only action invariant failed');
      for (const unit of [...resolved.state.allies, ...resolved.state.enemies]) {
        if (![unit.hp, unit.mp, unit.poison].every(Number.isFinite) || unit.hp < 0 || unit.hp > unit.monster.hp || unit.mp < 0 || unit.mp > unit.monster.mp || !Number.isInteger(unit.mp) || unit.monster.mp !== initialUnits.get(unit.key).monster.mp || !Number.isInteger(unit.poison) || unit.poison < 0 || unit.poison > 3 || unit.poisonCashoutBonus !== initialUnits.get(unit.key).poisonCashoutBonus || (unit.poisonCashoutBonus !== undefined && (unit.monster.id !== UNDEAD_CORE_ID || !Number.isInteger(unit.poisonCashoutBonus) || unit.poisonCashoutBonus < 0 || unit.poisonCashoutBonus > 30)) || unit.mpDamageBonus !== initialUnits.get(unit.key).mpDamageBonus || (unit.mpDamageBonus !== undefined && (unit.monster.id !== DEMON_CORE_ID || !Number.isInteger(unit.mpDamageBonus) || unit.mpDamageBonus < 0 || unit.mpDamageBonus > 30)) || !responseResourcesValid(unit, initialUnits.get(unit.key), [...state.allies, ...state.enemies].find(prior => prior.key === unit.key)) || !supportResourcesValid(unit) || !dragonResourcesValid(unit, initialUnits.get(unit.key)) || !materialResourcesValid(unit, initialUnits.get(unit.key), [...state.allies, ...state.enemies].find(prior => prior.key === unit.key)) || !slimeResourcesValid(unit, initialUnits.get(unit.key), [...state.allies, ...state.enemies].find(prior => prior.key === unit.key))) fail(`resource invariant failed for ${unit.key}`);
      }
      if (resolved.state.turnMpRecovery !== trace.initialState.turnMpRecovery) fail('turn recovery economy changed during battle');
      if (resolved.state.reservePoison !== trace.initialState.reservePoison) fail('poison reservation policy changed during battle');
      for (const unit of [...resolved.state.allies, ...resolved.state.enemies]) if (unit.poisonImpactScale !== initialUnits.get(unit.key).poisonImpactScale) fail('poison impact scale changed during battle');
      const current = new Map([...state.allies, ...state.enemies].map(unit => [unit.key, clone(unit)]));
      const lastCast = new Map();
      const actualSkills = new Map();
      const lossesThisTurn = new Set();
      const fallbackActors = new Set();
      const castActors = new Set();
      let pendingMpLoss = null;
      let pendingCashout = null, pendingDefeat = null, damageSeed = queueSeed;
      const cashoutActors = new Set(), actionsStarted = new Set(), cashoutTargets = new Map(), castBases = new Map();
      let activeActor = null;
      let pendingResponse = null;
      const responseGuardTargets = new Map();
      const pendingRepair = new Map();
      const pendingSupply = new Map();
      const pendingDebit = new Map();
      const pendingSupplyCast = new Set();
      let repairPhase = false;
      let turnEnded = false, recoveryBoundary = false;
      const pendingRecovery = new Map();
      for (const event of resolved.events) {
        if (event.kind === 'phase' && event.phase === 'turn-end') turnEnded = true;
        if (event.kind === 'phase' && event.phase === 'next-turn-start') {
          keys(event, ['kind', 'phase', 'nextTurn'], 'turn recovery boundary');
          if (!turnEnded || recoveryBoundary || resolved.state.winner || event.nextTurn !== state.turn + 1 || turnMpRecoveryAmount(state.turnMpRecovery) <= 0) fail('invalid turn recovery boundary');
          recoveryBoundary = true;
          for (const unit of current.values()) if (unit.hp > 0) { const amount = Math.min(turnMpRecoveryAmount(state.turnMpRecovery), unit.monster.mp - unit.mp); if (amount > 0) pendingRecovery.set(unit.key, amount); }
        } else if (recoveryBoundary && !(event.kind === 'resource-gain' && event.effect === 'turn-mp-recovery')) fail('unexpected event after turn recovery boundary');
        if (pendingResponse) {
          const p = pendingResponse;
          if (p.stage === 'debit' && (event.kind !== 'resource' || event.actor !== p.actor || event.target !== p.actor)) fail('response cast missing immediate MP debit');
          if (p.stage === 'spend' && (event.kind !== 'response' || event.actor !== p.actor)) fail('response debit missing immediate shared spend');
          if (p.stage === 'impact' && (event.kind !== p.choice || event.actor !== p.actor || event.target !== p.recipients[0])) fail('response missing ordered absolute recipient impact');
        }

        if (pendingDefeat && (event.kind !== 'defeat' || event.actor !== pendingDefeat.actor || event.target !== pendingDefeat.target)) fail('lethal damage missing immediate matching defeat');
        if (event.kind === 'defeat') {
          if (!pendingDefeat || event.hp !== 0 || event.poison !== 0 || event.guard !== false) fail('defeat missing its immediate lethal damage or resource reset');
          pendingDefeat = null;
        }
        if (pendingCashout && event.kind !== 'damage') fail('cashout missing immediate direct hit');
        if (event.kind === 'phase' && event.phase === 'before-action') {
          if (actionsStarted.has(event.actor)) fail('actor entered more than one action checkpoint');
          const order = record.orders.find(order => order.key === event.actor);
          if (policy === 'action-time' && order.side === 'allies') {
          const publicState = { ...state, allies: state.allies.map(unit => current.get(unit.key)), enemies: state.enemies.map(unit => current.get(unit.key)) };
          const remaining = new Set(expectedOrders.map(order => order.key).filter(key => !actionsStarted.has(key)));
          const choice = chooseAutomaticOrder(publicState, event.actor, order.side, remaining);
          if (choice.skill !== order.skill || choice.target !== order.target) fail('automatic choice differs from current public state at its action');
          }
          actionsStarted.add(event.actor);
          if (policy === 'action-time' && order.side === 'allies') countSelection(order, current.get(event.actor));
        }
        if (pendingMpLoss && event.kind !== 'resource-loss') fail('MP damage missing immediate loss after surviving HP hit');
        if (event.kind === 'phase' && event.phase === 'before-action') activeActor = event.actor;
        const actor = metrics.get(event.actor);
        const target = metrics.get(event.target);
        if (event.effect === 'extraordinary-response-spend' && event.kind !== 'response') fail('response allowance must use response event');
        if (event.responseChoice !== undefined && event.kind !== 'response') fail('response choice belongs only to shared consumption event');
        if (actor && ['heal','damage','resource-gain','poison','break'].includes(event.kind) && isExtraordinaryResponse(actualSkills.get(event.actor) ?? {kind:'hit'})) fail('response cannot heal, attack, recover MP, reapply poison or strip');
        if (event.kind === 'response') {
          keys(event, ['kind','actor','target','skill','responseReady','responseChoice','effect','phase'], 'response event');
          const source = current.get(event.actor), skill = actualSkills.get(event.actor);
          if (!actor || !pendingResponse || pendingResponse.stage !== 'spend' || pendingResponse.actor !== event.actor || source?.monster.id !== EXTRAORDINARY_CORE_ID || source.hp <= 0 || source.responseReady !== true || event.target !== event.actor || event.responseReady !== false || event.responseChoice !== pendingResponse.choice || event.effect !== 'extraordinary-response-spend' || event.phase !== 'action' || event.skill !== skill?.name || pendingDebit.has(event.actor) || actor.responseCasts) fail('invalid response current-state shared consumption');
          actor.responseCasts++; actor[event.responseChoice === 'cleanse' ? 'responseCleanseCasts' : 'responseGuardCasts']++;
          if (event.responseChoice === 'cleanse') actor.cleanseResponseAllowanceSpent++;
          actor.responseMpAfterCast += source.mp; actor.responseRecipients += pendingResponse.recipients.length;
          pendingResponse.stage = 'impact';
        }
        if (event.effect === 'extraordinary-response-cleanse' || event.effect === 'extraordinary-response-guard') {
          const choice = event.effect.endsWith('cleanse') ? 'cleanse' : 'guard';
          keys(event, ['kind','actor','target',choice === 'cleanse' ? 'poison' : 'guard','effect','phase'], 'response recipient event');
          const recipient = current.get(event.target);
          if (!actor || !target || pendingResponse?.stage !== 'impact' || pendingResponse.actor !== event.actor || pendingResponse.choice !== choice || event.kind !== choice || pendingResponse.recipients[0] !== event.target || event.phase !== 'action' || recipient.hp <= 0 || event.actor[0] !== event.target[0] || (choice === 'cleanse' ? event.poison !== 0 : event.guard !== true)) fail('response absolute recipient invariant failed');
          if (choice === 'cleanse' && recipient.poison > 0) { actor.responseClearRecipients++; actor.responseClearedTicks += recipient.poison; actor.responseClearNominalPotential += recipient.poison * Math.floor(recipient.monster.hp * 0.06); responseClearedTargets.set(event.target, event.actor); }
          if (choice === 'guard') { if (recipient.guard) actor.responseGuardAlreadyRecipients++; else { actor.responseGuardNewRecipients++; responseGuardTargets.set(event.target,{actor:event.actor,hits:0}); } }
          pendingResponse.recipients.shift(); if (!pendingResponse.recipients.length) pendingResponse = null;
        } else if (pendingResponse?.stage === 'impact' && ['guard','cleanse'].includes(event.kind)) fail('response recipient effect missing');
        if (event.responseReady !== undefined) {
          boolean(event.responseReady, 'event.responseReady');
          if (initialUnits.get(event.target)?.responseReady === undefined || event.responseReady !== false || !['response','defeat','expire'].includes(event.kind) || (event.kind === 'expire' && current.get(event.target)?.hp > 0)) fail('response allowance cannot be enabled, dispelled, or cancelled while living');
        }
        if (event.kind === 'phase' && event.phase === 'action-end' && !castActors.has(event.actor)) {
          const unit = current.get(event.actor), order = record.orders.find(order => order.key === event.actor), skill = unit && battleSkill(unit.monster,order?.skill);
          if (skill && isExtraordinaryResponse(skill)) { const metric = metrics.get(event.actor); metric.responseCancelledSelections++; const reason = skillUnavailableReason(unit,skill,[...current.values()].filter(u=>u.key[0]===event.actor[0])); if (['response-no-poison','response-all-guarded'].includes(reason)) metric.responseNoEffect++; }
        }
        if (event.effect === 'poison-cashout' && event.kind !== 'poison-cashout') fail('cashout cannot heal, recover MP or create another effect');
        if (event.hp !== undefined && !['damage', 'heal', 'defeat'].includes(event.kind)) fail('HP resource changed outside damage, healing or defeat');
        if (event.kind === 'poison-cashout') {
          keys(event, ['kind', 'actor', 'target', 'skill', 'poison', 'poisonTicksConsumed', 'poisonCashoutPerTick', 'poisonCashoutAdded', 'effect', 'phase'], 'cashout event');
          const source = current.get(event.actor), recipient = current.get(event.target), skill = actualSkills.get(event.actor), cast = lastCast.get(event.actor);
          const perTick = source && skill ? poisonCashoutPerTickFor(source, skill) : 0;
          integer(event.poisonTicksConsumed, 0, 3, 'cashout consumed ticks'); integer(event.poisonCashoutPerTick, 0, 30, 'cashout per tick');
          if (!actor || !target || source.hp <= 0 || recipient.hp <= 0 || event.actor[0] === event.target[0] || !perTick || event.poisonCashoutPerTick !== perTick || event.poisonTicksConsumed !== poisonTicksFor(recipient) || event.poisonCashoutAdded !== perTick * event.poisonTicksConsumed || event.poison !== 0 || event.effect !== 'poison-cashout' || event.phase !== 'action' || event.skill !== skill.name || cast?.target !== event.target || cast.scope !== 'single' || pendingDebit.has(event.actor) || activeActor !== event.actor || cashoutActors.has(event.actor)) fail('cashout current-target, addition, order or single-consumption invariant failed');
          cashoutActors.add(event.actor); actor.cashoutEvents++; actor.cashoutTicksConsumed += event.poisonTicksConsumed; actor.cashoutAddedBasis += event.poisonCashoutAdded;
          if (!event.poisonTicksConsumed) actor.cashoutZeroPoison++;
          else poisonRemovedTargets.set(event.target, { kind: 'cashout', actor: event.actor });
          actor.cashoutFuturePoisonNominal += event.poisonTicksConsumed * Math.floor(recipient.monster.hp * 0.06);
          actor.cashoutScaledAddition += event.poisonCashoutAdded * directDamageScale(recipient);
          if (recipient.guard) actor.cashoutGuardedEvents++; if (recipient.ward) actor.cashoutWardedEvents++;
          if (record.orders.find(order => order.key === event.actor).target !== event.target) actor.cashoutRetargets++;
          pendingCashout = { actor: event.actor, target: event.target, added: event.poisonCashoutAdded };
          cashoutTargets.set(event.target, event.actor);
        }
        if (event.effect === 'slime-supply' && event.kind !== 'resource-gain') fail('slime supply must use resource-gain, never healing or debit');
        if (event.effect === 'slime-supply-spend' && event.kind !== 'supply') fail('slime allowance must use supply events');
        if (event.kind === 'supply') {
          const core = current.get(event.actor), cast = lastCast.get(event.actor);
          if (!actor || core?.monster.id !== SLIME_CORE_ID || core.hp <= 0 || core.supplyReady !== true || event.target !== event.actor || event.supplyReady !== false || event.effect !== 'slime-supply-spend' || event.phase !== 'action' || cast?.effect !== 'restoreMp' || actor.supplyCasts) fail('invalid slime supply consumption');
          const recipients = [...current.values()].filter(unit => unit.key[0] === event.actor[0] && unit.hp > 0 && unit.monster.family === SLIME_SUPPLY.family);
          if (cast.scope !== 'all' || JSON.stringify(cast.targets) !== JSON.stringify(recipients.map(unit => unit.key)) || !recipients.some(unit => unit.mp < unit.monster.mp)) fail('slime supply cast targets or full-MP invariant failed');
          if (!pendingSupplyCast.delete(event.actor)) fail('slime supply consumption without its chosen cast');
          actor.supplyCasts++; actor.supplyTurn = state.turn; actor.supplyRecipients += recipients.length;
          actor.supplyPotential += recipients.length * supplyAmountFor(core);
          pendingSupply.set(event.actor, new Map(recipients.map(unit => [unit.key, Math.min(supplyAmountFor(core), unit.monster.mp - unit.mp)])));
        }
        if (event.kind === 'resource-gain' && event.effect === 'turn-mp-recovery') {
          keys(event, ['kind','target','amount','mp','effect','nextTurn','phase'], 'turn recovery gain');
          const recipient = current.get(event.target);
          if (!recoveryBoundary || !target || !recipient || recipient.hp <= 0 || event.phase !== 'next-turn-start' || event.nextTurn !== state.turn + 1 || !pendingRecovery.has(event.target) || event.amount !== pendingRecovery.get(event.target) || event.mp !== recipient.mp + event.amount) fail('turn recovery absolute credit/recipient invariant failed');
          target.mpGenerated += event.amount; target.turnMpRecovered += event.amount; target.peakMp = Math.max(target.peakMp, event.mp); pendingRecovery.delete(event.target);
        } else if (event.kind === 'resource-gain') {
          const pending = pendingSupply.get(event.actor), recipient = current.get(event.target);
          if (!actor || !target || event.effect !== 'slime-supply' || event.phase !== 'action' || !pending?.has(event.target) || event.amount !== pending.get(event.target) || event.mp !== recipient.mp + event.amount || recipient.hp <= 0 || recipient.monster.family !== SLIME_SUPPLY.family || event.actor[0] !== event.target[0]) fail('slime supply MP credit/recipient invariant failed');
          actor.supplyGenerated += event.amount; target.supplyReceived += event.amount; target.mpGenerated += event.amount;
          target.peakMp = Math.max(target.peakMp, event.mp); pending.delete(event.target);
        }
        if (event.supplyReady !== undefined) {
          boolean(event.supplyReady, 'event.supplyReady');
          if (initialUnits.get(event.target)?.supplyReady === undefined || event.supplyReady !== false) fail('event enables disabled or consumed slime supply');
          if (!['supply', 'defeat', 'expire'].includes(event.kind) || (event.kind === 'expire' && current.get(event.target)?.hp > 0)) fail('slime supply cannot be dispelled or cancelled while living');
          if (event.kind === 'defeat' && current.get(event.target)?.supplyReady === true) target.supplyDefeatedBeforeUse++;
        }
        if (event.mp !== undefined && !['resource', 'resource-gain', 'resource-loss'].includes(event.kind)) fail('MP changed outside debit, gain or enemy loss events');
        if (event.effect === 'mp-damage' && event.kind !== 'resource-loss') fail('MP damage requires a resource-loss event');
        if (event.kind === 'resource-loss') {
          keys(event, ['kind', 'actor', 'target', 'skill', 'amount', 'mp', 'effect', 'phase'], 'MP damage loss event');
          const source = current.get(event.actor), recipient = current.get(event.target), skill = actualSkills.get(event.actor);
          if (!actor || !target || !pendingMpLoss || pendingMpLoss.actor !== event.actor || pendingMpLoss.target !== event.target || event.effect !== 'mp-damage' || event.phase !== 'action' || event.actor === event.target || event.actor[0] === event.target[0] || recipient.hp <= 0 || event.amount !== pendingMpLoss.amount || event.mp !== recipient.mp - event.amount || event.skill !== skill?.name || event.hitIndex !== undefined) fail('MP damage loss/recipient/absolute ledger invariant failed');
          const potential = mpDamageFor(source, skill), mitigated = Math.floor(potential * directDamageScale(recipient));
          actor.mpDamageEvents++; if (!event.amount) actor.mpDamageZeroEvents++;
          actor.mpDamageActual += event.amount; target.mpDamageReceived += event.amount;
          actor.mpDamagePotential += potential; actor.mpDamageMitigated += potential - mitigated; actor.mpDamageClipped += mitigated - event.amount;
          actor.pressureTargetMpBefore += recipient.mp; actor.pressureTargetMpAfter += event.mp;
          if (event.amount > 0) lossesThisTurn.add(event.target);
          pendingMpLoss = null;
        }
        if (event.kind === 'fallback') {
          keys(event, ['kind', 'actor', 'target', 'skill', 'fromSkill', 'toSkill', 'reason', 'queuePriority', 'requiredMP', 'availableMP', 'phase'], 'MP fallback event');
          const unit = current.get(event.actor), order = record.orders.find(order => order.key === event.actor), selected = unit && battleSkill(unit.monster, order?.skill);
          if (!actor || !order?.accepted || unit.hp <= 0 || selected?.mpCost <= 0 || unit.mp >= selected.mpCost || !lossesThisTurn.has(event.actor) || fallbackActors.has(event.actor) || castActors.has(event.actor) || activeActor !== event.actor || event.phase !== 'action' || event.reason !== 'enemy-mp-loss' || event.fromSkill !== order.skill || event.toSkill !== BASIC_ATTACK || event.queuePriority !== selected.priority || event.requiredMP !== selected.mpCost || event.availableMP !== unit.mp || event.skill !== selected.name || current.get(event.target)?.hp <= 0 || event.actor[0] === event.target?.[0]) fail('invalid enemy MP fallback or original queue slot');
          fallbackActors.add(event.actor); actor.fallbackCasts++;
          if (isExtraordinaryResponse(selected)) actor.responseFallbacks++;
        }
        if (event.kind === 'resource' && event.effect === 'material-repair') fail('material repair cannot spend MP');
        if (event.effect === 'material-repair' && !['passive', 'heal'].includes(event.kind)) fail('material repair must use passive/heal events, never casts');
        if (repairPhase && ['cast', 'resource', 'damage'].includes(event.kind)) fail('action, MP debit or poison occurred after material repair');
        if (event.kind === 'passive' && event.effect === 'material-repair') {
          const core = current.get(event.actor);
          if (!actor || core?.monster.id !== MATERIAL_CORE_ID || core.hp <= 0 || core.repairReady !== true || event.target !== event.actor || event.repairReady !== false || event.scope !== 'all' || event.phase !== 'turn-end' || state.turn !== 1 || actor.repairTriggers) fail('invalid material repair trigger');
          const recipients = [...current.values()].filter(unit => unit.key[0] === event.actor[0] && unit.hp > 0 && unit.monster.family === 'material');
          if (JSON.stringify(event.targets) !== JSON.stringify(recipients.map(unit => unit.key))) fail('material repair recipients differ from living same-side material units');
          repairPhase = true;
          actor.repairTriggers++; actor.repairTriggerTurn = state.turn; actor.repairRecipients += recipients.length;
          pendingRepair.set(event.actor, new Map(recipients.map(unit => [unit.key, Math.min(Math.floor(unit.monster.hp * (core.repairPercent ?? MATERIAL_REPAIR_PERCENT) / 100), unit.monster.hp - unit.hp)])));
          actor.repairPotentialHealing += recipients.reduce((sum, unit) => sum + Math.floor(unit.monster.hp * (core.repairPercent ?? MATERIAL_REPAIR_PERCENT) / 100), 0);
        }
        if (event.kind === 'heal' && event.effect === 'material-repair') {
          const pending = pendingRepair.get(event.actor);
          if (event.phase !== 'turn-end' || !actor || !pending?.has(event.target) || event.amount !== pending.get(event.target) || event.hp !== current.get(event.target).hp + event.amount) fail('material repair healing/recipient invariant failed');
          actor.repairHealing += event.amount; target.repairReceived += event.amount; pending.delete(event.target);
        }
        if (event.repairReady !== undefined) {
          boolean(event.repairReady, 'event.repairReady');
          if (initialUnits.get(event.target)?.repairReady === undefined || event.repairReady !== false) fail(`event enables disabled or consumed material repair for ${event.target}`);
          if (current.get(event.target)?.repairReady === true && !(event.kind === 'passive' && event.effect === 'material-repair')) {
            if (!['break', 'defeat'].includes(event.kind)) fail('unexpected material repair cancellation');
            target.repairCancellations++;
            if (event.kind === 'defeat') target.repairDefeatedBeforeTrigger++;
            if (event.kind === 'break' && actor) actor.repairDispelled++;
          }
        }
        if (event.kind === 'cast' && actor) {
          if (firstCastSide === null) firstCastSide = event.actor.startsWith('a') ? 'allies' : 'enemies';
          if (castActors.has(event.actor)) fail('multiple casts in one accepted queue slot');
          castActors.add(event.actor); actor.casts++;
          lastCast.set(event.actor, event);
          if (event.dragonChargeSpent !== undefined) {
            integer(event.dragonChargeSpent, 0, DRAGON_CHARGE_CAP, 'cast.dragonChargeSpent');
            actor.dragonFinishers++; actor.dragonChargeSpent += event.dragonChargeSpent;
            if (event.dragonChargeSpent > 0) actor.chargedDragonFinishers++;
          }
          const order = record.orders.find(order => order.key === event.actor);
          const unit = current.get(event.actor);
          const actualIndex = fallbackActors.has(event.actor) ? BASIC_ATTACK : order.skill;
          if (actualIndex >= 0) actor.specialCasts++;
          const skill = battleSkill(unit.monster, actualIndex);
          actualSkills.set(event.actor, skill); castBases.set(event.actor, baseDamage(unit, skill));
          if (skill.kind === 'poison') { actor.poisonCasts++; actor.poisonMpSpent += skill.mpCost; }
          if (['cleanse', 'responseCleanse'].includes(skill.kind)) { actor.cleanseCasts++; actor.cleanseMpSpent += skill.mpCost; actor.cleanseZeroHealingCasts++; }
          if (own(skill, 'poisonCashout')) { actor.cashoutCasts++; actor.cashoutMpSpent += skill.mpCost; actor.cashoutSourceMpAtCast += unit.mp; }
          if (event.skill !== skill.name || event.effect !== skill.kind) fail('cast resource invariant differs from accepted skill or MP fallback');
          if (own(skill, 'mpDamage')) { actor.pressureCasts++; actor.pressureMpSpent += skill.mpCost; actor.pressureSourceMpAtCast += unit.mp; }
          if (skill.mpCost > 0) { actor.paidCasts++; pendingDebit.set(event.actor, skill.mpCost); }
          if ((skill.kind === 'restoreMp') !== (event.effect === 'restoreMp')) fail('slime supply cast effect differs from chosen skill');
          if (skill.kind === 'restoreMp') pendingSupplyCast.add(event.actor);
          if (isExtraordinaryResponse(skill)) {
            keys(event,['kind','actor','scope','targets','skill','effect','phase'],'response cast');
            const recipients = [...current.values()].filter(u=>u.key[0]===event.actor[0]&&u.hp>0), choice = skill.kind === 'responseCleanse' ? 'cleanse' : 'guard';
            if (unit.monster.id !== EXTRAORDINARY_CORE_ID || unit.hp <= 0 || unit.responseReady !== true || unit.mp < EXTRAORDINARY_RESPONSE.mpCost || skill.mpCost !== EXTRAORDINARY_RESPONSE.mpCost || skill.power !== 0 || skill.priority !== (choice === 'guard' ? 3 : 0) || !skill.all || event.phase !== 'action' || activeActor !== event.actor || event.scope !== 'all' || event.target !== undefined || JSON.stringify(event.targets) !== JSON.stringify(recipients.map(u=>u.key)) || !recipients.some(u=>choice==='cleanse'?u.poison>0:!u.guard) || actor.responseCasts) fail('response cast eligibility, payment, no-effect or target invariant failed');
            actor.responseMpSpent += skill.mpCost; actor.responseSourceMpAtCast += unit.mp;
            pendingResponse = {actor:event.actor,choice,stage:'debit',recipients:recipients.map(u=>u.key)};
          }
        }
        if (event.kind === 'damage') {
          if (event.hp === 0) pendingDefeat = { actor: event.actor, target: event.target };
          if (actor) {
            const source = current.get(event.actor), skill = actualSkills.get(event.actor), recipient = current.get(event.target);
            if (!skill) fail('direct damage missing accepted cast or fallback');
            if (skill.randomHits) damageSeed = rngStep(damageSeed);
            damageSeed = rngStep(damageSeed);
            const roll = 0.9 + (damageSeed % 21) / 100;
            if (poisonCashoutPerTickFor(source, skill) > 0 && (!pendingCashout || pendingCashout.actor !== event.actor || pendingCashout.target !== event.target)) fail('cashout direct damage missing its consumption');
            if (skill.kind === 'poison') {
              if (poisonImpactScaleFor(source) === 0) fail('zero-scale poison emitted a direct damage event');
              const expected = Math.min(recipient.hp, Math.max(1, Math.floor(castBases.get(event.actor) * roll * directDamageScale(recipient))));
              if (event.amount !== expected || event.hp !== recipient.hp - expected) fail('poison full-basis randomized HP-clipped direct damage differs');
              actor.poisonDirectHp += event.amount;
            }
            if (recipient.guard) {
              const basis = castBases.get(event.actor) + (pendingCashout?.added ?? 0);
              const guarded = Math.min(recipient.hp, Math.max(1, Math.floor(basis * roll * directDamageScale(recipient))));
              const without = Math.min(recipient.hp, Math.max(1, Math.floor(basis * roll * directDamageScale({...recipient,guard:false}))));
              if (event.amount !== guarded || event.hp !== recipient.hp - guarded) fail('guard same-impact damage reconstruction differs');
              target.guardProtectedHits++; target.guardActualPrevented += without - guarded;
            }
            const guardCredit = responseGuardTargets.get(event.target);
            if (guardCredit && recipient.guard) {
              const basis = castBases.get(event.actor) + (pendingCashout?.added ?? 0);
              const guarded = Math.min(recipient.hp, Math.max(1, Math.floor(basis * roll * directDamageScale(recipient))));
              const without = Math.min(recipient.hp, Math.max(1, Math.floor(basis * roll * directDamageScale({...recipient,guard:false}))));
              if (event.amount !== guarded || event.hp !== recipient.hp - guarded) fail('response guard same-impact damage reconstruction differs');
              const owner = metrics.get(guardCredit.actor); guardCredit.hits++; owner.responseGuardProtectedHits++; owner.responseGuardHpDamageObserved += guarded; owner.responseGuardActualPrevented += without - guarded;
            }
            if (pendingCashout) {
              const scale = directDamageScale(recipient), base = castBases.get(event.actor);
              const without = Math.min(recipient.hp, Math.max(1, Math.floor(base * roll * scale)));
              const expected = Math.min(recipient.hp, Math.max(1, Math.floor((base + pendingCashout.added) * roll * scale)));
              if (event.effect !== undefined || event.hitIndex !== undefined || event.amount !== expected || event.hp !== recipient.hp - expected) fail('cashout randomized, mitigated and HP-clipped damage invariant failed');
              actor.cashoutActualAddedDamage += expected - without; actor.cashoutDirectDamage += expected;
              if (event.hp === 0) { actor.cashoutKills++; actor.cashoutKillTurnSum += state.turn; if (without < recipient.hp) actor.cashoutDecisiveKills++; if (!actionsStarted.has(event.target)) actor.cashoutKillsBeforeTargetAction++; } else actor.cashoutSurvivingTargets++;
              pendingCashout = null;
            }
            if (skill && mpDamageFor(source, skill) > 0) {
              if (event.hp > 0) pendingMpLoss = { actor: event.actor, target: event.target, amount: mpLossFor(source, skill, { ...recipient, hp: event.hp }) };
              else actor.mpDamageKilledTargets++;
            }
            actor.directDamage += event.amount ?? 0;
            if (lastCast.get(event.actor)?.dragonChargeSpent !== undefined) actor.dragonFinisherDamage += event.amount ?? 0;
          }
          if (target) { if (!Number.isInteger(event.amount) || event.amount < 0 || event.hp !== current.get(event.target).hp - event.amount) fail('HP resource damage ledger invariant failed'); target.hpDamageTaken += event.amount; }
          if (!actor && event.effect === 'poison') { poisonDamageTaken[event.target.startsWith('a') ? 'allies' : 'enemies'] += event.amount ?? 0; target.poisonTickHpTaken += event.amount; target.poisonTickEventsTaken++; }
        }
        if (event.kind === 'heal' && actor) {
          actor.healing += event.amount ?? 0;
          const source = current.get(event.actor), recipient = current.get(event.target), skill = actualSkills.get(event.actor);
          const potential = event.effect === 'material-repair' ? Math.floor(recipient.monster.hp * (source.repairPercent ?? MATERIAL_REPAIR_PERCENT) / 100) : skill?.power;
          if (!Number.isFinite(potential) || event.amount !== Math.max(0, Math.min(potential, recipient.monster.hp - recipient.hp))) fail('effective healing/overheal reconstruction differs');
          actor.healPotential += potential; actor.overheal += potential - event.amount;
          if (event.effect !== 'material-repair' && skill?.kind === 'cleanse') { actor.cleanseEffectiveHealing += event.amount; actor.cleanseOverheal += potential - event.amount; if (event.amount > 0) { actor.cleanseHealingCasts++; actor.cleanseZeroHealingCasts--; } }
        }
        if (event.kind === 'heal' && target) { if (!Number.isInteger(event.amount) || event.amount < 0 || event.hp !== current.get(event.target).hp + event.amount) fail('HP healing ledger invariant failed'); target.hpHealingReceived += event.amount; }
        if (event.kind === 'resource') {
          const unit = current.get(event.actor);
          if (!actor || event.target !== event.actor || event.effect !== 'mp' || pendingDebit.get(event.actor) !== event.amount || !Number.isInteger(event.amount) || event.amount <= 0 || event.mp !== unit.mp - event.amount) fail('MP debit invariant failed');
          actor.mpSpent += event.amount; pendingDebit.delete(event.actor);
          if (pendingResponse?.stage === 'debit' && pendingResponse.actor === event.actor) pendingResponse.stage = 'spend';
        }
        if (event.kind === 'guard' && actor) actor.guardApplications++;
        if (responseGuardTargets.has(event.target) && ((event.guard === false) || (event.kind === 'guard' && event.effect !== 'extraordinary-response-guard'))) { const credit = responseGuardTargets.get(event.target), owner = metrics.get(credit.actor); if (event.kind === 'break') owner.responseGuardStrippedRecipients++; if (!credit.hits) owner.responseGuardIdleRecipients++; responseGuardTargets.delete(event.target); }
        if (event.kind === 'cleanse' && actor) {
          const recipient = current.get(event.target); actor.cleanseEvents++;
          if (recipient.poison > 0) { actor.effectiveCleanses++; actor.cleanseClearedTicks += recipient.poison; actor.cleanseFuturePoisonNominal += recipient.poison * Math.floor(recipient.monster.hp * 0.06); poisonRemovedTargets.set(event.target, {kind:'cleanse',actor:event.actor}); }
        }
        if (event.kind === 'poison' && actor) {
          const source = current.get(event.actor), recipient = current.get(event.target), skill = actualSkills.get(event.actor);
          if (skill?.kind !== 'poison' || recipient.hp <= 0 || event.poison !== 3) fail('poison application lacks a living target and poison cast');
          if (poisonImpactScaleFor(source) === 0) damageSeed = rngStep(damageSeed); // The engine still drew this target roll, without a damage event.
          if (recipient.poison === 0) actor.poisonNewApplications++; else if (recipient.poison === 3) actor.poisonRedundantApplications++; else actor.poisonRefreshApplications++;
          const removal = poisonRemovedTargets.get(event.target);
          if (removal) { if (recipient.poison !== 0) fail('poison removal ledger did not clear on first reapplication'); actor[removal.kind === 'cleanse' ? 'poisonReapplicationsAfterCleanse' : 'poisonReapplicationsAfterCashout']++; poisonRemovedTargets.delete(event.target); }
          const cleared = responseClearedTargets.get(event.target); if (cleared) { metrics.get(cleared).responseLaterReapplications++; responseClearedTargets.delete(event.target); } actor.poisonApplications++; const consumer = cashoutTargets.get(event.target); if (consumer) { metrics.get(consumer).cashoutLaterReapplications++; cashoutTargets.delete(event.target); } }
        if (event.kind === 'break' && actor) {
          actor.dispelApplications++;
          if (event.dragonCharge === 0) actor.dragonChargeDispelled += current.get(event.target)?.dragonCharge ?? 0;
        }
        if (event.kind === 'charge' && event.effect === 'dragon-charge-gain' && actor) actor.dragonChargeGenerated++;
        if (event.dragonCharge !== undefined) {
          integer(event.dragonCharge, 0, DRAGON_CHARGE_CAP, 'event.dragonCharge');
          if (!initialUnits.get(event.target)?.dragonCharge && initialUnits.get(event.target)?.dragonCharge !== 0) fail(`event enables disabled dragon charge for ${event.target}`);
          if (target) target.peakDragonCharge = Math.max(target.peakDragonCharge, event.dragonCharge);
          if (event.kind === 'defeat' && target) target.dragonChargeLostOnDefeat += current.get(event.target)?.dragonCharge ?? 0;
        }
        if (event.kind === 'defeat' && target) { target.deathTurn = state.turn; target.diedBeforeAnyCast = target.casts === 0; if (!actionsStarted.has(event.target)) target.deathsBeforeTurnAction++; poisonRemovedTargets.delete(event.target); }
        if (event.target && current.has(event.target)) {
          const affected = current.get(event.target);
          for (const field of ['hp', 'mp', 'poison', 'guard', 'rally', 'ward', 'dragonCharge', 'repairReady', 'supplyReady', 'responseReady']) if (event[field] !== undefined) affected[field] = event[field];
        }
      }
      for (const unit of [...resolved.state.allies, ...resolved.state.enemies]) if (current.get(unit.key).dragonCharge !== unit.dragonCharge) fail(`charge event/state mismatch for ${unit.key}`);
      if (pendingResponse) fail('response cast missing spend or recipients');
      for (const unit of [...resolved.state.allies, ...resolved.state.enemies]) if (current.get(unit.key).responseReady !== unit.responseReady || current.get(unit.key).guard !== unit.guard) fail(`response/guard event/state mismatch for ${unit.key}`);
      if (pendingDefeat) fail('lethal damage missing defeat event');
      if (pendingCashout) fail('cashout missing damage event');
      if (damageSeed !== resolved.state.seed) fail('direct damage RNG accounting differs');
      if (pendingMpLoss) fail('MP damage missing loss event');
      for (const key of fallbackActors) if (!castActors.has(key)) fail('fallback missing one basic cast');
      if (pendingRecovery.size || recoveryBoundary !== (!resolved.state.winner && turnMpRecoveryAmount(state.turnMpRecovery) > 0)) fail('turn recovery missing boundary or recipient gain');
      if (pendingSupplyCast.size) fail('slime supply cast missing consumption event');
      if (pendingDebit.size) fail('cast missing MP debit event');
      for (const pending of pendingSupply.values()) if (pending.size) fail('slime supply missing recipient gain events');
      for (const unit of [...resolved.state.allies, ...resolved.state.enemies]) {
        if (current.get(unit.key).supplyReady !== unit.supplyReady) fail(`supply event/state mismatch for ${unit.key}`);
        if (current.get(unit.key).mp !== unit.mp || initialUnits.get(unit.key).mp + metrics.get(unit.key).mpGenerated - metrics.get(unit.key).mpSpent - metrics.get(unit.key).mpDamageReceived !== unit.mp) fail(`MP ledger/event/state mismatch for ${unit.key}`);
      }
      for (const pending of pendingRepair.values()) if (pending.size) fail('material repair missing recipient heal events');
      for (const unit of [...resolved.state.allies, ...resolved.state.enemies]) if (current.get(unit.key).repairReady !== unit.repairReady) fail(`repair event/state mismatch for ${unit.key}`);
      for (const unit of [...resolved.state.allies, ...resolved.state.enemies]) {
        if (current.get(unit.key).hp !== unit.hp || initialUnits.get(unit.key).hp + metrics.get(unit.key).hpHealingReceived - metrics.get(unit.key).hpDamageTaken !== unit.hp || current.get(unit.key).poison !== unit.poison) fail(`HP/poison ledger/event/state mismatch for ${unit.key}`);
      }
      state = resolved.state;
      delete trace.activeAttempt;
    }
    if (!state.winner) fail(`no terminal result within ${MAX_TURNS} turns`);
  } catch (error) { throw new MatchFailure(error.message, request, { ...trace, lastState: clone(state) }); }
  const units = [...state.allies, ...state.enemies].map(unit => ({ ...metrics.get(unit.key), responseUnused: metrics.get(unit.key).responseEligible && !metrics.get(unit.key).responseCasts ? 1 : 0, responseDeadWithUnused: metrics.get(unit.key).responseEligible && !metrics.get(unit.key).responseCasts && unit.hp === 0 ? 1 : 0, responseSurvivedUnused: metrics.get(unit.key).responseEligible && !metrics.get(unit.key).responseCasts && unit.hp > 0 ? 1 : 0, responseGuardNoHitCasts: metrics.get(unit.key).responseGuardCasts && !metrics.get(unit.key).responseGuardProtectedHits ? 1 : 0, supplyUnused: metrics.get(unit.key).supplyEligible && !metrics.get(unit.key).supplyCasts ? 1 : 0, supplyWasted: metrics.get(unit.key).supplyPotential - metrics.get(unit.key).supplyGenerated, repairFailedBeforeTrigger: metrics.get(unit.key).repairEligible && !metrics.get(unit.key).repairTriggers ? 1 : 0, repairUnusedHealing: metrics.get(unit.key).repairPotentialHealing - metrics.get(unit.key).repairHealing, finalHp: unit.hp, finalMp: unit.mp }));
  const sides = {};
  for (const side of ['allies', 'enemies']) {
    const group = units.filter(unit => unit.key.startsWith(side === 'allies' ? 'a' : 'e'));
    const total = field => group.reduce((sum, unit) => sum + unit[field], 0);
    const damage = total('directDamage');
    sides[side] = {
      dragonChargeGenerated: total('dragonChargeGenerated'), dragonChargeSpent: total('dragonChargeSpent'), dragonFinishers: total('dragonFinishers'), chargedDragonFinishers: total('chargedDragonFinishers'), dragonFinisherDamage: total('dragonFinisherDamage'), dragonChargeDispelled: total('dragonChargeDispelled'), dragonChargeLostOnDefeat: total('dragonChargeLostOnDefeat'), peakDragonCharge: Math.max(...group.map(unit => unit.peakDragonCharge)),
      ...Object.fromEntries(['repairEligible', 'repairTriggers', 'repairHealing', 'repairReceived', 'repairRecipients', 'repairPotentialHealing', 'repairUnusedHealing', 'repairCancellations', 'repairFailedBeforeTrigger', 'repairDispelled', 'repairDefeatedBeforeTrigger', 'repairMpSpent'].map(field => [field, total(field)])),
      repairTriggerTurnSum: total('repairTriggerTurn'),
      ...Object.fromEntries([...PRESSURE_METRICS, ...CASHOUT_METRICS, ...RESPONSE_METRICS, ...POISON_METRICS].map(field => [field, total(field)])),
      ...Object.fromEntries(SUPPLY_METRICS.map(field => [field, total(field)])),
      supplyTurnSum: total('supplyTurn'),
      directDamage: damage, healing: total('healing'), mpSpent: total('mpSpent'), paidCasts: total('paidCasts'), specialCasts: total('specialCasts'), casts: total('casts'),
      guardApplications: total('guardApplications'), effectiveCleanses: total('effectiveCleanses'), poisonApplications: total('poisonApplications'), dispelApplications: total('dispelApplications'),
      noAffordableSpecialTurns: total('noAffordableSpecialTurns'), zeroMpTurns: total('zeroMpTurns'), aliveAtTurnStartTurns: total('aliveAtTurnStartTurns'),
      zeroCastDeaths: group.filter(unit => unit.diedBeforeAnyCast).length, deaths: group.filter(unit => unit.deathTurn !== null).length,
      damageConcentration: damage ? Math.max(...group.map(unit => unit.directDamage)) / damage : 0,
      poisonDamageTaken: poisonDamageTaken[side], remainingHpFraction: state[side].reduce((sum, unit) => sum + unit.hp / unit.monster.hp, 0) / 5,
    };
  }
  trace.finalState = clone(state);
  const result = { winner: state.winner, turns: state.turn - 1, turnLimit: state.turn - 1 === MAX_TURNS, adjudicated: isAdjudicatedState(state), firstCastSide, units, sides, traceHash: hash(trace) };
  if (includeTrace) result.trace = trace;
  return result;
}

export const isAdjudicatedState = state => !!state.winner && state.turn - 1 === MAX_TURNS && state.allies.some(unit => unit.hp > 0) && state.enemies.some(unit => unit.hp > 0);

export const METRIC_DEFINITIONS = {
  ...Object.fromEntries(Object.entries(POISON_DEFINITIONS).map(([field,definition]) => [`mean${field[0].toUpperCase()}${field.slice(1)}`, definition])),
  adjudications: 'Actual HP-fraction adjudications: both physical sides still have a living unit at the end of turn20. A turn20 elimination is not adjudication.',
  ...Object.fromEntries(RESPONSE_METRICS.map(field => [`mean${field[0].toUpperCase()}${field.slice(1)}`, `Team A per-game ${field}; shared response allowance and actual events only; see extraordinary audit definitions.`])),
  meanResponseClearNominalPotential: 'Removed current ticks times floor(recipient maxHP * 6%). Nominal potential only, never prevented future HP: reapplication, cleanse, death and healing change it.',
  meanResponseGuardActualPrevented: 'Exact local same-impact HP-clipped unguarded minus guarded damage with original cast basis, cashout addition, roll, floor, clipping and current other ward state. Credited only newly response-guarded targets before strip/expiry/another guard. Not whole-battle causal prevention.',
  meanResponseGuardProtectedHits: 'Actual direct hits on newly response-guarded recipients before strip/expiry/another guard; may save zero HP due to clipping or stronger ward. Never multiply observed damage to estimate prevention.',
  meanResponseNoEffect: 'Selected accepted response cancelled at action time because poison was already cleared or all living friends guarded. MP and shared use preserved.',
  meanResponseWithheldTurns: 'Living initially eligible core turn choosing another action while the shared allowance is still ready. Does not assert a missed opportunity.',

  ...Object.fromEntries(CASHOUT_METRICS.map(field => [`mean${field[0].toUpperCase()}${field.slice(1)}`, `Team A per-game ${field}; cashout addition is bounded, poison is consumed at actual impact; see undead audit for exact accounting definitions.`])),
  meanCashoutActualAddedDamage: 'HP-clipped same-hit damage with addition minus same target, protection and random roll without addition. Local arithmetic attribution only, not a full battle counterfactual.',
  meanCashoutFuturePoisonNominal: 'Consumed ticks times floor(target maxHP * 6%). Potential future poison sacrificed, not guaranteed realized loss: later cleanse, defeat and reapplication can change it.',
  ...Object.fromEntries(PRESSURE_METRICS.map(field => [`mean${field[0].toUpperCase()}${field.slice(1)}`, ({
    pressureSelections: 'Actual recorded choices of a learned MP-marked attack (player action-time, enemy pre-turn), including zero/off base controls; actors defeated before a player decision are excluded; accepted pre-turn enemy decisions remain counted.',
    pressureHpAttackSelections: 'HP-only learned attack selections by MP-marked actors/core29.', pressureBasicSelections: 'Free basic selections by MP-marked actors/core29.',
    pressureCasts: 'Actual casts of MP-marked attacks, including explicit zero/off controls.', pressureMpSpent: 'Actual MP paid by MP-marked attacks; never enemy loss.',
    pressureSourceMpAtCast: 'Sum of source MP immediately before each MP-marked cast; divide by casts for conditional mean.',
    pressureTargetMpBefore: 'Sum of target MP immediately before actual resource-loss events; divide by events for conditional mean.', pressureTargetMpAfter: 'Sum of absolute target MP immediately after resource-loss events.',
    mpDamageEvents: 'Actual surviving-hit resource-loss events, including zero.', mpDamageZeroEvents: 'Resource-loss events with zero actual MP loss.',
    mpDamageActual: 'Actual enemy MP lost caused by this side, clipped by current MP.', mpDamageReceived: 'Actual enemy MP loss suffered; separate debit in initial + generated - spent - lost = final ledger.',
    mpDamagePotential: 'Unmitigated MP damage on actual surviving targets only.', mpDamageMitigated: 'Surviving-hit MP budget removed by guard/ward/floor.', mpDamageClipped: 'Remaining surviving-hit MP budget wasted against insufficient target MP.',
    mpDamageKilledTargets: 'MP-capable hits that killed the target and therefore caused no MP-loss event.', fallbackCasts: 'One free basic cast replacing an accepted paid order made unaffordable by earlier enemy loss, retaining its original queue position.'
  })[field]])),
  winRate: 'Team A wins / games. Draws are not wins. Swapped physical sides retain team A identity.',
  scoreRate: '(Team A wins + 0.5 * draws) / games.',
  drawRate: 'Draws / games, including tied HP-fraction adjudication at the turn cap.',
  meanTurns: 'Mean completed turns; the production 20-turn cap and HP-fraction adjudication are unchanged.',
  physicalAllyScoreRate: 'Physical allies-side (a keys) wins plus half draws / games. Its difference from 0.5 is a side-assignment diagnostic, not proof of first-move bias.',
  firstCastSideScoreRate: 'Score of the side making the first actual cast. Descriptive initiative association; not causal and not corrected for team speed or skill choice.',
  meanDirectDamage: 'HP-clipped direct damage caused by team A events per game. Overkill excluded; poison ticks lack actor attribution and are reported as poisonDamageTaken instead.',
  meanHealing: 'Actual HP restored by team A per game; overhealing excluded.',
  meanSupplyEligible: 'Initially ready slime cores per game. Eligibility is fixed from starting membership.',
  meanSupplySelections: 'Recorded supply choices per game: player action-time and enemy pre-turn. An enemy selected before defeat can count without casting.',
  meanSupplyCasts: 'Actual once-only supply consumption events per game, also counted as normal learned casts.',
  meanSupplyGenerated: 'Actual MP credited by supply per game, clipped to living same-side slime missing MP.',
  meanSupplyReceived: 'Actual supply MP received by team A per game.',
  meanSupplyRecipients: 'Living same-side slime recipients at actual casts, including zero-gain full-MP units.',
  meanSupplyPotential: 'Supply amount times actual living recipients at casts; excludes defeated recipients.',
  meanSupplyWasted: 'Potential minus actual supply MP due to recipient maximum-MP clipping.',
  meanSupplyUnused: 'Initially ready cores with no supply cast in the match.',
  meanSupplyDefeatedBeforeUse: 'Ready cores defeated before consumption. Supply is nondispellable.',
  meanSupplyMpSpent: 'MP charged by supply itself; strict skill schema requires zero. It still uses one action.',
  meanSupplyTurn: 'Mean turn conditional on actual supply consumption; null when never cast.',
  meanMpGenerated: 'Actual resource-gain MP credited per game, separate from debit/healing.',
  meanTurnMpRecovered: 'Actual capped recurring turn-start MP credits per game, separate from once-only slime supply.',
  meanInitialMp: 'Team initial MP after leader modifiers.',
  meanMaximumMp: 'Team sum of maximum MP after leader modifiers.',
  meanPeakMp: 'Sum of each team member highest observed MP; not a simultaneous peak.',
  meanMpSpent: 'MP resource events spent by team A per game. No MP is spent merely choosing an order.',
  meanPaidCasts: 'Number of actually executed positive-MP-cost casts by team A per game.',
  meanSpecialCasts: 'Executed learned-skill casts by team A per game, including any zero-cost learned guard; universal basic/defend commands excluded.',
  meanCasts: 'All actually executed casts by team A per game, including basic and guard.',
  meanGuardApplications: 'Guard/protect application events by team A per game. Reapplying guard counts; passive opening ward grants are excluded. This is not prevented-damage attribution.',
  meanEffectiveCleanses: 'Team A cleanse events whose target was poisoned immediately before the event, per game.',
  meanPoisonApplications: 'Poison application events by team A per game, including duration refreshes. Future poison damage is not attributed.',
  meanDispelApplications: 'Guard/rally/ward/dragon-charge/repair-readiness break events caused by team A per game. One event removing multiple statuses counts once. This does not measure damage prevented or the value of each removed status.',
  meanRepairEligible: 'Initially enabled material cores on team A per game; disabled and below-threshold cores excluded.',
  meanRepairTriggers: 'Authoritative once-only material repair passive events per game, never counted as casts.',
  meanRepairHealing: 'Actual HP restored by team A material repair per game, clipped to missing HP.',
  meanRepairReceived: 'Actual repair HP received by team A recipients per game.',
  meanRepairRecipients: 'Living material targets listed at the repair trigger per game, including full-HP zero-heal recipients.',
  meanRepairPotentialHealing: 'Sum of floor(maxHP * repair percent) for living recipients at actual triggers, before missing-HP clipping.',
  meanRepairUnusedHealing: 'Potential healing minus actual healing at triggers, due to insufficient missing HP. Does not value dead recipients.',
  meanRepairCancellations: 'Team A ready cores cancelled by an actual break or defeat before triggering per game; not double-counted after prior cancellation.',
  meanRepairFailedBeforeTrigger: 'Initially ready team A cores with no repair trigger in the match per game.',
  meanRepairDispelled: 'Enemy readiness cancelled by team A break events per game, measured before absolute false update.',
  meanRepairDefeatedBeforeTrigger: 'Team A ready cores defeated before trigger per game; already-dispelled cores are excluded.',
  meanRepairMpSpent: 'MP spent by the material repair passive itself; invariant zero, separate from paid cast MP.',
  meanRepairTriggerTurn: 'Mean turn conditional on a material repair trigger; null when none. Expected exactly turn 1.',
  meanDragonChargeGenerated: 'Actual +1 charge-gain events from team A paid dragon hit casts per game; capped attempts do not emit gains. This resource is separate from MP.',
  meanDragonChargeSpent: 'Sum of charge captured by team A finisher cast events per game, before reset. MP cost is recorded separately.',
  meanDragonFinishers: 'Team A executed charge-finisher casts per game, including zero-charge casts.',
  meanChargedDragonFinishers: 'Team A executed finisher casts that spent positive charge per game.',
  meanDragonFinisherDamage: 'HP-clipped direct damage from team A charge-finisher casts per game.',
  meanDragonChargeDispelled: 'Opponent charge removed by team A break events per game, counted immediately before reset.',
  meanDragonChargeLostOnDefeat: 'Team A charge remaining immediately before a defeat reset per game.',
  meanPeakDragonCharge: 'Mean highest charge observed on team A in a match, including event-time peaks.',
  meanPoisonDamageTaken: 'HP-clipped poison tick damage taken by team A per game, without caster attribution.',
  meanRemainingHpFraction: 'Mean of five team-A remaining HP/max-HP ratios at the end of a match, averaged across matches.',
  meanNoAffordableSpecialTurns: 'Sum of living unit-turns where a unit has positive-cost learned skills but cannot afford any. Does not imply the useful/desired skill was unavailable; basics remain legal.',
  meanZeroMpTurns: 'Sum of living unit-turns starting at exactly zero MP. Positive leftover MP below skill costs is counted separately above.',
  zeroCastDeathRate: 'Team A units that died before their first cast / (5 * games). Actions include basic, guard, attacks and support. This is not the fraction of dead units.',
  meanDamageConcentration: 'Mean largest single-unit share of team A direct damage. A dependency proxy only; ignores support contribution and replacement counterfactuals.',
  keyUnit: 'For optional scenario.keyUnitId on team A: first-turn deaths, zero-cast deaths and score conditional on survival/death. Survival association is not the causal value of that unit.',
};
export const LIMITATIONS = [
  'Undead full-off disables both poison consumption and addition, including stale bonus; bonus-off retains base14 and consumption. Core32 retains its production public-state AI under all ablations. Target/order/RNG divergence is allowed, so paired outcomes are not fixed-order causality. Slow Naga can reapply poison after cashout; preserve this adverse exploit candidate.',
  'Demon full-off sets base zero and removes bonus; bonus-only zero retains base6. Core29 retains identical all-target traversal under full-off. Player auto chooses at actual checkpoints; enemies choose once before the queue under the legacy public-state policy, with only exhausted guard-only progress correction; adaptive skill/target choices and random-stream divergence mean this is not a fixed-order causal estimate.',
  'These are current-engine CPU-policy measurements, not human enjoyment, DQMSL reproduction, PvP balance, or optimal-play proof.',
  'Slime supply AI acts only when current bounded gain can fund a currently unaffordable paid skill. It does not forecast later turns or optimize recipient timing; zero amount is never selected by this policy.',
  'Action-time automatic choices use current charge at each descending-priority checkpoint. They observe completed actions but do not forecast later allies, hidden opposing commands or future rolls; low finisher usage may be a policy limitation.',
  'Large-roster sampling uses exact legal suffix counts and a seeded coprime rank walk, not a proven uniform random sample. Fixed exclusions, correlated ranks, shuffled leader order and curated opponent rotation limit coverage.',
  'Both sides share combat rules and public information. Player automatic choices use current action-time support preferences. Enemy choices retain legacy pre-turn timing and seeded variation; only an exhausted learned-guard-only pool adds a free basic and removes unjustified guard. Explicit enemy AUTO and symmetric headless scorers are diagnostic controls, not the shipping Lab policy. Archived all-auto outcomes are not parity expectations.',
  'Paired seeds use common initial random streams, not identical per-action draws after skill/target choices diverge.',
  'reservePoison is retained in saved comparison configurations and the explicit-snapshot mechanic control; action-time actors do not reserve imagined allies or confirmed future actions.',
  'Mirrors diagnose physical side effects; team-A normalized mirror score after swaps is 0.5 by construction, so read physicalAllyScoreRate.',
  'Support, initiative, MP opportunity and damage concentration metrics are proxies. Poison ticks cannot be credited to an original caster in the current engine.',
  'All candidate patches apply roster-wide to both sides. No automatic changes are made to shipping balance.',
  'Sampled teams and curated scenarios cover a bounded slice, not the Cartesian product. Report coverage and test additional hypotheses before conclusions.',
  'A paired-seed 95% interval is an approximate normal interval over seed-level mean differences for this fixed scenario suite, not a population-wide balance guarantee.',
];
const rngStep = seed => (Math.imul(seed, 1664525) + 1013904223) >>> 0;
export const generateSeeds = (count, seed = 20261009) => {
  integer(count, 1, 1000, 'seed count'); integer(seed, 0, 0xffffffff, 'seed base');
  return Array.from({ length: count }, (_, i) => (Math.imul(i + 1, 2654435761) + seed) >>> 0);
};
export function makeDefaultConfig() {
  const teams = [
    { id: 'beast-core', role: '獣系3体・解除連撃・回復・低コスト支援', ids: [12, 0, 2, 6, 10] },
    { id: 'priority', role: '先制・高速度・毒', ids: [0, 6, 9, 11, 10] },
    { id: 'guard-heal', role: '守護・回復・持久', ids: [1, 2, 7, 10, 6] },
    { id: 'area', role: '全体攻撃・アンカー', ids: [5, 8, 0, 6, 10] },
    { id: 'poison', role: '毒・回復・浄化', ids: [4, 3, 7, 2, 10] },
    { id: 'replacement', role: '同コストのアヌビス置換・攻撃リーダー', ids: [11, 0, 2, 6, 10] },
  ];
  return { schemaVersion: 1, suiteId: 'arena-smoke', seeds: generateSeeds(8), costLimit: 17, teams,
    scenarios: teams.slice(1).flatMap(team => [
      { id: `beast-vs-${team.id}`, a: 'beast-core', b: team.id, complaintIds: [], keyUnitId: 12 },
      ...(team.id !== 'replacement' ? [{ id: `replacement-vs-${team.id}`, a: 'replacement', b: team.id, complaintIds: [], keyUnitId: 11 }] : []),
    ]),
    candidate: { id: 'identity', label: '変更なし・再現性の対照', overrides: {} }, complaints: [], sampling: { count: 4, seed: 20261009 },
  };
}
/** Small rosters retain the historical enumerate/shuffle stream exactly. Larger rosters
 * count legal suffixes with dynamic programming, then walk distinct legal ranks.
 * The latter is bounded by roster length and cost budget, never C(n,5) storage.
 * A seeded coprime stride is deterministic coverage, not a claim of uniform sampling. */
export function sampleLegalMemberSets({ roster, candidateRoster = roster, excluded = [], count, costLimit, seed }) {
  integer(count, 0, 100, 'sampling.count'); integer(seed, 0, 0xffffffff, 'sampling.seed');
  integer(costLimit, 1, 17, 'sampling.costLimit');
  const ids = roster.map(monster => monster.id);
  if (new Set(ids).size !== ids.length) fail('sampling: duplicate roster ID');
  const candidate = new Map(candidateRoster.map(monster => [monster.id, monster]));
  if (candidate.size !== candidateRoster.length || candidate.size !== ids.length || ids.some(id => !candidate.has(id))) fail('sampling: candidate roster IDs differ');
  for (const monster of [...roster, ...candidateRoster]) { integer(monster.id, 0, Number.MAX_SAFE_INTEGER, 'sampling.monster.id'); integer(monster.cost, 1, 17, 'sampling.monster.cost'); }
  const keyFor = members => [...members].sort((a, b) => a - b).join(',');
  const used = new Set();
  for (const members of excluded) {
    array(members, 5, 5, 'sampling.excluded');
    if (new Set(members).size !== 5 || members.some(id => !candidate.has(id))) fail('sampling.excluded: duplicate or unknown monster');
    used.add(keyFor(members));
  }
  const legal = members => members.reduce((sum, id) => sum + roster.find(monster => monster.id === id).cost, 0) <= costLimit
    && members.reduce((sum, id) => sum + candidate.get(id).cost, 0) <= costLimit;
  let randomSeed = seed;
  const draw = limit => { randomSeed = rngStep(randomSeed); return Math.floor(randomSeed / 0x100000000 * limit); };
  let members;
  let legalSets;
  let algorithm;
  // 19 current monsters require only 11,628 five-member combinations.
  if (ids.length <= 20) {
    algorithm = 'historical-enumerate-shuffle-v1';
    const combinations = [];
    const visit = (prefix, from) => {
      if (prefix.length === 5) { if (!used.has(keyFor(prefix)) && legal(prefix)) combinations.push(prefix); return; }
      for (let i = from; i <= ids.length - (5 - prefix.length); i++) visit([...prefix, ids[i]], i + 1);
    };
    visit([], 0); legalSets = combinations.length;
    if (count > legalSets) fail(`sampling: only ${legalSets} unused legal member sets exist, requested ${count}`);
    for (let i = combinations.length - 1; i > 0; i--) { const j = draw(i + 1); [combinations[i], combinations[j]] = [combinations[j], combinations[i]]; }
    members = combinations.slice(0, count);
  } else {
    algorithm = 'legal-suffix-dp-coprime-rank-walk-v1';
    const costs = roster.map(monster => [monster.cost, candidate.get(monster.id).cost]);
    const memo = new Map();
    const ways = (from, slots, a, b) => {
      if (!slots) return 1;
      if (ids.length - from < slots || a < slots || b < slots) return 0;
      const key = `${from}/${slots}/${a}/${b}`;
      if (memo.has(key)) return memo.get(key);
      const [ca, cb] = costs[from];
      const n = ways(from + 1, slots, a, b) + (ca <= a && cb <= b ? ways(from + 1, slots - 1, a - ca, b - cb) : 0);
      if (!Number.isSafeInteger(n)) fail('sampling: legal pool exceeds exact safe integer counting');
      memo.set(key, n); return n;
    };
    const total = ways(0, 5, costLimit, costLimit);
    legalSets = total - [...used].filter(key => legal(key.split(',').map(Number))).length;
    if (count > legalSets) fail(`sampling: only ${legalSets} unused legal member sets exist, requested ${count}`);
    const unrank = rank => {
      const result = []; let from = 0; let a = costLimit; let b = costLimit;
      while (result.length < 5) {
        const [ca, cb] = costs[from];
        const take = ca <= a && cb <= b ? ways(from + 1, 4 - result.length, a - ca, b - cb) : 0;
        if (rank < take) { result.push(ids[from]); a -= ca; b -= cb; } else rank -= take;
        from++;
      }
      return result;
    };
    members = [];
    if (count) {
      const gcd = (a, b) => { while (b) [a, b] = [b, a % b]; return a; };
      let rank = draw(total); let stride = 1 + draw(Math.max(1, total - 1));
      // Searching 1024 candidates is bounded; stride 1 is always a safe fallback.
      for (let attempts = 0; gcd(stride, total) !== 1; attempts++) stride = attempts >= 1023 ? 1 : stride % total + 1;
      // Distinct ranks mean at most count + excluded.size visits are necessary.
      for (let visits = 0; members.length < count && visits < count + used.size; visits++) {
        const set = unrank(rank); if (!used.has(keyFor(set))) members.push(set);
        rank = (rank + stride) % total;
      }
      if (members.length !== count) fail('sampling: rank traversal failed to deliver the requested legal sets');
    }
  }
  const shuffledMembers = members.map(set => {
    const shuffled = [...set];
    for (let j = shuffled.length - 1; j > 0; j--) { const k = draw(j + 1); [shuffled[j], shuffled[k]] = [shuffled[k], shuffled[j]]; }
    return shuffled;
  });
  return { members: shuffledMembers, algorithm, unusedLegalMemberSets: legalSets };
}
function sampleTeams(config) {
  const count = config.sampling?.count ?? 0;
  if (!count) return [];
  const sample = sampleLegalMemberSets({ roster: monsters, candidateRoster: patchedRoster(config.candidate.overrides), excluded: config.teams.map(team => team.ids), count, costLimit: config.costLimit, seed: config.sampling.seed });
  return sample.members.map((ids, i) => ({ id: `sample-${i + 1}`, role: `Seeded legal member-set sample (${sample.algorithm}); leader and slot order shuffled`, ids }));
}

export function buildSchedule(input) {
  const config = validateConfig(input);
  const sampled = sampleTeams(config);
  for (const team of sampled) createBattle(team.ids, team.ids, config.seeds[0], config.candidate.overrides);
  const teams = [...config.teams, ...sampled];
  const scenarios = [
    ...config.scenarios.map(scenario => ({ ...scenario, kind: 'matchup' })),
    ...sampled.map((team, i) => ({ id: team.id, a: team.id, b: config.teams[i % config.teams.length].id, kind: 'matchup', complaintIds: [] })),
    ...teams.map(team => ({ id: `mirror-${team.id}`, a: team.id, b: team.id, kind: 'mirror', complaintIds: [] })),
  ];
  const cases = [];
  for (const scenario of scenarios) for (const seed of config.seeds) for (const orientation of ['a-left', 'a-right']) for (const variant of ['baseline', 'candidate']) {
    const a = teams.find(team => team.id === scenario.a).ids;
    const b = teams.find(team => team.id === scenario.b).ids;
    cases.push({ id: `${scenario.id}__s${seed}__${orientation}__${variant}`, scenarioId: scenario.id, kind: scenario.kind, variant, orientation, seed, teamAId: scenario.a, teamBId: scenario.b,
      request: { teamA: orientation === 'a-left' ? a : b, teamB: orientation === 'a-left' ? b : a, seed, overrides: variant === 'candidate' ? config.candidate.overrides : {} }, keyUnitId: scenario.keyUnitId });
  }
  if (cases.length > MAX_MATCHES) fail(`schedule: exceeds ${MAX_MATCHES} matches`);
  return { config, teams, scenarios, cases };
}
const physicalScore = result => result.winner === 'win' ? 1 : result.winner === 'draw' ? 0.5 : 0;
const focalScore = match => match.orientation === 'a-left' ? physicalScore(match.result) : 1 - physicalScore(match.result);
const focalSide = match => match.orientation === 'a-left' ? 'allies' : 'enemies';
const mean = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
const round = value => value === null ? null : Math.round(value * 1e6) / 1e6;
const meanOf = values => round(mean(values));
export function summarize(matches, keyUnitId) {
  if (!matches.length) return { games: 0 };
  const metrics = matches.map(match => match.result.sides[focalSide(match)]);
  const wins = matches.filter(match => focalScore(match) === 1).length;
  const losses = matches.filter(match => focalScore(match) === 0).length;
  const draws = matches.length - wins - losses;
  const result = { games: matches.length, wins, losses, draws, winRate: round(wins / matches.length), scoreRate: round((wins + draws * 0.5) / matches.length), drawRate: round(draws / matches.length),
    meanTurns: meanOf(matches.map(match => match.result.turns)), turnLimitGames: matches.filter(match => match.result.turnLimit).length, adjudications: matches.filter(match => match.result.adjudicated).length, adjudicationRate: round(matches.filter(match => match.result.adjudicated).length / matches.length),
    physicalAllyScoreRate: meanOf(matches.map(match => physicalScore(match.result))),
    physicalAllyScoreBias: round(mean(matches.map(match => physicalScore(match.result))) - 0.5),
    firstCastSideScoreRate: meanOf(matches.filter(match => match.result.firstCastSide).map(match => match.result.firstCastSide === 'allies' ? physicalScore(match.result) : 1 - physicalScore(match.result))),
    zeroCastDeathRate: round(metrics.reduce((sum, metric) => sum + metric.zeroCastDeaths, 0) / (5 * matches.length)),
  };
  for (const [output, field] of Object.entries({ meanDirectDamage: 'directDamage', meanHealing: 'healing', meanMpSpent: 'mpSpent', meanPaidCasts: 'paidCasts', meanSpecialCasts: 'specialCasts', meanCasts: 'casts', meanGuardApplications: 'guardApplications', meanEffectiveCleanses: 'effectiveCleanses', meanPoisonApplications: 'poisonApplications', meanDispelApplications: 'dispelApplications', meanNoAffordableSpecialTurns: 'noAffordableSpecialTurns', meanZeroMpTurns: 'zeroMpTurns', meanDamageConcentration: 'damageConcentration', meanPoisonDamageTaken: 'poisonDamageTaken', meanRemainingHpFraction: 'remainingHpFraction', meanDragonChargeGenerated: 'dragonChargeGenerated', meanDragonChargeSpent: 'dragonChargeSpent', meanDragonFinishers: 'dragonFinishers', meanChargedDragonFinishers: 'chargedDragonFinishers', meanDragonFinisherDamage: 'dragonFinisherDamage', meanDragonChargeDispelled: 'dragonChargeDispelled', meanDragonChargeLostOnDefeat: 'dragonChargeLostOnDefeat', meanPeakDragonCharge: 'peakDragonCharge' })) result[output] = meanOf(metrics.map(metric => metric[field]));
  for (const field of ['repairEligible', 'repairTriggers', 'repairHealing', 'repairReceived', 'repairRecipients', 'repairPotentialHealing', 'repairUnusedHealing', 'repairCancellations', 'repairFailedBeforeTrigger', 'repairDispelled', 'repairDefeatedBeforeTrigger', 'repairMpSpent']) result[`mean${field[0].toUpperCase()}${field.slice(1)}`] = meanOf(metrics.map(metric => metric[field]));
  for (const field of [...SUPPLY_METRICS, ...PRESSURE_METRICS, ...CASHOUT_METRICS, ...RESPONSE_METRICS, ...POISON_METRICS]) result[`mean${field[0].toUpperCase()}${field.slice(1)}`] = meanOf(metrics.map(metric => metric[field]));
  const supplyCasts = metrics.reduce((sum, metric) => sum + metric.supplyCasts, 0);
  result.meanSupplyTurn = supplyCasts ? round(metrics.reduce((sum, metric) => sum + metric.supplyTurnSum, 0) / supplyCasts) : null;
  const repairTriggers = metrics.reduce((sum, metric) => sum + metric.repairTriggers, 0);
  result.meanRepairTriggerTurn = repairTriggers ? round(metrics.reduce((sum, metric) => sum + metric.repairTriggerTurnSum, 0) / repairTriggers) : null;
  if (keyUnitId !== undefined) {
    const rows = matches.map(match => ({ match, unit: match.result.units.find(unit => unit.monsterId === keyUnitId && unit.key.startsWith(focalSide(match) === 'allies' ? 'a' : 'e')) })).filter(row => row.unit);
    const surviving = rows.filter(row => row.unit.finalHp > 0);
    const dead = rows.filter(row => row.unit.finalHp === 0);
    result.keyUnit = { monsterId: keyUnitId, appearances: rows.length, survivals: surviving.length, deaths: dead.length, turnOneDeaths: rows.filter(row => row.unit.deathTurn === 1).length, zeroCastDeaths: rows.filter(row => row.unit.diedBeforeAnyCast).length, meanCasts: meanOf(rows.map(row => row.unit.casts)), meanMpSpent: meanOf(rows.map(row => row.unit.mpSpent)), scoreWhenSurvived: meanOf(surviving.map(row => focalScore(row.match))), scoreWhenDefeated: meanOf(dead.map(row => focalScore(row.match))) };
  }
  return result;
}
export function pairedDelta(matches) {
  const groups = new Map();
  for (const match of matches) {
    const id = `${match.scenarioId}|${match.seed}|${match.orientation}`;
    if (!groups.has(id)) groups.set(id, {});
    groups.get(id)[match.variant] = match;
  }
  const pairs = [...groups.values()];
  if (!pairs.length) return { pairs: 0 };
  if (pairs.some(pair => !pair.baseline || !pair.candidate)) fail('unpaired baseline/candidate schedule');
  const bySeed = new Map();
  for (const pair of pairs) {
    if (!bySeed.has(pair.baseline.seed)) bySeed.set(pair.baseline.seed, []);
    bySeed.get(pair.baseline.seed).push(focalScore(pair.candidate) - focalScore(pair.baseline));
  }
  const seedMeans = [...bySeed.values()].map(mean);
  const delta = mean(seedMeans);
  const se = seedMeans.length > 1 ? Math.sqrt(seedMeans.reduce((sum, value) => sum + (value - delta) ** 2, 0) / (seedMeans.length - 1) / seedMeans.length) : null;
  return { pairs: pairs.length, seedClusters: seedMeans.length, changedOutcomes: pairs.filter(pair => focalScore(pair.candidate) !== focalScore(pair.baseline)).length,
    scoreRateChange: round(delta), approximate95Interval: se === null ? null : [round(Math.max(-1, delta - 1.96 * se)), round(Math.min(1, delta + 1.96 * se))],
    meanTurnsChange: meanOf(pairs.map(pair => pair.candidate.result.turns - pair.baseline.result.turns)),
    meanDirectDamageChange: meanOf(pairs.map(pair => pair.candidate.result.sides[focalSide(pair.candidate)].directDamage - pair.baseline.result.sides[focalSide(pair.baseline)].directDamage)),
    meanHealingChange: meanOf(pairs.map(pair => pair.candidate.result.sides[focalSide(pair.candidate)].healing - pair.baseline.result.sides[focalSide(pair.baseline)].healing)),
    meanMpSpentChange: meanOf(pairs.map(pair => pair.candidate.result.sides[focalSide(pair.candidate)].mpSpent - pair.baseline.result.sides[focalSide(pair.baseline)].mpSpent)),
  };
}
export function runSuite(input, onProgress) {
  const schedule = buildSchedule(input);
  const matches = [];
  const rosterBefore = JSON.stringify(monsters);
  for (const item of schedule.cases) {
    try {
      const result = runMatch(item.request);
      const { request, keyUnitId, ...metadata } = item;
      matches.push({ ...metadata, result });
      onProgress?.({ completed: matches.length, total: schedule.cases.length, id: item.id });
    } catch (error) { error.matchId = item.id; throw error; }
  }
  if (JSON.stringify(monsters) !== rosterBefore) fail('lab mutated production roster');
  const summarizePair = (rows, keyUnitId) => ({ baseline: summarize(rows.filter(row => row.variant === 'baseline'), keyUnitId), candidate: summarize(rows.filter(row => row.variant === 'candidate'), keyUnitId), pairedDelta: pairedDelta(rows) });
  return { schemaVersion: SCHEMA_VERSION, config: schedule.config, methodology: { sampling: { smallRosterThreshold: 20, algorithm: monsters.length <= 20 ? 'historical-enumerate-shuffle-v1' : 'legal-suffix-dp-coprime-rank-walk-v1', uniformityClaim: false }, policy: POLICY_ID, policyArms: { baseline: 'shipping-action-time', candidate: 'shipping-action-time' }, candidateScope: 'roster-wide-on-both-sides', samePolicyBothSides: false, sameRulesAndPublicInformation: true, allyPolicy: 'live-support', enemyPolicy: 'legacy-pre-turn-exhausted-guardfix', sideSwaps: true, pairedSeeds: true, mirrorsIncluded: true, maxTurns: MAX_TURNS, metricDefinitions: METRIC_DEFINITIONS, limitations: LIMITATIONS },
    scheduleCounts: { teams: schedule.teams.length, curatedTeams: schedule.config.teams.length, sampledTeams: schedule.teams.length - schedule.config.teams.length, matchupScenarios: schedule.scenarios.filter(scenario => scenario.kind === 'matchup').length, mirrorScenarios: schedule.teams.length, seeds: schedule.config.seeds.length, variants: 2, orientations: 2, matches: matches.length },
    teams: schedule.teams,
    summary: summarizePair(matches.filter(match => match.kind === 'matchup')),
    mirrorControls: summarizePair(matches.filter(match => match.kind === 'mirror')),
    scenarios: schedule.scenarios.map(scenario => ({ ...scenario, ...summarizePair(matches.filter(match => match.scenarioId === scenario.id), scenario.keyUnitId) })), matches,
  };
}
export function replayMatch(report, matchId) {
  const expected = report.matches.find(match => match.id === matchId);
  if (!expected) fail(`Unknown match ID: ${matchId}`);
  const item = buildSchedule(report.config).cases.find(match => match.id === matchId);
  if (!item) fail('Replay match is absent from embedded configuration');
  const result = runMatch({ ...item.request, trace: true });
  if (result.traceHash !== expected.result.traceHash) fail('Replay trace hash differs from recorded match');
  return { schemaVersion: SCHEMA_VERSION, matchId, verified: true, request: item.request, result };
}
