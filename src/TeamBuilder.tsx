import MonsterArt from './MonsterArt';
import LeaderComparison from './LeaderComparison';
import RosterBrowser, { createRosterFilters } from './RosterBrowser';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { monsters, EXTRAORDINARY_CORE_ID, EXTRAORDINARY_RESPONSE, assignedFamilyCount, extraordinaryResponseEligible, UNDEAD_CORE_ID, undeadCashoutEligible, DEMON_CORE_ID, DEMON_PRESSURE, demonPressureEligible, SLIME_CORE_ID, SLIME_SUPPLY, slimeSupplyEligible, MATERIAL_CORE_ID, materialRepairEligible, DRAGON_CORE_ID, DRAGON_CHARGE_CAP, dragonChargeEligible, NATURE_WARD_PERCENT, cost, familyLabel, leaderAppliesTo, leaderFor, type Monster } from './engine';
import { rules, monsterRole, type RuleId } from './strategy';
import { activeFamilyOptions } from './families';
import type { TeamWorkshop } from './teamWorkshop';
import { revealFocusedTeamSlot } from './teamFocusReveal';
import './teamBuilder.css';
import './familyPlanDisclosure.css';

type Props = {
  workshop: TeamWorkshop;
  saved: boolean;
  onSelectTeam: (index: number) => void;
  onResumeDraft: () => void;
  onRestoreDraft: () => void;
  onAssignDraft: (index: number) => void;
  team: number[];
  setTeam: (team: number[]) => void;
  rule: RuleId;
  setRule: (rule: RuleId) => void;
  onFocus: (id: number) => void;
  detailsOpen?: boolean;
  notice: string;
  setNotice: (message: string) => void;
  practice: boolean;
  leavePractice: () => void;
  onCatalog?: () => void;
};

const familyOptions = activeFamilyOptions(monsters);

function FamilyRecipients({ team, applies }: { team: number[]; applies: (monster: Monster) => boolean }) {
  const eligible = team.filter(id => applies(monsters[id]));
  const excluded = team.filter(id => !applies(monsters[id]));
  return <>
    <small className="familyRecipients">対象 {eligible.length}/{team.length}体：{eligible.map(id => monsters[id].name).join('・') || 'なし'}</small>
    <small className="familyExcluded">対象外 {excluded.length}体：{excluded.map(id => monsters[id].name).join('・') || 'なし'}</small>
  </>;
}

function OpeningSupport({ team }: { team: number[] }) {
  const supports = [
    { id: 12, family: 'beast', name: '群れの遠吠え', effect: '獣系に群気 · 攻撃+5%を2ターン。素早さ+5%は2ターン目の行動順から。' },
    { id: 14, family: 'nature', name: '森羅の甲羅', effect: `自然系に自然障壁 · 直接ダメージ${NATURE_WARD_PERCENT}%軽減を2ターン。防御・守護と重ならず、毒は軽減しない。` },
  ].filter(support => team.includes(support.id));
  if (!supports.length) return null;
  return <div className="openingSupports" aria-label="開幕の系統サポート">
    {supports.map(support => <div className="openingSupport" key={support.id} data-support-id={support.id}>
      <strong>開幕 · {support.name}</strong>
      <small>{support.effect}</small>
      <FamilyRecipients team={team} applies={monster => monster.family === support.family} />
    </div>)}
    <small className="supportTiming">先頭以外でも編成中なら開幕に一度発動。途中で解除されても再付与しません。</small>
  </div>;
}

function BeastBarrageBonus({ team }: { team: number[] }) {
  if (!team.includes(13)) return null;
  const beasts = team.filter(id => monsters[id].family === 'beast').length;
  const active = team.length === 5 && beasts === 5;
  return <div className="beastBarrageBonus" data-active={active} aria-label="ラタトスクの連弾条件">
    <strong>木の実の連弾 · 獣系 {beasts}/5体</strong>
    <small>{active ? '追加1発あり · ランダム4回' : '追加1発なし · ランダム3回'}</small>
    <small>開戦時の5体すべてが獣系なら+1回。戦闘不能になっても条件は変わりません。</small>
  </div>;
}

