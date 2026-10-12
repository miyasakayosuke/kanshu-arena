import {BEAST_ORIGINAL_ART} from './beastOriginalArt';
import {NATURE_ORIGINAL_ART} from './natureOriginalArt';
import {MIXED_ORIGINAL_ART} from './mixedOriginalArt';
import { DRAGON_ART } from './dragonArt';
import { MATERIAL_ART } from './materialArt';
import { EXTRAORDINARY_ART } from './extraordinaryArt';
import { UNDEAD_ART } from './undeadArt';
import { DEMON_ART } from './demonArt';
import { SLIME_ART } from './slimeArt';
import type { Monster } from './engine';
import { FENRIR_ART_URL, FENRIR_PORTRAIT_URL } from './fenrirArt';
import { GENBU_ART_URL, GENBU_PORTRAIT_URL, RATATOSKR_ART_URL, RATATOSKR_PORTRAIT_URL } from './familyArt';

export type CharacterArt = {artUrl: string; portraitUrl: string; spriteWidth: number};
export const CHARACTER_ART: Readonly<Record<number, CharacterArt>> = {
  ...BEAST_ORIGINAL_ART,
  ...NATURE_ORIGINAL_ART,
  ...MIXED_ORIGINAL_ART,
  12: {artUrl: FENRIR_ART_URL, portraitUrl: FENRIR_PORTRAIT_URL, spriteWidth: 110},
  13: {artUrl: RATATOSKR_ART_URL, portraitUrl: RATATOSKR_PORTRAIT_URL, spriteWidth: 99},
  14: {artUrl: GENBU_ART_URL, portraitUrl: GENBU_PORTRAIT_URL, spriteWidth: 121},
  ...DRAGON_ART,
  ...MATERIAL_ART,
  ...SLIME_ART,
  ...DEMON_ART,
  ...UNDEAD_ART,
  ...EXTRAORDINARY_ART,
};

/** Character artwork is static in the party dock; battlefield motion is enemy-only. */
export default function MonsterArt({ monster, portrait = false }: { monster: Monster; portrait?: boolean }) {
  const art = CHARACTER_ART[monster.id];
  return art ? <img className={`monsterArt ${portrait ? 'portraitArt' : ''}`} src={portrait ? art.portraitUrl : art.artUrl} alt="" draggable={false} /> : <>{monster.icon}</>;
}
