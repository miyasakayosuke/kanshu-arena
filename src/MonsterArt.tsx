import type { Monster } from './engine';
import { FENRIR_ART_URL, FENRIR_PORTRAIT_URL } from './fenrirArt';
import { GENBU_ART_URL, GENBU_PORTRAIT_URL, RATATOSKR_ART_URL, RATATOSKR_PORTRAIT_URL } from './familyArt';

const characterArt: Record<number, readonly [string, string]> = {
  12: [FENRIR_ART_URL, FENRIR_PORTRAIT_URL],
  13: [RATATOSKR_ART_URL, RATATOSKR_PORTRAIT_URL],
  14: [GENBU_ART_URL, GENBU_PORTRAIT_URL],
};

/** Character artwork is static in the party dock; battlefield motion is enemy-only. */
export default function MonsterArt({ monster, portrait = false }: { monster: Monster; portrait?: boolean }) {
  const art = characterArt[monster.id];
  return art ? <img className={`monsterArt ${portrait ? 'portraitArt' : ''}`} src={art[portrait ? 1 : 0]} alt="" draggable={false} /> : <>{monster.icon}</>;
}