function DragonChargePlan({ team }: { team: number[] }) {
  const dragons = team.filter(id => monsters[id].family === 'dragon');
  const hasCore = team.includes(DRAGON_CORE_ID);
  const active = dragonChargeEligible(team.map(id => ({ monster: monsters[id] })));
  return <div className="dragonChargePlan" data-active={active} aria-label="竜気の編成条件">
    <strong>竜気 · {active ? '条件成立' : '条件未成立'}</strong>
    <small>中核 {monsters[DRAGON_CORE_ID].name}：{hasCore ? '編成中' : '未編成'} · 竜系 {dragons.length}体 / 必要3体</small>
    <small>{active ? `開戦時に中核へ竜気0/${DRAGON_CHARGE_CAP}。味方が倒れても開始時の条件は変わりません。` : '中核を含む竜系3体以上で開戦すると有効。全員を竜系にする必要はありません。'}</small>
    <small>味方の竜系がMPを払う攻撃特技を1回使い終えると+1。連撃も1、通常攻撃・支援・毒・渇天の息では増えません。</small>
    <small>蓄積は中核だけが保持。防御解除で消え、本人が倒れると消失し以後は溜まりません。息の前に集中攻撃・解除・守護で対策できます。</small>
  </div>;
}

function MaterialRepairPlan({ team }: { team: number[] }) {
  const members = team.filter(id => monsters[id].family === 'material');
  const hasCore = team.includes(MATERIAL_CORE_ID);
  const active = materialRepairEligible(team.map(id => ({ monster: monsters[id] })));
  return <div className="materialRepairPlan" data-active={active} aria-label="炉心の修復の編成条件">
    <strong>炉心の修復 · {active ? '条件成立' : '条件未成立'}</strong>
    <small>中核 {monsters[MATERIAL_CORE_ID].name}：{hasCore ? '編成中' : '未編成'} · 物質系 {members.length}体 / 必要3体</small>
    <small>タロスを含む物質系3体以上で開戦すると、一度だけ修復待ち。先頭以外でも有効で、開始時の人数条件は変わりません。</small>
    <small>1ターン目終了時、両軍の毒ダメージ後に発動。タロスが生存し修復待ちなら、生き残った物質系の傷を最大HPに応じて少し修復します。MP・行動を使わず、戦闘不能の仲間は戻りません。</small>
    <FamilyRecipients team={team} applies={monster => monster.family === 'material'} />
    <small>防御解除で修復待ちを消すか、毒を含む集中攻撃でタロスを先に倒すと不発。再付与はありません。</small>
  </div>;
}

function SlimeSupplyPlan({ team }: { team: number[] }) {
  const members = team.filter(id => monsters[id].family === 'slime');
  const hasCore = team.includes(SLIME_CORE_ID);
  const active = slimeSupplyEligible(team.map(id => ({ monster: monsters[id] })));
  return <div className="slimeSupplyPlan" data-active={active} aria-label="蓄え分けの編成条件">
    <strong>蓄え分け · {active ? '条件成立' : '条件未成立'}</strong>
    <small>中核 {monsters[SLIME_CORE_ID].name}：{hasCore ? '編成中' : '未編成'} · 粘体系 {members.length}体 / 必要3体</small>
    <small>うつろ泉を含む粘体系3体以上で開戦すると補給1回。先頭以外でも有効で、開始時の人数条件は変わりません。</small>
    <small>通常順の行動を1回使い、生存する粘体系へ各MP+{SLIME_SUPPLY.amount}（最大MPまで）。本人も対象。全員満タンなら使えず、HP回復・蘇生はしません。</small>
    <FamilyRecipients team={team} applies={monster => monster.family === 'slime'} />
    <small>補給回数は防御解除では消えません。傷ついた仲間を先に倒す、守護を強いて手番を使わせる対策があります。</small>
  </div>;
}

