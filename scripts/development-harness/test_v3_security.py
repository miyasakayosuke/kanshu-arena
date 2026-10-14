import copy, json, sys, tempfile, unittest
from pathlib import Path
SRC=Path(__file__).resolve().parent;sys.path.insert(0,str(SRC))
import harness as h,public_schema as ps,cold_checkpoint as cold

def task():return dict(id='unit-a',title='Unit A',status='ready',kind='implementation',attempts=0,criteria=['works'],dependsOn=[],required=True,deliverableKind='release',generation=0)
def state():return dict(schemaVersion=3,revision=0,tasks=[task()],operations={})
class Security(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup);self.path=Path(self.tmp.name)/'state.json';self.path.write_text(json.dumps(state()));self.n=0
 def cmd(self,action,now=1000,**kw):
  self.n+=1;return h.transaction(self.path,dict(action=action,operationId=f'op-{self.n}',expectedRevision=json.loads(self.path.read_text())['revision'],**kw),now)
 def test_nested_secret_fields_rejected(self):
  for key in ['token','access_token','clientSecret','authToken','privateKey','password','apiKey']:
   for target in ['root','task','assignment','receipt']:
    s=state();t=s['tasks'][0]
    if target=='root':s[key]='short-secret'
    if target=='task':t[key]='short-secret'
    if target=='assignment':t.update(status='running',generation=1,assignment=dict(role='implement',worker='worker-one',generation=1,expiresAt=2000));t['assignment'][key]='short-secret'
    if target=='receipt':s['operations']['op-one']=dict(command=dict(action='reconcile',operationId='op-one'),result={'revision':1,key:'short-secret'})
    with self.subTest(key=key,target=target),self.assertRaises(ValueError):h.validate(s)
 def test_credential_keys_cannot_hide_in_dynamic_checks(self):
  for key in ['authToken','client_secret','privateKey','access_token']:
   s=state();s['tasks'][0]['checks']={key:'short-secret'}
   with self.subTest(key=key),self.assertRaises(ValueError):h.validate(s)
 def test_sensitive_free_text_is_rejected(self):
  for value in ['password: swordfish','my email is private@example.com','see http://private.invalid/document','Bearer abc','sk-live-secret']:
   with self.subTest(value=value),self.assertRaises(ValueError):ps.text(value)
 def test_cold_checkpoint_drops_legacy_capabilities_and_receipts(self):
  legacy=json.loads((SRC.parents[1]/'docs/development-harness/state.json').read_text());legacy['schemaVersion']=2;legacy['revision']=8;t=next(t for t in legacy['tasks'] if t['id']=='awakening-storage');t.pop('generation');t.update(status='running',title='password: poisoned-title',lease={'worker':'old-worker','token':'LEGACY-SECRET-DO-NOT-PUBLISH-12345','role':'implement','expiresAt':9999});legacy['operations']={'old-claim':{'fingerprint':'LEGACY-FINGERPRINT-DO-NOT-COPY-12345','result':{'lease':copy.deepcopy(t['lease'])}}}
  ref='https://github.com/miyasakayosuke/kanshu-arena/commit/'+'a'*40
  result=cold.cold_checkpoint(legacy,'b'*40,{'awakening-storage':[ref]});encoded=json.dumps(result);t=next(t for t in result['tasks'] if t['id']=='awakening-storage')
  self.assertNotIn('LEGACY',encoded);self.assertNotIn('poisoned-title',encoded);self.assertNotIn('lease',t);self.assertNotIn('assignment',t);self.assertEqual({},result['operations']);self.assertEqual('uncertain',t['block']['type']);self.assertEqual([ref],t['candidateRefs']);self.assertEqual(0,result['revision'])
 def test_cold_checkpoint_rejects_missing_required_tasks(self):
  legacy=json.loads((SRC.parents[1]/'docs/development-harness/state.json').read_text());legacy['schemaVersion']=2;legacy['tasks']=[t for t in legacy['tasks'] if t['id']=='baseline-regression']
  with self.assertRaises(ValueError):cold.cold_checkpoint(legacy,'a'*40)
 def test_cold_checkpoint_keeps_approval_gates(self):
  legacy=json.loads((SRC.parents[1]/'docs/development-harness/state.json').read_text());legacy['schemaVersion']=2;t=next(t for t in legacy['tasks'] if t['id']=='replacement-animation');t['status']='ready';t.pop('block',None)
  result=cold.cold_checkpoint(legacy,'a'*40);t=next(t for t in result['tasks'] if t['id']=='replacement-animation');self.assertEqual('blocked',t['status']);self.assertEqual('approval',t['block']['type'])

 def test_legacy_runtime_mutations_refused(self):
  s=state();s['schemaVersion']=2;self.path.write_text(json.dumps(s));before=self.path.read_bytes()
  with self.assertRaises(ValueError):self.cmd('claim',task='unit-a',role='implement',worker='worker-one')
  self.assertEqual(before,self.path.read_bytes())
 def test_new_claim_uses_nonsecret_monotonic_generation(self):
  r=self.cmd('claim',task='unit-a',role='implement',worker='worker-one');self.assertEqual(1,r['assignment']['generation']);self.assertNotIn('token',json.dumps(r));self.assertEqual({'role','worker','generation','expiresAt'},set(r['assignment']))
  self.cmd('reconcile',now=2800);self.cmd('resolve',now=2800,task='unit-a',outcome='retry',evidence='Worker stopped and branch inspected');r2=self.cmd('claim',now=3100,task='unit-a',role='implement',worker='worker-two');self.assertEqual(2,r2['assignment']['generation'])
  with self.assertRaises(ValueError):self.cmd('heartbeat',now=3100,task='unit-a',worker='worker-one',generation=1)
 def test_no_credential_is_accepted_as_command_capability(self):
  before=self.path.read_bytes()
  with self.assertRaises(ValueError):self.cmd('claim',task='unit-a',role='implement',worker='worker-one',token='short-secret')
  self.assertEqual(before,self.path.read_bytes())
if __name__=='__main__':unittest.main(verbosity=2)
