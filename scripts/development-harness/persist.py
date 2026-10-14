#!/usr/bin/env python3
"""Persist one state operation on an existing dedicated Git state branch.

No branch creation, merge, deployment, credentials or worker execution. Requires an
already-authorized Git remote and branch. Result is returned only after checking
that the remote contains this operation's commit.
"""
import argparse
import json
from pathlib import Path
import subprocess
import tempfile
import harness

STATE = 'docs/development-harness/state.json'


def git(repo, *args):
    return subprocess.check_output(['git', '-C', str(repo), *args], text=True, stderr=subprocess.PIPE, timeout=60).strip()


def persist(repo, remote, branch, command):
    harness.require(branch.startswith('harness-public-v3/') and '..' not in branch, 'use dedicated harness-public-v3/* branch')
    harness.public_schema.identifier(remote)
    harness.require('/' not in remote and ':' not in remote, 'use an already configured remote name')
    git(repo, 'check-ref-format', 'refs/heads/' + branch)
    # FETCH_HEAD is avoided: concurrent readers can fetch different refs.
    parent = git(repo, 'ls-remote', '--exit-code', remote, 'refs/heads/' + branch).split()[0]
    git(repo, 'fetch', '--no-tags', remote, parent)
    raw = git(repo, 'show', parent + ':' + STATE)
    with tempfile.TemporaryDirectory(prefix='arena-harness-') as tmp:
        path = Path(tmp) / 'state.json'
        path.write_text(raw)
        result = harness.transaction(path, command)
        content = path.read_bytes()
    if command['action'] == 'status' or json.loads(raw) == json.loads(content):
        return confirmed_result(repo, remote, branch, command)
    with tempfile.TemporaryDirectory(prefix='arena-harness-index-') as tmp:
        import os
        env = dict(os.environ, GIT_INDEX_FILE=str(Path(tmp) / 'index'))
        def indexed(*args, input=None):
            return subprocess.check_output(['git', '-C', str(repo), *args], input=input, text=True, env=env, stderr=subprocess.PIPE, timeout=60).strip()
        indexed('read-tree', parent)
        blob = indexed('hash-object', '-w', '--stdin', input=content.decode())
        indexed('update-index', '--add', '--cacheinfo', '100644,' + blob + ',' + STATE)
        tree = indexed('write-tree')
        # Parent is exactly the remotely observed head, not the latest fetched head.
        commit = indexed('commit-tree', tree, '-p', parent, '-m', 'Record development harness operation ' + command['operationId'])
    try:
        git(repo, 'push', remote, commit + ':refs/heads/' + branch)
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
        # The server may have accepted a push whose response was lost.
        observed = git(repo, 'ls-remote', '--exit-code', remote, 'refs/heads/' + branch).split()[0]
        git(repo, 'fetch', '--no-tags', remote, observed)
        try:
            git(repo, 'merge-base', '--is-ancestor', commit, observed)
        except subprocess.CalledProcessError:
            raise ValueError('State push not confirmed. Do not dispatch. Reload remote operationId before retry.') from None
    observed = git(repo, 'ls-remote', '--exit-code', remote, 'refs/heads/' + branch).split()[0]
    git(repo, 'fetch', '--no-tags', remote, observed)
    git(repo, 'merge-base', '--is-ancestor', commit, observed)
    return dict(confirmed_result(repo, remote, branch, command), stateCommit=commit)


def confirmed_result(repo, remote, branch, command):
    """Ancestry proves durability, not that an assignment still matches current work."""
    current = git(repo, 'ls-remote', '--exit-code', remote, 'refs/heads/' + branch).split()[0]
    git(repo, 'fetch', '--no-tags', remote, current)
    raw = git(repo, 'show', current + ':' + STATE)
    state = json.loads(raw)
    if command['action'] != 'status':
        harness.require(command['operationId'] in state['operations'], 'operation missing from latest remote state; do not dispatch')
    with tempfile.TemporaryDirectory(prefix='arena-harness-confirm-') as tmp:
        path = Path(tmp) / 'state.json'
        path.write_text(raw)
        result = harness.transaction(path, command)
    return dict(result, observedStateCommit=current)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', default='.')
    parser.add_argument('--remote', default='origin')
    parser.add_argument('--branch', required=True)
    parser.add_argument('--command', required=True)
    args = parser.parse_args()
    try:
        print(json.dumps(persist(args.repo, args.remote, args.branch, json.loads(args.command)), indent=2))
    except (ValueError, KeyError, OSError, subprocess.CalledProcessError, subprocess.TimeoutExpired) as error:
        parser.exit(2, f'harness persistence: {error}\n')