function DemonPressurePlan({ team }: { team: number[] }) {
  const members = team.filter(id => monsters[id].family === 'demon');
  const hasCore = team.includes(DEMON_CORE_ID);
  const active = demonPressureEligible(team.map(id => ({ monster: monsters[id] })));
  return <div className="demonPressurePlan" data-active={active} aria-label="空勘の爪の編成条件">
    <strong>空勘の爪 · {active ? 'MP削り強化あり' : 'MP削り強化なし'}</strong>
    <small>中核 マモン：{hasCore ? '編成中' : '未編成'} · 悪魔系 {members.length}体 / 必要3体</small>
    <small>マモンを含む悪魔系3体以上で開戦すると、本人の空勘の爪のMP削りが{DEMON_PRESSURE.base}→{DEMON_PRESSURE.base + DEMON_PRESSURE.bonus}。先頭以外でも有効で、開始時の条件は仲間が倒れても変わりません。</small>
    <small>HPへの命中後、生き残った相手のMPだけを削ります。本人への回復はなく、守り・自然障壁で軽減。強化されるのはマモンだけで、仲間の技にMP削りは追加されません。</small>
    <small>MPがなくても通常攻撃と防御は可能。本人を先に倒す、残りMPの少ない相手を守る、補給して特技を使う対策があります。</small>
  </div>;
}

function UndeadCashoutPlan({ team }: { team: number[] }) {
  const members = team.filter(id => monsters[id].family === 'undead');
  const hasCore = team.includes(UNDEAD_CORE_ID);
  const active = undeadCashoutEligible(team.map(id => ({ monster: monsters[id] })));
  return <div className="undeadCashoutPlan" data-active={active} aria-label="毒交換の編成条件">
    <strong>塚底の取り立て · {active ? '毒交換強化あり' : '毒交換強化なし'}</strong>
    <small>中核 ドラウグル：{hasCore ? '編成中' : '未編成'} · 不死系 {members.length}体 / 必要3体</small>
    <small>自身を含む不死系3体以上で開戦すると、毒を消費した一撃がさらに強まります。先頭以外でも有効で、開始時の条件は仲間が倒れても変わりません。</small>
    <small>使用者：{hasCore ? 'ドラウグルだけ' : 'なし'}。使用対象外：{team.filter(id => id !== UNDEAD_CORE_ID).map(id => monsters[id].name).join('・') || 'なし'}。仲間の技には毒交換を追加しません。</small>
    <small>MP18と一手で、実際に命中した相手の毒残0〜3回を全消費。今後の毒ダメージを捨て、追加分も守り・自然障壁で軽減されます。HP回復・MP獲得・追加行動はありません。</small>
    <small>毒役や中核を先に倒す、命中前に清める、守護で受ける、敵MP削りで特技を通常攻撃へ切り替えさせる対策があります。</small>
  </div>;
}

function ExtraordinaryResponsePlan({ team }: { team: number[] }) {
  const friends = team.map(id => ({ monster: monsters[id] }));
  const count = assignedFamilyCount(friends);
  const hasCore = team.includes(EXTRAORDINARY_CORE_ID);
  const active = extraordinaryResponseEligible(friends);
  return <div className="extraordinaryResponsePlan" data-active={active} aria-label="門口の応答の編成条件">
    <strong>門口の応答 · {active ? '条件成立' : '条件未成立'}</strong>
    <small>中核 ヤヌス：{hasCore ? '編成中' : '未編成'} · 所属系統 {count}種類 / 必要{EXTRAORDINARY_RESPONSE.minimumFamilies}種類</small>
    <small>本人を含む異なる所属タグを数え、重複・未所属は加算しません。先頭以外でも有効。開始時固定で、仲間の戦闘不能では変わりません。5種類でも追加効果はありません。</small>
    <small>MP24と一手で、生存味方全員の現在の毒解除か今ターンの守護を選択。二つで共通の戦闘中1回です。</small>
    <FamilyRecipients team={team} applies={() => hasCore && active} />
    <small>発動時は生存者だけが対象。HP回復・蘇生・毒予防・MP補給はなく、毒の再付与や守り解除が通ります。</small>
  </div>;
}

