#!/usr/bin/env python3
"""Public coordination only, never authentication. Requires a trusted orchestrator.
No credential-bearing assignments or legacy ledgers are accepted.
"""
import argparse
import copy
import fcntl
import json
import os
from pathlib import Path
import re
import tempfile
import time
import public_schema

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
    return 'decision' if t['kind'] == 'decision' else t['deliverableKind']


def dependencies(t):
    return [(d['task'], d['stage']) for d in t['dependsOn']]


def dependency_met(s, dep, stage):
    target = next(x for x in s['tasks'] if x['id'] == dep)
    if stage == 'verified':
        return deliverable(target) == 'internal' and target['status'] == 'verified'
    if stage == 'decided':
        return target['kind'] == 'decision' and target['status'] == 'decided'
    if stage == 'accepted':
        return deliverable(target) == 'release' and target['status'] == 'accepted'
    return target['status'] in {'released', 'accepted'}


def complete_task(t):
    return t['status'] == {'internal': 'verified', 'release': 'accepted', 'decision': 'decided'}[deliverable(t)]


def validate(s):
    public_schema.state(s)
    require(s.get('schemaVersion') == 3, 'unsupported schema')
    require(type(s.get('revision')) is int and s['revision'] >= 0, 'invalid revision')
    require(isinstance(s.get('operations'), dict), 'invalid operations')
    require(isinstance(s.get('tasks'), list) and bool(s['tasks']), 'invalid tasks')
    ids = [t['id'] for t in s['tasks']]
    require(len(ids) == len(set(ids)), 'duplicate task ID')
    for t in s['tasks']:
        require(nonempty(t['id']) and nonempty(t['title']), 'missing task identity')
        require(t['status'] in STATES, 'invalid status')
        require(t['kind'] in {'implementation', 'decision', 'validation'}, 'invalid kind')
        require(type(t['generation']) is int and t['generation'] >= 0, 'invalid generation')
        require(type(t['attempts']) is int and 0 <= t['attempts'] <= 3, 'invalid attempts')
        require(isinstance(t['criteria'], list) and t['criteria'] and all(nonempty(x) for x in t['criteria']), 'criteria required')
        require(len(t['criteria']) == len(set(t['criteria'])), 'duplicate criterion')
        deps = dependencies(t)
        require({d for d, _ in deps} <= set(ids) and t['id'] not in {d for d, _ in deps}, 'invalid dependencies')
        require(len(deps) == len({d for d, _ in deps}), 'duplicate dependency')
        require(t['kind'] == 'decision' or t.get('deliverableKind') in {'internal', 'release'}, 'explicit deliverable kind required')
        for dep, stage in deps:
            target = next(x for x in s['tasks'] if x['id'] == dep)
            allowed = {'internal': {'verified'}, 'release': {'released', 'accepted'}, 'decision': {'decided'}}[deliverable(target)]
            require(stage in allowed, 'dependency stage incompatible with target deliverable')
        require(t['status'] != 'verified' or (deliverable(t) == 'internal'), 'verified is internal only')
        require(deliverable(t) != 'internal' or t['status'] not in {'candidate', 'publishing', 'released', 'accepted'}, 'internal deliverables cannot publish or accept')
        require(type(t['required']) is bool, 'required must be boolean')
        assignment = t.get('assignment')
        active = t['status'] in {'running', 'reviewing', 'publishing'}
        require(bool(assignment) == active, 'assignment/state mismatch')
        if assignment:
            require(assignment['role'] in ROLES and ROLES[assignment['role']][1] == t['status'], 'assignment role mismatch')
            require(assignment['generation'] == t['generation'] and nonempty(assignment['worker']), 'invalid assignment generation/worker')
            require(type(assignment['expiresAt']) in {int, float}, 'invalid assignment expiry')
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
            'tasks': [{'id': t['id'], 'status': t['status'], 'stale': bool(t.get('assignment') and t['assignment']['expiresAt'] <= now),
                       'block': t.get('block'), 'notBefore': t.get('notBefore')} for t in s['tasks']]}


