#!/usr/bin/env python3
"""Durable coordination only. Does not execute agents, git, deployment or approvals."""
import argparse
import copy
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import tempfile
import time
import uuid

STATES = {'ready', 'running', 'review', 'reviewing', 'candidate', 'publishing', 'released', 'accepted', 'blocked', 'retry', 'decided', 'verified'}
ROLES = {'implement': ('ready', 'running', 2), 'review': ('review', 'reviewing', 1), 'publish': ('candidate', 'publishing', 1)}
SHA = re.compile(r'^[0-9a-f]{40}$')
CHECKS = {'rights:test', 'rights:check', 'test', 'build', 'scope-qa'}


def require(ok, message):
    if not ok:
        raise ValueError(message)


def nonempty(value):
    return isinstance(value, str) and bool(value.strip())


def deliverable(t):
    return 'decision' if t['kind'] == 'decision' else t.get('deliverableKind', 'release')


def dependencies(t):
    return [(d, 'legacy') if isinstance(d, str) else (d['task'], d['stage']) for d in t['dependsOn']]


def dependency_met(s, dep, stage):
    target = next(x for x in s['tasks'] if x['id'] == dep)
    if stage == 'verified':
        return deliverable(target) == 'internal' and target['status'] == 'verified'
    if stage == 'decided':
        return target['kind'] == 'decision' and target['status'] == 'decided'
    if stage == 'accepted':
        return deliverable(target) == 'release' and target['status'] == 'accepted'
    return target['status'] in ({'released', 'accepted', 'decided'} if stage == 'legacy' else {'released', 'accepted'})


def complete_task(t):
    return t['status'] == {'internal': 'verified', 'release': 'accepted', 'decision': 'decided'}[deliverable(t)]


