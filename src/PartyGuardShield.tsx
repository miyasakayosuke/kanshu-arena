import { useState } from 'react';
import type { PartyGuardCue } from './partyGuardCues';

/** Decorative arrival cue; the existing status text remains the state authority. */
export default function PartyGuardShield({ cue }: { cue: PartyGuardCue }) {
  // Capture the delay once per keyed mount. Re-renders must not advance an
  // already-running CSS animation twice; a delayed first render catches up.
  const [elapsed] = useState(() => Math.max(0, Date.now() - (cue.expires - cue.duration)));
  if (Date.now() >= cue.expires) return null;
  return <svg className="partyGuardCue" data-guard-target={cue.target} data-guard-actor={cue.actor} data-guard-cue={cue.id} aria-hidden="true" viewBox="0 0 48 56" style={{ animationDuration: `${cue.duration}ms`, animationDelay: `${-elapsed}ms` }}>
    <path d="M24 3 43 10 41 29 Q38 43 24 52 Q10 43 7 29 L5 10 Z" />
  </svg>;
}
