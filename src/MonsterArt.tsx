import type { Monster } from './engine';
import { FENRIR_ART_URL, FENRIR_PORTRAIT_URL } from './fenrirArt';

/** Character artwork is static in the party dock; battlefield motion is enemy-only. */
export default function MonsterArt({ monster, portrait = false }: { monster: Monster; portrait?: boolean }) {
  return monster.id === 12 ? <img className={`monsterArt ${portrait ? 'portraitArt' : ''}`} src={portrait ? FENRIR_PORTRAIT_URL : FENRIR_ART_URL} alt="" draggable={false} /> : <>{monster.icon}</>;
}
