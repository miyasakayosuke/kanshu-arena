import { useState } from 'react';
import { CHARACTER_ART } from './MonsterArt';
import type { Monster } from './engine';

/** Catalog-only full bodies, with a readable fallback that never removes the name/action. */
export default function CatalogArt({ monster }: { monster: Monster }) {
  const source = CHARACTER_ART[monster.id]?.artUrl;
  const [failedSource, setFailedSource] = useState<string | undefined>();
  if (!source || failedSource === source) return <span className="catalogArtFallback" role="img" aria-label={`${monster.name}の画像を表示できません`}><span aria-hidden="true">{monster.icon}</span><small>画像を表示できません</small></span>;
  return <img className="monsterArt" src={source} alt="" draggable={false} onError={() => setFailedSource(source)} />;
}
