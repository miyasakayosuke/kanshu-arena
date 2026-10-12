import { useEffect, useRef, type Dispatch, type SetStateAction, type RefObject } from 'react';
import RosterBrowser, { type RosterFilters } from './RosterBrowser';

export default function CatalogScreen({ filters, setFilters, onFocus, scrollPosition }: {
  filters: RosterFilters;
  setFilters: Dispatch<SetStateAction<RosterFilters>>;
  onFocus: (id: number) => void;
  scrollPosition: RefObject<number>;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);
  return <main className="home teamBuilder catalogScreen" aria-label="モンスター図鑑">
    <div className="intro"><span className="eyebrow">MONSTER CATALOG</span><h2 ref={heading} tabIndex={-1}>モンスター図鑑</h2><p>仲間の役割・特技・物語を調べよう。</p></div>
    <section className="candidatePanel" aria-label="図鑑の検索と一覧">
      <RosterBrowser filters={filters} setFilters={setFilters} onFocus={onFocus} scrollPosition={scrollPosition} />
    </section>
  </main>;
}
