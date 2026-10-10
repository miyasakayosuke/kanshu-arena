/**
 * Original, code-native character drawings. No downloaded artwork, glyphs,
 * animation, or external resources. Portraits and canvas sprites share paths.
 */
const RATATOSKR_ARTWORK = `
  <defs>
    <linearGradient id="rt-copper" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#f9c176"/><stop offset=".45" stop-color="#cb7444"/><stop offset="1" stop-color="#743c31"/></linearGradient>
    <linearGradient id="rt-tail" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#ffe2a3"/><stop offset=".3" stop-color="#de9455"/><stop offset=".75" stop-color="#a45235"/><stop offset="1" stop-color="#6b382e"/></linearGradient>
    <linearGradient id="rt-cream" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#fff3cf"/><stop offset="1" stop-color="#d8b989"/></linearGradient>
    <linearGradient id="rt-scarf" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#92dac0"/><stop offset=".5" stop-color="#3f967e"/><stop offset="1" stop-color="#265b58"/></linearGradient>
  </defs>
  <ellipse cx="145" cy="191" rx="100" ry="9" fill="#433c292e"/>
  <!-- A high, open curling tail is recognizable even at 48px. -->
  <path d="M132 163c32 0 53-15 62-38 9-24-10-35-21-22-7 10-1 18 6 17-6 11-25 10-32-4-11-23 3-48 25-57l-5-7 17 2 6-14 8 9c24-3 42 9 49 27l7-6-1 16 12 3-8 9 10 8-12 10c-2 32-26 61-61 70-31 9-56 3-64-7Z" fill="url(#rt-tail)" stroke="#553b30" stroke-width="3" stroke-linejoin="round"/>
  <path d="M153 158c39 2 77-30 78-62 2-28-28-40-46-24-18 14-11 35-3 35-1-18 17-23 25-11 13 23-19 51-42 54Z" fill="#f8cb87"/>
  <path d="M165 161c44-4 73-36 77-62l-1 24-7-2-3 17-7-3-10 19-5-5-21 22-1-9-24 8Z" fill="#d5884e"/>
  <path d="M185 66c26-13 48 4 48 27M174 149c30-8 44-28 45-44M204 158l15-13" fill="none" stroke="#ffdfa3" stroke-width="2" stroke-linecap="round" opacity=".8"/>
  <!-- Light-footed rear leg, bent forward rather than a heavy wolf stance. -->
  <path d="M132 147c19-3 27 11 20 24l-7 7 15 5c7 3 10 8 5 11h-34l-9-10 10-12-9-14Z" fill="url(#rt-copper)" stroke="#553b30" stroke-width="3" stroke-linejoin="round"/>
  <path d="m140 182 14 5 9 5h-30l-3-4Z" fill="#f4d7a6"/>
  <path d="m143 186 1 6m7-4 2 4m7-2 2 2" stroke="#89553b" stroke-width="1.4"/>
  <!-- Compact pear-shaped body and soft bib. -->
  <path d="M97 100c20-5 39 9 46 29l7 7-5 3 9 7-5 4 4 9-10 3c-12 18-39 20-55 7-14-14-11-45 9-69Z" fill="url(#rt-copper)" stroke="#553b30" stroke-width="3" stroke-linejoin="round"/>
  <path d="M103 111c-13 6-20 34-11 47 9 14 27 10 33-3 7-13-2-36-13-43Z" fill="url(#rt-cream)"/>
  <path d="m129 118 7 8-3 12 9 7-5 7-2-16-8-6Z" fill="#9c523a"/>
  <!-- A short scarf and ribbon lead left into the next branch-hop. -->
  <path d="m87 96-28 15-22-4 11 13-7 11 27-2 28-18Z" fill="url(#rt-scarf)" stroke="#294f46" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="m47 120 15 1 26-15" fill="none" stroke="#aee4be" stroke-width="2"/>
  <path d="M83 92c10 10 26 11 36 7l8 11c-14 10-36 6-50-6Z" fill="url(#rt-scarf)" stroke="#294f46" stroke-width="2.5"/>
  <path d="m94 103 9 3-3 12-10-2-2-7Z" fill="#c0e4bd" stroke="#3b7360" stroke-width="2"/>
  <!-- Back paw balances on the branch without being part of a background card. -->
  <path d="M95 149c9 7 8 17 1 25l-11 12 7 4c4 4 2 7-3 7H61c-6-1-5-6 0-8l15-12 2-20Z" fill="url(#rt-copper)" stroke="#553b30" stroke-width="3" stroke-linejoin="round"/>
  <path d="m76 185 10 7H60l5-4Z" fill="#f6dab0"/>
  <path d="m70 191 0 5m7-4 1 4m6-3 1 3" stroke="#89553b" stroke-width="1.4"/>
  <path d="M40 198c49-3 85 3 126-1l17-6 6 4-18 8-129 2Z" fill="#725444" stroke="#443d32" stroke-width="2"/>
  <path d="m164 199 20-17 10 1-10 10" fill="#725444" stroke="#443d32" stroke-width="2"/>
  <path d="M181 185c-4-13 7-19 15-15-2 9-7 14-15 15Z" fill="#73a974" stroke="#3f674d" stroke-width="1.7"/>
  <!-- Two high ear tufts, broad eyes and a rounded squirrel muzzle. -->
  <path d="m68 54-5-20 1-19 10 10 3-8 8 25 9 3 16-12 9-15 5 18-2 24 8 12-5 18-11 12-22 6-22-7-15-13-6-12 8-13Z" fill="url(#rt-copper)" stroke="#553b30" stroke-width="3" stroke-linejoin="round"/>
  <path d="m69 28 9 21-8 4-2-15Zm48 4-13 17 12 4Z" fill="#e6b5a0"/>
  <path d="m74 38 5 11-7 1Zm40 3-7 7 6 3Z" fill="#955842"/>
  <path d="m74 54 16 1 9-3 11 5-10 9-3 12-12 4-11-9-12-8Z" fill="#edae6d"/>
  <path d="M62 77c6-6 14-3 22 4 8-8 20-8 27-3 10 9 1 22-11 25l-21-1-15-9Z" fill="url(#rt-cream)"/>
  <path d="M62 62c10-7 20 0 18 12-1 8-9 11-16 7-6-4-7-13-2-19Z" fill="#3d3128"/>
  <path d="M96 62c9-6 20-1 19 10-1 10-12 14-19 8-5-4-6-13 0-18Z" fill="#3d3128"/>
  <ellipse cx="71" cy="72" rx="5.4" ry="7" fill="#75b6a2"/><ellipse cx="104" cy="71" rx="5.8" ry="7.5" fill="#75b6a2"/>
  <ellipse cx="72" cy="72" rx="2.7" ry="5.8" fill="#223d36"/><ellipse cx="105" cy="71" rx="2.8" ry="6" fill="#223d36"/>
  <circle cx="69" cy="68" r="2.8" fill="#fffbe9"/><circle cx="102" cy="67" r="3" fill="#fffbe9"/>
  <path d="m61 59 9-3 7 2m20-2 10-2 8 3" fill="none" stroke="#ffe2a6" stroke-width="3" stroke-linecap="round"/>
  <path d="m79 81 9-2 5 4-6 6-6-2Z" fill="#594039"/><path d="m81 82 5-1 3 1" stroke="#ca9480" stroke-width="1.5"/>
  <path d="m87 87-1 7m-9-2c6 7 13 7 18 0" fill="none" stroke="#78503d" stroke-width="1.8" stroke-linecap="round"/>
  <path d="m84 96 6 0-1 5-4-1Z" fill="#fff7dd"/><path d="m55 86 13 2m-15 4 14-1m40-6 16-3m-13 9 15 1" stroke="#9b6747" stroke-width="1.2" stroke-linecap="round"/>
  <!-- A bead sling and seed carried by articulate little paws. -->
  <path d="M124 106c4 16-4 33-20 40" fill="none" stroke="#574736" stroke-width="2"/>
  <g stroke="#72543a" stroke-width="1.5"><circle cx="124" cy="118" r="4" fill="#dfc07b"/><circle cx="121" cy="129" r="4.5" fill="#a96f42"/><circle cx="115" cy="139" r="4" fill="#e4c793"/></g>
  <path d="M127 120c-5-5-10-4-13 2l-9 10-11-1-3 7 16 6 18-13Z" fill="url(#rt-copper)" stroke="#553b30" stroke-width="2.5"/>
  <path d="M91 124c-8-1-15 6-12 12l12 5 10-6-3-8Z" fill="url(#rt-cream)" stroke="#79543a" stroke-width="2"/>
  <path d="m97 119c-7 1-10 7-7 14 2 6 7 9 10 6 6-5 9-12 5-17Z" fill="#b67e42" stroke="#68462e" stroke-width="2"/>
  <path d="m89 125c3-9 13-12 19-5l-3 6-15 3Z" fill="#64895b" stroke="#44634b" stroke-width="1.7"/><path d="m99 118 2-6" stroke="#72503a" stroke-width="2.5" stroke-linecap="round"/>
  <path d="m91 136 7-3m-13 0 7-3" stroke="#885f42" stroke-width="1.5" stroke-linecap="round"/>
`;