def validate(s):
    require(s.get('schemaVersion') in {1, 2}, 'unsupported schema')
    require(type(s.get('revision')) is int and s['revision'] >= 0, 'invalid revision')
    require(isinstance(s.get('operations'), dict), 'invalid operations')
    require(isinstance(s.get('tasks'), list) and bool(s['tasks']), 'invalid tasks')
    ids = [t['id'] for t in s['tasks']]
    require(len(ids) == len(set(ids)), 'duplicate task ID')
    for t in s['tasks']:
        require(nonempty(t['id']) and nonempty(t['title']), 'missing task identity')
        require(t['status'] in STATES, 'invalid status')
        require(t['kind'] in {'implementation', 'decision', 'validation'}, 'invalid kind')
        require(type(t['attempts']) is int and 0 <= t['attempts'] <= 3, 'invalid attempts')
        require(isinstance(t['criteria'], list) and t['criteria'] and all(nonempty(x) for x in t['criteria']), 'criteria required')
        require(len(t['criteria']) == len(set(t['criteria'])), 'duplicate criterion')
        deps = dependencies(t)
        require({d for d, _ in deps} <= set(ids) and t['id'] not in {d for d, _ in deps}, 'invalid dependencies')
        require(len(deps) == len({d for d, _ in deps}), 'duplicate dependency')
        if s['schemaVersion'] == 2:
            require(t['kind'] == 'decision' or t.get('deliverableKind') in {'internal', 'release'}, 'explicit deliverable kind required')
            for dep, stage in deps:
                target = next(x for x in s['tasks'] if x['id'] == dep)
                allowed = {'internal': {'verified'}, 'release': {'released', 'accepted'}, 'decision': {'decided'}}[deliverable(target)]
                require(stage in allowed, 'dependency stage incompatible with target deliverable')
        else:
            require('deliverableKind' not in t and all(stage == 'legacy' for _, stage in deps), 'migrate v1 before adding deliverable kinds/stages')
        require(t['status'] != 'verified' or (s['schemaVersion'] == 2 and deliverable(t) == 'internal'), 'verified is internal only')
        require(deliverable(t) != 'internal' or t['status'] not in {'candidate', 'publishing', 'released', 'accepted'}, 'internal deliverables cannot publish or accept')
        require(type(t['required']) is bool, 'required must be boolean')
        lease = t.get('lease')
        active = t['status'] in {'running', 'reviewing', 'publishing'}
        require(bool(lease) == active, 'lease/state mismatch')
        if lease:
            require(lease['role'] in ROLES and ROLES[lease['role']][1] == t['status'], 'lease role mismatch')
            require(nonempty(lease['token']) and nonempty(lease['worker']), 'invalid lease identity')
            require(type(lease['expiresAt']) in {int, float}, 'invalid lease expiry')
        if t['status'] == 'blocked':
            require(t.get('block', {}).get('type') in {'approval', 'uncertain', 'exhausted', 'external', 'dependency'}, 'block reason required')
        if t['status'] in {'review', 'reviewing', 'candidate', 'publishing', 'released', 'accepted', 'verified'}:
            require(bool(SHA.fullmatch(t.get('commit', ''))), 'exact candidate commit required')
        if t['status'] in {'candidate', 'publishing', 'released', 'accepted', 'verified'}:
            require(t.get('review', {}).get('commit') == t['commit'], 'review does not match commit')
            require(nonempty(t.get('implementer')) and nonempty(t['review'].get('worker')) and t['review']['worker'] != t['implementer'], 'review must be independent')
            require(nonempty(t['review'].get('evidence')), 'review evidence required')
            require(set(t.get('checks', {})) >= CHECKS and all(nonempty(t['checks'][k]) for k in CHECKS), 'passing check evidence required')
            require(set(t.get('criteriaEvidence', {})) == set(t['criteria']) and all(nonempty(v) for v in t['criteriaEvidence'].values()), 'criterion evidence required')
        if t['status'] in {'released', 'accepted'}:
            require(t.get('release', {}).get('commit') == t['commit'], 'release does not match commit')
        if t['status'] == 'decided':
            require(t['kind'] == 'decision' and nonempty(s.get('decisions', {}).get(t['id'], {}).get('reference')), 'owner decision evidence required')
        if t['status'] == 'accepted':
            require(nonempty(t.get('acceptanceRef')), 'owner acceptance required')
    for role, (_, active, cap) in ROLES.items():
        require(sum(t['status'] == active for t in s['tasks']) <= cap, f'{role} capacity exceeded')
    def visit(task, path):
        require(task['id'] not in path, 'dependency cycle')
        for dep, _ in dependencies(task):
            visit(next(x for x in s['tasks'] if x['id'] == dep), path | {task['id']})
    for t in s['tasks']:
        visit(t, set())
    return s


def summary(s, now):
    return {'revision': s['revision'], 'complete': all(complete_task(t) for t in s['tasks'] if t['required']),
            'tasks': [{'id': t['id'], 'status': t['status'], 'stale': bool(t.get('lease') and t['lease']['expiresAt'] <= now),
                       'block': t.get('block'), 'notBefore': t.get('notBefore')} for t in s['tasks']]}


