/**
 * Original code-native beast roster art, drawn directly as SVG geometry.
 * No downloaded images, traced art, embedded glyphs, or external resources.
 * Each portrait crops the exact same artwork used by the full battle sprite.
 */
const YOKO_ARTWORK = `
  <defs>
    <linearGradient id="by-fur" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#de9578"/><stop offset=".45" stop-color="#ae4f52"/><stop offset="1" stop-color="#69394c"/></linearGradient>
    <linearGradient id="by-tail" x1="0" y1="0" x2=".9" y2="1"><stop stop-color="#f8e8d1"/><stop offset=".6" stop-color="#d5bfcb"/><stop offset="1" stop-color="#8a739f"/></linearGradient>
    <linearGradient id="by-cream" x1="0" y1="0" x2=".6" y2="1"><stop stop-color="#fff4d8"/><stop offset="1" stop-color="#dcbda8"/></linearGradient>
    <linearGradient id="by-jade" x1="0" y1="0" x2=".5" y2="1"><stop stop-color="#b9edcf"/><stop offset="1" stop-color="#599c9c"/></linearGradient>
  </defs>
  <ellipse cx="143" cy="192" rx="113" ry="10" fill="#4b30432a"/>
  <!-- Three separate, broad tails fan behind a low fox body. -->
  <path d="M145 144c-15-38-3-70 25-89 19-13 29-28 31-44 20 30 14 65-12 94-14 16-25 30-24 51Z" fill="url(#by-tail)" stroke="#63445f" stroke-width="3.2" stroke-linejoin="round"/>
  <path d="M174 101c16-22 29-44 27-74-8 19-19 27-31 39-16 17-24 39-17 68Z" fill="#fff1d5"/>
  <path d="m174 67 8-8-5 15 9-3-18 27 0-13-10 6Z" fill="#c7a9bb"/>
  <path d="M149 147c7-38 28-59 60-62 28-3 47-11 62-26-2 38-20 64-59 69-23 3-41 12-49 30Z" fill="url(#by-tail)" stroke="#63445f" stroke-width="3.2" stroke-linejoin="round"/>
  <path d="M167 133c22-28 58-20 84-47l10-14c-29 20-53 16-76 29-11 8-17 18-18 32Z" fill="#fff1d5"/>
  <path d="m220 97-17 13 16-4-14 10 21-4 23-17-17 4 12-12Z" fill="#b6a0be"/>
  <path d="M150 151c30-19 55-11 75-10 20 1 35-5 49-16-2 28-24 51-59 49-23-3-40 0-52 6Z" fill="url(#by-tail)" stroke="#63445f" stroke-width="3.2" stroke-linejoin="round"/>
  <path d="M177 157c37 7 66 3 84-18-29 14-58 0-84 18Z" fill="#fff1d5"/>
  <path d="m237 154-14 8 13 0-11 6 21-4 12-11-14 4Z" fill="#ab93b1"/>
  <path d="m171 71-8 16m69 14-15 5m18 50-13 2" fill="none" stroke="#fff8e3" stroke-width="2" stroke-linecap="round"/>
  <!-- A fox's narrow hocks and long paws; the far pair sit behind the torso. -->
  <path d="M142 137c13-5 30 1 29 13l-16 25 11 12-1 7-30 0-7-8 13-18-7-19Z" fill="#793d4e" stroke="#513549" stroke-width="3" stroke-linejoin="round"/>
  <path d="m148 183 15 5-1 5-24 0 2-6Z" fill="#d1a9a0"/>
  <path d="M91 130c7 9 9 20 4 36l-12 18 3 8H58l-1-7 17-15 2-33Z" fill="#854353" stroke="#513549" stroke-width="3"/>
  <path d="m64 182 13-3 7 10-24 1Z" fill="#d2ac9d"/>
  <!-- High shoulders taper to a small crouching haunch. -->
  <path d="M87 95c24-7 38 21 58 27 22 0 40 10 37 29-4 28-38 29-61 17-19-9-37-25-44-43Z" fill="url(#by-fur)" stroke="#513549" stroke-width="3.5" stroke-linejoin="round"/>
  <path d="M88 108c11 11 15 30 32 43 15 12 32 14 48 6-14 18-41 15-59-4-11-11-18-25-21-45Z" fill="url(#by-cream)"/>
  <path d="m137 131 10 1-7 6 10 4-14 3-9-5Z" fill="#c4716c"/>
  <path d="M145 145c12-4 23 6 19 18l-16 18 3 9 10 3-1 8h-34l-5-9 10-26-2-10Z" fill="url(#by-fur)" stroke="#513549" stroke-width="3"/>
  <path d="m133 184 12-4 6 13 8 2-1 5h-28l-3-5Z" fill="url(#by-cream)"/>
  <path d="m139 194-1 6m7-5 0 5m7-5 1 5" stroke="#ac847d" stroke-width="1.7" stroke-linecap="round"/>
  <path d="M90 122c10 1 13 11 9 23l-10 31-12 12 1 7-11 7H41l-2-7 22-12 13-36 3-20Z" fill="url(#by-fur)" stroke="#513549" stroke-width="3" stroke-linejoin="round"/>
  <path d="m68 171 17 6-10 12 0 6-10 6H41l1-6 21-14Z" fill="url(#by-cream)"/>
  <path d="m47 195 1 6m7-7 1 7m7-8 1 6" fill="none" stroke="#ac847d" stroke-width="1.7" stroke-linecap="round"/>
  <!-- Broad cheek ruff, small tapered muzzle, large black-backed ears. -->
  <path d="m66 85-6-26 2-31 17 17 13 21 21-22 16-7-8 31-13 24 6 18-11-3 2 14-14-5-3 10-12-8-12 2-15-8-17-17 13-1-8-13Z" fill="url(#by-fur)" stroke="#513549" stroke-width="3.3" stroke-linejoin="round"/>
  <path d="m65 36 5 28 10 10 2-15Zm53 12-18 26 10-5Z" fill="#49354b"/>
  <path d="m70 45 4 18 5 6-1-10Zm40 13-7 12 7-7Z" fill="#cda2af"/>
  <path d="m57 84-7 7 13 3-10 5 15 13 10-5 9 6 14-8 8-11-12-3-13 7-13-10Z" fill="url(#by-cream)"/>
  <path d="m65 75 13 2 6 7-9 6-13-5Z" fill="#3f3448"/>
  <path d="m66 79 11 1 3 4-7 2-7-3Z" fill="#cce9b3"/>
  <path d="m73 80 0 6" stroke="#315950" stroke-width="2"/>
  <path d="m92 78 11-5 5 4-7 8-9 1Z" fill="#3f3448"/>
  <path d="m95 80 7-4 3 1-5 5-6 1Z" fill="#cce9b3"/>
  <path d="m100 77-1 5" stroke="#315950" stroke-width="1.8"/>
  <path d="m62 72 12-1 8 6m12-4 10-4 6 3" fill="none" stroke="#f4c5a4" stroke-width="2.8" stroke-linecap="round"/>
  <path d="m80 91 10-1 5 5-9 6-8-6Z" fill="#503848"/>
  <path d="m82 92 7 0" stroke="#c18a9e" stroke-width="1.4" stroke-linecap="round"/>
  <path d="m86 100-2 6m-9-2 9 3 9-3" fill="none" stroke="#956c76" stroke-width="1.6" stroke-linecap="round"/>
  <path d="m54 94 11 3m-10 3 11 1m35-5 14-3m-13 7 10-1" fill="none" stroke="#9e7584" stroke-width="1.3" stroke-linecap="round"/>
  <!-- One jade cord and cut-stone bell add identity without a borrowed emblem. -->
  <path d="M66 113c8 10 28 12 39 2l3 5c-13 12-33 11-44-2Z" fill="#6c9a97" stroke="#3d686d" stroke-width="2"/>
  <path d="m85 123 8 0 4 8-9 11-8-10Z" fill="url(#by-jade)" stroke="#396771" stroke-width="2"/>
  <path d="m85 129 7 1-4 7Z" fill="#e0f6d6"/>
`;

