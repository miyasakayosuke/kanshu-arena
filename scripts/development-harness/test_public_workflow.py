import copy
import json
from pathlib import Path
import tempfile
import unittest
import harness as h


class PublicWorkflow(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
        self.path=Path(self.tmp.name)/'state.json'
        self.path.write_bytes((Path(__file__).parents[2]/'docs/development-harness/state.json').read_bytes())
        self.n=0
    def read(self):return json.loads(self.path.read_text())
    def run_cmd(self,action,**kw):
        self.n+=1
        return h.transaction(self.path,dict(action=action,operationId=f'public-op-{self.n}',expectedRevision=self.read()['revision'],**kw),1000)
    def verify(self):
        assignment=self.run_cmd('claim',task='awakening-storage',role='implement',worker='storage-worker')['assignment']
        task=next(t for t in self.read()['tasks'] if t['id']=='awakening-storage')
        self.run_cmd('submit',task=task['id'],worker='storage-worker',generation=assignment['generation'],commit='a'*40,checks={k:'passing check' for k in h.CHECKS},criteriaEvidence={k:'passing criterion' for k in task['criteria']})
        assignment=self.run_cmd('claim',task=task['id'],role='review',worker='independent-reviewer')['assignment']
        self.run_cmd('review',task=task['id'],worker='independent-reviewer',generation=assignment['generation'],commit='a'*40,approved=True,evidence='fresh independent review')
    def test_internal_completion_and_quantity_gate(self):
        self.verify()
        task=next(t for t in self.read()['tasks'] if t['id']=='awakening-storage')
        self.assertTrue(h.complete_task(task));self.assertFalse(self.run_cmd('status')['complete'])
        with self.assertRaisesRegex(ValueError,'dependency'):
            self.run_cmd('claim',task='awakening-integration',role='implement',worker='integration-worker')
        self.run_cmd('owner-decision',task='awakening-quantities',authorizationRef='verified owner decision',evidence='approved public specification')
        self.run_cmd('claim',task='awakening-integration',role='implement',worker='integration-worker')
    def test_internal_cannot_publish_or_accept(self):
        self.verify()
        with self.assertRaises(ValueError):self.run_cmd('claim',task='awakening-storage',role='publish',worker='publisher',authorizationRef='verified scope')
        with self.assertRaises(ValueError):self.run_cmd('accept',task='awakening-storage',authorizationRef='verified scope')
    def test_verified_requires_exact_independent_evidence(self):
        self.verify();state=self.read()
        for field in ['review','checks','criteriaEvidence']:
            broken=copy.deepcopy(state);task=next(t for t in broken['tasks'] if t['id']=='awakening-storage');del task[field]
            with self.assertRaises(ValueError):h.validate(broken)
        task=next(t for t in state['tasks'] if t['id']=='awakening-storage');task['review']['commit']='b'*40
        with self.assertRaises(ValueError):h.validate(state)
    def test_no_secret_disguised_as_extra_check_or_unknown_result(self):
        self.verify();state=self.read();task=next(t for t in state['tasks'] if t['id']=='awakening-storage')
        task['checks']['unapproved-extra']='value'
        with self.assertRaises(ValueError):h.validate(state)
        state=self.read();next(iter(state['operations'].values()))['result']['unapproved-extra']={'nested':'value'}
        with self.assertRaises(ValueError):h.validate(state)

if __name__=='__main__':unittest.main()
