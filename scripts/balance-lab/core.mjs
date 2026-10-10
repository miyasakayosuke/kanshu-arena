/** Development-only lab. All turns resolve through the shipping combat engine. */
import { createHash } from 'node:crypto';
import {
  advanceWithEvents, autoOrders, battleSkill, leaderAppliesTo, leaderFor,
  DRAGON_CHARGE_CAP, DRAGON_CORE_ID, dragonChargeEligible,
  MAX_SPECIAL_SKILLS, MAX_TURNS, monsters, NATURE_WARD_PERCENT, OPENING_RALLY_TURNS, OPENING_WARD_TURNS, RALLY_PERCENT, start,
} from '../../src/engine.ts';
import { FAMILY_IDS } from '../../src/families.ts';

export const SCHEMA_VERSION = 1;
export const POLICY_ID = 'production-autoOrders-both-sides-v1';
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
  keys(skill, ['name', 'power', 'priority', 'mpCost', 'kind', 'all', 'breaksGuard', 'randomHits', 'breaksGuardAfterHit', 'familyBonusHit', 'fixedDamage', 'dragonChargeFinisher'], path);
  text(skill.name, `${path}.name`);
  if (['通常攻撃', 'ぼうぎょ'].includes(skill.name)) fail(`${path}.name: reserved universal-command name`);
  number(skill.power, 0, 10000, `${path}.power`);
  integer(skill.priority, -10, 10, `${path}.priority`);
  integer(skill.mpCost, 0, 10000, `${path}.mpCost`);
  if (!['hit', 'heal', 'guard', 'poison', 'protect', 'cleanse'].includes(skill.kind)) fail(`${path}.kind: unsupported effect`);
  for (const field of ['all', 'breaksGuard', 'breaksGuardAfterHit', 'fixedDamage', 'dragonChargeFinisher']) if (own(skill, field)) boolean(skill[field], `${path}.${field}`);
  if (own(skill, 'randomHits')) integer(skill.randomHits, 1, 20, `${path}.randomHits`);
  if (skill.randomHits && (skill.kind !== 'hit' || skill.all)) fail(`${path}: randomHits requires single/random hit kind, not all`);
  if (own(skill, 'familyBonusHit') && (!FAMILIES.includes(skill.familyBonusHit) || skill.kind !== 'hit' || !skill.randomHits)) fail(`${path}.familyBonusHit: requires a known family and random hit kind`);
  if ((skill.breaksGuard || skill.breaksGuardAfterHit) && skill.kind !== 'hit') fail(`${path}: guard breaking requires hit kind`);
  if (skill.fixedDamage && skill.kind !== 'hit') fail(`${path}.fixedDamage: requires hit kind`);
  if (skill.dragonChargeFinisher && (skill.kind !== 'hit' || !skill.fixedDamage || !skill.all || skill.randomHits || skill.mpCost <= 0 || skill.priority >= 0)) fail(`${path}.dragonChargeFinisher: requires paid, fixed-damage, all-target anchor hit`);
  if (skill.all && !['hit', 'poison'].includes(skill.kind)) fail(`${path}: ally-wide support is not implemented`);
};
const validateLeader = (trait, path) => {
  keys(trait, ['name', 'stat', 'percent', 'description', 'family', 'secondary'], path);
  text(trait.name, `${path}.name`); text(trait.description, `${path}.description`);
  if (!['hp', 'atk', 'speed'].includes(trait.stat)) fail(`${path}.stat: unsupported leader stat`);
  number(trait.percent, -90, 300, `${path}.percent`);
  if (own(trait, 'family') && !FAMILIES.includes(trait.family)) fail(`${path}.family: unsupported family`);
  if (own(trait, 'secondary')) {
    keys(trait.secondary, ['stat', 'percent'], `${path}.secondary`);
    if (!['atk', 'speed'].includes(trait.secondary.stat) || trait.secondary.stat === trait.stat) fail(`${path}.secondary.stat: must be a different atk/speed stat`);
    number(trait.secondary.percent, -90, 300, `${path}.secondary.percent`);
  }
};
export function validateOverrides(overrides = {}) {
  keys(overrides, ['monsters', 'leaders', 'openingRally', 'openingWard', 'dragonCharge'], 'overrides');
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
  return overrides;
}
const patchedRoster = overrides => monsters.map(monster => {
  const result = { ...clone(monster), ...clone(overrides.monsters?.[monster.id] ?? {}) };
  if (result.family === null) delete result.family;
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
  const state = clone(start(teamA, teamB, seed, { leaders: true }));
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
        ...(hasCharge && id === DRAGON_CORE_ID ? { dragonCharge: 0, ...(charge.perPoint !== undefined ? { dragonChargePerPoint: charge.perPoint } : {}) } : {}) };
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
const freshMetric = unit => ({
  key: unit.key, monsterId: unit.monster.id, casts: 0, specialCasts: 0, paidCasts: 0, directDamage: 0, healing: 0,
  guardApplications: 0, effectiveCleanses: 0, poisonApplications: 0, dispelApplications: 0, mpSpent: 0,
  aliveAtTurnStartTurns: 0, noAffordableSpecialTurns: 0, zeroMpTurns: 0, deathTurn: null, diedBeforeAnyCast: false,
  dragonChargeGenerated: 0, dragonChargeSpent: 0, dragonFinishers: 0, chargedDragonFinishers: 0, dragonFinisherDamage: 0, dragonChargeDispelled: 0, dragonChargeLostOnDefeat: 0, peakDragonCharge: unit.dragonCharge ?? 0,
  finalHp: unit.hp, finalMp: unit.mp,
});

export function runMatch({ teamA, teamB, seed, overrides = {}, trace: includeTrace = false }) {
  const request = { teamA: clone(teamA), teamB: clone(teamB), seed, overrides: clone(overrides) };
  let state = createBattle(teamA, teamB, seed, overrides);
  const trace = { initialState: clone(state), turns: [] };
  const metrics = new Map([...state.allies, ...state.enemies].map(unit => [unit.key, freshMetric(unit)]));
  const initialUnits = new Map([...state.allies, ...state.enemies].map(unit => [unit.key, clone(unit)]));
  let firstCastSide = null;
  const poisonDamageTaken = { allies: 0, enemies: 0 };
  try {
    while (!state.winner && state.turn <= MAX_TURNS) {
      for (const unit of [...state.allies, ...state.enemies]) if (unit.hp > 0) {
        const metric = metrics.get(unit.key); metric.aliveAtTurnStartTurns++;
        if (unit.mp === 0) metric.zeroMpTurns++;
        const paidSkills = unit.monster.skills.filter(skill => skill.mpCost > 0);
        if (paidSkills.length && paidSkills.every(skill => skill.mpCost > unit.mp)) metric.noAffordableSpecialTurns++;
      }
      const orders = autoOrders(state, 'allies');
      const enemyOrders = autoOrders(state, 'enemies');
      const before = clone(state);
      trace.activeAttempt = { turn: state.turn, seedBefore: state.seed, orders: clone(orders), enemyOrders: clone(enemyOrders), unitsBefore: unitSnapshot(state) };
      const resolved = advanceWithEvents(state, orders, { enemyOrders });
      const record = resolved.state.history.at(-1);
      trace.turns.push({ turn: state.turn, seedBefore: state.seed, seedAfter: resolved.state.seed, orders: clone(record.orders), events: clone(resolved.events), unitsAfter: unitSnapshot(resolved.state) });
      if (JSON.stringify(state) !== JSON.stringify(before)) fail('resolver mutated input state');
      if (record.orders.some(order => !order.accepted)) fail('same-policy AI selected an invalid order');
      for (const unit of [...resolved.state.allies, ...resolved.state.enemies]) {
        if (![unit.hp, unit.mp, unit.poison].every(Number.isFinite) || unit.hp < 0 || unit.hp > unit.monster.hp || unit.mp < 0 || unit.mp > unit.monster.mp || unit.poison < 0 || !supportResourcesValid(unit) || !dragonResourcesValid(unit, initialUnits.get(unit.key))) fail(`resource invariant failed for ${unit.key}`);
      }
      const current = new Map([...state.allies, ...state.enemies].map(unit => [unit.key, clone(unit)]));
      const lastCast = new Map();
      for (const event of resolved.events) {
        const actor = metrics.get(event.actor);
        const target = metrics.get(event.target);
        if (event.kind === 'cast' && actor) {
          if (firstCastSide === null) firstCastSide = event.actor.startsWith('a') ? 'allies' : 'enemies';
          actor.casts++;
          lastCast.set(event.actor, event);
          if (event.dragonChargeSpent !== undefined) {
            integer(event.dragonChargeSpent, 0, DRAGON_CHARGE_CAP, 'cast.dragonChargeSpent');
            actor.dragonFinishers++; actor.dragonChargeSpent += event.dragonChargeSpent;
            if (event.dragonChargeSpent > 0) actor.chargedDragonFinishers++;
          }
          const order = record.orders.find(order => order.key === event.actor);
          const unit = current.get(event.actor);
          if (order.skill >= 0) actor.specialCasts++;
          if (battleSkill(unit.monster, order.skill).mpCost > 0) actor.paidCasts++;
        }
        if (event.kind === 'damage') {
          if (actor) {
            actor.directDamage += event.amount ?? 0;
            if (lastCast.get(event.actor)?.dragonChargeSpent !== undefined) actor.dragonFinisherDamage += event.amount ?? 0;
          }
          else if (event.effect === 'poison') poisonDamageTaken[event.target.startsWith('a') ? 'allies' : 'enemies'] += event.amount ?? 0;
        }
        if (event.kind === 'heal' && actor) actor.healing += event.amount ?? 0;
        if (event.kind === 'resource' && actor) actor.mpSpent += event.amount ?? 0;
        if (event.kind === 'guard' && actor) actor.guardApplications++;
        if (event.kind === 'cleanse' && actor && current.get(event.target)?.poison > 0) actor.effectiveCleanses++;
        if (event.kind === 'poison' && actor) actor.poisonApplications++;
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
        if (event.kind === 'defeat' && target) { target.deathTurn = state.turn; target.diedBeforeAnyCast = target.casts === 0; }
        if (event.target && current.has(event.target)) {
          const affected = current.get(event.target);
          for (const field of ['hp', 'mp', 'poison', 'guard', 'rally', 'ward', 'dragonCharge']) if (event[field] !== undefined) affected[field] = event[field];
        }
      }
      for (const unit of [...resolved.state.allies, ...resolved.state.enemies]) if (current.get(unit.key).dragonCharge !== unit.dragonCharge) fail(`charge event/state mismatch for ${unit.key}`);
      state = resolved.state;
      delete trace.activeAttempt;
    }
    if (!state.winner) fail(`no terminal result within ${MAX_TURNS} turns`);
  } catch (error) { throw new MatchFailure(error.message, request, { ...trace, lastState: clone(state) }); }
  const units = [...state.allies, ...state.enemies].map(unit => ({ ...metrics.get(unit.key), finalHp: unit.hp, finalMp: unit.mp }));
  const sides = {};
  for (const side of ['allies', 'enemies']) {
    const group = units.filter(unit => unit.key.startsWith(side === 'allies' ? 'a' : 'e'));
    const total = field => group.reduce((sum, unit) => sum + unit[field], 0);
    const damage = total('directDamage');
    sides[side] = {
      dragonChargeGenerated: total('dragonChargeGenerated'), dragonChargeSpent: total('dragonChargeSpent'), dragonFinishers: total('dragonFinishers'), chargedDragonFinishers: total('chargedDragonFinishers'), dragonFinisherDamage: total('dragonFinisherDamage'), dragonChargeDispelled: total('dragonChargeDispelled'), dragonChargeLostOnDefeat: total('dragonChargeLostOnDefeat'), peakDragonCharge: Math.max(...group.map(unit => unit.peakDragonCharge)),
      directDamage: damage, healing: total('healing'), mpSpent: total('mpSpent'), paidCasts: total('paidCasts'), specialCasts: total('specialCasts'), casts: total('casts'),
      guardApplications: total('guardApplications'), effectiveCleanses: total('effectiveCleanses'), poisonApplications: total('poisonApplications'), dispelApplications: total('dispelApplications'),
      noAffordableSpecialTurns: total('noAffordableSpecialTurns'), zeroMpTurns: total('zeroMpTurns'), aliveAtTurnStartTurns: total('aliveAtTurnStartTurns'),
      zeroCastDeaths: group.filter(unit => unit.diedBeforeAnyCast).length, deaths: group.filter(unit => unit.deathTurn !== null).length,
      damageConcentration: damage ? Math.max(...group.map(unit => unit.directDamage)) / damage : 0,
      poisonDamageTaken: poisonDamageTaken[side], remainingHpFraction: state[side].reduce((sum, unit) => sum + unit.hp / unit.monster.hp, 0) / 5,
    };
  }
  trace.finalState = clone(state);
  const result = { winner: state.winner, turns: state.turn - 1, turnLimit: state.turn - 1 === MAX_TURNS, firstCastSide, units, sides, traceHash: hash(trace) };
  if (includeTrace) result.trace = trace;
  return result;
}

export const METRIC_DEFINITIONS = {
  winRate: 'Team A wins / games. Draws are not wins. Swapped physical sides retain team A identity.',
  scoreRate: '(Team A wins + 0.5 * draws) / games.',
  drawRate: 'Draws / games, including tied HP-fraction adjudication at the turn cap.',
  meanTurns: 'Mean completed turns; the production 20-turn cap and HP-fraction adjudication are unchanged.',
  physicalAllyScoreRate: 'Physical allies-side (a keys) wins plus half draws / games. Its difference from 0.5 is a side-assignment diagnostic, not proof of first-move bias.',
  firstCastSideScoreRate: 'Score of the side making the first actual cast. Descriptive initiative association; not causal and not corrected for team speed or skill choice.',
  meanDirectDamage: 'HP-clipped direct damage caused by team A events per game. Overkill excluded; poison ticks lack actor attribution and are reported as poisonDamageTaken instead.',
  meanHealing: 'Actual HP restored by team A per game; overhealing excluded.',
  meanMpSpent: 'MP resource events spent by team A per game. No MP is spent merely choosing an order.',
  meanPaidCasts: 'Number of actually executed positive-MP-cost casts by team A per game.',
  meanSpecialCasts: 'Executed learned-skill casts by team A per game, including any zero-cost learned guard; universal basic/defend commands excluded.',
  meanCasts: 'All actually executed casts by team A per game, including basic and guard.',
  meanGuardApplications: 'Guard/protect application events by team A per game. Reapplying guard counts; passive opening ward grants are excluded. This is not prevented-damage attribution.',
  meanEffectiveCleanses: 'Team A cleanse events whose target was poisoned immediately before the event, per game.',
  meanPoisonApplications: 'Poison application events by team A per game, including duration refreshes. Future poison damage is not attributed.',
  meanDispelApplications: 'Guard/rally/ward/dragon-charge break events caused by team A per game. One event removing multiple statuses counts once. This does not measure damage prevented or the value of each removed status.',
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
  'These are current-engine CPU-policy measurements, not human enjoyment, DQMSL reproduction, PvP balance, or optimal-play proof.',
  'autoOrders scores dragon finishers using current charge only. It does not predict charge from allies already ordered to act later in the same turn; low finisher usage may be a policy limitation.',
  'Large-roster sampling uses exact legal suffix counts and a seeded coprime rank walk, not a proven uniform random sample. Fixed exclusions, correlated ranks, shuffled leader order and curated opponent rotation limit coverage.',
  'Identical autoOrders policy is used on both sides. Shipping CPU variation remains unchanged outside the lab.',
  'Paired seeds use common initial random streams, not identical per-action draws after skill/target choices diverge.',
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
    meanTurns: meanOf(matches.map(match => match.result.turns)), turnLimitGames: matches.filter(match => match.result.turnLimit).length,
    physicalAllyScoreRate: meanOf(matches.map(match => physicalScore(match.result))),
    physicalAllyScoreBias: round(mean(matches.map(match => physicalScore(match.result))) - 0.5),
    firstCastSideScoreRate: meanOf(matches.filter(match => match.result.firstCastSide).map(match => match.result.firstCastSide === 'allies' ? physicalScore(match.result) : 1 - physicalScore(match.result))),
    zeroCastDeathRate: round(metrics.reduce((sum, metric) => sum + metric.zeroCastDeaths, 0) / (5 * matches.length)),
  };
  for (const [output, field] of Object.entries({ meanDirectDamage: 'directDamage', meanHealing: 'healing', meanMpSpent: 'mpSpent', meanPaidCasts: 'paidCasts', meanSpecialCasts: 'specialCasts', meanCasts: 'casts', meanGuardApplications: 'guardApplications', meanEffectiveCleanses: 'effectiveCleanses', meanPoisonApplications: 'poisonApplications', meanDispelApplications: 'dispelApplications', meanNoAffordableSpecialTurns: 'noAffordableSpecialTurns', meanZeroMpTurns: 'zeroMpTurns', meanDamageConcentration: 'damageConcentration', meanPoisonDamageTaken: 'poisonDamageTaken', meanRemainingHpFraction: 'remainingHpFraction', meanDragonChargeGenerated: 'dragonChargeGenerated', meanDragonChargeSpent: 'dragonChargeSpent', meanDragonFinishers: 'dragonFinishers', meanChargedDragonFinishers: 'chargedDragonFinishers', meanDragonFinisherDamage: 'dragonFinisherDamage', meanDragonChargeDispelled: 'dragonChargeDispelled', meanDragonChargeLostOnDefeat: 'dragonChargeLostOnDefeat', meanPeakDragonCharge: 'peakDragonCharge' })) result[output] = meanOf(metrics.map(metric => metric[field]));
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
  return { schemaVersion: SCHEMA_VERSION, config: schedule.config, methodology: { sampling: { smallRosterThreshold: 20, algorithm: monsters.length <= 20 ? 'historical-enumerate-shuffle-v1' : 'legal-suffix-dp-coprime-rank-walk-v1', uniformityClaim: false }, policy: POLICY_ID, candidateScope: 'roster-wide-on-both-sides', samePolicyBothSides: true, sideSwaps: true, pairedSeeds: true, mirrorsIncluded: true, maxTurns: MAX_TURNS, metricDefinitions: METRIC_DEFINITIONS, limitations: LIMITATIONS },
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
