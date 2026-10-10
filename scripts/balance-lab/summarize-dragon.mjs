#!/usr/bin/env node
/** Compact review evidence from saved CLI reports; never runs or changes gameplay. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import { summarize, pairedDelta } from './core.mjs';
const [output, ...paths] = process.argv.slice(2);
if (!output || !paths.length) throw new Error('Usage: node scripts/balance-lab/summarize-dragon.mjs OUTPUT.json REPORT.json ...');
const round = n => Number.isFinite(n) ? Math.round(n * 1e6) / 1e6 : null;
const focal = match => match.orientation === 'a-left' ? 'allies' : 'enemies';
const selectedMetrics = ['games','wins','losses','draws','scoreRate','meanTurns','zeroCastDeathRate','meanMpSpent','meanNoAffordableSpecialTurns','meanHealing','meanGuardApplications','meanEffectiveCleanses','meanPoisonApplications','meanDispelApplications','meanDragonChargeGenerated','meanDragonChargeSpent','meanDragonFinishers','meanChargedDragonFinishers','meanDragonFinisherDamage','meanDragonChargeDispelled','meanDragonChargeLostOnDefeat','meanPeakDragonCharge','meanDamageConcentration'];
const view = rows => {
  const stats = summarize(rows);
  const units = rows.map(match => match.result.units.find(unit => unit.monsterId === 15 && unit.key[0] === (focal(match) === 'allies' ? 'a' : 'e'))).filter(Boolean);
  const finishers = units.reduce((sum, unit) => sum + unit.dragonFinishers, 0);
  return { ...Object.fromEntries(selectedMetrics.map(key => [key, stats[key]])), core: {
    appearances: units.length, defeatsBeforeFirstFinisher: units.filter(unit => unit.finalHp === 0 && unit.dragonFinishers === 0).length,
    meanChargeSpentPerFinisher: round(units.reduce((sum, unit) => sum + unit.dragonChargeSpent, 0) / finishers),
    firstTurnDeaths: units.filter(unit => unit.deathTurn === 1).length,
    noCastDeaths: units.filter(unit => unit.diedBeforeAnyCast).length,
  } };
};
const result = { schemaVersion: 1, status: 'adopted-candidate-with-final-source-validation', note: 'Same-policy fixed-suite evidence, not human/PvP balance. Candidate applies on both sides. Draws score half. Per-core charge excludes MP. All original fullnature members [14,3,6,9,10] retained.', reports: [] };
let previous;
for (const path of paths) {
  const raw = readFileSync(path);
  const report = JSON.parse(raw.toString('utf8'));
  const teamIds = [...new Set(report.matches.filter(match => match.kind === 'matchup').map(match => match.teamAId))];
  result.reports.push({ path, phase: path.includes('/dragon-final-') ? 'final-source' : 'exploratory', reportSha256: createHash('sha256').update(raw).digest('hex'), source: report.source, suiteId: report.config.suiteId, candidate: report.config.candidate,
    scheduleCounts: report.scheduleCounts, seeds: report.config.seeds, teams: report.teams.map(team => ({ id: team.id, ids: team.ids })),
    mirrorPhysicalAllyScore: { baseline: report.mirrorControls.baseline.physicalAllyScoreRate, candidate: report.mirrorControls.candidate.physicalAllyScoreRate },
    focalTeams: teamIds.map(id => {
      const rows = report.matches.filter(match => match.kind === 'matchup' && match.teamAId === id);
      const partition = predicate => Object.fromEntries(['baseline','candidate'].map(variant => [variant,view(rows.filter(match => match.variant === variant && predicate(match)))]));
      return { id, ...partition(() => true), pairedDelta: pairedDelta(rows),
        ...(rows.some(match => match.teamBId.startsWith('generated-')) ? { curated: partition(match => !match.teamBId.startsWith('generated-')), generated: partition(match => match.teamBId.startsWith('generated-')) } : {}),
        controls: report.scenarios.filter(scenario => scenario.kind === 'matchup' && scenario.a === id && !scenario.b.startsWith('generated-')).map(scenario => ({ opponent: scenario.b, gamesPerVariant: scenario.baseline.games, baselineScore: scenario.baseline.scoreRate, candidateScore: scenario.candidate.scoreRate })),
      };
    }),
  });
  // Keep only the immediately preceding candidate rows; large raw reports are not all retained.
  result.candidateComparisons ??= [];
  if (previous && previous.source.engineSha256 === report.source.engineSha256 && previous.source.labSha256 === report.source.labSha256
    && JSON.stringify(previous.config.seeds) === JSON.stringify(report.config.seeds) && JSON.stringify(previous.config.teams) === JSON.stringify(report.config.teams) && JSON.stringify(previous.config.scenarios) === JSON.stringify(report.config.scenarios)) {
    for (const team of report.config.teams.slice(0,5)) {
      const prior = previous.matches.filter(match => match.kind === 'matchup' && match.teamAId === team.id).map(match => ({ ...match, variant: 'baseline' }));
      const next = report.matches.filter(match => match.kind === 'matchup' && match.teamAId === team.id && match.variant === 'candidate');
      result.candidateComparisons.push({ from: previous.config.candidate.id, to: report.config.candidate.id, team: team.id, ...pairedDelta([...prior,...next]) });
    }
  }
  previous = { source: report.source, config: report.config, matches: report.matches.filter(match => match.variant === 'candidate') };
}
for (const [field, path] of [['verification', 'lab-results/dragon-final-verification.json'], ['timingSensitivity', 'lab-results/dragon-initial-timing-probe.json']]) {
  if (existsSync(path)) {
    const raw = readFileSync(path);
    const value = JSON.parse(raw.toString('utf8'));
    result[field] = { path, sha256: createHash('sha256').update(raw).digest('hex'), ...value };
  }
}
// Keep individual evidence files reviewable rather than one very large JSON blob.
const reportDirectory = `${basename(output, '.json')}-runs`;
mkdirSync(join(dirname(output), reportDirectory), { recursive: true });
result.reportFormat = 'split-json-lossless';
result.reports = result.reports.map((report, index) => {
  const file = `${String(index + 1).padStart(2, '0')}-${report.phase}-${report.suiteId}.json`;
  const content = JSON.stringify(report, null, 2) + '\n';
  writeFileSync(join(dirname(output), reportDirectory, file), content);
  return { evidenceFile: `${reportDirectory}/${file}`, evidenceSha256: createHash('sha256').update(content).digest('hex'), rawReportPath: report.path, rawReportSha256: report.reportSha256, phase: report.phase, suiteId: report.suiteId };
});
writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
console.log(`Saved compact evidence: ${output}`);