def operate(s, cmd, now):
    """Pure mutation on a private copy; persistence handles CAS and idempotency."""
    action = cmd['action']
    if action == 'migrate-v2':
        return migrate_v2(s, cmd)
    if action == 'reconcile':
        stale = []
        for t in s['tasks']:
            if t.get('lease') and t['lease']['expiresAt'] <= now:
                t['block'] = {'type': 'uncertain', 'reason': 'Lease expired; inspect worker, branch, PR and deployment before retry.', 'previousRole': t['lease']['role']}
                t['status'] = 'blocked'
                del t['lease']
                stale.append(t['id'])
        return {'stale': stale}
    t = next((t for t in s['tasks'] if t['id'] == cmd.get('task')), None)
    require(t is not None, 'unknown task')
    if action == 'claim':
        role = cmd['role']
        require(role in ROLES, 'unknown role')
        eligible, active, cap = ROLES[role]
        require(nonempty(cmd.get('worker')), 'worker required')
        if t['status'] == 'retry' and now >= t['notBefore']:
            t['status'] = 'ready'
        require(t['status'] == eligible, 'not eligible; never duplicate a fresh or uncertain claim')
        require(all(dependency_met(s, dep, stage) for dep, stage in dependencies(t)), 'dependency unresolved')
        require(sum(x['status'] == active for x in s['tasks']) < cap, 'capacity reached')
        if role == 'implement':
            require(t['kind'] != 'decision', 'owner decisions cannot be implemented')
            require(t['attempts'] < 3, 'retry limit reached')
            t['attempts'] += 1
            t['implementer'] = cmd['worker']
        elif role == 'review':
            require(cmd['worker'] != t['implementer'], 'review must be independent')
        else:
            require(deliverable(t) == 'release', 'only release deliverables can publish')
            require(nonempty(cmd.get('authorizationRef')), 'publication authorization required')
            t['publicationAuthorization'] = cmd['authorizationRef']
        ttl = cmd.get('ttl', 1800)
        require(type(ttl) is int and 60 <= ttl <= 3600, 'lease must be 60..3600 seconds')
        t['status'] = active
        t['lease'] = {'role': role, 'worker': cmd['worker'], 'token': uuid.uuid4().hex, 'expiresAt': now + ttl}
        return {'lease': t['lease']}
    if action in {'heartbeat', 'submit', 'review', 'release', 'fail', 'block'}:
        lease = t.get('lease', {})
        require(lease and cmd.get('token') == lease['token'] and cmd.get('worker') == lease['worker'], 'invalid fencing token or worker')
        require(lease['expiresAt'] > now, 'lease expired; reconcile first')
        if action == 'heartbeat':
            ttl = cmd.get('ttl', 1800)
            require(type(ttl) is int and 60 <= ttl <= 3600, 'lease must be 60..3600 seconds')
            lease['expiresAt'] = now + ttl
            return {'lease': lease}
        if action == 'submit':
            require(lease['role'] == 'implement', 'implementation lease required')
            require(bool(SHA.fullmatch(cmd.get('commit', ''))), 'exact commit required')
            require(set(cmd.get('checks', {})) >= CHECKS and all(nonempty(cmd['checks'][key]) for key in CHECKS), 'passing test and scope-QA evidence required')
            require(set(cmd.get('criteriaEvidence', {})) == set(t['criteria']) and all(nonempty(v) for v in cmd['criteriaEvidence'].values()), 'every criterion needs evidence')
            t.update(status='review', commit=cmd['commit'], checks=cmd['checks'], criteriaEvidence=cmd['criteriaEvidence'])
            t.pop('review', None)
            t.pop('release', None)
        elif action == 'review':
            require(lease['role'] == 'review' and cmd.get('commit') == t['commit'], 'review lease and exact commit required')
            require(nonempty(cmd.get('evidence')), 'review evidence required')
            require(type(cmd.get('approved')) is bool, 'approved must be boolean')
            if cmd['approved']:
                t.update(status='verified' if deliverable(t) == 'internal' else 'candidate', review={'worker': lease['worker'], 'commit': t['commit'], 'evidence': cmd['evidence']})
            else:
                retry(t, now, cmd['evidence'])
        elif action == 'release':
            require(deliverable(t) == 'release', 'only release deliverables can publish')
            require(lease['role'] == 'publish' and cmd.get('commit') == t['commit'], 'publisher lease and reviewed commit required')
            for key in ('deployment', 'liveCheck', 'creditsCheck', 'noticesCheck'):
                require(nonempty(cmd.get(key)), f'{key} evidence required')
            t.update(status='released', release={key: cmd[key] for key in ('commit', 'deployment', 'liveCheck', 'creditsCheck', 'noticesCheck')})
        elif action == 'fail':
            require(nonempty(cmd.get('reason')), 'failure reason required')
            # Publishing/review uncertainty is never automatically rerun.
            t.update(status='blocked', block={'type': 'uncertain', 'reason': cmd['reason'], 'previousRole': lease['role']})
        else:
            require(nonempty(cmd.get('reason')), 'approval reason required')
            t.update(status='blocked', block={'type': 'approval', 'reason': cmd['reason'], 'previousRole': lease['role']})
        del t['lease']
        return {'status': t['status']}
    if action == 'resolve':
        require(t['status'] == 'blocked', 'task not blocked')
        require(nonempty(cmd.get('evidence')), 'read-first reconciliation evidence required')
        require(t['block']['type'] not in {'approval', 'exhausted', 'external'} or nonempty(cmd.get('authorizationRef')), 'approval or external handoff authorization required')
        require(t['kind'] != 'decision', 'decision requires owner-decision action')
        require(cmd.get('outcome') == 'retry', 'only retry is supported; uncertain release must be inspected and recorded by a new publisher')
        retry(t, now, cmd['evidence'])
        return {'status': t['status'], 'notBefore': t.get('notBefore')}
    if action == 'accept':
        require(deliverable(t) == 'release', 'only release deliverables can be owner-accepted')
        require(t['status'] == 'released', 'only released work can be accepted')
        require(nonempty(cmd.get('authorizationRef')), 'explicit owner acceptance required')
        t.update(status='accepted', acceptanceRef=cmd['authorizationRef'])
        return {'status': 'accepted'}
    if action == 'owner-decision':
        require(t['kind'] == 'decision' and t['status'] == 'blocked', 'not an open decision')
        require(nonempty(cmd.get('authorizationRef')), 'explicit owner decision required')
        # Decisions remain distinct from released software. Record in the project decision registry.
        s.setdefault('decisions', {})[t['id']] = {'reference': cmd['authorizationRef'], 'evidence': cmd.get('evidence', '')}
        require(nonempty(cmd.get('evidence')), 'approved scope/criteria evidence required')
        t['status'] = 'decided'
        t.pop('block', None)
        return {'decisionRecorded': t['id']}
    raise ValueError('unknown action')