def operate(s, cmd, now):
    """Pure mutation on a private copy; persistence handles CAS and idempotency."""
    action = cmd['action']
    if action == 'reconcile':
        stale = []
        for t in s['tasks']:
            if t.get('assignment') and t['assignment']['expiresAt'] <= now:
                t['block'] = {'type': 'uncertain', 'reason': 'Assignment expired; inspect worker, branch, PR and deployment before retry.', 'previousRole': t['assignment']['role']}
                t['status'] = 'blocked'
                del t['assignment']
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
            t['publicationApprovalRef'] = cmd['authorizationRef']
        ttl = cmd.get('ttl', 1800)
        require(type(ttl) is int and 60 <= ttl <= 3600, 'assignment must be 60..3600 seconds')
        t['status'] = active
        t['generation'] += 1
        t['assignment'] = {'role': role, 'worker': cmd['worker'], 'generation': t['generation'], 'expiresAt': now + ttl}
        return {'assignment': t['assignment']}
    if action in {'heartbeat', 'submit', 'review', 'release', 'fail', 'block'}:
        assignment = t.get('assignment', {})
        require(assignment and cmd.get('generation') == assignment['generation'] and cmd.get('worker') == assignment['worker'], 'stale generation or mismatched worker; not an authentication check')
        require(assignment['expiresAt'] > now, 'assignment expired; reconcile first')
        if action == 'heartbeat':
            ttl = cmd.get('ttl', 1800)
            require(type(ttl) is int and 60 <= ttl <= 3600, 'assignment must be 60..3600 seconds')
            assignment['expiresAt'] = now + ttl
            return {'assignment': assignment}
        if action == 'submit':
            require(assignment['role'] == 'implement', 'implementation assignment required')
            require(bool(SHA.fullmatch(cmd.get('commit', ''))), 'exact commit required')
            require(set(cmd.get('checks', {})) >= CHECKS and all(nonempty(cmd['checks'][key]) for key in CHECKS), 'passing test and scope-QA evidence required')
            require(set(cmd.get('criteriaEvidence', {})) == set(t['criteria']) and all(nonempty(v) for v in cmd['criteriaEvidence'].values()), 'every criterion needs evidence')
            t.update(status='review', commit=cmd['commit'], checks=cmd['checks'], criteriaEvidence=cmd['criteriaEvidence'])
            t.pop('review', None)
            t.pop('release', None)
        elif action == 'review':
            require(assignment['role'] == 'review' and cmd.get('commit') == t['commit'], 'review assignment and exact commit required')
            require(nonempty(cmd.get('evidence')), 'review evidence required')
            require(type(cmd.get('approved')) is bool, 'approved must be boolean')
            if cmd['approved']:
                t.update(status='verified' if deliverable(t) == 'internal' else 'candidate', review={'worker': assignment['worker'], 'commit': t['commit'], 'evidence': cmd['evidence']})
            else:
                retry(t, now, cmd['evidence'])
        elif action == 'release':
            require(deliverable(t) == 'release', 'only release deliverables can publish')
            require(assignment['role'] == 'publish' and cmd.get('commit') == t['commit'], 'publisher assignment and reviewed commit required')
            for key in ('deployment', 'liveCheck', 'creditsCheck', 'noticesCheck'):
                require(nonempty(cmd.get(key)), f'{key} evidence required')
            t.update(status='released', release={key: cmd[key] for key in ('commit', 'deployment', 'liveCheck', 'creditsCheck', 'noticesCheck')})
        elif action == 'fail':
            require(nonempty(cmd.get('reason')), 'failure reason required')
            # Publishing/review uncertainty is never automatically rerun.
            t.update(status='blocked', block={'type': 'uncertain', 'reason': cmd['reason'], 'previousRole': assignment['role']})
        else:
            require(nonempty(cmd.get('reason')), 'approval reason required')
            t.update(status='blocked', block={'type': 'approval', 'reason': cmd['reason'], 'previousRole': assignment['role']})
        del t['assignment']
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
        public_schema.command(cmd)
        s = validate(json.loads(path.read_text()))
        if cmd['action'] == 'status':
            return summary(s, now)
        require(nonempty(cmd.get('operationId')), 'stable operationId required')
        receipt_command = {k: v for k, v in cmd.items() if k != 'expectedRevision'}
        old = s['operations'].get(cmd['operationId'])
        if old:
            require(old['command'] == receipt_command, 'operationId reused with different payload')
            if 'assignment' in old['result']:
                current = next((t.get('assignment') for t in s['tasks'] if t['id'] == cmd.get('task')), None)
                receipt = old['result']['assignment']
                require(current and current['generation'] == receipt['generation'] and current['worker'] == receipt['worker'] and current['expiresAt'] > now, 'historical assignment receipt is no longer dispatchable; inspect current state')
                return dict(old['result'], assignment=copy.deepcopy(current))
            return old['result']
        require(cmd.get('expectedRevision') == s['revision'], 'revision conflict; reload and reconcile')
        result = copy.deepcopy(operate(s, cmd, now))
        s['revision'] += 1
        result['revision'] = s['revision']
        s['operations'][cmd['operationId']] = {'command': receipt_command, 'result': result}
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
