import sys, json, tempfile, subprocess, threading, concurrent.futures, unittest
from pathlib import Path
from unittest.mock import patch
SRC=Path(__file__).resolve().parent
sys.path.insert(0,str(SRC))
import harness as h, persist as p

class Adversarial(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
  self.root=Path(self.tmp.name);self.remote=self.root/'remote.git';self.repo=self.root/'repo'
  subprocess.run(['git','init','--bare',str(self.remote)],check=True,capture_output=True)
  subprocess.run(['git','init',str(self.repo)],check=True,capture_output=True)
  for key,val in [('user.email','test@example.invalid'),('user.name','Harness independent test')]:p.git(self.repo,'config',key,val)
  p.git(self.repo,'remote','add','origin',str(self.remote))
  self.path=self.repo/p.STATE;self.path.parent.mkdir(parents=True)
  self.path.write_bytes((SRC.parents[1]/p.STATE).read_bytes())
  p.git(self.repo,'add','.');p.git(self.repo,'commit','-m','seed');p.git(self.repo,'push','origin','HEAD:refs/heads/harness-state/test')
 def cmd(self,id='claim',**kw):return dict(action='claim',task='baseline-regression',role='implement',worker=id,operationId=id,expectedRevision=0,**kw)
 def test_replayed_claim_after_reconcile_is_not_dispatchable(self):
  cmd=self.cmd();h.transaction(self.path,cmd,1000)
  h.transaction(self.path,dict(action='reconcile',operationId='reconcile',expectedRevision=1),2800)
  try:r=h.transaction(self.path,cmd,3000)
  except ValueError:return
  self.assertFalse(r.get('dispatchable',True),'Expired claim receipt still appears successful and dispatchable')
 def test_push_succeeded_response_lost_is_read_back(self):
  real=p.git
  def lost(repo,*args):
   result=real(repo,*args)
   if args[0]=='push':raise subprocess.CalledProcessError(128,['git','push'])
   return result
  with patch.object(p,'git',lost):r=p.persist(self.repo,'origin','harness-state/test',self.cmd())
  self.assertEqual(r['stateCommit'],real(self.repo,'ls-remote','origin','refs/heads/harness-state/test').split()[0])
 def test_two_concurrent_distinct_claims_have_one_winner(self):
  barrier=threading.Barrier(2);real=p.git
  def race(repo,*args):
   if args[0]=='push':barrier.wait(timeout=10)
   return real(repo,*args)
  def execute(id):
   try:return p.persist(self.repo,'origin','harness-state/test',self.cmd(id))
   except ValueError:return None
  with patch.object(p,'git',race),concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:rs=list(pool.map(execute,['a','b']))
  self.assertEqual(sum(r is not None for r in rs),1)
  head=real(self.repo,'ls-remote','origin','refs/heads/harness-state/test').split()[0]
  state=json.loads(real(self.repo,'show',head+':'+p.STATE));self.assertEqual(state['revision'],1);self.assertEqual(len(state['operations']),1)
 def test_failure_checkpoint_does_not_advance_state(self):
  real=p.git
  def rejected(repo,*args):
   if args[0]=='push':raise subprocess.CalledProcessError(128,['git','push'])
   return real(repo,*args)
  with patch.object(p,'git',rejected),self.assertRaises(ValueError):p.persist(self.repo,'origin','harness-state/test',self.cmd())
  head=real(self.repo,'ls-remote','origin','refs/heads/harness-state/test').split()[0]
  state=json.loads(real(self.repo,'show',head+':'+p.STATE));self.assertEqual(state['operations'],{});self.assertEqual(state['revision'],0)
 def test_claim_invalidated_before_remote_confirmation_is_not_dispatchable(self):
  real=p.git;fired=False
  def invalidated(repo,*args):
   nonlocal fired
   result=real(repo,*args)
   if args[0]=='push' and not fired:
    fired=True
    head=real(repo,'ls-remote','origin','refs/heads/harness-state/test').split()[0]
    state=json.loads(real(repo,'show',head+':'+p.STATE))
    task=next(t for t in state['tasks'] if t['id']=='baseline-regression')
    with patch.object(p,'git',real):
     p.persist(repo,'origin','harness-state/test',dict(action='fail',task=task['id'],worker=task['lease']['worker'],token=task['lease']['token'],reason='Worker cancelled while acknowledgement pending',operationId='invalidate',expectedRevision=1))
   return result
  try:
   with patch.object(p,'git',invalidated):r=p.persist(self.repo,'origin','harness-state/test',self.cmd())
  except ValueError:return
  self.assertFalse(r.get('dispatchable',True),'Confirmed historical ancestor claim has since been invalidated')
 def test_empty_ledger_is_not_complete(self):
  state={'schemaVersion':1,'revision':0,'operations':{},'tasks':[]}
  try:h.validate(state)
  except ValueError:return
  self.assertFalse(h.summary(state,1000)['complete'],'An empty ledger cannot establish completion')
if __name__=='__main__':unittest.main(verbosity=2)