def migrate_v2(s, cmd):
    """Explicit, CAS-protected configuration migration; never reset work or receipts."""
    require(set(cmd) <= {'action', 'operationId', 'expectedRevision', 'authorizationRef', 'internalTaskIds', 'verifiedDependencies', 'candidateRefs'}, 'unknown migration field')
    require(s['schemaVersion'] == 1, 'migration requires v1 state')
    require(nonempty(cmd.get('authorizationRef')), 'reviewed migration reference required')
    internal = cmd.get('internalTaskIds', [])
    require(isinstance(internal, list) and len(internal) == len(set(internal)), 'invalid internal task list')
    require(set(internal) == {'awakening-storage', 'baseline-regression'}, 'migration is limited to reviewed internal task classification')
    by_id = {t['id']: t for t in s['tasks']}
    require(set(internal) <= set(by_id), 'unknown internal task')
    for id in internal:
        task = by_id[id]
        require(task['kind'] != 'decision', 'cannot classify decision as internal')
        require(task['status'] not in {'candidate', 'publishing', 'released', 'accepted'}, 'cannot reclassify public review/release history')
    edges = cmd.get('verifiedDependencies', [])
    require(isinstance(edges, list), 'invalid verified dependencies')
    require(all(isinstance(e, dict) and set(e) == {'task', 'dependency'} for e in edges), 'invalid migration edge fields')
    edge_set = {(e['task'], e['dependency']) for e in edges}
    require(len(edge_set) == len(edges), 'duplicate migration edge')
    require(edge_set == {('awakening-integration', 'awakening-storage')}, 'migration is limited to reviewed storage dependency')
    for task, dep in edge_set:
        require(task in by_id and dep in by_id[task]['dependsOn'] and dep in internal, 'verified dependency must target declared internal task')
    for task in s['tasks']:
        if task['kind'] != 'decision':
            task['deliverableKind'] = 'internal' if task['id'] in internal else 'release'
        task['dependsOn'] = [dict(task=dep, stage='verified' if (task['id'], dep) in edge_set else 'decided' if by_id[dep]['kind'] == 'decision' else 'released') for dep in task['dependsOn']]
    refs = cmd.get('candidateRefs', {})
    require(isinstance(refs, dict) and set(refs) <= {'catalog-filter-scroll', 'awakening-preview'}, 'candidate references limited to existing UI candidates')
    for id, urls in refs.items():
        require(id in by_id and by_id[id]['status'] == 'blocked', 'candidate task must remain blocked')
        require(isinstance(urls, list) and 0 < len(urls) <= 10 and all(isinstance(url, str) and re.fullmatch(r'https://github\.com/miyasakayosuke/kanshu-arena/(?:tree|blob|commit)/[A-Za-z0-9._/-]+', url) for url in urls), 'public repository candidate URLs required')
        require('candidateRefs' not in by_id[id] or by_id[id]['candidateRefs'] == urls, 'existing candidate references cannot be overwritten')
        by_id[id]['candidateRefs'] = urls
    s['schemaVersion'] = 2
    require(isinstance(s.get('migrations', []), list), 'invalid migration history')
    s.setdefault('migrations', []).append({'from': 1, 'to': 2, 'authorizationRef': cmd['authorizationRef']})
    return {'schemaVersion': 2, 'internalTaskIds': internal}