const familyPlans = [
  { coreId: DRAGON_CORE_ID, Plan: DragonChargePlan },
  { coreId: MATERIAL_CORE_ID, Plan: MaterialRepairPlan },
  { coreId: SLIME_CORE_ID, Plan: SlimeSupplyPlan },
  { coreId: DEMON_CORE_ID, Plan: DemonPressurePlan },
  { coreId: UNDEAD_CORE_ID, Plan: UndeadCashoutPlan },
  { coreId: EXTRAORDINARY_CORE_ID, Plan: ExtraordinaryResponsePlan },
];

function FamilyPlans({ team, comparisonTeam = [] }: { team: number[]; comparisonTeam?: number[] }) {
  // Present cores and cores removed by a preview stay visible, even below the
  // threshold or with no remaining family members. Only cores absent from both
  // teams are disclosed. Eligibility and counts use the projected team alone.
  const prominent = familyPlans.filter(({ coreId }) => team.includes(coreId) || comparisonTeam.includes(coreId));
  const absent = familyPlans.filter(({ coreId }) => !team.includes(coreId) && !comparisonTeam.includes(coreId)
    && (coreId === EXTRAORDINARY_CORE_ID || team.some(id => monsters[id].family === monsters[coreId].family)));
  return <>
    {prominent.map(({ coreId, Plan }) => <Plan key={coreId} team={team} />)}
    {absent.length > 0 && <details className="familyPlanDisclosure">
      <summary>
        未編成の中核・条件を見る（{absent.length}件）
        <span>{absent.map(({ coreId }) => monsters[coreId].name).join('・')}</span>
      </summary>
      {absent.map(({ coreId, Plan }) => <Plan key={coreId} team={team} />)}
    </details>}
  </>;
}

function MemberSummary({ monster, label }: { monster?: Monster; label: string }) {
  return <div className="memberComparison">
    <small className="comparisonLabel">{label}</small>
    {monster ? <>
      <strong><span aria-hidden="true"><MonsterArt monster={monster} portrait /></span> {monster.name}</strong>
      <span className="comparisonRole">{familyLabel(monster)} · {monsterRole(monster.id).name}</span>
      <dl className="comparisonStats">
        <div><dt>HP</dt><dd>{monster.hp}</dd></div>
        <div><dt>MP</dt><dd>{monster.mp}</dd></div>
        <div><dt>攻撃</dt><dd>{monster.atk}</dd></div>
        <div><dt>素早さ</dt><dd>{monster.speed}</dd></div>
      </dl>
      <span className="comparisonCost">COST {monster.cost}</span>
    </> : <p className="comparisonEmpty">{label === '現在のメンバー' ? '空き枠' : '下の候補から選択'}</p>}
  </div>;
}