const BASTET_ARTWORK = `
  <defs>
    <linearGradient id="bb-fur" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#526d6b"/><stop offset=".52" stop-color="#284649"/><stop offset="1" stop-color="#182f39"/></linearGradient>
    <linearGradient id="bb-copper" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#f4d4a0"/><stop offset=".42" stop-color="#d7975d"/><stop offset="1" stop-color="#9a604a"/></linearGradient>
    <linearGradient id="bb-cloth" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#e7a296"/><stop offset="1" stop-color="#a45668"/></linearGradient>
  </defs>
  <ellipse cx="140" cy="192" rx="95" ry="10" fill="#293c3d2a"/>
  <!-- A low oval tail loops around the seated cat, ending in a copper cap. -->
  <path d="M159 157c41-18 78-5 72 20-6 27-57 31-110 23-51-7-82-20-77-43 3-15 22-17 28-7 5 9-5 16-11 10-9 19 32 29 62 30 45 4 88-2 89-17 1-11-26-15-45-5Z" fill="url(#bb-fur)" stroke="#182e35" stroke-width="3.4"/>
  <path d="M55 146c7-4 16 0 18 7 1 6-5 12-11 9l-6-6-6 2Z" fill="url(#bb-copper)" stroke="#705342" stroke-width="2"/>
  <path d="M75 184c40 17 107 21 139 3" fill="none" stroke="#76918a" stroke-width="2.2" stroke-linecap="round"/>
  <!-- Wide haunches, an upright teardrop chest and narrow, paired forepaws. -->
  <path d="M111 115c-25 5-41 29-37 56 2 17 21 22 42 15l19-32Z" fill="url(#bb-fur)" stroke="#182e35" stroke-width="3.3"/>
  <path d="M157 116c28 1 47 25 43 52-3 20-22 26-42 18l-20-28Z" fill="url(#bb-fur)" stroke="#182e35" stroke-width="3.3"/>
  <path d="m92 146 10-12m-15 22 9-9m82-7 8 10m-4 3 7 8" fill="none" stroke="#809389" stroke-width="2.3" stroke-linecap="round"/>
  <path d="M115 90c-18 22-16 63-8 89l-1 11 27 4 30-6c6-31 12-75-11-99Z" fill="url(#bb-fur)" stroke="#182e35" stroke-width="3.5"/>
  <path d="M128 108c-12 20-10 48-1 68l12 6 13-12c5-26 0-50-11-64Z" fill="#6c8b7c"/>
  <path d="m135 122-7 21 9-6 8 9 0-20-6-9Z" fill="#9aada0"/>
  <!-- A folded rose wrap crosses one hip; its long edge follows the posture. -->
  <path d="m162 133 16 11-4 37-14 8-14-14 9-22Z" fill="url(#bb-cloth)" stroke="#614451" stroke-width="2.5"/>
  <path d="m166 145-6 25 7 11m1-33 6-1m-11 15 9-1" fill="none" stroke="#f1c1a3" stroke-width="2" stroke-linejoin="round"/>
  <path d="M112 135c9-4 14 3 12 13l-4 28 0 10 8 5-1 8h-30l-2-7 9-8 0-37Z" fill="url(#bb-fur)" stroke="#182e35" stroke-width="3"/>
  <path d="m104 172 16 0-1 12-16 2Z" fill="url(#bb-copper)" stroke="#705342" stroke-width="1.8"/>
  <path d="m105 177 13 0" stroke="#f7dca2" stroke-width="1.5"/>
  <path d="M140 137c8-6 16 1 15 11l-4 34 4 6 10 5-1 7h-31l-4-8 7-9-2-32Z" fill="url(#bb-fur)" stroke="#182e35" stroke-width="3"/>
  <path d="m135 174 17 0-1 11-17 1Z" fill="url(#bb-copper)" stroke="#705342" stroke-width="1.8"/>
  <path d="m136 179 14 0" stroke="#f7dca2" stroke-width="1.5"/>
  <path d="m105 192 0 7m7-8 1 8m24-6 1 7m7-7 1 7m7-5 1 5" stroke="#7f9b90" stroke-width="1.7" stroke-linecap="round"/>
  <!-- Tall triangular ears and a broad, level cat mask. -->
  <path d="m104 63-8-22-2-26 21 12 15 20 17-1 15-19 23-10-2 29-11 23 5 15-8 16-23 9-23-2-22-11-9-19Z" fill="url(#bb-fur)" stroke="#182e35" stroke-width="3.4" stroke-linejoin="round"/>
  <path d="m102 25 4 21 12 10 3-8Zm74 3-18 23 13 4 5-10Z" fill="#c58c78"/>
  <path d="m108 36 4 12 5 4m51-13-7 10 8-3" fill="none" stroke="#704f52" stroke-width="2.4"/>
  <path d="m124 48 10 5 12-2 7-6-5 15-13 8-13-9Z" fill="url(#bb-copper)"/>
  <path d="m132 52 5 4 6-1-5 7Z" fill="#f8dcaf"/>
  <path d="m105 69 13-6 14 8-11 10-15-3Z" fill="#101f2a"/>
  <path d="m109 70 10-3 9 5-8 4-10-1Z" fill="#edcc81"/>
  <path d="m119 67 0 9" stroke="#536057" stroke-width="2.2"/>
  <path d="m143 70 14-7 13 5-3 11-15 2Z" fill="#101f2a"/>
  <path d="m147 72 10-5 9 3-2 5-11 1Z" fill="#edcc81"/>
  <path d="m157 67 0 9" stroke="#536057" stroke-width="2.2"/>
  <path d="m105 63 11-5 14 7m15-1 11-6 13 3" fill="none" stroke="#a1b3a1" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M117 84c6-5 12-4 20 1 9-7 19-3 21 4-1 9-15 13-22 10-8 4-24-5-19-15Z" fill="#879e90"/>
  <path d="m130 82 11-1 6 4-10 7-8-6Z" fill="#cda086"/>
  <path d="m137 92 0 5m-8-1 8 3 8-4" fill="none" stroke="#294747" stroke-width="1.6" stroke-linecap="round"/>
  <path d="m107 85 12 3m-13 3 13 1m38-3 14-4m-13 8 15-1" fill="none" stroke="#a2b3a0" stroke-width="1.4" stroke-linecap="round"/>
  <!-- A broad handmade leaf collar is deliberately asymmetric. -->
  <path d="M107 100c18 12 43 13 62-3l4 13c-14 16-49 23-69 4Z" fill="url(#bb-copper)" stroke="#705342" stroke-width="2.4"/>
  <path d="m113 108 1 9 8 2-2-9m9 3 2 10 9 0-2-10m9-3 3 10 8-4-3-10m9-3 4 8" fill="none" stroke="#7e694e" stroke-width="2" stroke-linejoin="round"/>
  <path d="m140 111-3 11 7 11 10-13-4-11Z" fill="#80b5a5" stroke="#385e5d" stroke-width="2"/>
  <path d="m142 119 4-4 3 6-5 6Z" fill="#c6e3c1"/>
  <!-- One open copper rattle rests beside a lifted paw. -->
  <path d="M88 119c-21-17-31-10-27 4 3 13 17 19 25 9l-5-4c-6 5-13-1-14-6-2-8 5-10 17 2Z" fill="url(#bb-copper)" stroke="#705342" stroke-width="2.2"/>
  <path d="m74 112-1 21m-7-16 15 11" fill="none" stroke="#d6ad77" stroke-width="2"/>
  <path d="m82 129 15 17 6-5-15-17Z" fill="#d49b6a" stroke="#705342" stroke-width="2"/>
  <path d="M111 121c-8-2-13 3-13 11l-8-1-6 6 6 10 15-4 10-11Z" fill="url(#bb-fur)" stroke="#182e35" stroke-width="2.6"/>
  <path d="m88 137 9 1m-6 4 8 0" stroke="#9bb1a0" stroke-width="1.6" stroke-linecap="round"/>
`;

