import{SOURCES as BASE_SOURCES,phaseAt}from'./high-leap-timing.mjs';
export const SOURCES={...BASE_SOURCES,tuck:'high-leap-extension-tuck-study.png'};
export function bridgePhaseAt(ms){return ms>=400&&ms<460?'tuck':phaseAt(ms);}
