"""Strict public-data allowlists. This is a disclosure guard, not authentication."""
import math
import re

SENSITIVE_KEY = re.compile(r'(?:token|secret|password|credential|privatekey|apikey|authkey|session|cookie|authorization$)', re.I)
CHECK_NAMES = {'rights:test','rights:check','test','build','scope-qa'}
FORBIDDEN = {'token', 'accesstoken', 'refreshtoken', 'password', 'secret', 'credential', 'credentials', 'apikey', 'authorization', 'cookie', 'session', 'sessionid', 'bearer', 'fingerprint'}
OPAQUE = re.compile(r'(?<![A-Za-z0-9])[A-Za-z0-9+/_=-]{32,}(?![A-Za-z0-9])')
SHA = re.compile(r'^[0-9a-f]{40}$')
ID = re.compile(r'^[a-zA-Z][a-zA-Z0-9_-]{0,119}$')


def check(ok, message='Public schema rejected unexpected or sensitive data'):
    if not ok:
        raise ValueError(message)


def text(value, sha=False):
    check(isinstance(value, str) and 0 < len(value) <= 4000)
    if sha:
        check(bool(SHA.fullmatch(value)))
        return
    check(not re.search(r'(?i)(?:bearer\s+|sk-[A-Za-z0-9]|gh[pousr]_|github_pat_|AKIA[0-9A-Z]|password\s*=|access_token\s*=)', value))
    check(not re.search(r'(?i)\b(?:password|token|secret|api[_ -]?key|private[_ -]?key|authorization)\s*[:=]', value))
    check(not re.search(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', value), 'Public schema rejects personal contact data')
    check(not re.search(r'(?<![A-Za-z0-9])\+?\d[\d ()-]{8,}\d(?![A-Za-z0-9])', value), 'Public schema rejects phone-like data')
    check('http://' not in value.lower() and not re.search(r'(?i)(?:file|ftp)://',value))
    masked = value
    # Only public URLs in this repository may carry exact Git object SHAs.
    for url in re.findall(r'https://\S+', value):
        check(re.fullmatch(r'https://github\.com/miyasakayosuke/kanshu-arena/(?:tree|blob|commit)/[A-Za-z0-9._/-]+', url) or re.fullmatch(r'https://miyasakayosuke\.github\.io/kanshu-arena/[A-Za-z0-9._/#-]*', url))
        for segment in url.split('/')[3:]:
            opaque = OPAQUE.search(segment)
            check(not opaque or bool(SHA.fullmatch(opaque.group())))
        masked = masked.replace(url, 'public-repository-reference')
    check(not OPAQUE.search(masked), 'Public schema rejects opaque credential-like strings')


def identifier(value):
    text(value)
    check(bool(ID.fullmatch(value)), 'Use a readable nonsecret coordinator label')
    normalized=re.sub('[^a-z]', '', value.lower())
    check(not SENSITIVE_KEY.search(normalized) and normalized not in FORBIDDEN)


def keys(obj, allowed, required=()):
    check(isinstance(obj, dict) and set(obj) <= set(allowed) and set(required) <= set(obj))
    for key in obj:
        check(isinstance(key, str))
        check(not SENSITIVE_KEY.search(re.sub('[^a-z]', '', key.lower())) and re.sub('[^a-z]', '', key.lower()) not in FORBIDDEN)


def strings(obj):
    check(isinstance(obj, dict))
    for key, value in obj.items():
        text(key)
        check(not SENSITIVE_KEY.search(re.sub('[^a-z]', '', key.lower())) and re.sub('[^a-z]', '', key.lower()) not in FORBIDDEN)
        text(value)


def assignment(obj):
    keys(obj, {'role', 'worker', 'generation', 'expiresAt'}, {'role', 'worker', 'generation', 'expiresAt'})
    check(obj['role'] in {'implement', 'review', 'publish'})
    identifier(obj['worker'])
    check(type(obj['generation']) is int and 1 <= obj['generation'] <= 1000000000)
    check(type(obj['expiresAt']) in {int, float} and math.isfinite(obj['expiresAt']))


COMMAND_FIELDS = {
    'status': set(), 'reconcile': set(),
    'claim': {'task','role','worker','ttl','authorizationRef','planRevision'},
    'replan': {'task','generation','planRevision','method','criteria','claimBudget','authorizationRef','evidence'},
    'heartbeat': {'task','worker','generation','ttl'},
    'submit': {'task','worker','generation','commit','checks','criteriaEvidence'},
    'review': {'task','worker','generation','commit','approved','evidence'},
    'release': {'task','worker','generation','commit','deployment','liveCheck','creditsCheck','noticesCheck'},
    'fail': {'task','worker','generation','reason'}, 'block': {'task','worker','generation','reason','blockType'},
    'resolve': {'task','evidence','outcome','authorizationRef'},
    'accept': {'task','authorizationRef'}, 'owner-decision': {'task','authorizationRef','evidence'},
}


def command(cmd):
    check(isinstance(cmd, dict) and cmd.get('action') in COMMAND_FIELDS)
    keys(cmd, COMMAND_FIELDS[cmd['action']] | {'action','operationId','expectedRevision'}, {'action'})
    for key, value in cmd.items():
        if key in {'operationId','worker','task'}: identifier(value)
        elif key in {'checks','criteriaEvidence'}:
            strings(value)
            if key == 'checks': check(set(value) == CHECK_NAMES)
        elif key == 'commit': text(value, sha=True)
        elif key in {'expectedRevision','generation','ttl','planRevision','claimBudget'}: check(type(value) is int and 0 <= value <= 1000000000)
        elif key == 'criteria':
            check(isinstance(value, list) and 1 <= len(value) <= 20)
            for item in value: text(item)
        elif key == 'approved': check(type(value) is bool)
        else: text(value)


def result(obj):
    keys(obj, {'revision','status','assignment','stale','decisionRecorded','notBefore','planRevision'})
    for key, value in obj.items():
        if key in {'revision','notBefore','planRevision'}: check(type(value) in {int,float} and math.isfinite(value) and value >= 0)
        elif key == 'assignment': assignment(value)
        elif key == 'stale':
            check(isinstance(value,list))
            for item in value: identifier(item)
        else: text(value)


SNAPSHOT_FIELDS = {'status','attempts','generation','block','commit','checks','criteriaEvidence',
                   'review','release','acceptanceRef','publicationApprovalRef','lastFailure',
                   'notBefore','implementer','candidateRefs'}


def plan(obj):
    fields = {'revision','startAttempts','claimBudget','method','criteria','authorizationRef','evidence','previous'}
    keys(obj, fields, fields)
    for key in {'revision','startAttempts'}:
        check(type(obj[key]) is int and 0 <= obj[key] <= 1000000000)
    check(type(obj['claimBudget']) is int and 1 <= obj['claimBudget'] <= 3)
    for key in {'method','authorizationRef','evidence'}: text(obj[key])
    check(isinstance(obj['criteria'], list) and 1 <= len(obj['criteria']) <= 20)
    for item in obj['criteria']: text(item)
    check(len(obj['criteria']) == len(set(obj['criteria'])))
    prior = obj['previous']
    keys(prior, SNAPSHOT_FIELDS, {'status','attempts','generation','block'})
    # Validate all archived fields through the same strict field allowlists as
    # live tasks; the synthetic envelope is validation-only, never persisted.
    envelope = dict(id='archived-plan', title='Archived plan', kind='implementation',
                    deliverableKind='release', criteria=['Archive'], required=True,
                    dependsOn=[], **prior)
    state(dict(schemaVersion=3, revision=0, operations={}, tasks=[envelope]))


def state(s):
    keys(s, {'schemaVersion','revision','tasks','operations','baseline','decisions','provenance'}, {'schemaVersion','revision','tasks','operations'})
    check(s['schemaVersion'] == 3, 'Legacy ledgers are refused; use a separate reviewed cold checkpoint')
    check(type(s['revision']) is int and 0 <= s['revision'] <= 1000000000)
    if 'baseline' in s:
        keys(s['baseline'], {'version','verification'})
        strings(s['baseline'])
    if 'provenance' in s:
        keys(s['provenance'], {'priorCheckpointSHA','priorRevision','method'}, {'priorCheckpointSHA','priorRevision','method'})
        text(s['provenance']['priorCheckpointSHA'], sha=True)
        check(type(s['provenance']['priorRevision']) is int and 0 <= s['provenance']['priorRevision'] <= 1000000000)
        text(s['provenance']['method'])
    check(isinstance(s['tasks'],list) and s['tasks'])
    for t in s['tasks']:
        keys(t, {'id','title','status','kind','attempts','criteria','dependsOn','required','deliverableKind','generation','assignment','block','commit','checks','criteriaEvidence','review','release','acceptanceRef','publicationApprovalRef','lastFailure','notBefore','implementer','candidateRefs','plans'}, {'id','title','status','kind','attempts','criteria','dependsOn','required','generation'})
        for key, value in t.items():
            if key in {'id','implementer'}: identifier(value)
            elif key in {'generation','attempts'}: check(type(value) is int and 0 <= value <= 1000000000)
            elif key == 'required': check(type(value) is bool)
            elif key == 'notBefore': check(type(value) in {int,float} and math.isfinite(value))
            elif key == 'assignment': assignment(value)
            elif key in {'criteria','candidateRefs'}:
                check(isinstance(value,list))
                for item in value: text(item)
            elif key == 'plans':
                check(isinstance(value, list) and 1 <= len(value) <= 1000)
                for item in value: plan(item)
            elif key == 'dependsOn':
                check(isinstance(value,list))
                for edge in value:
                    keys(edge, {'task','stage'}, {'task','stage'})
                    identifier(edge['task']); text(edge['stage'])
            elif key == 'block':
                keys(value, {'type','reason','previousRole'}, {'type','reason'})
                strings(value)
            elif key in {'checks','criteriaEvidence'}:
                strings(value)
                if key == 'checks': check(set(value) == CHECK_NAMES)
            elif key == 'review':
                keys(value, {'worker','commit','evidence'}, {'worker','commit','evidence'})
                identifier(value['worker']); text(value['commit'],sha=True); text(value['evidence'])
            elif key == 'release':
                keys(value, {'commit','deployment','liveCheck','creditsCheck','noticesCheck'}, {'commit','deployment','liveCheck','creditsCheck','noticesCheck'})
                for field,item in value.items(): text(item,sha=field=='commit')
            else: text(value,sha=key=='commit')
    check(isinstance(s['operations'],dict))
    for id,receipt in s['operations'].items():
        identifier(id)
        keys(receipt, {'command','result'}, {'command','result'})
        command(receipt['command']); result(receipt['result'])
        check(receipt['command'].get('operationId') == id)
    if 'decisions' in s:
        check(isinstance(s['decisions'],dict))
        for id,record in s['decisions'].items():
            identifier(id); keys(record, {'reference','evidence'}, {'reference','evidence'}); strings(record)
