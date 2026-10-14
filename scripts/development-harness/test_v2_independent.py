import sys,json,copy,tempfile,unittest
from pathlib import Path
SRC=Path(__file__).resolve().parent
sys.path.insert(0,str(SRC))
import harness as h
class Workflow(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup);self.path=Path(self.tmp.name)/'state.json'
  self.path.write_bytes((SRC.parents[1]/'docs/development-harness/state.json').read_bytes());self.n=0
 def state(self):return json.loads(self.path.read_text())
 def task(self,id):return next(t for t in self.state()['tasks'] if t['id']==id)
 def run_cmd(self,action,**kw):
  self.n+=1;c=dict(action=action,operationId=f'op-{self.n}',expectedRevision=self.state()['revision'],**kw);return h.transaction(self.path,c,1000)
 def migrate(self):return self.run_cmd('migrate-v2',internalTaskIds=['awakening-storage','baseline-regression'],verifiedDependencies=[dict(task='awakening-integration',dependency='awakening-storage')],authorizationRef='reviewed migration')
 def claim(self,id,role='implement',worker='builder'):return self.run_cmd('claim',task=id,role=role,worker=worker)
 def reviewed(self,id):
  token=self.claim(id)['lease']['token'];self.run_cmd('submit',task=id,worker='builder',token=token,commit='a'*40,checks={k:'evidence' for k in h.CHECKS},criteriaEvidence={k:'evidence' for k in self.task(id)['criteria']})
  token=self.claim(id,'review','reviewer')['lease']['token'];self.run_cmd('review',task=id,worker='reviewer',token=token,commit='a'*40,approved=True,evidence='independent review')
 def test_internal_verified_unlocks_only_after_owner_decision(self):
  self.migrate();self.reviewed('awakening-storage');t=self.task('awakening-storage');self.assertEqual(t['status'],'verified');self.assertNotIn('release',t);self.assertNotIn('acceptanceRef',t)
  with self.assertRaisesRegex(ValueError,'dependency'):self.claim('awakening-integration')
  self.run_cmd('owner-decision',task='awakening-quantities',authorizationRef='owner quantities',evidence='approved quantities')
  self.claim('awakening-integration');self.assertEqual(self.task('awakening-integration')['status'],'running')
 def test_internal_cannot_publish_accept_or_bypass_independence(self):
  self.migrate();self.reviewed('baseline-regression')
  with self.assertRaises(ValueError):self.run_cmd('claim',task='baseline-regression',role='publish',worker='publisher',authorizationRef='publication')
  with self.assertRaises(ValueError):self.run_cmd('accept',task='baseline-regression',authorizationRef='owner')
  s=self.state();t=next(t for t in s['tasks'] if t['id']=='baseline-regression');t['review']['worker']=t['implementer']
  with self.assertRaises(ValueError):h.validate(s)
 def test_migration_preserves_live_lease_receipts_and_replays(self):
  claimed=self.claim('awakening-storage');before=self.state();lease=copy.deepcopy(self.task('awakening-storage')['lease']);self.migrate();after=self.state()
  self.assertEqual(self.task('awakening-storage')['lease'],lease)
  for k,v in before['operations'].items():self.assertEqual(after['operations'][k],v)
  cmd=dict(action='migrate-v2',operationId='op-2',expectedRevision=1,internalTaskIds=['awakening-storage','baseline-regression'],verifiedDependencies=[dict(task='awakening-integration',dependency='awakening-storage')],authorizationRef='reviewed migration')
  h.transaction(self.path,cmd,1000);self.assertEqual(after,self.state())
  self.run_cmd('heartbeat',task='awakening-storage',worker='builder',token=lease['token']);self.assertEqual(self.task('awakening-storage')['lease']['token'],lease['token'])
 def test_public_candidate_does_not_count_complete_or_verified_dependency(self):
  self.migrate();s=self.state();t=next(t for t in s['tasks'] if t['id']=='awakening-integration');t['dependsOn']=[];s['tasks']=[t];self.path.write_text(json.dumps(s));self.reviewed(t['id']);self.assertEqual(self.task(t['id'])['status'],'candidate');self.assertFalse(self.run_cmd('status')['complete'])
  s=self.state();internal=copy.deepcopy(s['tasks'][0]);internal.update(id='consumer',status='ready',dependsOn=[dict(task=t['id'],stage='verified')]);s['tasks'].append(internal)
  with self.assertRaises(ValueError):h.validate(s)
 def test_validation_completion_does_not_need_release(self):
  self.migrate();s=self.state();s['tasks']=[t for t in s['tasks'] if t['id']=='baseline-regression'];self.path.write_text(json.dumps(s));self.reviewed('baseline-regression');self.assertTrue(self.run_cmd('status')['complete'])
 def test_v1_rejects_implicit_internal_classification(self):
  s=self.state();s['tasks'][0]['deliverableKind']='internal'
  with self.assertRaises(ValueError):h.validate(s)
if __name__=='__main__':unittest.main(verbosity=2)