const GENBU_ARTWORK = `
  <defs>
    <linearGradient id="gb-shell" x1="0" y1="0" x2=".75" y2="1"><stop stop-color="#799989"/><stop offset=".4" stop-color="#3f7166"/><stop offset="1" stop-color="#173e43"/></linearGradient>
    <linearGradient id="gb-jade" x1="0" y1="0" x2=".6" y2="1"><stop stop-color="#8dc7ad"/><stop offset=".48" stop-color="#477f72"/><stop offset="1" stop-color="#20494c"/></linearGradient>
    <linearGradient id="gb-stone" x1="0" y1="0" x2=".6" y2="1"><stop stop-color="#b6bda0"/><stop offset=".4" stop-color="#74867c"/><stop offset="1" stop-color="#3c605c"/></linearGradient>
    <linearGradient id="gb-water" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#a6f2d6"/><stop offset=".55" stop-color="#3caca9"/><stop offset="1" stop-color="#296f80"/></linearGradient>
  </defs>
  <ellipse cx="147" cy="187" rx="118" ry="12" fill="#193c3e30"/>
  <g fill="none" stroke="#71c6b1" stroke-width="1.5" opacity=".55"><ellipse cx="144" cy="186" rx="126" ry="15"/><path d="M13 178c-12 17 58 25 98 24m107-1 35-10"/></g>
  <!-- Serpent tail wraps under the mountain shell before rising at its far edge. -->
  <path d="M202 169c39 11 65-13 54-40-6-14-3-29 10-39-20 3-29 23-21 41 7 18-17 29-33 24Z" fill="url(#gb-water)" stroke="#1e4849" stroke-width="3"/>
  <path d="m259 96-8 11 0 12" fill="none" stroke="#c1f4d8" stroke-width="2"/>
  <!-- Four low, column-like feet make the tortoise's weight clear. -->
  <path d="m93 133 18 9-1 32-7 11H72l-4-7 12-13 2-23Z" fill="#365d58" stroke="#213f40" stroke-width="3"/>
  <path d="m206 132 20 8 12 31-3 13h-31l-7-11-6-25Z" fill="#355f59" stroke="#213f40" stroke-width="3"/>
  <path d="m209 177 3 7m7-7 4 7m6-8 5 6" stroke="#a4b79b" stroke-width="3"/>
  <path d="M62 121c15-13 102-23 159-1l11 32-18 16-116 6-39-24Z" fill="#2b5352" stroke="#203e3e" stroke-width="3"/>
  <!-- A hand-drawn tessellation of rocky, beveled hexagonal scutes. -->
  <path d="M64 131c0-35 30-70 62-80l19-7 39 6c29 10 53 36 61 71l-2 27-22 16-72 10-65-17-23-13Z" fill="url(#gb-shell)" stroke="#183d40" stroke-width="4" stroke-linejoin="round"/>
  <g stroke="#244e4b" stroke-width="3" stroke-linejoin="round">
    <path d="m95 81 31-27 23 7 7 26-22 20-34-5Z" fill="#6c9682"/>
    <path d="m149 61 35-6 29 21-5 28-33 7-19-24Z" fill="#4f8475"/>
    <path d="m74 109 21-28 5 21-14 29-20 1Z" fill="#668978"/>
    <path d="m100 102 34 5 11 32-22 22-37-12 0-18Z" fill="url(#gb-jade)"/>
    <path d="m134 107 22-20 19 24 2 32-32-4Z" fill="#376f66"/>
    <path d="m175 111 33-7 25 24-9 28-26 8-21-21Z" fill="url(#gb-jade)"/>
    <path d="m208 104 5-28 22 28 10 24-12 0Z" fill="#305e59"/>
    <path d="m145 139 32 4 21 21-49 8-26-11Z" fill="#315f59"/>
  </g>
  <g fill="none" stroke="#76dac1" stroke-width="2.3" stroke-linejoin="round"><path d="m96 84 6 18 32 7 12 30 30 5 21 18M150 65l6 22 20 23 32-6 22 23m-54-17 0 34M87 131l15-29m31 7 23-22m-11 52-20 20"/></g>
  <g fill="none" stroke="#c5f8d8" stroke-width="1.1" opacity=".8"><path d="m136 110 10 26 13 5m18-28 14-4m19-2 17 18m-122-23 26 6"/></g>
  <!-- Small asymmetrical summit and moss patches, not a smooth generic shell. -->
  <path d="m111 65 5-21 11 5 11-23 12 9 10-4 18 29-24 14Z" fill="url(#gb-stone)" stroke="#345a53" stroke-width="2.8" stroke-linejoin="round"/>
  <path d="m137 28 1 25 13 9 9-30-10 9Z" fill="#9aab94"/><path d="m127 49 9 5-13 11 21-3 13 9" fill="none" stroke="#557367" stroke-width="2"/>
  <path d="m111 63 10-5 8 3 6-4 11 8 11-4 13 2 8-6 4 9-15 7-16-4-12 5-12-5-12 3Z" fill="#699c67" stroke="#3d7154" stroke-width="1.8"/>
  <path d="m97 90 11-12 13 3 8-7 13 7-5 7-14-2-8 7Z" fill="#79aa74"/>
  <path d="m190 117 13-6 9 4 7-1 9 11-13-4-10 5Z" fill="#81ad77"/>
  <path d="m161 47 3-14 5-3 1 19m-46 7-6-20 4-7" stroke="#5c885c" stroke-width="2.5" stroke-linecap="round"/><path d="M166 35c-8-1-9-7-5-10 6 1 8 5 5 10Zm-46 4c-8 1-12-4-10-9 7-1 11 3 10 9Z" fill="#8ab17a"/>
  <!-- Near feet have armor plates and broad ivory claws. -->
  <path d="M96 141c12-4 23 4 23 18l-8 29-8 6H65l-4-8 15-17 5-23Z" fill="url(#gb-jade)" stroke="#203f40" stroke-width="3" stroke-linejoin="round"/>
  <path d="m86 150 18 1 5 13-11 12-20-5Z" fill="#63947e" stroke="#375f55" stroke-width="2"/><path d="m86 153 14 2m-24 21 13 5 14-4" fill="none" stroke="#a3ceb1" stroke-width="1.6"/>
  <path d="m68 185 5-7 5 14-12 0Zm14 2 6-8 5 14H81Zm15 0 6-8 5 12-12 2Z" fill="#cad6b6" stroke="#506e60" stroke-width="1.4"/>
  <path d="M192 144c14-2 25 7 26 20l-1 23-10 8h-35l-5-8 12-16-1-16Z" fill="url(#gb-jade)" stroke="#203f40" stroke-width="3"/>
  <path d="m189 151 17 6 4 12-13 6-13-8Z" fill="#62927c" stroke="#375f55" stroke-width="2"/>
  <path d="m172 188 6-7 5 12-13 0Zm14 0 6-8 5 14-13 0Zm15-1 6-7 5 12-13 2Z" fill="#cbd5b7" stroke="#506e60" stroke-width="1.4"/>
  <!-- Broad wise face with a low beak, turquoise eyes and stone brow. -->
  <path d="M73 109c-18-7-40 0-45 14l-13 7-2 15 11 13 21 6 26-6 18-16-2-23Z" fill="url(#gb-jade)" stroke="#203f40" stroke-width="3" stroke-linejoin="round"/>
  <path d="m27 147 12 6 22-3 17-10-7 15-27 8-19-5-10-11Z" fill="#96b89b"/>
  <path d="m29 131 16-3 13 7-7 10-19-1Z" fill="#1e4242"/>
  <path d="m33 134 13-2 7 4-6 5-13-1Z" fill="#a0f4d0"/><path d="m43 133 3 0-1 8-3-1Z" fill="#245958"/>
  <path d="m28 128 12-9 18 9-1 7-13-6-14 6Z" fill="url(#gb-stone)" stroke="#426d5e" stroke-width="2"/>
  <path d="m18 133 11 1-3 11-10 3-5-8Z" fill="#aac3a4" stroke="#4a7262" stroke-width="1.8"/>
  <path d="m21 150 16 2 19-5" fill="none" stroke="#355b50" stroke-width="2.2" stroke-linecap="round"/>
  <path d="m62 117 10 5-2 9m-9 6 12-3m-2 11 9-7" fill="none" stroke="#7fc4ac" stroke-width="2" stroke-linecap="round"/>
  <circle cx="21" cy="137" r="1.6" fill="#305449"/>
  <!-- A slender water-serpent forms a second, unmistakable silhouette. -->
  <path d="M207 136c-16-6-14-26 2-34 21-11 16-34-3-41-16-5-47 11-50-1-2-6 5-17-4-25-7-8-25-6-29 3-5 11 4 20 9 27 11 18 40 11 61 10 15-1 18 13 5 22-24 16-17 45 8 53l8-7Z" fill="url(#gb-water)" stroke="#235452" stroke-width="3" stroke-linejoin="round"/>
  <path d="M131 43c-3 10 7 16 10 23 9 12 36 7 52 7 20-1 27 14 10 25-22 15-14 40 4 46" fill="none" stroke="#b9efd0" stroke-width="3.8" stroke-linecap="round"/>
  <path d="m124 41-7-10 12 2 9-7 3 8c11 1 17 7 14 16l-8 7-14-3-13-7Z" fill="url(#gb-water)" stroke="#235452" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="m123 41 11-2 6 4-4 6-10-1Z" fill="#23504d"/><path d="m126 42 8 0-2 4-6-1Z" fill="#e5f7b1"/><path d="m130 42 1 4" stroke="#244c45" stroke-width="1.6"/>
  <path d="m142 51 8-1m-27-9-8 0-5 4m7-6-4-5" fill="none" stroke="#91cfc2" stroke-width="1.5" stroke-linecap="round"/>
  <path d="m203 62 4-8 6 12m-59 5 3 5m11-7 3 5m11-6 3 5m25 38 4 4m-14 7 5 3m-4 10 5 1" fill="none" stroke="#367f7a" stroke-width="1.7"/>
`;

function svg(artwork: string, viewBox: string, width: number, height: number) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBox}" fill="none">${artwork}</svg>`;
}
const url = (source: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;

export const RATATOSKR_SVG = svg(RATATOSKR_ARTWORK, '0 0 280 210', 280, 210);
export const RATATOSKR_ART_URL = url(RATATOSKR_SVG);
export const RATATOSKR_PORTRAIT_SVG = svg(RATATOSKR_ARTWORK, '37 10 155 155', 140, 140);
export const RATATOSKR_PORTRAIT_URL = url(RATATOSKR_PORTRAIT_SVG);
export const GENBU_SVG = svg(GENBU_ARTWORK, '0 0 280 210', 280, 210);
export const GENBU_ART_URL = url(GENBU_SVG);
export const GENBU_PORTRAIT_SVG = svg(GENBU_ARTWORK, '5 23 160 160', 140, 140);
export const GENBU_PORTRAIT_URL = url(GENBU_PORTRAIT_SVG);
