#!/usr/bin/env node
/** Bounded frozen undead study. Creates inputs only; never runs a battle or redraws a frozen cohort. */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { monsters, UNDEAD_CASHOUT } from '../../src/engine.ts';
import { generateSeeds, validateConfig, validateOverrides } from './core.mjs';

const sha = value => createHash('sha256').update(value).digest('hex');
const load = path => JSON.parse(readFileSync(path));
const manifestPath = 'docs/undead-balance-freeze.json';
if (existsSync(manifestPath)) throw Error('Undead study already frozen; do not redraw');
const expectedSource = {
  engineSha256: '3522c3dddad392e8947ec85821e039dabf6ce1369778017545e7661d1b8bc84d',
  familySha256: '21b008f6c573d132ac7c9cba2bb9c71522156767b3c37ecc4d5745ea063b2c84',
};
const assertSource = () => {
  if (sha(readFileSync('src/engine.ts')) !== expectedSource.engineSha256) throw Error('Engine changed before freeze');
  if (sha(readFileSync('src/families.ts')) !== expectedSource.familySha256) throw Error('Families changed before freeze');
};
assertSource();
if (UNDEAD_CASHOUT.base !== 14 || UNDEAD_CASHOUT.bonus !== 8) throw Error('Stock cashout values changed');
const team = (id, ids, role) => ({ id, ids, role });
const cost = ids => ids.reduce((total, id) => total + monsters[id].cost, 0);
const priorPaths = ['configs/balance-lab/slime-final-identity.json', 'configs/balance-lab/demon-initial.json'];
const previous = priorPaths.flatMap(path => load(path).teams);
const prior = id => {
  const row = previous.find(t => t.id === id);
  if (!row) throw Error(`Missing frozen anchor ${id}`);
  return structuredClone(row);
};
const exactAnchors = ['fullbeast', 'puredragon', 'purematerial', 'pureslime', 'puredemon', 'nature-brute-dryas', 'nature-brute-tengu', 'strong-poison', 'strong-area', 'material-strong'].map(prior);
const lowerAnchors = ['fullnature', 'guard-heal', 'poison-cleanse', 'priority', 'mp-pressure'].map(prior);
const anchors = [...exactAnchors, ...lowerAnchors];
if (exactAnchors.some(t => cost(t.ids) !== 17) || lowerAnchors.some(t => cost(t.ids) >= 17)) throw Error('Anchor budget partition changed');
if (prior('fullnature').ids.join(',') !== '14,3,6,9,10') throw Error('Original triple-poison/slow-Naga nature anchor changed');
const targets = [
  team('pureundead', [32,4,33,34,35], 'Initial pure five undead; exact C17; Banshee supplies poison'),
  team('mixedundead', [32,4,35,3,10], 'Initial C15 eligible mixed undead; original triple-poison Banshee/Dryas/slow-Naga adversarial shell retained'),
];
const c17Poison = team('c17-poison-undead', [32,4,33,3,10], 'Exact C17 eligible undead with three poison owners and slow Naga; Dullahan33 replaces healer35');

