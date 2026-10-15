"""Bounded plans supplement gates; claims and prior audit are never reset."""
import concurrent.futures
import copy
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import harness as h
import persist
import public_schema as ps
from test_harness import task
import test_persist


class ReplanTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path = Path(self.tmp.name) / 'state.json'
        self.n = 0
        t = task('motion')
        t.update(status='blocked', attempts=3, generation=4,
                 block={'type': 'approval', 'reason': 'Prior rendered candidate failed quality', 'previousRole': 'implement'})
        self.path.write_text(json.dumps(dict(schemaVersion=3, revision=0, operations={}, tasks=[t])))

    def read(self):
        return json.loads(self.path.read_text())

    def cmd(self, action, **kw):
        self.n += 1
        return dict(action=action, operationId='new-op-' + str(self.n), expectedRevision=self.read()['revision'], **kw)

    def run_cmd(self, action, now=1000, **kw):
        return h.transaction(self.path, self.cmd(action, **kw), now)

    def replan(self, **kw):
        values = dict(task='motion', generation=self.read()['tasks'][0]['generation'],
                      planRevision=h.plan_revision(self.read()['tasks'][0]) + 1,
                      method='Full-body key poses followed by sprite-led acting', criteria=['Readable body mechanics'],
                      claimBudget=2, authorizationRef='Fresh owner-approved motion plan one',
                      evidence='Prior worker stopped; exact candidate and failure reviewed; new bounded scope verified')
        values.update(kw)
        return self.cmd('replan', **values)

    def claim(self, now=1000, **kw):
        values = dict(task='motion', role='implement', worker='builder', planRevision=1)
        values.update(kw)
        return self.run_cmd('claim', now=now, **values)['assignment']['generation']

    def test_archive_preserves_all_prior_dynamic_evidence_and_original_gates(self):
        s = self.read(); t = s['tasks'][0]
        t.update(commit='a'*40, checks={k:'Old check' for k in h.CHECKS}, criteriaEvidence={'works':'Old evidence'},
                 review={'worker':'old-reviewer','commit':'a'*40,'evidence':'Old review'},
                 release=dict(commit='a'*40, deployment='Old deploy', liveCheck='Old live', creditsCheck='Old credits', noticesCheck='Old notices'),
                 acceptanceRef='Old acceptance', publicationApprovalRef='Old publication',
                 candidateRefs=['Public candidate'], lastFailure='Old failure', notBefore=999, implementer='old-builder')
        s['operations']['old-read'] = {'command':{'action':'reconcile','operationId':'old-read'},'result':{'stale':[],'revision':0}}
        self.path.write_text(json.dumps(s)); old = copy.deepcopy(t)
        h.transaction(self.path, self.replan(), 1000)
        result = self.read(); current = result['tasks'][0]
        self.assertEqual(s['operations']['old-read'], result['operations']['old-read'])
        self.assertEqual(3, current['attempts']); self.assertEqual(5, current['generation'])
        self.assertEqual('ready', current['status']); self.assertEqual('release', current['deliverableKind'])
        for key in ('id','title','kind','criteria','dependsOn','required'):
            self.assertEqual(old[key], current[key])
        for key in h.RETIRED_FIELDS:
            self.assertNotIn(key, current)
            if key in old: self.assertEqual(old[key], current['plans'][0]['previous'][key])
        self.assertEqual(3, current['plans'][0]['startAttempts'])
        self.assertEqual(5, h.claim_limit(current))

    def test_missing_or_invalid_inputs_fail_atomically(self):
        invalid = [dict(claimBudget=0),dict(claimBudget=4),dict(claimBudget=True),dict(criteria=[]),
                   dict(criteria=['same','same']),dict(criteria=['works']),dict(authorizationRef=''),
                   dict(evidence=''),dict(method=''),dict(generation=3),dict(planRevision=2),dict(title='Bypass rename'),dict(dependsOn=[])]
        for kw in invalid:
            with self.subTest(kw=kw):
                before=self.path.read_bytes()
                with self.assertRaises(ValueError): h.transaction(self.path,self.replan(**kw),1000)
                self.assertEqual(before,self.path.read_bytes())

    def test_replan_is_not_uncertainty_external_publication_or_decision_resolution(self):
        for block in ('uncertain','external','dependency'):
            s=self.read(); s['tasks'][0]['block']['type']=block; self.path.write_text(json.dumps(s))
            with self.subTest(block=block),self.assertRaises(ValueError): h.transaction(self.path,self.replan(),1000)
        s=self.read();s['tasks'][0]['block'].update(type='approval',previousRole='publish');self.path.write_text(json.dumps(s))
        with self.assertRaises(ValueError): h.transaction(self.path,self.replan(),1000)
        s=self.read();s['tasks'][0].update(kind='decision');s['tasks'][0]['block']['previousRole']='implement';self.path.write_text(json.dumps(s))
        with self.assertRaises(ValueError): h.transaction(self.path,self.replan(),1000)

    def test_old_approval_reference_is_not_a_new_plan_grant(self):
        s=self.read();s['operations']['old-approval']={'command':dict(action='resolve',task='motion',outcome='retry',evidence='Prior read-first check',authorizationRef='Old approval',operationId='old-approval'),'result':dict(status='blocked',revision=0)}
        self.path.write_text(json.dumps(s))
        with self.assertRaisesRegex(ValueError,'fresh plan-specific'): h.transaction(self.path,self.replan(authorizationRef='Old approval'),1000)

    def test_new_plan_cap_counts_claims_not_completed_visual_failures(self):
        h.transaction(self.path,self.replan(),1000)
        with self.assertRaisesRegex(ValueError,'current approved plan'): self.claim(planRevision=0)
        generation=self.claim()
        self.assertEqual(4,self.read()['tasks'][0]['attempts'])
        self.run_cmd('fail',task='motion',worker='builder',generation=generation,reason='Execution interrupted')
        self.run_cmd('resolve',task='motion',outcome='retry',evidence='Actual worker stopped; branch and artifacts inspected')
        with self.assertRaises(ValueError): self.claim(now=1299)
        generation=self.claim(now=1300)
        self.run_cmd('block',now=1300,task='motion',worker='builder',generation=generation,blockType='quality',reason='Rendered motion failed review')
        self.run_cmd('resolve',now=1300,task='motion',outcome='retry',evidence='Independent quality failure confirmed')
        t=self.read()['tasks'][0]
        self.assertEqual(5,t['attempts']);self.assertEqual('exhausted',t['block']['type'])
        with self.assertRaises(ValueError): self.claim(now=5000)

    def test_every_claim_budget_exhausts_cleanly_after_failure_or_quality_block(self):
        for budget in (1, 2, 3):
            for failure in ('fail', 'quality'):
                with self.subTest(budget=budget, failure=failure):
                    fixture=ReplanTest();fixture.setUp()
                    try:
                        h.transaction(fixture.path,fixture.replan(claimBudget=budget),1000)
                        now=1000
                        for offset in range(budget):
                            generation=fixture.claim(now=now)
                            if failure=='fail':
                                fixture.run_cmd('fail',now=now,task='motion',worker='builder',generation=generation,reason='Execution interrupted')
                            else:
                                fixture.run_cmd('block',now=now,task='motion',worker='builder',generation=generation,blockType='quality',reason='Rendered quality failed')
                            result=fixture.run_cmd('resolve',now=now,task='motion',outcome='retry',evidence='Actual worker stopped and candidate inspected')
                            if offset < budget-1:
                                delay=300*2**offset
                                self.assertEqual(now+delay,result['notBefore'])
                                with self.assertRaises(ValueError):fixture.claim(now=now+delay-1)
                                now+=delay
                        t=fixture.read()['tasks'][0]
                        self.assertEqual(3+budget,t['attempts']);self.assertEqual('exhausted',t['block']['type'])
                        self.assertNotIn('notBefore',t);self.assertNotIn('notBefore',result)
                        before=fixture.path.read_bytes()
                        with self.assertRaises(ValueError):fixture.claim(now=now+9999)
                        self.assertEqual(before,fixture.path.read_bytes())
                    finally:fixture.doCleanups()

    def test_one_claim_expiry_reconciles_and_next_plan_delay_restarts(self):
        h.transaction(self.path,self.replan(claimBudget=1),1000)
        self.claim()
        self.run_cmd('reconcile',now=2800)
        result=self.run_cmd('resolve',now=2800,task='motion',outcome='retry',evidence='Expired worker stopped; exact candidate and deployment inspected')
        self.assertEqual('blocked',result['status']);self.assertNotIn('notBefore',result)
        h.transaction(self.path,self.replan(claimBudget=2,method='Second genuinely changed method',authorizationRef='New approval for second plan'),2800)
        generation=self.claim(now=2800,planRevision=2)
        self.run_cmd('fail',now=2800,task='motion',worker='builder',generation=generation,reason='Execution interrupted')
        result=self.run_cmd('resolve',now=2800,task='motion',outcome='retry',evidence='Worker stopped; no uncertain side effects remain')
        self.assertEqual(3100,result['notBefore'])
        self.assertEqual(5,self.read()['tasks'][0]['attempts'])

    def test_original_exhausted_task_without_retry_timestamp_can_resolve(self):
        s=self.read();s['tasks'][0]['block']['type']='uncertain';self.path.write_text(json.dumps(s))
        result=self.run_cmd('resolve',task='motion',outcome='retry',evidence='Original worker and candidate checked')
        self.assertEqual('blocked',result['status']);self.assertNotIn('notBefore',result)
        self.assertEqual('exhausted',self.read()['tasks'][0]['block']['type'])
        self.assertEqual(3,self.read()['tasks'][0]['attempts'])

    def test_plan_replay_never_replenishes_budget_or_dispatches_old_assignment(self):
        cmd=self.replan();first=h.transaction(self.path,cmd,1000)
        claim=self.cmd('claim',task='motion',role='implement',worker='builder',planRevision=1)
        generation=h.transaction(self.path,claim,1000)['assignment']['generation']
        before=self.path.read_bytes();self.assertEqual(first,h.transaction(self.path,cmd,1100));self.assertEqual(before,self.path.read_bytes())
        self.run_cmd('block',task='motion',worker='builder',generation=generation,blockType='quality',reason='New quality result')
        second=self.replan(method='New full-body hand-drawn acting',authorizationRef='Fresh approval for plan two')
        h.transaction(self.path,second,1000)
        with self.assertRaisesRegex(ValueError,'historical assignment'):h.transaction(self.path,claim,1100)
        with self.assertRaisesRegex(ValueError,'current approved plan'):self.claim()
        self.assertEqual(4,self.read()['tasks'][0]['attempts'])

    def test_second_plan_requires_new_approval_new_method_and_a_consumed_claim(self):
        h.transaction(self.path,self.replan(),1000)
        t=self.read()['tasks'][0]
        with self.assertRaises(ValueError): h.transaction(self.path,self.replan(),1000)
        generation=self.claim()
        self.run_cmd('block',task='motion',worker='builder',generation=generation,blockType='quality',reason='Pose failed')
        with self.assertRaisesRegex(ValueError,'fresh plan-specific'):h.transaction(self.path,self.replan(method='Another method'),1000)
        with self.assertRaisesRegex(ValueError,'new method'):h.transaction(self.path,self.replan(authorizationRef='Another approval'),1000)
        h.transaction(self.path,self.replan(method='Another method',authorizationRef='Another approval'),1000)
        self.assertEqual(2,h.plan_revision(self.read()['tasks'][0]))

    def test_original_and_plan_criteria_are_both_required_and_release_approvals_are_fresh(self):
        s=self.read();s['tasks'][0].update(publicationApprovalRef='Retired publication approval',acceptanceRef='Retired owner acceptance');self.path.write_text(json.dumps(s))
        h.transaction(self.path,self.replan(),1000);generation=self.claim()
        submission=dict(task='motion',worker='builder',generation=generation,commit='b'*40,checks={k:'Fresh check' for k in h.CHECKS})
        for evidence in ({'works':'Pass'},{'Readable body mechanics':'Pass'}):
            with self.assertRaisesRegex(ValueError,'every criterion'):self.run_cmd('submit',**submission,criteriaEvidence=evidence)
        self.run_cmd('submit',**submission,criteriaEvidence={'works':'Fresh acceptance evidence','Readable body mechanics':'Fresh pose evidence'})
        generation=self.claim(role='review',worker='reviewer')
        self.run_cmd('review',task='motion',worker='reviewer',generation=generation,commit='b'*40,approved=True,evidence='Independent exact-commit review')
        self.assertEqual('candidate',self.read()['tasks'][0]['status'])
        with self.assertRaisesRegex(ValueError,'fresh publication'):self.claim(role='publish',worker='publisher',authorizationRef='Fresh owner-approved motion plan one')
        with self.assertRaisesRegex(ValueError,'fresh publication'):self.claim(role='publish',worker='publisher',authorizationRef='Retired publication approval')
        generation=self.claim(role='publish',worker='publisher',authorizationRef='New publication approval')
        self.run_cmd('release',task='motion',worker='publisher',generation=generation,commit='b'*40,deployment='New deploy',liveCheck='New live',creditsCheck='New credits',noticesCheck='New notices')
        with self.assertRaisesRegex(ValueError,'fresh owner acceptance'):self.run_cmd('accept',task='motion',authorizationRef='New publication approval')
        with self.assertRaisesRegex(ValueError,'fresh owner acceptance'):self.run_cmd('accept',task='motion',authorizationRef='Retired owner acceptance')
        self.run_cmd('accept',task='motion',authorizationRef='New owner acceptance')
        self.assertEqual('accepted',self.read()['tasks'][0]['status'])

    def test_concurrent_plan_cas_has_one_winner(self):
        commands=[self.replan(authorizationRef='Fresh approval '+label) for label in ('one','two')]
        def run(cmd):
            try:h.transaction(self.path,cmd,1000);return True
            except ValueError:return False
        with concurrent.futures.ThreadPoolExecutor() as pool:self.assertEqual(1,sum(pool.map(run,commands)))
        self.assertEqual(1,self.read()['revision']);self.assertEqual(1,len(self.read()['tasks'][0]['plans']))

    def test_strict_plan_and_archive_disclosure_schema(self):
        h.transaction(self.path,self.replan(),1000)
        for target in ('plan','archive','block'):
            s=self.read();p=s['tasks'][0]['plans'][0]
            obj=p if target=='plan' else p['previous'] if target=='archive' else p['previous']['block']
            obj['secret']='short-sensitive-value'
            with self.subTest(target=target),self.assertRaises(ValueError):h.validate(s)
        s=self.read();s['tasks'][0]['plans'][0]['method']='private@example.com'
        with self.assertRaises(ValueError):h.validate(s)

    def test_documented_json_schema_matches_command_and_archive_allowlists(self):
        schema=json.loads((Path(__file__).parents[2]/'docs/development-harness/state.schema.json').read_text())
        commands=schema['properties']['operations']['additionalProperties']['properties']['command']['oneOf']
        by_action={c['properties']['action']['const']:c for c in commands}
        self.assertEqual(set(ps.COMMAND_FIELDS),set(by_action))
        for action,fields in ps.COMMAND_FIELDS.items():
            self.assertEqual(fields | {'action','operationId','expectedRevision'},set(by_action[action]['properties']))
        plan=schema['properties']['tasks']['items']['properties']['plans']['items']
        self.assertEqual(ps.SNAPSHOT_FIELDS,set(plan['properties']['previous']['properties']))
        self.assertFalse(plan['additionalProperties']);self.assertFalse(plan['properties']['previous']['additionalProperties'])
        self.assertEqual(3,plan['properties']['claimBudget']['maximum'])

    def test_history_and_counter_tampering_fail_validation(self):
        h.transaction(self.path,self.replan(),1000)
        for change in ('counter','baseline','revision','generation','budget'):
            s=self.read();t=s['tasks'][0];p=t['plans'][0]
            if change=='counter':t['attempts']=0
            if change=='baseline':p['startAttempts']=2
            if change=='revision':p['revision']=2
            if change=='generation':p['previous']['generation']=t['generation']
            if change=='budget':p['claimBudget']=4
            with self.subTest(change=change),self.assertRaises(ValueError):h.validate(s)


