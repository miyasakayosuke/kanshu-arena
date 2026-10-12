import { Fragment } from 'react';
import MonsterArt, { CHARACTER_ART } from './MonsterArt';
import { monsters } from './engine';
import { enemyFormation } from './enemyFormation';
import { PASTURE_ART_URL, PASTURE_WIDTH } from './pastureScene';
import './homePasture.css';

/** Arena-derived five-slot front/back geometry, without a battle or animation loop. */
export function pastureSlot(index: number, monsterId?: number) {
  const slot = enemyFormation(index, 5, 1, monsterId === undefined ? undefined : CHARACTER_ART[monsterId]);
  const grow = slot.depth ? 1.12 : 1.19;
  const foot = { x: 140 + index * 110, y: slot.foot.y + 76 };
  return { ...slot, scale: slot.scale * grow, width: slot.width * grow, height: slot.height * grow,
    top: foot.y - (slot.foot.y - slot.top) * grow, foot };
}

export default function HomePasture({ team, onFocus }: { team: number[]; onFocus: (id: number) => void }) {
  return <section className="homePasture" aria-label={`現在のパーティ ${team.length}/5体`}>
    <img className="pastureLandscape" src={PASTURE_ART_URL} alt="" draggable={false} />
    {Array.from({ length: 5 }, (_, index) => {
      const id = team[index];
      const slot = pastureSlot(index, id);
      // Extra portrait height separates the rows instead of leaving an empty upper field.
      // Width-driven bodies retain their aspect ratio; inset centers keep giant feet inside.
      const floorStyle = { top: `${slot.depth ? 68 : 49}%` };
      if (id === undefined) return <span key={`empty-${index}`} className="pastureEmpty" role="img" aria-label={`${index + 1}枠・空き`} style={{ left: `${slot.foot.x / PASTURE_WIDTH * 100}%`, ...floorStyle }}>＋</span>;
      const monster = monsters[id];
      return <Fragment key={`${index}-${id}`}>
        <div className={`pastureMonster ${slot.depth ? 'pastureFront' : 'pastureRear'}`} aria-hidden="true" data-monster-id={id} data-party-slot={index}
          style={{ left: `${(slot.foot.x - slot.width / 2) / PASTURE_WIDTH * 100}%`, ...floorStyle, width: `${slot.width / PASTURE_WIDTH * 100}%`, aspectRatio: `${slot.width} / ${slot.height}`, transform: `translateY(-${(slot.foot.y - slot.top) / slot.height * 100}%)`, zIndex: slot.depth + 1 }}>
          <span className="pastureShadow" style={{ top: `${(slot.foot.y - slot.top) / slot.height * 100}%` }} />
          <MonsterArt monster={monster} />
        </div>
        {/* Separate name targets stay above every body, including transparent overlaps. */}
        <button className="pastureDetails" aria-label={`${monster.name}の詳細`} onClick={event => { event.currentTarget.focus({ preventScroll: true }); onFocus(id); }}
          style={{ left: `${slot.foot.x / PASTURE_WIDTH * 100}%`, ...floorStyle }}><span>{monster.name}</span></button>
      </Fragment>;
    })}
  </section>;
}
