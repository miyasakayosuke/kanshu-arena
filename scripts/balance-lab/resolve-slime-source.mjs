/** Resolve an exact archived or current executable source; never silently replay another version. */
import { existsSync,readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
const sha=s=>createHash('sha256').update(s).digest('hex');
export function resolveSlimeSource(source) {
 for(const candidate of ['.','lab-results/slime-budget-source','lab-results/slime-initial-source']){
  const root=resolve(candidate);const files=[['engineSha256',['src/engine.ts']],['familySha256',['src/families.ts']],['labSha256',['scripts/balance-lab/core.mjs','scripts/balance-lab/cli.mjs']]];
  if(files.every(([key,paths])=>paths.every(path=>existsSync(resolve(root,path)))&&sha(paths.map(path=>readFileSync(resolve(root,path),'utf8')).join('\n'))===source[key]))return root;
 }
 throw Error(`No exact executable source for engine ${source.engineSha256}`);
}
