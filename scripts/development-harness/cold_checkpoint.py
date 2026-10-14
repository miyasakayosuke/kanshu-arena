#!/usr/bin/env python3
"""Local-only projection into a NEW public ledger. Never writes a remote branch.

The input may contain sensitive legacy fields. Do not print it, upload it, or use
its tree as the new branch base. This importer never preserves legacy execution
credentials, assignments, operation receipts, or unverified evidence.
"""
import argparse
import copy
import json
from pathlib import Path
import harness
import public_schema


def cold_checkpoint(legacy, prior_checkpoint_sha, reviewed_refs=None):
    public_schema.text(prior_checkpoint_sha, sha=True)
    harness.require(legacy.get('schemaVersion') in {1,2}, 'cold checkpoint requires a legacy ledger')
    harness.require(type(legacy.get('revision')) is int and legacy['revision'] >= 0, 'invalid prior revision')
    harness.require(isinstance(legacy.get('tasks'),list) and legacy['tasks'], 'legacy tasks missing')
    template_path = Path(__file__).parents[2] / 'docs/development-harness/state.json'
    template = harness.validate(json.loads(template_path.read_text()))
    templates = {t['id']:t for t in template['tasks']}
    by_id = {t['id']:t for t in legacy['tasks']}
    harness.require(set(by_id) == set(templates), 'Unknown legacy tasks require reviewed public definitions before checkpointing')
    harness.require(len(by_id)==len(legacy['tasks']), 'duplicate legacy task')
    refs = reviewed_refs or {}
    harness.require(isinstance(refs,dict) and set(refs) <= set(by_id), 'unknown reviewed reference task')
    out = {'schemaVersion':3, 'revision':0, 'operations':{}, 'tasks':[],
           'provenance':{'priorCheckpointSHA':prior_checkpoint_sha,'priorRevision':legacy['revision'],
                         'method':'Fresh public checkpoint; prior runtime claims retired; evidence needs fresh review'}}
    for old in legacy['tasks']:
        # Explicit field projection, never copying arbitrary task/receipt objects.
        approved = templates[old['id']]
        t = {key:copy.deepcopy(approved[key]) for key in ('id','title','kind','criteria','required')}
        attempts = old.get('attempts',0)
        harness.require(type(attempts) is int and 0 <= attempts <= 3, 'invalid legacy attempt count')
        generation = old.get('generation',0)
        harness.require(type(generation) is int and 0 <= generation < 1000000000, 'invalid prior generation')
        t.update(attempts=attempts,generation=generation+1,dependsOn=[])
        if t['kind'] != 'decision':
            t['deliverableKind'] = 'internal' if t['id'] in {'awakening-storage','baseline-regression'} else 'release'
        for d in approved['dependsOn']:
            dep = d if isinstance(d,str) else d['task']
            harness.require(dep in by_id, 'unknown dependency')
            stage = 'verified' if dep in {'awakening-storage','baseline-regression'} else 'decided' if templates[dep]['kind']=='decision' else 'released'
            # Preserve a stricter public acceptance dependency when explicitly present.
            if isinstance(d,dict) and d.get('stage')=='accepted' and stage=='released': stage='accepted'
            t['dependsOn'].append({'task':dep,'stage':stage})
        status=old['status']
        if t['kind']=='decision':
            t.update(status='blocked',block={'type':'approval','reason':'Owner decision evidence must be reverified before recording it in the new ledger.'})
        elif approved.get('block',{}).get('type') in {'approval','external'}:
            t.update(status='blocked',block={'type':approved['block']['type'],'reason':'Reviewed template gate retained; no legacy status establishes approval or new review.'})
        elif attempts >= 3:
            t.update(status='blocked',block={'type':'exhausted','reason':'Attempt limit retained; coordinator decision required before more work.'})
        elif status=='ready':
            t['status']='ready'
        elif status=='blocked' and old.get('block',{}).get('type') in {'approval','external','dependency','exhausted'}:
            t.update(status='blocked',block={'type':old['block']['type'],'reason':'Existing gate retained; coordinator must verify the pending decision or candidate before resuming.'})
        else:
            t.update(status='blocked',block={'type':'uncertain','reason':'Legacy runtime claim and evidence retired. Verify the previous worker is stopped; import candidate evidence only through fresh assignment and independent review.'})
        if t['id'] in refs:
            harness.require(isinstance(refs[t['id']],list), 'reviewed references must be a list')
            for url in refs[t['id']]:
                public_schema.text(url)
                harness.require(url.startswith('https://github.com/miyasakayosuke/kanshu-arena/'), 'reviewed public repository URL required')
            t['candidateRefs']=list(refs[t['id']])
        out['tasks'].append(t)
    return harness.validate(out)


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--legacy',required=True)
    parser.add_argument('--prior-checkpoint-sha',required=True)
    parser.add_argument('--reviewed-refs')
    parser.add_argument('--out',required=True,help='New local file only; never overwrites')
    args=parser.parse_args()
    try:
        legacy=json.loads(Path(args.legacy).read_text())
        refs=json.loads(Path(args.reviewed_refs).read_text()) if args.reviewed_refs else {}
        safe=cold_checkpoint(legacy,args.prior_checkpoint_sha,refs)
        with open(args.out,'x') as out: out.write(json.dumps(safe,indent=2)+'\n')
        print('Safe local checkpoint created; remote publication and orchestrator retirement are separate reviewed steps.')
    except (ValueError,KeyError,TypeError,OSError):
        parser.exit(2,'Cold checkpoint failed closed; input contents omitted. Inspect locally without transmitting legacy data.\n')