const SELKIE_ARTWORK = `
  <defs>
    <linearGradient id="bs-pelt" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#adbcc9"/><stop offset=".45" stop-color="#6e849c"/><stop offset="1" stop-color="#364b67"/></linearGradient>
    <linearGradient id="bs-pearl" x1="0" y1="0" x2=".65" y2="1"><stop stop-color="#fff1d6"/><stop offset="1" stop-color="#bbbdbe"/></linearGradient>
    <linearGradient id="bs-kelp" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#94cbb0"/><stop offset="1" stop-color="#3e817e"/></linearGradient>
    <linearGradient id="bs-coral" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#f1b19c"/><stop offset="1" stop-color="#b86979"/></linearGradient>
  </defs>
  <ellipse cx="142" cy="192" rx="116" ry="10" fill="#334c6926"/>
  <!-- The paired hind flippers open like a small fan at the right. -->
  <path d="M201 160c17-11 31-13 49-9l22 17-19 1 14 13-24-1-26-12-13 3Z" fill="url(#bs-pelt)" stroke="#34455f" stroke-width="3" stroke-linejoin="round"/>
  <path d="M207 168c24-3 42 4 51 20l2 13-14-6-5 7-18-9-21-17Z" fill="url(#bs-pelt)" stroke="#34455f" stroke-width="3" stroke-linejoin="round"/>
  <path d="m220 164 34 2m-31-7 19-1m-22 20 27 15m-24-11 12 13" fill="none" stroke="#b7c5ce" stroke-width="2" stroke-linecap="round"/>
  <!-- A long buoyant seal body curls up into a broad, soft shoulder. -->
  <path d="M100 95c30-7 46 10 55 31 8 19 26 25 53 27l11 17c-28 25-90 29-127 14-35-14-49-45-29-66Z" fill="url(#bs-pelt)" stroke="#34455f" stroke-width="3.5"/>
  <path d="M91 112c-7 27 8 51 35 59 24 8 54 5 73-3-27 25-83 21-108 3-22-15-27-34-20-49Z" fill="url(#bs-pearl)"/>
  <path d="M149 137c12 21 39 26 59 24" fill="none" stroke="#c3d0d4" stroke-width="2.5" stroke-linecap="round"/>
  <path d="m165 150 7 5m9 1 7 3m-39 4 6 3m17 1 6 1" fill="none" stroke="#4e657f" stroke-width="3" stroke-linecap="round"/>
  <!-- An open, doubled pelt collar evokes the folkloric skin without a human costume. -->
  <path d="M56 91c-13 19-9 37 7 50l15-9 4-24 17-10 26 4 7-17-34-12Z" fill="#3a536e" stroke="#34455f" stroke-width="3" stroke-linejoin="round"/>
  <path d="M58 101c-5 12-1 24 6 31l7-10 2-14 15-15 30 2 3-7-31-7Z" fill="url(#bs-pearl)"/>
  <path d="m60 113 10-4m-10 12 9-5m8-17 7 1m8-13 2 6m8-7 1 7m8-5-1 6" fill="none" stroke="#969ead" stroke-width="1.8" stroke-linecap="round"/>
  <!-- Far flipper supports the lifted chest, near flipper sweeps forward. -->
  <path d="M113 129c8-7 18-4 26 5l23 38-3 11-13-5-24-25Z" fill="#576e89" stroke="#34455f" stroke-width="3"/>
  <path d="m136 151 17 25m-21-20 13 18" fill="none" stroke="#a5b6c3" stroke-width="2" stroke-linecap="round"/>
  <path d="M79 132c-16-8-29 4-31 21l-23 26-2 12 13 4 22-13 27-33Z" fill="url(#bs-pelt)" stroke="#34455f" stroke-width="3.3" stroke-linejoin="round"/>
  <path d="M63 144c-1 21-18 35-30 41" fill="none" stroke="#bfcbd3" stroke-width="3" stroke-linecap="round"/>
  <path d="m48 173-15 14m21-12-15 15" fill="none" stroke="#8eabc1" stroke-width="2" stroke-linecap="round"/>
  <!-- Rounded seal head, small external folds and a wide whiskered muzzle. -->
  <path d="M51 66c-4-24 14-42 40-43 26-1 49 13 53 34l-1 17-12 17-22 10-29-3-25-12Z" fill="url(#bs-pelt)" stroke="#34455f" stroke-width="3.5"/>
  <path d="M62 45c14-18 44-19 61-4-16-9-35-4-46 6Z" fill="#d1dae0"/>
  <path d="m57 58-8 1-4 10 6 8 6-1m80-17 10 3 4 10-7 6-5-3" fill="#7c91a8" stroke="#34455f" stroke-width="2.2"/>
  <path d="m50 66 3 4m91-3 3 5" fill="none" stroke="#b8c6cf" stroke-width="2" stroke-linecap="round"/>
  <path d="M63 67c-1-8 5-14 12-13 8 0 11 7 9 15-2 7-9 10-15 7Z" fill="#263649"/>
  <path d="M110 61c2-9 13-11 19-4 4 5 3 13-3 16-9 5-18-3-16-12Z" fill="#263649"/>
  <path d="M68 61c5-4 11-1 11 5-1 6-7 8-10 4Z" fill="#739da4"/>
  <path d="M115 60c4-4 11-1 11 4 0 6-6 8-10 4Z" fill="#739da4"/>
  <path d="m71 61 0 8m48-10 1 8" stroke="#1c3544" stroke-width="3.3" stroke-linecap="round"/>
  <circle cx="70" cy="60" r="2.4" fill="#fbf8e5"/><circle cx="117" cy="58" r="2.4" fill="#fbf8e5"/>
  <path d="m63 51 10-4 10 2m28-4 11 0 7 5" fill="none" stroke="#c8d3da" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M73 77c4-9 17-9 23-2 8-10 23-8 27 1 6 12-13 22-28 17-13 6-31-5-22-16Z" fill="url(#bs-pearl)"/>
  <path d="m88 72 10-3 10 4-5 8-10 1-6-6Z" fill="#3d495d"/>
  <path d="m92 73 8-1 3 1" stroke="#8597a5" stroke-width="1.8" stroke-linecap="round"/>
  <path d="m97 82 0 6m-9-2 9 4 10-5" fill="none" stroke="#687d8e" stroke-width="1.7" stroke-linecap="round"/>
  <path d="m79 81-22-3m22 7-26 3m59-8 28-4m-29 8 27 4m-28 0 18 8m-49-8-18 10" fill="none" stroke="#e1e4d9" stroke-width="1.6" stroke-linecap="round"/>
  <g fill="#6f8192"><circle cx="82" cy="80" r="1.3"/><circle cx="86" cy="85" r="1.2"/><circle cx="114" cy="78" r="1.3"/><circle cx="111" cy="84" r="1.2"/></g>
  <!-- Sea-kelp clasp and coral scallops are hand-drawn, unlettered forms. -->
  <path d="M123 85c10 5 12 17 8 29l-7 20-6-4 7-20-4-15Z" fill="url(#bs-kelp)" stroke="#3d6771" stroke-width="2"/>
  <path d="M130 101c6-12 15-14 18-8-2 7-8 12-18 8Zm-4 11c-13-1-18-7-14-13 7 0 11 5 14 13Zm-4 13c9-5 16-2 14 4-4 4-9 4-14-4Z" fill="url(#bs-kelp)" stroke="#3d6771" stroke-width="1.8"/>
  <path d="m126 100 6 2m-12 4 6 6m2 15 4 0" stroke="#c0dfbe" stroke-width="1.6" stroke-linecap="round"/>
  <path d="M119 88c-9-10-11-17-5-19 4-1 5 5 7 7-1-8 5-12 8-7l-1 10c7-5 12-1 9 4l-11 8Z" fill="url(#bs-coral)" stroke="#825369" stroke-width="2" stroke-linejoin="round"/>
  <path d="m119 84 6 1 4-5" fill="none" stroke="#fbd4b6" stroke-width="1.7" stroke-linecap="round"/>
  <path d="m142 123 5 4m9 12 4 4m-16 1 4 3m11 9 5 2m24 0 5 1m-2 13 5-1" fill="none" stroke="#d2d8d6" stroke-width="2" stroke-linecap="round"/>
`;

