import concurrent.futures
import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('harness', Path(__file__).with_name('harness.py'))
h = importlib.util.module_from_spec(spec)
spec.loader.exec_module(h)


def task(id):
    return dict(id=id, title=id, status='ready', kind='implementation', attempts=0, generation=0, deliverableKind='release',
                criteria=['works'], dependsOn=[], required=True)


class HarnessTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path = Path(self.tmp.name) / 'state.json'
        self.path.write_text(json.dumps(dict(schemaVersion=3, revision=0, operations={}, tasks=[task('a'), task('b'), task('c')])))
        self.counter = 0

    def command(self, action, **kw):
        self.counter += 1
        return dict(action=action, expectedRevision=self.read()['revision'], operationId='op-'+str(self.counter), **kw)

    def run_cmd(self, action, now=1000, **kw):
        return h.transaction(self.path, self.command(action, **kw), now)

    def read(self):
        return json.loads(self.path.read_text())

    def claim(self, task='a', role='implement', worker='one', now=1000):
        return self.run_cmd('claim', now=now, task=task, role=role, worker=worker)['assignment']['generation']

    def candidate(self):
        generation = self.claim()
        self.run_cmd('submit', task='a', generation=generation, worker='one', commit='a'*40,
                     checks={k:'evidence/test.log' for k in h.CHECKS}, criteriaEvidence={'works':'evidence/qa.json'})
        generation = self.claim(role='review', worker='two')
        self.run_cmd('review', task='a', generation=generation, worker='two', commit='a'*40, evidence='evidence/review.json', approved=True)

    def test_idempotent_claim_and_payload_collision(self):
        cmd = self.command('claim', task='a', role='implement', worker='one')
        first = h.transaction(self.path, cmd, 1000)
        self.assertEqual(first, h.transaction(self.path, cmd, 1100))
        self.assertEqual(1, self.read()['tasks'][0]['attempts'])
        with self.assertRaisesRegex(ValueError, 'different payload'):
            h.transaction(self.path, dict(cmd, worker='other'), 1100)

    def test_stale_receipt_cannot_dispatch(self):
        cmd = self.command('claim', task='a', role='implement', worker='one')
        h.transaction(self.path, cmd, 1000)
        with self.assertRaisesRegex(ValueError, 'historical assignment'):
            h.transaction(self.path, cmd, 2800)
        self.run_cmd('reconcile', now=2800)
        with self.assertRaisesRegex(ValueError, 'historical assignment'):
            h.transaction(self.path, cmd, 2800)
        self.run_cmd('resolve', now=2800, task='a', outcome='retry', evidence='worker stopped')
        self.claim(now=3100)
        with self.assertRaisesRegex(ValueError, 'historical assignment'):
            h.transaction(self.path, cmd, 3100)

    def test_revision_cas_and_no_partial_writes(self):
        cmd = self.command('claim', task='a', role='implement', worker='one')
        self.claim(task='b')
        before = self.path.read_bytes()
        with self.assertRaisesRegex(ValueError, 'revision conflict'):
            h.transaction(self.path, cmd, 1000)
        self.assertEqual(before, self.path.read_bytes())

    def test_parallel_capacity_and_fresh_claim(self):
        self.claim('a')
        self.claim('b')
        with self.assertRaisesRegex(ValueError, 'capacity'):
            self.claim('c')
        with self.assertRaisesRegex(ValueError, 'not eligible'):
            self.claim('a')

    def test_concurrent_cas_has_one_winner(self):
        cmds = [dict(action='claim', task=x, role='implement', worker=x, operationId=x, expectedRevision=0) for x in ['a','b']]
        def execute(cmd):
            try:
                h.transaction(self.path, cmd, 1000)
                return True
            except ValueError:
                return False
        with concurrent.futures.ThreadPoolExecutor() as pool:
            self.assertEqual(1, sum(pool.map(execute, cmds)))
        self.assertEqual(1, self.read()['revision'])

    def test_expired_generation_and_read_first(self):
        generation = self.claim()
        with self.assertRaisesRegex(ValueError, 'expired'):
            self.run_cmd('heartbeat', now=2800, task='a', generation=generation, worker='one')
        self.run_cmd('reconcile', now=2800)
        with self.assertRaisesRegex(ValueError, 'not eligible'):
            self.claim(now=2800)
        self.run_cmd('resolve', now=2800, task='a', outcome='retry', evidence='branch and worker inspected; no completed change')
        with self.assertRaises(ValueError):
            self.claim(now=2800)
        newer = self.claim(now=3100)
        self.assertNotEqual(generation, newer)
        with self.assertRaisesRegex(ValueError, 'generation'):
            self.run_cmd('heartbeat', now=3100, task='a', generation=generation, worker='one')

    def test_independent_review_and_evidence(self):
        generation = self.claim()
        with self.assertRaises(ValueError):
            self.run_cmd('submit', task='a', generation=generation, worker='one', commit='a'*40, checks={}, criteriaEvidence={})
        self.run_cmd('submit', task='a', generation=generation, worker='one', commit='a'*40,
                     checks={k:'log' for k in h.CHECKS}, criteriaEvidence={'works':'qa'})
        with self.assertRaisesRegex(ValueError, 'independent'):
            self.claim(role='review', worker='one')
        generation = self.claim(role='review', worker='two')
        with self.assertRaisesRegex(ValueError, 'exact commit'):
            self.run_cmd('review', task='a', generation=generation, worker='two', commit='b'*40, evidence='review', approved=True)

    def test_publication_and_acceptance_are_separate(self):
        self.candidate()
        self.assertFalse(self.run_cmd('status')['complete'])
        with self.assertRaisesRegex(ValueError, 'authorization'):
            self.claim(role='publish', worker='publisher')
        generation = self.run_cmd('claim', task='a', role='publish', worker='publisher', authorizationRef='operator authorization record')['assignment']['generation']
        with self.assertRaisesRegex(ValueError, 'liveCheck'):
            self.run_cmd('release', task='a', worker='publisher', generation=generation, commit='a'*40, deployment='url')
        self.run_cmd('release', task='a', worker='publisher', generation=generation, commit='a'*40, deployment='url', liveCheck='live', creditsCheck='credits', noticesCheck='notices')
        self.assertEqual('released', self.read()['tasks'][0]['status'])
        self.run_cmd('accept', task='a', authorizationRef='owner acceptance record')
        self.assertEqual('accepted', self.read()['tasks'][0]['status'])

    def test_bounded_retry(self):
        now = 1000
        for attempt in range(3):
            generation = self.claim(now=now)
            self.run_cmd('fail', now=now, task='a', worker='one', generation=generation, reason='execution failed')
            result = self.run_cmd('resolve', now=now, task='a', outcome='retry', evidence='worker stopped; no artifacts')
            now += 300 * 2 ** attempt
        self.assertEqual('blocked', result['status'])
        self.assertEqual('exhausted', self.read()['tasks'][0]['block']['type'])

    def test_approval_isolation(self):
        generation = self.claim()
        self.run_cmd('block', task='a', worker='one', generation=generation, reason='owner art approval needed')
        self.claim('b')
        with self.assertRaisesRegex(ValueError, 'authorization'):
            self.run_cmd('resolve', task='a', outcome='retry', evidence='still waiting')

    def test_dependency_cycle_and_assignment_validation(self):
        s = self.read()
        s['tasks'][0]['dependsOn'] = [{'task':'b','stage':'released'}]
        s['tasks'][1]['dependsOn'] = [{'task':'a','stage':'released'}]
        with self.assertRaisesRegex(ValueError, 'cycle'):
            h.validate(s)
        s = self.read()
        s['tasks'][0]['status'] = 'running'
        with self.assertRaisesRegex(ValueError, 'assignment/state'):
            h.validate(s)

    def test_dependencies_do_not_stall_independent_work(self):
        s = self.read()
        s['tasks'][0]['dependsOn'] = [{'task':'b','stage':'released'}]
        self.path.write_text(json.dumps(s))
        with self.assertRaisesRegex(ValueError, 'dependency'):
            self.claim('a')
        self.claim('c')

    def test_publisher_capacity_and_heartbeat(self):
        self.candidate()
        s = self.read()
        s['tasks'][1] = dict(copy.deepcopy(s['tasks'][0]), id='b', title='b')
        self.path.write_text(json.dumps(s))
        generation = self.run_cmd('claim', task='a', role='publish', worker='publisher', authorizationRef='authorized')['assignment']['generation']
        with self.assertRaisesRegex(ValueError, 'capacity'):
            self.run_cmd('claim', task='b', role='publish', worker='publisher-two', authorizationRef='authorized')
        self.run_cmd('heartbeat', now=1500, task='a', worker='publisher', generation=generation)
        self.assertEqual(3300, self.read()['tasks'][0]['assignment']['expiresAt'])

    def test_decision_requires_evidence_and_stays_required(self):
        s = self.read()
        s['tasks'] = [dict(task('scope'), kind='decision', status='blocked', block={'type':'approval','reason':'scope'})]
        self.path.write_text(json.dumps(s))
        self.assertFalse(self.run_cmd('status')['complete'])
        with self.assertRaisesRegex(ValueError, 'criteria evidence'):
            self.run_cmd('owner-decision', task='scope', authorizationRef='owner')
        self.run_cmd('owner-decision', task='scope', authorizationRef='owner', evidence='approved criteria document')
        self.assertTrue(self.read()['tasks'][0]['required'])
        self.assertTrue(self.run_cmd('status')['complete'])

    def test_seed_valid(self):
        seed = Path(__file__).parents[2] / 'docs/development-harness/state.json'
        h.validate(json.loads(seed.read_text()))


if __name__ == '__main__':
    unittest.main()