class ReplanPersistTest(unittest.TestCase):
    git = test_persist.PersistTest.git

    def setUp(self):
        test_persist.PersistTest.setUp(self)
        path=self.repo/persist.STATE
        s=json.loads(path.read_text());t=next(t for t in s['tasks'] if t['id']=='replacement-animation')
        t.update(attempts=3,generation=4,status='blocked',block={'type':'quality','reason':'Prior rendered failure','previousRole':'implement'})
        path.write_text(json.dumps(s));self.git('add','.');self.git('commit','-m','Preserve exhausted original plan');self.git('push','origin','HEAD:refs/heads/harness-public-v3/test')

    def replan_command(self, label='one'):
        return dict(action='replan',task='replacement-animation',generation=4,planRevision=1,claimBudget=2,
                    method='New full-body acting method',criteria=['Readable key poses'],authorizationRef='Fresh plan approval '+label,
                    evidence='Stopped worker and failed candidate independently inspected',operationId='replan-'+label,expectedRevision=0)

    def test_remote_plan_is_parent_exact_and_old_approval_cannot_be_replayed_as_new(self):
        before=self.git('ls-remote','origin','refs/heads/harness-public-v3/test').split()[0]
        result=persist.persist(self.repo,'origin','harness-public-v3/test',self.replan_command())
        self.assertEqual(before,self.git('rev-parse',result['stateCommit']+'^'))
        current=json.loads(self.git('show',result['stateCommit']+':'+persist.STATE))
        t=next(t for t in current['tasks'] if t['id']=='replacement-animation')
        self.assertEqual(3,t['attempts']);self.assertEqual(1,len(t['plans']))
        replay=persist.persist(self.repo,'origin','harness-public-v3/test',self.replan_command())
        self.assertEqual(result['observedStateCommit'],replay['observedStateCommit'])

    def test_remote_replan_lost_acknowledgement_is_reconciled_without_duplicate_budget(self):
        import subprocess
        real=persist.git;fired=False
        def lost(repo,*args):
            nonlocal fired
            answer=real(repo,*args)
            if args[0]=='push' and not fired:
                fired=True
                raise subprocess.TimeoutExpired('git push',60)
            return answer
        with patch.object(persist,'git',lost):
            result=persist.persist(self.repo,'origin','harness-public-v3/test',self.replan_command())
        current=json.loads(self.git('show',result['observedStateCommit']+':'+persist.STATE))
        task=next(t for t in current['tasks'] if t['id']=='replacement-animation')
        self.assertEqual(3,task['attempts']);self.assertEqual(1,len(task['plans']))
        self.assertEqual(1,current['revision'])

    def test_remote_concurrent_replans_have_one_durable_winner(self):
        real=persist.git;fired=False
        def racing(repo,*args):
            nonlocal fired
            if args[0]=='push' and not fired:
                fired=True
                with patch.object(persist,'git',real):persist.persist(self.repo,'origin','harness-public-v3/test',self.replan_command('winner'))
            return real(repo,*args)
        with patch.object(persist,'git',racing),self.assertRaisesRegex(ValueError,'not confirmed'):
            persist.persist(self.repo,'origin','harness-public-v3/test',self.replan_command('loser'))
        head=self.git('ls-remote','origin','refs/heads/harness-public-v3/test').split()[0]
        s=json.loads(self.git('show',head+':'+persist.STATE))
        self.assertIn('replan-winner',s['operations']);self.assertNotIn('replan-loser',s['operations'])


if __name__=='__main__':unittest.main()