export default function TeamBuilder({ workshop, saved, onSelectTeam, onResumeDraft, onRestoreDraft, onAssignDraft, team, setTeam, rule, setRule, onFocus, detailsOpen = false, notice, setNotice, practice, leavePractice, onCatalog }: Props) {
  const [filters, setFilters] = useState(createRosterFilters);
  const [copyTarget, setCopyTarget] = useState<number | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [candidateId, setCandidateId] = useState<number | null>(null);
  const [browsing, setBrowsing] = useState(false);
  const slotButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const browseButton = useRef<HTMLButtonElement | null>(null);
  const restoreBrowseFocus = useRef(false);
  const restoreSlotFocus = useRef<number | null>(null);
  const editorHeading = useRef<HTMLHeadingElement | null>(null);
  const preview = useRef<HTMLDivElement | null>(null);
  const commitPending = useRef(false);
  const teamKey = team.join(',');
  const budget = rules[rule].budget;
  const total = cost(team);
  const leader = team.length ? leaderFor(team[0]) : null;
  const currentId = selectedSlot === null ? undefined : team[selectedSlot];
  const current = currentId === undefined ? undefined : monsters[currentId];
  const candidate = candidateId === null ? undefined : monsters[candidateId];
  const editing = selectedSlot !== null;
  const movedLeaderTeam = currentId === undefined ? team : [currentId, ...team.filter(id => id !== currentId)];

  // A load or another parent update must never keep a candidate for an older party.
  useEffect(() => {
    if (selectedSlot !== null) restoreSlotFocus.current = selectedSlot;
    setSelectedSlot(null);
    setCandidateId(null);
  }, [teamKey, workshop.selected]);

  const replacement = (id: number) => {
    const next = [...team];
    if (selectedSlot !== null && selectedSlot < next.length) next[selectedSlot] = id;
    else next.push(id);
    return next;
  };
  const unavailableReason = (id: number) => {
    if (!editing) return '先に入れ替える枠を選んでください';
    if (id === currentId) return 'この枠のメンバー';
    const occupied = team.indexOf(id);
    if (occupied !== -1) return `編成済み（${occupied + 1}枠）`;
    const next = replacement(id);
    if (next.length > 5 || new Set(next).size !== next.length) return '5体・重複なしで編成してください';
    const over = cost(next) - budget;
    if (over > 0) return `COST ${over}超過`;
    return '';
  };
  const revealPreview = () => {
    preview.current?.focus({ preventScroll: true });
    preview.current?.scrollIntoView({ block: 'start', behavior: 'auto' });
  };
  useEffect(() => {
    if (selectedSlot !== null || browsing) {
      editorHeading.current?.focus({ preventScroll: true });
      editorHeading.current?.scrollIntoView({ block: 'start', behavior: 'auto' });
    }
  }, [selectedSlot, browsing]);
  useEffect(() => {
    if (candidateId !== null) revealPreview();
  }, [candidateId]);
  const candidateReason = candidate ? unavailableReason(candidate.id) : '';
  const projectedCost = candidate ? cost(replacement(candidate.id)) : total;
  const projectedTeam = candidate ? replacement(candidate.id) : team;
  const projectedLeader = projectedTeam.length ? leaderFor(projectedTeam[0]) : null;

  const pickSlot = (index: number) => {
    commitPending.current = false;
    setSelectedSlot(index);
    setCandidateId(null);
    setBrowsing(false);
    setNotice('');
  };
  const closeEditor = () => {
    restoreSlotFocus.current = selectedSlot;
    setSelectedSlot(null);
    setCandidateId(null);
  };
  useLayoutEffect(() => {
    // Restore only after the overview is revealed and any profile/movie yields focus.
    if (!editing && !browsing && !detailsOpen && restoreSlotFocus.current !== null) {
      // A synchronized team may have shrunk while its picker was open.
      const slot = slotButtons.current[Math.min(restoreSlotFocus.current, team.length)];
      if (slot) {
        slot.focus({ preventScroll: true });
        revealFocusedTeamSlot(slot);
      }
      restoreSlotFocus.current = null;
    }
  }, [editing, browsing, detailsOpen]);
  const closeBestiary = () => {
    restoreBrowseFocus.current = true;
    setBrowsing(false);
  };
  useEffect(() => {
    if (!browsing && restoreBrowseFocus.current) {
      browseButton.current?.focus({ preventScroll: true });
      restoreBrowseFocus.current = false;
    }
  }, [browsing]);
  const confirmReplacement = () => {
    if (commitPending.current || !candidate || selectedSlot === null || unavailableReason(candidate.id)) return;
    commitPending.current = true;
    const next = replacement(candidate.id);
    // One parent update commits the whole replacement. Preview never removes a member.
    setTeam(next);
    setNotice(current ? `${current.name}を${candidate.name}に入れ替えました` : `${candidate.name}を編成に加えました`);
    closeEditor();
  };
  const makeLeader = () => {
    if (commitPending.current || currentId === undefined || selectedSlot === 0) return;
    commitPending.current = true;
    setTeam(movedLeaderTeam);
    setNotice(`${monsters[currentId].name}をリーダーにしました`);
    closeEditor();
  };
  const moveMember = (direction: -1 | 1) => {
    if (commitPending.current || selectedSlot === null) return;
    const destination = selectedSlot + direction;
    if (destination < 0 || destination >= team.length) return;
    const next = [...team];
    [next[selectedSlot], next[destination]] = [next[destination], next[selectedSlot]];
    commitPending.current = true;
    setTeam(next); setNotice(`${current!.name}を${destination + 1}枠へ移動しました`); closeEditor();
  };
  const removeMember = () => {
    if (commitPending.current || currentId === undefined) return;
    commitPending.current = true;
    setTeam(team.filter(id => id !== currentId)); setNotice(`${current!.name}を編成から外しました`); closeEditor();
  };
  const selectTeam = (index: number) => {
    setSelectedSlot(null); setCandidateId(null); setBrowsing(false); setCopyTarget(null);
    onSelectTeam(index);
  };

  useEffect(() => {
    const dismiss = (event: KeyboardEvent) => {
      // App owns detail dialogs. The same Escape must not also discard this preview.
      if (event.key !== 'Escape' || event.defaultPrevented || document.querySelector('.overlay, [role="dialog"][aria-modal="true"]')) return;
      if (selectedSlot !== null) {
        event.preventDefault();
        closeEditor();
      } else if (browsing) {
        event.preventDefault();
        closeBestiary();
      }
    };
    window.addEventListener('keydown', dismiss);
    return () => window.removeEventListener('keydown', dismiss);
  }, [selectedSlot, browsing]);

  return <main className={`home teamBuilder${editing || browsing ? ' isPicking' : ''}`} aria-label="編成">
    <div className="teamOverview" hidden={editing || browsing}>
    <div className="workshopHeading"><h2>チーム編成</h2><span className={saved ? 'teamSaveState' : 'teamSaveState saveFailed'} role="status">{saved ? '変更は自動保存' : '保存できません・この画面では保持中'}</span></div>
    <div className="teamTabs" aria-label="チームを選ぶ">{workshop.teams.map((slot, index) => <button key={index} aria-label={`チーム${index + 1}を選ぶ`} aria-pressed={workshop.selected === index} onClick={() => selectTeam(index)}>
      <strong>チーム{index + 1}</strong><small>{slot.team.length ? `${slot.team.length}/5体 · C${cost(slot.team)}` : '未編成'}</small>
    </button>)}</div>
    {workshop.selected === null && <div className="previousDraftNotice"><strong>一時編成を使用中</strong><p>3チームは変更していません。この編成も自動保存されます。</p>
      <details className="draftAssignment"><summary>この編成をチームに保存</summary><div className="draftTargets">{workshop.teams.map((slot, index) => <button key={index} onClick={() => slot.team.length ? setCopyTarget(index) : onAssignDraft(index)}>チーム{index + 1}{slot.team.length ? 'に上書き' : 'に保存'}</button>)}</div>
      {copyTarget !== null && <div className="draftConfirmation" role="group" aria-label="チームの上書き確認"><p>チーム{copyTarget + 1}の5枠をこの編成で置き換えますか？</p><button onClick={() => { onAssignDraft(copyTarget); setCopyTarget(null); }}>置き換える</button><button onClick={() => setCopyTarget(null)}>やめる</button></div>}</details>
    </div>}
    {workshop.selected !== null && workshop.draft && <button className="secondary recoverDraft" onClick={onResumeDraft}>前回の一時編成に戻す</button>}
    {practice && <div className="practiceNotice">同じ相手・同じ条件で再挑戦 <button onClick={leavePractice}>通常の対戦へ</button></div>}
    <section className="partyCard" aria-label="出場パーティ">
      <div className="sectionTitle">{workshop.selected === null ? '一時編成' : `チーム${workshop.selected + 1}`} <span>{team.length}/5体 <b className={total > budget ? 'overBudget' : ''}>COST {total}/{budget}</b></span></div>
      <div className="team builderSlots">
        {Array.from({ length: 5 }, (_, index) => {
          const monster = team[index] === undefined ? undefined : monsters[team[index]];
          const waitingForEarlierSlot = !monster && index > team.length;
          return <button key={index} ref={node => { slotButtons.current[index] = node; }}
            className={`teamUnit ${index === 0 && monster ? 'teamLeader' : ''} ${!monster ? 'emptySlot' : ''}`}
            aria-label={monster ? `${index + 1}枠・${monster.name}を入れ替える` : `${index + 1}枠・空き枠に追加`}
            data-monster-id={monster?.id} aria-pressed={selectedSlot === index} aria-controls="team-candidates" disabled={waitingForEarlierSlot} aria-describedby={waitingForEarlierSlot ? `empty-slot-reason-${index}` : undefined} onClick={() => pickSlot(index)}>
            <small>{index === 0 ? 'LEADER' : `0${index + 1}`}</small>
            <span aria-hidden="true">{monster ? <MonsterArt monster={monster} portrait /> : '＋'}</span>
            <strong>{monster?.name ?? '空き枠'}</strong>
            <i id={waitingForEarlierSlot ? `empty-slot-reason-${index}` : undefined}>{monster ? `C${monster.cost}` : waitingForEarlierSlot ? '前の枠から' : '追加'}</i>
          </button>;
        })}
      </div>
      {leader && <div className="leaderBanner"><span>✦ {leader.name}</span><small>{leader.description}</small></div>}
      <details className="builderDisclosure teamEffects"><summary>系統・特性の詳細</summary><div className="familyComposition" aria-label="系統の内訳">{familyOptions.map(([value, label]) => <span key={value}>{label} <b>{team.filter(id => (monsters[id].family ?? 'unassigned') === value).length}</b>体</span>)}</div>
      {leader && <div className="leaderRecipients"><FamilyRecipients team={team} applies={monster => leaderAppliesTo(leader, monster)} /></div>}
      <OpeningSupport team={team} />
      <BeastBarrageBonus team={team} />
      <FamilyPlans team={team} />
      </details>
      {total > budget && <p className="budgetWarning" role="status">あとCOST {total - budget}減らすと出場できます。</p>}
      {team.length < 5 && <p className="hint">空き枠からあと{5 - team.length}体を追加してください。</p>}
    </section>
    <details className="builderDisclosure ruleDisclosure">
      <summary>ルール：{rules[rule].name}<span>COST上限 {budget}</span></summary>
      {practice && <p className="hint">ルール変更で同条件再戦を解除します。</p>}
      <div className="ruleTabs" aria-label="対戦ルール">{Object.values(rules).map(value => <button key={value.id} aria-pressed={rule === value.id} onClick={() => setRule(value.id)}><strong>{value.name}</strong><small>COST {value.budget}</small></button>)}</div>
      <p className="hint ruleHint">{rules[rule].description}</p>
    </details>
    {workshop.previous && <details className="builderDisclosure legacyRecovery"><summary>移行前の編成を復元</summary><p>{workshop.previous.team.map(id => monsters[id].name).join('・') || '空の編成'}</p><button className="secondary" onClick={onRestoreDraft}>移行前の編成に戻す</button></details>}
    {!editing && !browsing && <button className="detailButton browseBestiary" ref={browseButton} onClick={() => { if (onCatalog) { onCatalog(); return; } setBrowsing(true); setFilters(previous => previous.costFilter === 'fit' ? { ...previous, costFilter: 'all' } : previous); }}>モンスター図鑑を開く</button>}
    </div>
    <p className="saveNotice teamNotice" role="status">{notice}</p>

    {(editing || browsing) && <section className="candidatePanel" id="team-candidates" aria-labelledby="candidate-heading">
      <div className="candidateHeading">
        <div><h3 id="candidate-heading" ref={editorHeading} tabIndex={-1}>{editing ? `${selectedSlot + 1}枠の${current ? '入れ替え' : '追加'}` : 'モンスター図鑑'}</h3>
        </div>
        <button className="secondary" onClick={editing ? closeEditor : closeBestiary}>
          {editing ? 'キャンセル' : '図鑑を閉じる'}
        </button>
      </div>
      {editing && <div className="candidatePreview" ref={preview} tabIndex={-1} aria-label="編成の変更プレビュー">
        {candidate ? <div className="comparisonGrid" aria-label="現在と候補の比較">
          <MemberSummary monster={current} label="現在のメンバー" />
          <MemberSummary monster={candidate} label="入れ替え候補" />
        </div> : <div className="currentMemberBrief">
          <span aria-hidden="true">{current ? <MonsterArt monster={current} portrait /> : '＋'}</span>
          <div><small>現在のメンバー</small><strong>{current ? `${current.name} · COST ${current.cost}` : '空き枠'}</strong><small>{current ? monsterRole(current.id).name : '下の候補から選択'}</small></div>
        </div>}
        <div className="memberActions">
          {current && <button className="detailButton" aria-label={`現在の${current.name}の詳細`} onClick={() => onFocus(current.id)}>現在の詳細</button>}
          {candidate && <button className="detailButton" aria-label={`比較中の${candidate.name}の詳細`} onClick={() => onFocus(candidate.id)}>候補の詳細</button>}
        </div>
        {current && <div className="memberOrderActions" aria-label="並び順とメンバーの変更">
          <button className="secondary" disabled={selectedSlot === 0} onClick={() => moveMember(-1)}>← 前へ</button>
          <button className="secondary" disabled={selectedSlot === team.length - 1} onClick={() => moveMember(1)}>後ろへ →</button>
          <button className="detailButton" onClick={removeMember}>編成から外す</button>
        </div>}
        {current && selectedSlot !== 0 && <div className="leaderMovePreview">
          <details className="builderDisclosure leaderPreviewDetails"><summary>リーダー変更の比較</summary><LeaderComparison beforeTeam={team} afterTeam={movedLeaderTeam} idPrefix="leader-move" /></details>
          <button className="secondary leaderMoveConfirm" aria-label={`${current.name}をリーダーにする`} aria-describedby="leader-move-summary" onClick={makeLeader}>{current.name}をリーダーにする</button>
        </div>}
        {candidate && selectedSlot === 0 && <details className="builderDisclosure leaderPreviewDetails"><summary>リーダー変更の比較</summary><LeaderComparison beforeTeam={team} afterTeam={projectedTeam} idPrefix="leader-replacement" /></details>}
        {candidate && <div className="candidateImpact" role="status">
          <p>合計COST <strong>{total} → {projectedCost}/{budget}</strong><span className={projectedCost > budget ? 'overBudget' : ''}>残り {budget - projectedCost}</span></p>
          <details className="builderDisclosure projectedEffects"><summary>入れ替え後の効果を確認</summary>{projectedLeader && <div className="projectedLeader"><small>{selectedSlot === 0 ? '新リーダー効果' : '入れ替え後のリーダー効果'}：{projectedLeader.description}</small><FamilyRecipients team={projectedTeam} applies={monster => leaderAppliesTo(projectedLeader, monster)} /></div>}
          <OpeningSupport team={projectedTeam} />
          <BeastBarrageBonus team={projectedTeam} />
          <FamilyPlans team={projectedTeam} comparisonTeam={team} />
          <small>{monsterRole(candidate.id).strength}</small>
          <small>気をつけたいこと：{monsterRole(candidate.id).tradeoff}</small>
          </details>
          {candidateReason && <p className="budgetWarning">{candidateReason}</p>}
        </div>}
        {candidate && <button className="primary confirmReplacement" disabled={!!candidateReason} aria-describedby={selectedSlot === 0 ? 'leader-replacement-summary' : undefined} onClick={confirmReplacement}>
          {`${candidate.name}${current ? 'に入れ替える' : 'を編成に加える'}`}
        </button>}
      </div>}
      <RosterBrowser filters={filters} setFilters={setFilters} onFocus={onFocus} editing={editing ? {
        candidateId, unavailableReason, projectedCost: id => cost(replacement(id)), budget,
        onSelect: id => { setCandidateId(id); if (candidateId === id) revealPreview(); },
      } : undefined} />
    </section>}

  </main>;
}
