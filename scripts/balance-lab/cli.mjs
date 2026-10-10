#!/usr/bin/env node
// Node 22.18+ (native TypeScript stripping); no added runtime dependencies.
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSchedule, generateSeeds, MatchFailure, replayMatch, runMatch, runSuite } from './core.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const generatedNames = ['config.json', 'report.json', 'report.md', 'failure.json'];
const existingOutputs = out => generatedNames.filter(name => existsSync(resolve(out, name)));
const sha = text => createHash('sha256').update(text).digest('hex');
const load = path => JSON.parse(readFileSync(path, 'utf8'));
const save = (path, value) => { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, JSON.stringify(value, null, 2) + '\n'); };
const git = args => { try { return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return null; } };
function sourceVersion(config) {
  return {
    gameVersion: load(resolve(root, 'package.json')).version,
    gitCommit: git(['rev-parse', 'HEAD']), workingTreeDirty: !!git(['status', '--porcelain']), nodeVersion: process.version,
    engineSha256: sha(readFileSync(resolve(root, 'src/engine.ts'))),
    familySha256: sha(readFileSync(resolve(root, 'src/families.ts'))),
    labSha256: sha(['scripts/balance-lab/core.mjs', 'scripts/balance-lab/cli.mjs'].map(path => readFileSync(resolve(root, path), 'utf8')).join('\n')),
    configSha256: sha(JSON.stringify(config)),
  };
}
function verifyVersion(source, config) {
  if (!source) throw new Error('Replay requires source metadata from a lab CLI report');
  const current = sourceVersion(config);
  for (const field of ['engineSha256', 'familySha256', 'labSha256', 'configSha256']) if (current[field] !== source[field]) throw new Error(`Replay blocked: ${field} differs. Check out the recorded source/config; do not treat a different version as reproduction.`);
}
const percent = value => value === undefined || value === null ? 'n/a' : `${(value * 100).toFixed(2)}%`;
const numeric = value => value === undefined || value === null ? 'n/a' : value.toFixed(3);
function renderReport(report) {
  const { summary, mirrorControls, scheduleCounts: counts } = report;
  const lines = [
    `# Battle balance lab: ${report.config.suiteId}`, '',
    `Candidate: ${report.config.candidate.label} (${report.config.candidate.id})`, '',
    `- Engine: ${report.source.gameVersion}; commit: ${report.source.gitCommit ?? 'unavailable'}${report.source.workingTreeDirty ? ' (working tree has changes; hashes are authoritative)' : ''}`,
    `- Engine SHA-256: ${report.source.engineSha256}`,
    `- Families SHA-256: ${report.source.familySha256}`,
    `- Lab SHA-256: ${report.source.labSha256}`,
    `- Config SHA-256: ${report.source.configSha256}`,
    `- Node: ${report.source.nodeVersion}`,
    `- Policy: ${report.methodology.policy}; identical on both physical sides`,
    `- Coverage: ${counts.teams} teams (${counts.curatedTeams} curated + ${counts.sampledTeams} sampled), ${counts.matchupScenarios} matchups + ${counts.mirrorScenarios} mirrors, ${counts.seeds} seeds, both side assignments, baseline and candidate = ${counts.matches} matches`,
    '- Candidate changes apply roster-wide to both teams. Shipping defaults are unchanged.', '',
    '## Matchup results (mirrors excluded)', '',
    '| Metric for configured team A | Baseline | Candidate |', '| --- | ---: | ---: |',
  ];
  const row = (label, field, format = numeric) => lines.push(`| ${label} | ${format(summary.baseline[field])} | ${format(summary.candidate[field])} |`);
  row('Games', 'games', value => String(value)); row('Win rate', 'winRate', percent); row('Score rate (win + half draw)', 'scoreRate', percent); row('Draw rate', 'drawRate', percent);
  for (const [label, field] of [['Turns', 'meanTurns'], ['Direct damage, HP-clipped', 'meanDirectDamage'], ['Effective healing', 'meanHealing'], ['MP spent', 'meanMpSpent'], ['Paid casts', 'meanPaidCasts'], ['Unit-turns with no affordable paid special', 'meanNoAffordableSpecialTurns'], ['Unit-turns at exactly zero MP', 'meanZeroMpTurns'], ['Guard applications', 'meanGuardApplications'], ['Effective poison cleanses', 'meanEffectiveCleanses'], ['Dispel events', 'meanDispelApplications'], ['Dragon charge generated', 'meanDragonChargeGenerated'], ['Dragon charge spent (separate from MP)', 'meanDragonChargeSpent'], ['Dragon finishers', 'meanDragonFinishers'], ['Charged dragon finishers', 'meanChargedDragonFinishers'], ['Dragon finisher direct damage', 'meanDragonFinisherDamage'], ['Opponent charge dispelled', 'meanDragonChargeDispelled'], ['Own charge lost on defeat', 'meanDragonChargeLostOnDefeat'], ['Peak dragon charge', 'meanPeakDragonCharge']]) row(label, field);
  row('Deaths before first cast / unit appearances', 'zeroCastDeathRate', percent); row('Largest unit share of team direct damage', 'meanDamageConcentration', percent);
  const delta = summary.pairedDelta;
  lines.push('', `Paired score change: ${percent(delta.scoreRateChange)} points; ${delta.changedOutcomes ?? 0} changed outcomes across ${delta.pairs} pairs.`,
    `Approximate seed-clustered 95% interval: ${delta.approximate95Interval ? delta.approximate95Interval.map(percent).join(' to ') + ' points' : 'not available (fewer than two seed clusters)'}.`, '',
    '## Physical side and initiative diagnostics', '',
    `- Matchup physical allies-side score: ${percent(summary.baseline.physicalAllyScoreRate)} → ${percent(summary.candidate.physicalAllyScoreRate)}. Both team assignments have equal counts.`,
    `- Mirror physical allies-side score: ${percent(mirrorControls.baseline.physicalAllyScoreRate)} → ${percent(mirrorControls.candidate.physicalAllyScoreRate)}. This is the meaningful mirror side diagnostic.`,
    `- First-actual-cast side score: ${percent(summary.baseline.firstCastSideScoreRate)} → ${percent(summary.candidate.firstCastSideScoreRate)}. This is an association, not a causal first-move advantage.`,
    '- Swapped team-A mirror score is 50% by construction and must not be used as evidence of fairness.', '',
    '## Per-scenario results', '',
    '| Scenario | Type | Games per variant | Baseline A score | Candidate A score | Paired change |', '| --- | --- | ---: | ---: | ---: | ---: |');
  for (const scenario of report.scenarios) lines.push(`| ${scenario.id} | ${scenario.kind} | ${scenario.baseline.games} | ${percent(scenario.baseline.scoreRate)} | ${percent(scenario.candidate.scoreRate)} | ${percent(scenario.pairedDelta.scoreRateChange)} pts |`);
  const keyScenarios = report.scenarios.filter(scenario => scenario.candidate.keyUnit);
  if (keyScenarios.length) {
    lines.push('', '## Key-unit dependency proxies', '', 'Survival-conditioned scores are associations, not replacement value. Baseline and candidate details are retained in report.json.', '');
    for (const scenario of keyScenarios) {
      const key = scenario.candidate.keyUnit;
      lines.push(`- ${scenario.id}, monster ${key.monsterId}: ${key.survivals}/${key.appearances} survived; ${key.turnOneDeaths} first-turn deaths; ${key.zeroCastDeaths} deaths before any cast; ${numeric(key.meanCasts)} casts; team score when surviving ${percent(key.scoreWhenSurvived)}, when defeated ${percent(key.scoreWhenDefeated)}.`);
    }
  }
  lines.push('', '## Complaint → hypothesis → scenario → metric', '');
  if (!report.config.complaints?.length) lines.push('No sourced complaint asserted by this configuration. The identity candidate is an infrastructure check.');
  for (const complaint of report.config.complaints ?? []) {
    lines.push(`### ${complaint.id} (${complaint.status})`, '', complaint.complaint, '', `Hypothesis: ${complaint.hypothesis}`, '',
      `Source: ${complaint.source ? `${complaint.source.title} (${complaint.source.url}), observed ${complaint.source.observedAt}; scope: ${complaint.source.scope}` : 'none; an unverified engineering hypothesis, not attributed to players'}`,
      `Scenarios: ${complaint.scenarioIds.join(', ')}`, ...complaint.metrics.map(metric => `- ${metric.name}, ${metric.direction}: ${metric.rationale}`), ...complaint.limitations.map(item => `- Limitation: ${item}`), '');
  }
  lines.push('', '## Metric definitions', '', ...Object.entries(report.methodology.metricDefinitions).map(([name, definition]) => `- **${name}**: ${definition}`), '', '## Limits and interpretation', '', ...report.methodology.limitations.map(item => `- ${item}`), '', '## Reproduce and inspect', '', '```sh', report.reproduce.run, report.reproduce.replay, '```', '', 'Replay verifies both source/config hashes and the recorded event-trace hash. Keep config.json and report.json together. Successful replay includes full initial state, orders/events per turn, random states, resource snapshots, and final state.', '');
  return lines.join('\n');
}
const usage = `Battle balance lab (Node 22.18+ or 24)\n\n  npm run lab -- run --config configs/balance-lab/smoke.json --out lab-results/smoke [--seeds N] [--sample-teams N] [--overwrite]\n  npm run lab -- replay --report lab-results/smoke/report.json --match MATCH_ID --out lab-results/replay.json\n  npm run lab -- replay-failure --failure lab-results/smoke/failure.json --out lab-results/repeated-failure.json\n\nJSON configs only. No runtime code injection. Maximum 20,000 total matches including all controls.\n`;
function parseArgs(argv) {
  if (!argv.length || argv[0] === '--help' || argv[0] === 'help') return { command: 'help' };
  const [command, ...args] = argv;
  if (!['run', 'replay', 'replay-failure'].includes(command)) throw new Error(`Unknown command: ${command}`);
  const allowed = command === 'run' ? ['config', 'out', 'seeds', 'sample-teams', 'overwrite'] : command === 'replay' ? ['report', 'match', 'out'] : ['failure', 'out'];
  const result = { command };
  for (let i = 0; i < args.length; i++) {
    const option = args[i];
    const name = option.replace(/^--/, '');
    if (!option.startsWith('--') || !allowed.includes(name) || own(result, name)) throw new Error(`Invalid or duplicate option: ${option}`);
    if (name === 'overwrite') { result.overwrite = true; continue; }
    if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`Missing value: ${option}`);
    result[name] = args[++i];
  }
  for (const required of command === 'run' ? ['config', 'out'] : command === 'replay' ? ['report', 'match', 'out'] : ['failure', 'out']) if (!result[required]) throw new Error(`--${required} is required`);
  return result;
}
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
let args;
let config;
let activeSource;
let beganRun = false;
try {
  args = parseArgs(process.argv.slice(2));
  if (args.command === 'help') process.stdout.write(usage);
  else if (args.command === 'run') {
    config = load(resolve(args.config));
    if (args.seeds !== undefined) config.seeds = generateSeeds(Number(args.seeds), config.sampling?.seed ?? 20261009);
    if (args['sample-teams'] !== undefined) config.sampling = { count: Number(args['sample-teams']), seed: config.sampling?.seed ?? 20261009 };
    const schedule = buildSchedule(config); // Full validation and budget check before replacing output.
    const previous = existingOutputs(resolve(args.out));
    if (previous.length && !args.overwrite) throw new Error('Output directory contains previous results. Choose a new --out or explicitly pass --overwrite.');
    if (args.overwrite) for (const name of previous) rmSync(resolve(args.out, name));
    beganRun = true;
    activeSource = sourceVersion(schedule.config);
    console.log(`Running ${schedule.cases.length} matches: identical policy, paired seeds, side swaps and mirrors.`);
    const report = runSuite(config, ({ completed, total }) => { if (completed % 1000 === 0) console.log(`${completed}/${total}`); });
    const afterSource = sourceVersion(report.config);
    if (afterSource.engineSha256 !== activeSource.engineSha256 || afterSource.familySha256 !== activeSource.familySha256 || afterSource.labSha256 !== activeSource.labSha256) throw new Error('Engine/lab source changed during this run. Rerun on a stable version before saving evidence.');
    report.source = activeSource;
    const out = resolve(args.out);
    const quoted = path => JSON.stringify(relative(process.cwd(), path));
    report.reproduce = {
      run: `npm run lab -- run --config ${quoted(resolve(out, 'config.json'))} --out ${quoted(resolve(out, '../reproduced'))}`,
      replay: `npm run lab -- replay --report ${quoted(resolve(out, 'report.json'))} --match ${report.matches[0].id} --out ${quoted(resolve(out, '../replay.json'))}`,
    };
    save(resolve(out, 'config.json'), report.config); save(resolve(out, 'report.json'), report);
    writeFileSync(resolve(out, 'report.md'), renderReport(report));
    console.log(`Saved ${relative(process.cwd(), out)}/{config.json,report.json,report.md}`);
    console.log(`Matchup score: ${percent(report.summary.baseline.scoreRate)} → ${percent(report.summary.candidate.scoreRate)}; paired change ${percent(report.summary.pairedDelta.scoreRateChange)} points. These are policy/suite-specific measurements.`);
  } else if (args.command === 'replay') {
    const report = load(resolve(args.report)); verifyVersion(report.source, report.config);
    const replay = replayMatch(report, args.match); replay.source = report.source;
    save(resolve(args.out), replay); console.log(`Verified deterministic replay: ${args.match}; trace ${replay.result.traceHash}`);
  } else {
    const failure = load(resolve(args.failure)); verifyVersion(failure.source, failure.config);
    if (!failure.request) throw new Error('Failure contains no executable match request');
    const scheduled = buildSchedule(failure.config).cases.find(item => item.id === failure.matchId);
    if (!scheduled || JSON.stringify(scheduled.request) !== JSON.stringify(failure.request)) throw new Error('Failure request differs from its embedded schedule and match ID');
    if (sha(JSON.stringify(failure.trace)) !== failure.traceSha256) throw new Error('Stored failure trace hash differs');
    try {
      const result = runMatch({ ...scheduled.request, trace: true });
      save(resolve(args.out), { reproducedFailure: false, result });
      throw new Error('Recorded failure did not recur. Successful trace saved; do not claim it reproduced.');
    } catch (error) {
      if (!(error instanceof MatchFailure)) throw error;
      const traceSha256 = sha(JSON.stringify(error.trace));
      const sameFailure = error.message === failure.error && traceSha256 === failure.traceSha256 && JSON.stringify(error.request) === JSON.stringify(scheduled.request);
      save(resolve(args.out), { reproducedFailure: sameFailure, error: error.message, request: error.request, trace: error.trace, traceSha256 });
      if (!sameFailure) throw new Error('Failure message, request or trace differed; trace saved');
      console.log(`Reproduced failure: ${error.message}`);
    }
  }
} catch (error) {
  if (error instanceof MatchFailure && args?.command === 'run') {
    const path = resolve(args.out, 'failure.json');
    save(path, { schemaVersion: 1, error: error.message, matchId: error.matchId ?? null, config, source: activeSource ?? sourceVersion(config), request: error.request, trace: error.trace, traceSha256: sha(JSON.stringify(error.trace)),
      reproduce: `npm run lab -- replay-failure --failure ${JSON.stringify(relative(process.cwd(), path))} --out lab-results/repeated-failure.json` });
    console.error(`Failing match preserved: ${relative(process.cwd(), path)}`);
  }
  console.error(`Balance lab: ${error.message}`);
  if (args?.command === 'run' && args.out && !beganRun && existingOutputs(resolve(args.out)).length) console.error('Existing outputs belong to a previous run and were not replaced. This run produced no new successful report.');
  process.exitCode = 1;
}