// Full legal member-set enumeration, then a frozen seed shuffle and distinct ownership-stratum selections.
// These are coherent controls, not an optimized or uniformly sampled metagame.
let rng = 242610310;
const draw = () => { rng = (Math.imul(rng,1664525)+1013904223) >>> 0; return rng / 4294967296; };
const features = ids => {
  const units = ids.map(id => monsters[id]);
  return {
    support: units.filter(m => m.skills.some(s => s.kind === 'heal' || s.kind === 'cleanse')).length,
    poison: units.filter(m => m.skills.some(s => s.kind === 'poison')).length,
    breaker: units.filter(m => m.skills.some(s => s.breaksGuard || s.breaksGuardAfterHit)).length,
  };
};
const strata = [['support', f => f.support >= 2], ['poison', f => f.poison >= 1], ['breaker', f => f.breaker >= 1]];
const coherent = [], pools = [];
for (const [family, core] of [['beast',12], ['nature',14], ['dragon',15], ['material',19], ['slime',24], ['demon',29]]) {
  const rest = monsters.filter(m => m.id <= 31 && m.id !== core), pool = [];
  const visit = (ids, from) => {
    if (ids.length === 4) {
      const all = [core, ...ids];
      if (cost(all) === 17 && all.filter(id => monsters[id].family === family).length >= 3) pool.push({ ids: all, features: features(all) });
      return;
    }
    for (let i = from; i <= rest.length - (4 - ids.length); i++) visit([...ids, rest[i].id], i+1);
  };
  visit([], 0);
  const fullPoolHash = sha(JSON.stringify(pool));
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(draw()*(i+1)); [pool[i],pool[j]] = [pool[j],pool[i]]; }
  const signature = ids => [...ids].sort((a,b) => a-b).join(',');
  const used = new Set(anchors.map(t => signature(t.ids)));
  for (const [label, predicate] of strata) {
    const row = pool.find(r => !used.has(signature(r.ids)) && predicate(r.features));
    if (!row) throw Error(`Empty distinct ${family}/${label} pool`);
    used.add(signature(row.ids));
    coherent.push(team(`coherent-${family}-${label}`, row.ids, `Exact C17 old roster IDs <=31; core-led >=3 ${family}; frozen ${label} skill-ownership stratum, actual execution must be measured`));
  }
  pools.push({ family, core, legalSets: pool.length, sha256: fullPoolHash });
}
const broadOpponents = [...exactAnchors, ...coherent];
const substitutions = [
  structuredClone(targets[0]), structuredClone(c17Poison),
  team('core-nonleader', [4,32,33,34,35], 'Exact same pure members, Banshee leader; fixed opening cashout eligibility retained; leader effect changes'),
  team('bonus-threshold-lost', [32,4,7,3,10], 'Exact C17 poison control: Selkie7 replaces Dullahan33, leaving two undead; original triple poison and slow Naga retained; member kit confounded'),
  team('core-replaced-slime', [28,4,33,34,35], 'Exact C17 pure core32 replaced by old slime brute28; no cashout; stats, skills and leader confounded'),
  team('core-replaced-demon', [29,4,33,34,35], 'Exact C17 pure core32 replaced by old demon core29 with base-only MP pressure; no cashout; stats, skills and leader confounded'),
  team('healer-replaced', [32,4,33,34,20], 'Exact C17 pure healer35 replaced by old cleanser20; four undead keep cashout bonus; unit-kit comparison'),
  team('breaker-replaced', [32,4,7,34,35], 'Exact C17 pure breaker33 replaced by old healer/cleanser7; four undead keep cashout bonus; unit-kit comparison'),
];
const contributions = [
  team('control-nature-dryas', [14,3,6,10,28], 'Exact old nature+brute Dryas control for new core32 and healer35 substitutions'),
  team('nature-newcore-dryas', [14,3,6,10,32], 'Exact C17 known nature+brute shell replaces28 with32; one undead, base-only cashout, retained poison and slow Naga'),
  team('control-nature-tengu', [14,6,9,10,28], 'Exact old nature+brute Tengu control for new core32 substitution'),
  team('nature-newcore-tengu', [14,6,9,10,32], 'Exact C17 second known nature+brute shell replaces28 with32; one undead, base-only cashout'),
  team('nature-newhealer', [14,3,35,10,28], 'Exact C17 Dryas nature+brute shell replaces fast Garuda6 with cheap healer35; three nature retain ward'),
  team('control-material-strong', [19,20,23,7,10], 'Exact old strong material mixed control for new breaker33 substitution'),
  team('material-newbreaker', [19,20,23,33,10], 'Exact C17 strong material shell replaces Selkie7 with undead breaker33; loses a heal/cleanse kit'),
  team('control-material-pure', [19,20,21,22,23], 'Exact old pure material control for new shield34 and healer35 substitutions'),
  team('material-newshield', [19,20,34,22,23], 'Exact C17 pure material shell replaces shield21 with undead34; four material retain repair'),
  team('material-newhealer', [19,35,21,22,23], 'Exact C17 pure material shell replaces cleaner20 with healer35; four material retain repair'),
];
const lowerTargets = [
  structuredClone(targets[1]),
  team('c15-threshold-lost', [32,4,20,3,10], 'Exact C15 initial mixed control replaces35 with20; two undead lose bonus; triple poison/slow Naga retained'),
  team('c15-core-replaced', [28,4,35,3,10], 'Exact C15 initial mixed control replaces32 with old core28; triple poison/slow Naga retained; unit/leader effects confounded'),
];
if ([...coherent, ...substitutions, ...contributions].some(t => cost(t.ids) !== 17)) throw Error('A purported exact C17 cohort changed budget');
if (lowerTargets.some(t => cost(t.ids) !== 15)) throw Error('Lower-budget targets must remain C15');

