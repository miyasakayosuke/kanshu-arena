import json
from pathlib import Path
import subprocess
import tempfile
import unittest
import persist
from unittest.mock import patch


class PersistTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.remote = self.root / 'remote.git'
        self.repo = self.root / 'repo'
        subprocess.run(['git','init','--bare',str(self.remote)],check=True,capture_output=True)
        subprocess.run(['git','init',str(self.repo)],check=True,capture_output=True)
        self.git('config','user.email','test@example.invalid')
        self.git('config','user.name','Harness test')
        self.git('remote','add','origin',str(self.remote))
        path = self.repo / persist.STATE
        path.parent.mkdir(parents=True)
        seed = Path(__file__).parents[2] / persist.STATE
        path.write_bytes(seed.read_bytes())
        self.git('add','.')
        self.git('commit','-m','seed')
        self.git('push','origin','HEAD:refs/heads/harness-public-v3/test')

    def git(self,*args):
        return persist.git(self.repo,*args)

    def command(self, id='first'):
        return dict(action='claim',task='baseline-regression',role='implement',worker=id,operationId=id,expectedRevision=0)

    def test_durable_claim_and_replay(self):
        result = persist.persist(self.repo,'origin','harness-public-v3/test',self.command())
        replay = persist.persist(self.repo,'origin','harness-public-v3/test',self.command())
        self.assertEqual(result['assignment'],replay['assignment'])
        remote = self.git('ls-remote','origin','refs/heads/harness-public-v3/test').split()[0]
        self.assertEqual(result['stateCommit'],remote)
        # Local source seed remains unchanged.
        self.assertEqual(0,json.loads((self.repo/persist.STATE).read_text())['revision'])

    def test_divergent_state_cannot_overwrite(self):
        real = persist.git
        fired = False
        def racing(repo,*args):
            nonlocal fired
            if args[0] == 'push' and not fired:
                fired = True
                with patch.object(persist,'git',real):
                    persist.persist(self.repo,'origin','harness-public-v3/test',self.command('winner'))
            return real(repo,*args)
        with patch.object(persist,'git',racing):
            with self.assertRaisesRegex(ValueError,'not confirmed'):
                persist.persist(self.repo,'origin','harness-public-v3/test',self.command('loser'))
        remote = self.git('ls-remote','origin','refs/heads/harness-public-v3/test').split()[0]
        state = json.loads(self.git('show',remote+':'+persist.STATE))
        self.assertIn('winner',state['operations'])
        self.assertNotIn('loser',state['operations'])

    def test_never_targets_main(self):
        with self.assertRaisesRegex(ValueError,'dedicated'):
            persist.persist(self.repo,'origin','main',self.command())

if __name__ == '__main__':
    unittest.main()
