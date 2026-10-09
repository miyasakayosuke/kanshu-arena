/**
 * Original vector character art for 破縛の魔狼フェンリル.
 * Drawn for this game: no downloaded artwork, font glyphs, or external resources.
 * A shared SVG keeps the DOM portrait and the canvas combatant visually identical.
 */
const FENRIR_ARTWORK = `
  <defs>
    <linearGradient id="fn-fur" x1="0.2" y1="0" x2="0.65" y2="1">
      <stop stop-color="#64777d"/><stop offset=".43" stop-color="#34434e"/><stop offset="1" stop-color="#14202d"/>
    </linearGradient>
    <linearGradient id="fn-ivory" x1=".15" y1="0" x2=".7" y2="1">
      <stop stop-color="#fff9dd"/><stop offset=".52" stop-color="#dce2d3"/><stop offset="1" stop-color="#849c9d"/>
    </linearGradient>
    <linearGradient id="fn-mane" x1=".2" y1="0" x2=".7" y2="1">
      <stop stop-color="#e6ead8"/><stop offset=".5" stop-color="#a8bbba"/><stop offset="1" stop-color="#536c76"/>
    </linearGradient>
    <linearGradient id="fn-gold" x1="0" y1="0" x2=".7" y2="1">
      <stop stop-color="#fff1b2"/><stop offset=".25" stop-color="#dfb566"/><stop offset=".6" stop-color="#9b652b"/><stop offset=".8" stop-color="#e2bf75"/><stop offset="1" stop-color="#6b492a"/>
    </linearGradient>
    <linearGradient id="fn-tail" x1="0" y1="1" x2=".8" y2=".1">
      <stop stop-color="#253540"/><stop offset=".55" stop-color="#68858b"/><stop offset=".76" stop-color="#d7e2d2"/><stop offset="1" stop-color="#fcf5d9"/>
    </linearGradient>
    <radialGradient id="fn-eye"><stop stop-color="#edfff1"/><stop offset=".35" stop-color="#a4ffe1"/><stop offset="1" stop-color="#35d9c5"/></radialGradient>
    <filter id="fn-glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="2"/></filter>
  </defs>

  <!-- The faint wake belongs to the character, not to a rectangular backdrop. -->
  <ellipse cx="140" cy="188" rx="99" ry="10" fill="#07121c" opacity=".32"/>
  <g fill="none" stroke-linecap="round">
    <path d="M27 156C1 119 49 59 120 40M226 142c23-18 33-42 28-61" stroke="#5ee7cf" stroke-width="1.5" opacity=".23"/>
    <path d="M43 170c30 22 117 25 169 1" stroke="#a5edda" stroke-width="1" opacity=".23"/>
    <path d="m32 76 5-9m189-38 3-8m30 131 6-4" stroke="#c4f9dd" stroke-width="2" opacity=".62"/>
  </g>

  <!-- Wind-swept brush tail. -->
  <path d="M191 90c20-15 41-19 52-34 9-13 6-24 4-38l12 12 9-15c6 18 4 40-6 55l10-5c-7 17-19 31-36 37l9 2c-14 9-31 15-48 9Z" fill="url(#fn-tail)" stroke="#101e2b" stroke-width="3" stroke-linejoin="round"/>
  <path d="M205 98c29-3 49-27 55-52-2 19-13 36-25 47l12-4-12 12 11-2-24 10-11-1Z" fill="#294450" opacity=".65"/>
  <path d="M243 56c6-10 9-19 6-30l10 15 8-18c2 15-1 27-7 39l-1-14-8 16 1-10-15 17Z" fill="#f0efdb"/>
  <path d="M216 91c15-9 30-25 34-41" fill="none" stroke="#c0dbcc" stroke-width="2" opacity=".6"/>

  <!-- Far legs are quieter so all four paws read without flattening the body. -->
  <path d="M186 106c16-3 31 7 32 20l19 19-10 10 13 7c6 4 9 8 5 11h-33l-8-11 10-19-21-11-15-10Z" fill="#253943" stroke="#101e2b" stroke-width="3" stroke-linejoin="round"/>
  <path d="m226 156 8 8-17-2 2-6Z" fill="#9eafaa"/>
  <path d="m233 166 1 6m-8-7 1 7m-10-7 1 7" fill="none" stroke="#0c1926" stroke-width="2"/>
  <path d="M118 91c11 12 15 31 6 47l-11 25 7 9c3 5 2 10-4 11H91c-6-2-5-7-1-11l10-12 3-29-3-28Z" fill="#263c46" stroke="#101e2b" stroke-width="3" stroke-linejoin="round"/>
  <path d="m105 145 15 4-4 11-14-5Z" fill="url(#fn-gold)" stroke="#182a30" stroke-width="2"/>
  <path d="m94 176 1 6m8-7 1 7m8-7 1 7" fill="none" stroke="#091723" stroke-width="2"/>

  <!-- Athletic torso, with a high shoulder and compressed hindquarters. -->
  <path d="m97 71 16-13 10 1 12-12 8 8 21-8-2 8 18 2c22-5 41 8 47 28l-3 8 4 6-10 12 2 9-16 4-3 7-21-7-17 3-9-6-16 6-20-10-15 2-10-13-8-1-8-16Z" fill="url(#fn-fur)" stroke="#10202c" stroke-width="3" stroke-linejoin="round"/>
  <path d="m122 63 16-10 13 11 26-4 28 9 15 15-28-9-17 4-31-6-20 10-17-5Z" fill="#9eb3b2" opacity=".43"/>
  <path d="m147 78 29 3 24-4-12 12-25 6-15 19-15-4 7-21Z" fill="#233741"/>
  <path d="m156 100 22-8 19 1-4 9-19 9-22 2-13 10 12-17Z" fill="#718b91" opacity=".32"/>
  <path d="m169 65 10 5m-32-8 10 7m45 1 12 10" fill="none" stroke="#d0ded0" stroke-width="1.3" opacity=".6"/>

  <!-- Near hind leg: bent hock, broad weight-bearing paw, ivory toe tips. -->
  <path d="M193 91c16 0 23 13 18 28l-19 26 8 22 10 7c7 5 7 11 1 13h-32c-5-1-7-5-3-10l6-10-9-21 5-22-12-1c-2-17 7-29 27-32Z" fill="url(#fn-fur)" stroke="#10202c" stroke-width="3" stroke-linejoin="round"/>
  <path d="M193 98c13 1 15 9 10 21l-17 23-5-1 8-23-8-4Z" fill="#607b82"/>
  <path d="m183 159 13-1 4 12-18 3-6-6Z" fill="url(#fn-gold)" stroke="#162832" stroke-width="2"/>
  <path d="m183 160 9 1 3 6-11 2" fill="none" stroke="#fff0ac" stroke-width="1.4"/>
  <path d="m189 175 9-1 11 4 3 6h-32l4-6Z" fill="#becbc0"/>
  <path d="m191 179 1 7m8-7 2 7m7-6 2 5" fill="none" stroke="#263b44" stroke-width="1.8" stroke-linecap="round"/>
  <path d="m194 185 3-5 2 6m6-1 3-4 2 5" fill="#f1eed5"/>

  <!-- Broad ivory breast and a reaching foreleg give the low hunting posture. -->
  <path d="m92 65 15-3 17 13 12 22-7-1 5 20-10-4-4 23-8-8-12 23-5-14-15 12 1-17-14 5 5-25-10-5 14-18Z" fill="url(#fn-mane)" stroke="#10202c" stroke-width="2.8" stroke-linejoin="round"/>
  <path d="m98 83 19 8-9 12 8 2-13 16-5-2-10 19 1-26-8 2 5-18Z" fill="#f0f0da"/>
  <path d="m109 82 15 18-8-1 2 15-8-4-11 19 5-24Z" fill="#627e86" opacity=".58"/>
  <path d="M91 110c9 1 16 9 12 21l-18 21-17 24 3 7c2 6-2 10-8 10H36c-7-1-8-5-4-10l19-13 11-29 8-24Z" fill="url(#fn-fur)" stroke="#10202c" stroke-width="3" stroke-linejoin="round"/>
  <path d="M88 119c4 4 5 8 1 14l-19 24-9 18-10 3 15-39 11-13Z" fill="#87a1a2"/>
  <path d="m60 154 19 9-8 14-21-8Z" fill="url(#fn-gold)" stroke="#1b2d31" stroke-width="2.3"/>
  <path d="m60 158 14 6-4 8-15-5Z" fill="none" stroke="#fff0ad" stroke-width="1.4"/>
  <path d="m62 161 5 2-3 6-5-2Z" fill="#40d8be" stroke="#664d2d" stroke-width="1"/>
  <path d="m45 180 13-1 9 5-2 7H33l2-5Z" fill="url(#fn-ivory)"/>
  <path d="m43 185 1 7m8-8 2 8m7-7 2 7" fill="none" stroke="#273d46" stroke-width="2" stroke-linecap="round"/>
  <path d="m39 191 4-5 2 6m5 0 3-6 3 6m4 0 3-5 2 5" fill="#fff3d5"/>

  <!-- Broken links are open at the jagged end, rather than a decorative necklace. -->
  <g fill="none" stroke-linejoin="round">
    <path d="M56 167c-10-7-18 1-14 8 4 7 14 3 13-3M43 175c-8-5-16 0-13 7 3 7 12 5 13-1M31 182l-5-3-9 4-1 8 5 3m5-1 5-3-1-5" stroke="#122630" stroke-width="6"/>
    <path d="M56 167c-10-7-18 1-14 8 4 7 14 3 13-3M43 175c-8-5-16 0-13 7 3 7 12 5 13-1M31 182l-5-3-9 4-1 8 5 3m5-1 5-3-1-5" stroke="url(#fn-gold)" stroke-width="3.4"/>
    <path d="M197 165c8-7 16-1 12 6-4 6-11 3-10-1m9 2c6-5 14-1 12 5-2 7-10 7-12 2m12-1 6-2 7 4 1 7-4 2m-5-1-5-4 1-4" stroke="#142831" stroke-width="5.5"/>
    <path d="M197 165c8-7 16-1 12 6-4 6-11 3-10-1m9 2c6-5 14-1 12 5-2 7-10 7-12 2m12-1 6-2 7 4 1 7-4 2m-5-1-5-4 1-4" stroke="url(#fn-gold)" stroke-width="3"/>
  </g>
  <g fill="#f8d48a"><path d="m13 180-5-4 1 6 3 1Zm12 16 2 5 3-3-2-3Zm213-16 7-2-3 5-3-1Z"/></g>

  <!-- Head: long canine muzzle, swept cheek fur, two upright ears; no horns. -->
  <path d="m69 56-10-30 21 12 10 13 16-8 16-18-1 35 8 10-8 12 7 9-16 3 2 11-19-4-14 11-10-9-15-5-12-19 8-14Z" fill="url(#fn-ivory)" stroke="#10202c" stroke-width="3" stroke-linejoin="round"/>
  <path d="m65 35 8 21 8-8-5-6Zm51 2-13 17 13 4Z" fill="#2c414a"/>
  <path d="m69 42 5 11 3-7Zm44 3-7 9 7 1Z" fill="#65868a"/>
  <path d="m79 54 10 2 11-7 8 12-8 10 7 8-9 4-8-9-8 6-9-5 5-9Z" fill="#405963"/>
  <path d="m89 57 6 3-1 15-6 10-4-8 3-8Z" fill="#f9f2d6"/>
  <path d="m63 62 11-4-4 9-12 10 8 3-13 8-2-10Z" fill="#e6e9d8"/>
  <path d="m110 64 10 4-8 7 7 2-14 8 6 8-13-3-5-9Z" fill="#bccdc8"/>
  <path d="m65 72 10 1 5 9-9 4-15-3Z" fill="#1a2e39"/>
  <path d="m96 73 14-5-5 12-10 3-5-3Z" fill="#192e39"/>
  <path d="m62 74 13 3-4 5-10-4Zm35 2 10-4-4 6-7 2Z" fill="#46f1ce" filter="url(#fn-glow)" opacity=".9"/>
  <path d="m62 75 13 2-5 4-8-3Zm35 1 10-4-5 6-6 1Z" fill="url(#fn-eye)"/>
  <path d="m68 76 2 1-1 3-1-1Zm34-2 1 1-2 3-1-1Z" fill="#173832"/>
  <path d="m60 70 14 4 3 3m19-4 13-5" fill="none" stroke="#eeefd8" stroke-width="3" stroke-linecap="round"/>

  <!-- Angled snarl, with restrained, clear ivory fangs. -->
  <path d="M78 80 88 81 96 94 86 108 68 109 47 98 43 90 58 85Z" fill="#f5efd4" stroke="#28414a" stroke-width="1.5" stroke-linejoin="round"/>
  <path d="M48 94 63 97 78 96 92 91 88 105 75 114 59 107 47 100Z" fill="#142734" stroke="#10202c" stroke-width="2" stroke-linejoin="round"/>
  <path d="m60 103 14 5 12-7-11 11-12-5Z" fill="#9e736f"/>
  <path d="m53 96 9 2-3 9Zm24 0 8-2-5 13Zm-13 2 5-1-2 5Z" fill="#fff7d8"/>
  <path d="m65 108 3-4 2 7Zm11 3 4-7 1 5Z" fill="#dce2d1"/>
  <path d="M45 85 54 81 67 84 64 92 54 94 44 90Z" fill="#132734" stroke="#091b28" stroke-width="1.5" stroke-linejoin="round"/>
  <path d="m47 85 8-2 6 2-9 2Z" fill="#728d92"/>
  <path d="m72 85 7 4m8-4 3 3m-36 8-5 2m7 2-5 1" fill="none" stroke="#708e92" stroke-width="1.2" stroke-linecap="round"/>
  <path d="m96 93 8-5-4 11 9-1-13 11-1-8-7 8-4 3 4-12Z" fill="#afc4bf"/>

  <!-- Three luminous seal fragments, drawn as geometry rather than text. -->
  <g fill="none" stroke="#66f0d3" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" filter="url(#fn-glow)" opacity=".7">
    <path d="m140 83 5 8-9 6 3 9m13-28 5 7-7 6 3 8m13-22 4 6-5 6"/>
  </g>
  <g fill="none" stroke="#91f8dc" stroke-width="1.7" stroke-linecap="square" stroke-linejoin="miter">
    <path d="m140 83 5 8-9 6 3 9m13-28 5 7-7 6 3 8m13-22 4 6-5 6"/>
  </g>
  <path d="m130 75 3-5 3 5-3 5Z" fill="#a7ffe0"/>
  <g fill="none" stroke="#c8ddd0" stroke-width="1.1" stroke-linecap="round" opacity=".68">
    <path d="m126 64 7 2m-18 48 4-6m10 0 3-7m50 14 6-4m-36 7 5-3m38 13 4-6m-118 8 5-5"/>
  </g>
`;

/** Full-body art faces left and looks toward the viewer. Transparent, 4:3-ish. */
export const FENRIR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="210" viewBox="0 0 280 210" fill="none">${FENRIR_ARTWORK}</svg>`;

/** Safe for both <img src> and Image.src; never requires a network request. */
export const FENRIR_ART_URL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(FENRIR_SVG)}`;

/** A close face-and-shoulders crop for compact party and command tiles. */
export const FENRIR_PORTRAIT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="140" height="140" viewBox="35 20 115 115" fill="none">${FENRIR_ARTWORK}</svg>`;
export const FENRIR_PORTRAIT_URL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(FENRIR_PORTRAIT_SVG)}`;