// Lab support may be landing concurrently. Never alter stored input to pass validation.
// If the sole new override is not yet recognized, validate the identical base config and the field locally.
let cashoutOverrideSupported = true;
try { validateOverrides({ undeadCashout: { enabled: true, base: 14, bonus: 8 } }); }
catch (error) {
  if (!String(error.message).includes('overrides.undeadCashout: unknown field')) throw error;
  cashoutOverrideSupported = false;
}
const configs = [];
const save = (id, focals, opponents, overrides = {}, n = 8, seed = 232610310) => {
  const config = {
    schemaVersion: 1, suiteId: `undead-${id}`, seeds: generateSeeds(n,seed), costLimit: 17,
    teams: [...focals, ...opponents],
    scenarios: focals.flatMap((t,i) => opponents.map((o,j) => ({ id: `f${i+1}-o${j+1}`, a: t.id, b: o.id, keyUnitId: t.ids.includes(32) ? 32 : t.ids[0] }))),
    candidate: { id, label: `Frozen bounded undead ${id}; production autoOrders on both sides`, overrides },
    complaints: [], sampling: { count: 0, seed },
  };
  const validationConfig = structuredClone(config);
  if (!cashoutOverrideSupported && validationConfig.candidate.overrides.undeadCashout) {
    const cashout = validationConfig.candidate.overrides.undeadCashout;
    if (typeof cashout.enabled !== 'boolean' || ![cashout.base,cashout.bonus].every(v => Number.isInteger(v) && v >= 0 && v <= 30)) throw Error('Invalid locally validated cashout override');
    delete validationConfig.candidate.overrides.undeadCashout;
  }
  validateConfig(validationConfig); // This initializes state but never resolves turns or reads outcomes.
  const path = `configs/balance-lab/${config.suiteId}.json`;
  if (existsSync(path)) throw Error(`Already exists: ${path}`);
  const raw = JSON.stringify(config,null,2)+'\n';
  configs.push({ path, raw, config, focalIds: focals.map(t => t.id), opponentIds: opponents.map(t => t.id) });
};
save('initial', targets, anchors, {}, 16);
for (const [id, cashout] of [
  ['enabled', { enabled: true, base: 14, bonus: 8 }],
  ['bonus-off', { enabled: true, base: 14, bonus: 0 }],
  ['full-off', { enabled: false, base: 14, bonus: 8 }],
]) save(id, targets, anchors, { undeadCashout: cashout });
save('broad', [targets[0],c17Poison], broadOpponents, {}, 8,252610310);
save('substitutions', substitutions, broadOpponents, {}, 6,252610310);
save('oldcore-contribution', contributions, broadOpponents, {}, 6,252610310);
save('lower-budget', lowerTargets, lowerAnchors, {}, 8,252610310);
const configRecords = configs.map(({path,raw,config,focalIds,opponentIds}) => ({
  path, fileSha256: sha(raw), canonicalSha256: sha(JSON.stringify(config)),
  matches: (config.scenarios.length + config.teams.length) * config.seeds.length * 4,
  matchupScenarios: config.scenarios.length, mirrorScenarios: config.teams.length,
  seedCount: config.seeds.length, focalIds, opponentIds,
  teams: config.teams.map(t => ({id:t.id,cost:cost(t.ids)})), candidate: config.candidate,
}));
const totalMatches = configRecords.reduce((n,c) => n+c.matches,0);
if (totalMatches !== 24880 || totalMatches < 15000 || totalMatches > 25000) throw Error(`Unexpected bounded study budget ${totalMatches}`);
assertSource();
const freeze = {
  schemaVersion: 1, status: 'frozen-before-own-outcomes', authoritativeDate: '2026-10-10 UTC',
  executorRecordedAt: new Date().toISOString(), timestampCaution: 'Executor clock approximately 9h ahead of authoritative UTC; source/config hashes and file order establish freeze-before-run.',
  source: {
    ...expectedSource,
    labSha256: sha(['scripts/balance-lab/core.mjs','scripts/balance-lab/cli.mjs'].map(p => readFileSync(p,'utf8')).join('\n')),
    generatorSha256: sha(readFileSync('scripts/balance-lab/freeze-undead-configs.mjs')),
    priorInputs: priorPaths.map(path => ({path,fileSha256:sha(readFileSync(path))})),
  },
  priorUndeadOutcomesSeen: 'Study members and seeds were selected before this probe was reported: parent saw one seed42 pure-undead versus pure-nature Lab ledger probe before final freeze (undead loss; one cashout consumed three ticks with zero marginal HP damage due to overkill). No team or seed was selected or changed from that result. This generator never resolves turns or inspects outcomes.',
  validationAtFreeze: cashoutOverrideSupported ? 'All configs passed full Lab validation; no turns resolved.' : 'Base configs passed Lab validation. New undeadCashout field locally type/range validated; full Lab validation required before running once concurrent integration lands. Stored config bytes remain frozen.',
  totalScheduledMatches: totalMatches,
  counting: 'Every config includes one baseline plus one candidate, both physical orientations and one mirror scenario per listed team. Identity and repeated baseline runs count in full; cross-suite reuse is not independent evidence.',
  policy: 'Production autoOrders on both sides; explicit ablations change effective cashout utility and can alter decisions and RNG streams. No fixed-order causal claim. Full-off retains paid strike HP damage and poison application elsewhere but disables cashout and its poison consumption.',
  method: '16 initial seeds versus 15 stable anchors. Explicit stock-enabled, bonus-off and full-off use the same first 8 seeds. Exact C17 broad pool has 10 fixed C17 anchors plus 18 seeded coherent old-roster teams (3 skill-ownership strata for each of 6 families), with every new ID excluded from opponents. Lower-cost anchors and C15 substitutions are reported separately. All controls, comparisons and seeds frozen together before outcomes.',
  finiteBudget: 'Core32 starts 62 MP, pays 18 MP per cashout-capable strike, and has no natural recovery: at most 3 such casts without external supply. Maximum current poison is 3 ticks, stock base14 plus eligible bonus8 yields at most66 pre-mitigation cashout damage per cast; the poison is consumed once. Five slots cannot contain three undead and three slimes simultaneously, so eligible slime supply and undead bonus cannot coexist. Base-only32 can coexist with three slimes.',
  sampling: {seed:242610310,algorithm:'enumerate-exact-C17-core-led-at-least-three-family-then-LCG-Fisher-Yates-and-distinct-first-matching-strata-v1',uniformityClaim:false,oldRosterMaximumId:31,strata:['at least two heal/cleanse skill owners','at least one poison skill owner','at least one before-hit or after-hit breaker skill owner'],ownershipIsNotExecution:true},
  anchors: {exactC17:exactAnchors,lowerBudget:lowerAnchors}, targets, c17Poison, coherent, pools, substitutions, contributions, lowerTargets,
  pairedComparisons: [
    {suite:'undead-substitutions',control:'pureundead',variants:['core-nonleader','core-replaced-slime','core-replaced-demon','healer-replaced','breaker-replaced']},
    {suite:'undead-substitutions',control:'c17-poison-undead',variants:['bonus-threshold-lost']},
    {suite:'undead-oldcore-contribution',control:'control-nature-dryas',variants:['nature-newcore-dryas','nature-newhealer']},
    {suite:'undead-oldcore-contribution',control:'control-nature-tengu',variants:['nature-newcore-tengu']},
    {suite:'undead-oldcore-contribution',control:'control-material-strong',variants:['material-newbreaker']},
    {suite:'undead-oldcore-contribution',control:'control-material-pure',variants:['material-newshield','material-newhealer']},
    {suite:'undead-lower-budget',control:'mixedundead',variants:['c15-threshold-lost','c15-core-replaced']},
  ],
  limitations: ['Small fixed seed panels are diagnostics, not metagame equilibrium estimates.', 'Initial and lower-budget results must be reported by cost rather than pooled as equal-budget evidence.', 'Same-member nonleader control changes leader bonuses; replacements also change stats, skills and often family membership.', 'Known strong nature+28 adverse anchors and original triple-poison/slow-Naga shells remain visible regardless of result.', 'No outcome-informed redraw, seed selection, numerical tuning or hidden exclusion is permitted.'],
  configs: configRecords,
};
for (const {path,raw} of configs) writeFileSync(path,raw);
writeFileSync(manifestPath,JSON.stringify(freeze,null,2)+'\n');
console.log(JSON.stringify({totalScheduledMatches:totalMatches,validationAtFreeze:freeze.validationAtFreeze,configs:configRecords.map(c=>({path:c.path,matches:c.matches,fileSha256:c.fileSha256}))},null,2));