def retry(t, now, reason):
    t.pop('block', None)
    if t['attempts'] >= 3:
        t.update(status='blocked', block={'type': 'exhausted', 'reason': reason})
    else:
        t.update(status='retry', notBefore=now + min(3600, 300 * 2 ** max(0, t['attempts'] - 1)), lastFailure=reason)


def transaction(path, cmd, now=None):
    path = Path(path)
    now = time.time() if now is None else now
    # flock is OS-owned and released on process death; do not delete this lock file.
    with open(str(path) + '.lock', 'a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        s = validate(json.loads(path.read_text()))
        if cmd['action'] == 'status':
            return summary(s, now)
        require(nonempty(cmd.get('operationId')), 'stable operationId required')
        fingerprint = hashlib.sha256(json.dumps({k: v for k, v in cmd.items() if k != 'expectedRevision'}, sort_keys=True).encode()).hexdigest()
        old = s['operations'].get(cmd['operationId'])
        if old:
            require(old['fingerprint'] == fingerprint, 'operationId reused with different payload')
            if 'lease' in old['result']:
                current = next((t.get('lease') for t in s['tasks'] if t['id'] == cmd.get('task')), None)
                receipt = old['result']['lease']
                require(current and current['token'] == receipt['token'] and current['worker'] == receipt['worker'] and current['expiresAt'] > now, 'historical lease receipt is no longer dispatchable; inspect current state')
                return dict(old['result'], lease=copy.deepcopy(current))
            return old['result']
        require(cmd.get('expectedRevision') == s['revision'], 'revision conflict; reload and reconcile')
        result = copy.deepcopy(operate(s, cmd, now))
        s['revision'] += 1
        result['revision'] = s['revision']
        s['operations'][cmd['operationId']] = {'fingerprint': fingerprint, 'result': result}
        validate(s)
        fd, name = tempfile.mkstemp(prefix=path.name + '.', dir=path.parent)
        try:
            with os.fdopen(fd, 'w') as out:
                json.dump(s, out, indent=2, ensure_ascii=False)
                out.write('\n')
                out.flush()
                os.fsync(out.fileno())
            os.replace(name, path)
            directory = os.open(path.parent, os.O_RDONLY)
            try:
                os.fsync(directory)
            finally:
                os.close(directory)
        finally:
            if os.path.exists(name):
                os.unlink(name)
        return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--state', default='docs/development-harness/state.json')
    parser.add_argument('--command', help='JSON command; omit for read-only status')
    args = parser.parse_args()
    try:
        print(json.dumps(transaction(args.state, json.loads(args.command) if args.command else {'action': 'status'}), indent=2))
    except (ValueError, KeyError, TypeError, OSError) as error:
        parser.exit(2, f'harness: {error}\n')