const ANUBIS_ARTWORK = `
  <defs>
    <linearGradient id="ba-fur" x1="0" y1="0" x2=".6" y2="1"><stop stop-color="#7a6473"/><stop offset=".4" stop-color="#4a4058"/><stop offset="1" stop-color="#252c42"/></linearGradient>
    <linearGradient id="ba-brass" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#e9d69d"/><stop offset=".45" stop-color="#b69e60"/><stop offset="1" stop-color="#7e684c"/></linearGradient>
    <linearGradient id="ba-linen" x1="0" y1="0" x2=".5" y2="1"><stop stop-color="#f7e7c3"/><stop offset="1" stop-color="#bfb19b"/></linearGradient>
    <linearGradient id="ba-red" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#df9b78"/><stop offset="1" stop-color="#975368"/></linearGradient>
  </defs>
  <ellipse cx="142" cy="195" rx="88" ry="8" fill="#2d2f462b"/>
  <!-- A long, narrow jackal tail balances the upright stride. -->
  <path d="M157 135c30 4 43 23 55 32 14 10 26 6 38-6-5 20-20 32-37 22-24-15-26-29-53-31Z" fill="url(#ba-fur)" stroke="#282d42" stroke-width="3.2"/>
  <path d="M206 170c16 15 29 13 37 3-11 17-24 12-37-3Z" fill="#96858d"/>
  <!-- An open three-pronged rod has no borrowed symbol or lettering. -->
  <path d="m218 70-12 119 6 3 13-122Z" fill="url(#ba-brass)" stroke="#655942" stroke-width="2.2"/>
  <path d="m221 82 5-1m-6 8 5 0m-10 69 5 1m-6 7 6 1" stroke="#f1d7a1" stroke-width="2"/>
  <path d="M223 76c-17-5-26-16-25-31l8 6c0 8 6 15 14 16l2-34 7-9 5 10-5 33c10-2 18-10 20-19l8-4c-1 18-13 30-28 33Z" fill="url(#ba-brass)" stroke="#655942" stroke-width="2.4" stroke-linejoin="round"/>
  <path d="m223 58 2-20 3-6m-17 32-6-7m30 11 12-8" fill="none" stroke="#f8e6b7" stroke-width="1.8" stroke-linecap="round"/>
  <!-- Long far shin and near bent leg establish a walking, rather than throne, pose. -->
  <path d="M145 130c13-1 20 7 18 21l-11 22 3 15 20 6 1 7-35 0-8-12 1-19 0-27Z" fill="url(#ba-fur)" stroke="#282d42" stroke-width="3" stroke-linejoin="round"/>
  <path d="m137 173 16-2 1 12-17 3Z" fill="url(#ba-brass)" stroke="#655942" stroke-width="1.8"/>
  <path d="m140 179 12-1m3 17 0 6m7-5 1 5m6-3 1 3" stroke="#cfbea0" stroke-width="1.5"/>
  <path d="M123 125c-12 3-18 17-13 30l10 14-18 17-23 6-4 8h32l33-25 2-13-8-26Z" fill="url(#ba-fur)" stroke="#282d42" stroke-width="3.2" stroke-linejoin="round"/>
  <path d="m109 179 11 11-13 10-10-13Z" fill="url(#ba-brass)" stroke="#655942" stroke-width="1.8"/>
  <path d="m107 185 8 8m-31 2-2 5m10-6-1 6" stroke="#ead7b5" stroke-width="1.5"/>
  <!-- A slender chest is visible around two deliberately offset linen panels. -->
  <path d="M113 74c-12 19-7 45 6 65l36 5c15-24 14-56-5-71Z" fill="url(#ba-fur)" stroke="#282d42" stroke-width="3.4"/>
  <path d="m121 90 12 6 13-8-3 35-12 12-12-14Z" fill="#8b7981"/>
  <path d="m118 117 38 4 6 15-18 7-30-6Z" fill="url(#ba-brass)" stroke="#655942" stroke-width="2.2"/>
  <path d="m123 122 28 3m-30 5 32 3" fill="none" stroke="#eadcb5" stroke-width="1.7"/>
  <path d="m118 132 18 5-6 38-18-10-5-7Z" fill="url(#ba-linen)" stroke="#817466" stroke-width="2.2"/>
  <path d="m139 138 17-5 14 36-11 12-22-9Z" fill="url(#ba-linen)" stroke="#817466" stroke-width="2.2"/>
  <path d="m117 143 12 5-1 7-13-5m-3 5 14 6m17-13 14-6 3 6-17 7m1 5 18-7" fill="none" stroke="#baa579" stroke-width="2" stroke-linejoin="round"/>
  <path d="m135 134 7 0 1 43-7 9-7-8Z" fill="url(#ba-red)" stroke="#69485a" stroke-width="2"/>
  <path d="m136 144 1 29" stroke="#f1c9a0" stroke-width="2" stroke-linecap="round"/>
  <!-- Two bare, narrow arms; one reaches back to the rod. -->
  <path d="M153 84c10-3 17 6 20 18l14 11 26-11 5 8-29 16-12-1-22-23Z" fill="url(#ba-fur)" stroke="#282d42" stroke-width="3" stroke-linejoin="round"/>
  <path d="m199 108 6-3 6 13-7 4Z" fill="url(#ba-brass)" stroke="#655942" stroke-width="1.8"/>
  <path d="M209 105c1-6 6-10 10-9l4 6 7-1 3 7-7 9-12 0-4-5Z" fill="#776674" stroke="#282d42" stroke-width="2.4"/>
  <path d="m222 105 7 0m-7 5 6 1" stroke="#c0a89a" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M113 88c-10-5-17 3-17 15l-8 17-15-2-5 9 28 6 11-11 12-23Z" fill="url(#ba-fur)" stroke="#282d42" stroke-width="3"/>
  <path d="m80 118 10 2-3 12-10-2Z" fill="url(#ba-brass)" stroke="#655942" stroke-width="1.8"/>
  <path d="M75 118c-7-7-17-8-19-2l1 7 10 5 8-2Z" fill="#8d7780" stroke="#282d42" stroke-width="2.3"/>
  <path d="m60 117 9 4m-8 0 8 3" stroke="#d1b09e" stroke-width="1.4" stroke-linecap="round"/>
  <!-- A broad angular collar uses slate/ivory with a single red center. -->
  <path d="m107 74 15 8 21-2 12-9 6 17-15 20-17 5-19-15-10-10Z" fill="url(#ba-linen)" stroke="#817466" stroke-width="2.6" stroke-linejoin="round"/>
  <path d="m107 84 19 17 14-2 14-16-6 17-19 8-18-13Z" fill="#769494"/>
  <path d="m116 84 11 7 14-2 10-10-5 16-17 6-10-9Z" fill="url(#ba-brass)" stroke="#85734e" stroke-width="1.5"/>
  <path d="m128 92 8-2 5 8-8 10-7-8Z" fill="url(#ba-red)" stroke="#69485a" stroke-width="1.8"/>
  <!-- Tall unequal ears and a long horizontal muzzle distinguish the jackal. -->
  <path d="m109 42-7-15 2-22 12 10 7 27 14-3 10-24 10-7 1 21-9 27 6 15-10 13-24 2-22-8-21-3-13-13 6-11 27-1Z" fill="url(#ba-fur)" stroke="#282d42" stroke-width="3.4" stroke-linejoin="round"/>
  <path d="m108 14 0 13 10 18-4-26Zm45 5-11 25 8 1 4-17Z" fill="#c6a28c"/>
  <path d="m111 26 5 13m35-9-5 11" fill="none" stroke="#946678" stroke-width="2.2"/>
  <path d="m95 61 18 8 21-6-7 16-21 0-24-7-11-10Z" fill="#a18a8b"/>
  <path d="m101 48 14-4 15 9-7 9-16-3Z" fill="#202638"/>
  <path d="m106 51 9-3 10 5-5 4-12-2Z" fill="#eed09a"/>
  <path d="m115 49 1 7" stroke="#5f5560" stroke-width="2"/>
  <path d="m100 44 14-5 17 10" fill="none" stroke="#c3aa97" stroke-width="3" stroke-linecap="round"/>
  <path d="m70 52 15-2 4 8-11 6-10-3-3-5Z" fill="#1f293c"/>
  <path d="m72 54 10 0" stroke="#788194" stroke-width="1.8" stroke-linecap="round"/>
  <path d="m80 68 17 4 17-1" fill="none" stroke="#5b4e64" stroke-width="2" stroke-linecap="round"/>
  <path d="m133 61 9-5 5 6-9 6m-6 4 10-2-1 7-11 1" fill="#977d83"/>
  <path d="m131 42 8 1-5 7-6-5Z" fill="url(#ba-brass)"/>
`;

function svg(artwork: string, viewBox: string, width: number, height: number) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBox}" fill="none">${artwork}</svg>`;
}
const url = (source: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;
function character(artwork: string, crop: string, spriteWidth: number) {
  const full = svg(artwork, '0 0 280 210', 280, 210);
  const portrait = svg(artwork, crop, 140, 140);
  return {full, portrait, artUrl: url(full), portraitUrl: url(portrait), spriteWidth};
}

/** Existing creature IDs; this module changes artwork only. */
export const BEAST_ORIGINAL_ART = {
  0: character(YOKO_ARTWORK, '31 20 130 130', 122),
  2: character(BASTET_ARTWORK, '70 9 133 133', 112),
  7: character(SELKIE_ARTWORK, '34 15 140 140', 124),
  11: character(ANUBIS_ARTWORK, '59 0 132 132', 110),
} as const;
