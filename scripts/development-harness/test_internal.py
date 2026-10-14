import copy
import json
from pathlib import Path
import tempfile
import unittest
import harness as h


class InternalGateTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path = Path(self.tmp.name) / 'state.json'
        seed = Path(__file__).parents[2] / 'docs/development-harness/state.json'
        self.path.write_bytes(seed.read_bytes())
        self.counter = 0

    def read(self):
        return json.loads(self.path.read_text())

    def run_cmd(self, action, **kw):
        self.counter += 1
        return h.transaction(self.path, dict(action=action, operationId=str(self.counter), expectedRevision=self.read()['revision'], **kw), 1000)

    def migration(self):
        return dict(action='migrate-v2', operationId='migration', expectedRevision=self.read()['revision'],
                    internalTaskIds=['awakening-storage','baseline-regression'],
                    verifiedDependencies=[dict(task='awakening-integration',dependency='awakening-storage')],
                    authorizationRef='reviewed gate correction',
                    candidateRefs={'awakening-preview':['https://github.com/miyasakayosuke/kanshu-arena/tree/preview']})

    def claim(self, task, role='implement', worker='implementer'):
        return self.run_cmd('claim',task=task,role=role,worker=worker)['lease']['token']

    def verify_internal(self, task='awakening-storage'):
        token = self.claim(task)
        t = next(t for t in self.read()['tasks'] if t['id']==task)
        self.run_cmd('submit',task=task,worker='implementer',token=token,commit='a'*40,
                     checks={k:'passing evidence' for k in h.CHECKS},criteriaEvidence={k:'criterion evidence' for k in t['criteria']})
        token = self.claim(task,role='review',worker='reviewer')
        self.run_cmd('review',task=task,worker='reviewer',token=token,commit='a'*40,approved=True,evidence='independent review')

    def test_migration_preserves_claims_receipts_and_is_idempotent(self):
        token = self.claim('baseline-regression')
        before = self.read()
        cmd = self.migration()
        first = h.transaction(self.path,cmd,1000)
        self.assertEqual(first,h.transaction(self.path,cmd,1000))
        after = self.read()
        self.assertEqual(before['revision']+1,after['revision'])
        self.assertEqual(before['operations'],{k:v for k,v in after['operations'].items() if k!='migration'})
        for old,new in zip(before['tasks'],after['tasks']):
            for key,value in old.items():
                if key!='dependsOn':
                    self.assertEqual(value,new[key],(old['id'],key))
        self.run_cmd('heartbeat',task='baseline-regression',worker='implementer',token=token)

    def test_storage_verified_unlocks_only_after_quantities_decided(self):
        h.transaction(self.path,self.migration(),1000)
        self.verify_internal()
        with self.assertRaisesRegex(ValueError,'dependency'):
            self.claim('awakening-integration')
        self.run_cmd('owner-decision',task='awakening-quantities',authorizationRef='owner decision',evidence='approved quantities')
        self.claim('awakening-integration')

    def test_internal_cannot_publish_or_accept(self):
        h.transaction(self.path,self.migration(),1000)
        self.verify_internal()
        with self.assertRaises(ValueError):
            self.claim('awakening-storage',role='publish',worker='publisher')
        with self.assertRaisesRegex(ValueError,'only release'):
            self.run_cmd('accept',task='awakening-storage',authorizationRef='owner')

    def test_internal_verified_requires_all_exact_evidence(self):
        h.transaction(self.path,self.migration(),1000)
        self.verify_internal()
        state = self.read()
        for field in ['review','checks','criteriaEvidence']:
            broken = copy.deepcopy(state)
            task = next(t for t in broken['tasks'] if t['id']=='awakening-storage')
            del task[field]
            with self.assertRaises(ValueError): h.validate(broken)
        task = next(t for t in state['tasks'] if t['id']=='awakening-storage')
        task['review']['commit']='b'*40
        with self.assertRaisesRegex(ValueError,'review does not match'): h.validate(state)

    def test_public_candidate_never_satisfies_verified_dependency(self):
        h.transaction(self.path,self.migration(),1000)
        self.verify_internal()
        state=self.read()
        task=next(t for t in state['tasks'] if t['id']=='awakening-storage')
        task['deliverableKind']='release'
        task['status']='candidate'
        with self.assertRaisesRegex(ValueError,'dependency stage'): h.validate(state)
        self.assertFalse(h.dependency_met(state,'awakening-storage','verified'))
        self.assertFalse(h.complete_task(task))

    def test_mixed_completion_keeps_owner_acceptance(self):
        h.transaction(self.path,self.migration(),1000)
        self.verify_internal()
        self.assertFalse(self.run_cmd('status')['complete'])
        state=self.read()
        task=next(t for t in state['tasks'] if t['id']=='awakening-storage')
        self.assertTrue(h.complete_task(task))
        self.assertFalse(h.complete_task(dict(task,deliverableKind='release',status='released')))

    def test_failed_or_stale_migration_is_atomic(self):
        cmd=self.migration()
        self.claim('baseline-regression')
        before=self.path.read_bytes()
        with self.assertRaisesRegex(ValueError,'revision conflict'): h.transaction(self.path,cmd,1000)
        self.assertEqual(before,self.path.read_bytes())
        bad=self.migration();bad['internalTaskIds'].append('replacement-animation')
        with self.assertRaisesRegex(ValueError,'limited'): h.transaction(self.path,bad,1000)
        self.assertEqual(before,self.path.read_bytes())
        bad=self.migration();bad['candidateRefs']={'awakening-preview':['https://private.invalid/file']}
        with self.assertRaisesRegex(ValueError,'public repository'): h.transaction(self.path,bad,1000)
        self.assertEqual(before,self.path.read_bytes())

    def test_legacy_does_not_silently_weaken(self):
        state=self.read()
        task=next(t for t in state['tasks'] if t['id']=='awakening-storage')
        self.assertEqual('release',h.deliverable(task))
        task['deliverableKind']='internal'
        with self.assertRaisesRegex(ValueError,'migrate v1'): h.validate(state)


if __name__=='__main__': unittest.main()
