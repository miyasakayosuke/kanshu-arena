/**
 * Original code-native SVG geometry authored directly for this game by the
 * OpenAI coding assistant. No external image or motion sample was used.
 * Myth/folklore supplies general motifs only; see material-art-provenance.md.
 */
const TALOS = `
  <defs>
    <linearGradient id="mt-bronze" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#d8b57b"/><stop offset=".46" stop-color="#a47847"/><stop offset="1" stop-color="#624a38"/></linearGradient>
    <linearGradient id="mt-oxide" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#5a9481"/><stop offset="1" stop-color="#244b48"/></linearGradient>
    <linearGradient id="mt-inner" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#f4db93"/><stop offset="1" stop-color="#956139"/></linearGradient>
  </defs>
  <ellipse cx="144" cy="197" rx="83" ry="9" fill="#233d3824"/>
  <!-- Separated column legs and broad split feet anchor a hollow ring torso. -->
  <path d="m101 143 25 1-2 31-4 17-28 0 3-16Z" fill="url(#mt-oxide)" stroke="#294943" stroke-width="3"/>
  <path d="m149 144 24-3 10 30 1 23-28 0-5-20Z" fill="url(#mt-bronze)" stroke="#493f33" stroke-width="3"/>
  <path d="m93 175 29 2-3 8-28-2m62-8 29-3 2 10-29 2" fill="#d8b880" stroke="#665138" stroke-width="2"/>
  <path d="m95 185 23 0 9 15-46 0 1-10Zm61 0 27-2 17 10-2 8-48-1Z" fill="url(#mt-bronze)" stroke="#493f33" stroke-width="3" stroke-linejoin="round"/>
  <path d="m99 189-4 10m75-10 2 12" stroke="#31534b" stroke-width="3"/>
  <!-- Each cast ring has an open gap and a dark visible interior. -->
  <path d="m107 66 61 1 9 71-33 18-38-14Z" fill="#294e48" stroke="#25443e" stroke-width="3"/>
  <path d="M175 76c-2 12-69 18-81-1l4-11c8 14 55 17 72 3l6 0Z" fill="url(#mt-bronze)" stroke="#514331" stroke-width="3"/>
  <path d="M99 65c15-10 57-11 71 2l-12 6c-12-6-32-5-43 0Z" fill="#e5c897" stroke="#665237" stroke-width="2"/>
  <path d="M97 87c10 11 56 15 78 0l3 13c-14 13-65 17-83-1Z" fill="url(#mt-bronze)" stroke="#514331" stroke-width="3"/>
  <path d="m109 93 3 15 13 3-3-15Z" fill="#355e51"/>
  <path d="M95 114c19 13 58 11 83-1l-1 14c-19 16-62 16-80 0Z" fill="url(#mt-bronze)" stroke="#514331" stroke-width="3"/>
  <path d="m158 120-1 16 12-5 3-16Z" fill="#355e51"/>
  <path d="M103 138c17 8 44 8 65-1l-4 13-25 12-32-9Z" fill="url(#mt-oxide)" stroke="#294943" stroke-width="3"/>
  <path d="m112 146 12 2m22 1 12-4" stroke="#d9b477" stroke-width="3" stroke-linecap="round"/>
  <!-- A small flat head is offset; the face is an unlettered narrow incision. -->
  <path d="m128 47 18 1 2 19-24 0Z" fill="#5e775b" stroke="#3b4c3c" stroke-width="2"/>
  <path d="m115 24 33-4 15 11-5 24-16 9-24-8-10-17Z" fill="url(#mt-oxide)" stroke="#284740" stroke-width="3" stroke-linejoin="round"/>
  <path d="m116 26 30-2 11 7-27 4-16-3Z" fill="#92ae8a"/>
  <path d="m117 40 30-2 8 4-8 3-28 1Z" fill="#d7b67b"/><path d="m124 41 21-1" stroke="#263e38" stroke-width="2"/>
  <path d="m127 54 16 3 11-7m-42-18 4 17" fill="none" stroke="#a5a477" stroke-width="2"/>
  <!-- Narrow articulated left hand versus a heavy barrel-shaped right hammer. -->
  <path d="m96 70-15-2-19 26 11 17 23-19Z" fill="url(#mt-oxide)" stroke="#294943" stroke-width="3"/>
  <path d="m64 99 14 8-6 27-15 14-11-12 10-24Z" fill="url(#mt-bronze)" stroke="#514331" stroke-width="3"/>
  <path d="m47 132-9 9 1 15 9 4 3-14 5-1-2 16 8 0 8-17-7-9Z" fill="url(#mt-oxide)" stroke="#294943" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="m177 68 20 10 10 25-19 16-17-21Z" fill="url(#mt-bronze)" stroke="#514331" stroke-width="3"/>
  <path d="m191 108 19-2 10 23-24 8-13-20Z" fill="url(#mt-oxide)" stroke="#294943" stroke-width="3"/>
  <path d="m193 128 25-8 14 12 3 31-31 13-16-14Z" fill="url(#mt-bronze)" stroke="#514331" stroke-width="3" stroke-linejoin="round"/>
  <path d="m218 121 14 11 3 31-12-8Z" fill="#435e4b"/><path d="m192 134 29-9m-27 18 31-9m-29 21 32-10m-29 20 29-10" stroke="#d4b274" stroke-width="3"/>
  <path d="m205 151 7-3 0 11-6 3Z" fill="#31564c"/>
  <g fill="#d9be83" stroke="#536247" stroke-width="1.3"><circle cx="82" cy="83" r="5"/><circle cx="186" cy="83" r="5"/><circle cx="67" cy="114" r="4"/><circle cx="203" cy="114" r="4"/></g>
  <g fill="#6f9a79"><path d="m97 79 6 2 0 5-5-1Z"/><path d="m142 104 9-1-3 7-6 1Z"/><path d="m165 146 6-3-2 6-6 1Z"/><path d="m158 170 8 2-1 5-6-1Z"/></g>
`;

const UMBRELLA = `
  <defs>
    <linearGradient id="mu-paper" x1="0" y1="0" x2=".4" y2="1"><stop stop-color="#637f96"/><stop offset=".55" stop-color="#354d70"/><stop offset="1" stop-color="#253952"/></linearGradient>
    <linearGradient id="mu-patch" x1="0" y1="0" x2=".4" y2="1"><stop stop-color="#f4dfb3"/><stop offset="1" stop-color="#c7b383"/></linearGradient>
    <linearGradient id="mu-handle" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#648a77"/><stop offset=".5" stop-color="#b2b985"/><stop offset="1" stop-color="#416c62"/></linearGradient>
  </defs>
  <ellipse cx="151" cy="193" rx="54" ry="7" fill="#263d5223"/>
  <!-- One crooked suspended handle, no foot, tongue, arm or humanoid body. -->
  <path d="M134 96c-5 31 11 37 8 57-3 12-1 23 13 28 13 5 23-4 21-16l-10-2c1 6-4 10-8 7-8-4-2-13-2-21 1-24-16-29-11-52Z" fill="url(#mu-handle)" stroke="#3a5554" stroke-width="3"/>
  <path d="m141 125 10-3m-7 19 11-2m-11 17 10 1m5 16-1 8" stroke="#46685c" stroke-width="2"/>
  <path d="m136 31 5-16 8 1 4 17-11 11Z" fill="#cbb981" stroke="#4c6363" stroke-width="2.5"/>
  <!-- Tilted, unequal paper panels end at different heights, with visible ribs. -->
  <path d="M144 29C98 37 52 64 28 111l35-2 25 24 30-13 27 22 31-15 30 5 15-23 30-2c-26-45-59-71-107-78Z" fill="url(#mu-paper)" stroke="#2b4055" stroke-width="3.5" stroke-linejoin="round"/>
  <path d="M143 31C95 60 87 84 88 132l30-12 27 22c-5-43-5-76-2-111Z" fill="#4d6e83"/>
  <path d="M146 32c27 24 45 45 60 99l15-23 29-1c-25-42-62-68-104-75Z" fill="#29445f"/>
  <path d="M143 31c-40 26-65 48-79 78l-35 1c25-45 68-71 114-79Z" fill="#8195a0"/>
  <path d="m48 91 32-7 21 17-13 31-25-23-35 2Z" fill="url(#mu-patch)" stroke="#b1a579" stroke-width="1.8"/>
  <path d="m173 50 24 12 15 35-24 5-18-27Z" fill="url(#mu-patch)" stroke="#b1a579" stroke-width="1.8"/>
  <path d="m113 94 23-2 6 21-24 6Z" fill="#849b9b" stroke="#c9c6a0" stroke-width="1.5"/>
  <g fill="none" stroke="#b0b394" stroke-width="2"><path d="M144 32 64 108M144 32C108 72 98 95 89 130M144 32l1 108M144 32c24 31 31 60 32 94M144 32c43 34 60 50 76 76"/></g>
  <path d="m40 104 24-2 26 21 26-11 29 22 31-15 27 6 13-22 25-3" fill="none" stroke="#a4ada0" stroke-width="2.4"/>
  <!-- A pair of tiny stitched eye creases, offset from the central rib; no mouth. -->
  <path d="m101 79 10-4 7 3m35 1 9-4 9 5" fill="none" stroke="#f0d7a6" stroke-width="3.4" stroke-linecap="round"/>
  <path d="m108 76 2 5m53-6-1 6" stroke="#263d51" stroke-width="2"/>
  <g fill="none" stroke="#536e72" stroke-width="1.8" stroke-linecap="round"><path d="m55 88 2 6m8-8 2 6m9-8 2 6m6 6 6 1m-4 8 6 2m-9 8 5 3m88-63-3 5m10-1-3 5m8 4-5 3m8 6-5 2m8 7-5 2"/></g>
  <path d="m62 112-5 14m33 6-1 12m52-3 0 13m30-27 5 10m30-6 5 10m13-31 8 9" stroke="#b9b38c" stroke-width="2" stroke-linecap="round"/>
  <g fill="#88b7b1"><path d="m42 141-5 10 6 5 5-6Z"/><path d="m208 153-4 9 4 5 5-6Z"/><path d="m91 163-4 8 5 5 3-6Z"/></g>
  <path d="m184 183 8-1m-95 1 11 1" stroke="#aec6b7" stroke-width="2" stroke-linecap="round"/>
`;

const WALL = `
  <defs>
    <linearGradient id="mw-stone" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#c0bbb0"/><stop offset=".5" stop-color="#94958c"/><stop offset="1" stop-color="#626f69"/></linearGradient>
    <linearGradient id="mw-edge" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#334d4b"/><stop offset="1" stop-color="#61736a"/></linearGradient>
    <linearGradient id="mw-screen" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#d3c3b3"/><stop offset="1" stop-color="#a08f83"/></linearGradient>
  </defs>
  <ellipse cx="147" cy="196" rx="109" ry="8" fill="#394d4825"/>
  <!-- Folklore's intangible barrier is deliberately invented as three stepped screens. -->
  <!-- No face, arms or legs: every edge belongs to layered construction. -->
  <path d="m53 75 50-13 11 104-15 20-50-19Z" fill="url(#mw-edge)" stroke="#425953" stroke-width="3"/>
  <path d="m30 88 23-13 50 11-2 100-24-10-3-17-44-8Z" fill="url(#mw-stone)" stroke="#4d6259" stroke-width="3" stroke-linejoin="round"/>
  <path d="m31 88 21-13 52 11-23 14Z" fill="#c7c5b5" stroke="#637165" stroke-width="2"/>
  <path d="m80 100 23-14-2 100-24-10Z" fill="#77877a"/>
  <path d="m32 116 25 5 0 20 21 5m-25-49 0 24 26 5m-46 11 23 5m-5 16 23 5" fill="none" stroke="#718076" stroke-width="2.5"/>
  <path d="m87 39 23-12 65 17 7 115-24 26-71-13Z" fill="url(#mw-edge)" stroke="#425953" stroke-width="3"/>
  <path d="m87 39 56 10 0 18 20 3-1 114-26-5 0-18-49-11Z" fill="url(#mw-screen)" stroke="#5b6259" stroke-width="3" stroke-linejoin="round"/>
  <path d="m87 39 23-12 57 11-24 11Z" fill="#e1d4bf" stroke="#788172" stroke-width="2"/>
  <path d="m143 49 24-11 0 18 19 5-23 10-20-4Z" fill="#a9b1a1" stroke="#667a70" stroke-width="2"/>
  <path d="m163 70 23-9-1 108-23 15Z" fill="#4b6862" stroke="#3e5952" stroke-width="2"/>
  <path d="m89 65 51 10m-52 19 73 15m-73 14 72 15m-48-70-1 31m24 7 0 29m-40 2 0 26m35-17 0 18" fill="none" stroke="#877f73" stroke-width="2.4"/>
  <path d="m158 92 7-3 0 14m-8 16 7-3 0 15m-8 20 7-3 0 15" stroke="#aec4ad" stroke-width="2"/>
  <path d="m174 96 36-29 33 12 7 97-37 17-46-12Z" fill="url(#mw-edge)" stroke="#425953" stroke-width="3"/>
  <path d="m173 96 18 5 0-19 34 10 8 87-21 14-43-16Z" fill="url(#mw-stone)" stroke="#4d6259" stroke-width="3" stroke-linejoin="round"/>
  <path d="m191 82 19-15 33 12-18 13Z" fill="#d8d5c4" stroke="#65796c" stroke-width="2"/>
  <path d="m225 92 18-13 7 97-17 3Z" fill="#6b8173"/>
  <path d="m172 119 55 16m-56 14 59 16m-35-48 2 24m13 5 2 21m-33 0 1 21" fill="none" stroke="#6c7b71" stroke-width="2.5"/>
  <!-- Bright exposed ledges and small hovering shards make depth legible at 48px. -->
  <path d="m94 47 36 7m-36 45 52 11m-49 18 40 8m40-31 11 4m11-11 18 5m-13 54 22 6m-187-61 29 6" fill="none" stroke="#e8dccc" stroke-width="2.4" stroke-linecap="round"/>
  <path d="m68 189 11-4 13 6-10 7-13-3m57-1 12-6 18 7-8 8-16-1m50-8 10-5 10 3-5 8-14-1" fill="#9baa97" stroke="#536b5c" stroke-width="2"/>
  <path d="m63 81 6 3-1 10m47 66 5 2 0 13m110-57 4 1 1 13" stroke="#5f8474" stroke-width="3" stroke-linecap="round"/>
`;

const TRIPOD = `
  <defs>
    <linearGradient id="md-copper" x1="0" y1="0" x2=".5" y2="1"><stop stop-color="#e0a276"/><stop offset=".5" stop-color="#a45f48"/><stop offset="1" stop-color="#603c37"/></linearGradient>
    <linearGradient id="md-ceramic" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#e4f2d8"/><stop offset=".5" stop-color="#a1cdbe"/><stop offset="1" stop-color="#548a89"/></linearGradient>
    <linearGradient id="md-wheel" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#b3d3c0"/><stop offset="1" stop-color="#446e6d"/></linearGradient>
  </defs>
  <ellipse cx="142" cy="196" rx="92" ry="8" fill="#304f5124"/>
  <!-- Three separate struts terminate in exactly three wheels; no humanoid head. -->
  <path d="m137 110 13 0 0 43-9 11-10-10Z" fill="url(#md-copper)" stroke="#5b4b46" stroke-width="3"/>
  <ellipse cx="140" cy="162" rx="13" ry="16" fill="url(#md-wheel)" stroke="#3e6260" stroke-width="3"/>
  <ellipse cx="140" cy="162" rx="5" ry="7" fill="#dcc19d" stroke="#64786a" stroke-width="2"/>
  <path d="m140 148 0 8m0 12 0 9m-11-15 6 0m10 0 6 0" stroke="#aac3a6" stroke-width="2"/>
  <path d="m93 110 19 8-23 53-9 10-12-9Z" fill="url(#md-copper)" stroke="#5b4b46" stroke-width="3" stroke-linejoin="round"/>
  <path d="m173 115 17-6 22 61-8 13-12-8Z" fill="url(#md-copper)" stroke="#5b4b46" stroke-width="3" stroke-linejoin="round"/>
  <path d="m93 132 9 4-13 28-9-4m107-29 9-4 12 32-10 3" fill="#d9b688" stroke="#74634e" stroke-width="1.5"/>
  <!-- A shallow broad copper bowl with pale ceramic inside, open to the viewer. -->
  <path d="M56 86c10 28 33 48 83 49 48 0 76-19 85-48l-79-13Z" fill="url(#md-copper)" stroke="#694b42" stroke-width="3.5"/>
  <path d="M66 95c12 21 47 28 74 29 34 0 62-9 74-28-18 12-50 18-75 17-26 0-54-7-73-18Z" fill="#d1956f"/>
  <path d="m106 125 13 5 2-9-14-5m30 9 2 10 13-1 1-11m22-6-3 12 12-4 5-14" fill="#6b8980"/>
  <ellipse cx="140" cy="85" rx="84" ry="33" fill="url(#md-ceramic)" stroke="#6a5044" stroke-width="3.5"/>
  <ellipse cx="140" cy="85" rx="71" ry="25" fill="#d4e8cf" stroke="#99bbb0" stroke-width="2"/>
  <path d="M71 90c17-19 87-29 139-1-28 21-103 26-139 1Z" fill="#84b9ad"/>
  <path d="M79 86c25-12 73-16 110-5m-79 13c24 5 49 3 63-2" fill="none" stroke="#eff3d6" stroke-width="2.7" stroke-linecap="round"/>
  <path d="M58 83c-21-15-35-9-31 5 2 10 17 13 33 12m162-17c21-15 35-9 31 5-2 10-17 13-33 12" fill="none" stroke="#674a42" stroke-width="10"/>
  <path d="M58 82c-21-15-35-9-31 5 2 10 17 13 33 12m162-17c21-15 35-9 31 5-2 10-17 13-33 12" fill="none" stroke="#d59b70" stroke-width="5"/>
  <g fill="url(#md-wheel)" stroke="#3e6260" stroke-width="3"><ellipse cx="76" cy="182" rx="18" ry="21"/><ellipse cx="207" cy="182" rx="18" ry="21"/></g>
  <g fill="#e4cc9e" stroke="#627b6a" stroke-width="2"><ellipse cx="76" cy="182" rx="7" ry="9"/><ellipse cx="207" cy="182" rx="7" ry="9"/></g>
  <g fill="none" stroke="#adcab1" stroke-width="2.5"><path d="m76 164 0 9m0 18 0 9m-15-18 8 0m14 0 8 0m-26-13 7 6m8 15 7 6"/><path d="m207 164 0 9m0 18 0 9m-15-18 8 0m14 0 8 0m-26-13 7 6m8 15 7 6"/></g>
  <!-- Three still steam curls suggest warmth, not a face or an added unit. -->
  <path d="M112 65c-15-12 10-18 3-30-4-6-10-7-7-14m32 41c17-14-14-20-7-35m34 39c13-10-8-17-2-28" fill="none" stroke="#a1c5b7" stroke-width="6" stroke-linecap="round"/>
  <path d="M111 61c-7-8 13-16 5-27m25 23c8-8-10-16-8-23m34 28c8-7-7-14-2-20" fill="none" stroke="#e5edd8" stroke-width="2" stroke-linecap="round"/>
`;

const BULL = `
  <defs>
    <linearGradient id="mb-bronze" x1="0" y1="0" x2=".3" y2="1"><stop stop-color="#c29c59"/><stop offset=".5" stop-color="#8a6d3c"/><stop offset="1" stop-color="#4e5035"/></linearGradient>
    <linearGradient id="mb-plate" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#809784"/><stop offset="1" stop-color="#35594f"/></linearGradient>
    <linearGradient id="mb-horn" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#f2e3b7"/><stop offset="1" stop-color="#b49b64"/></linearGradient>
  </defs>
  <ellipse cx="144" cy="196" rx="116" ry="8" fill="#31473525"/>
  <!-- The far pair of legs remain visibly separate from the near pair. -->
  <path d="m104 124 21 5-11 35 6 21-22 4-5-24Z" fill="#627153" stroke="#384c3c" stroke-width="3"/>
  <path d="m195 122 24 0-8 39 16 23-25 6-19-29Z" fill="#657352" stroke="#384c3c" stroke-width="3"/>
  <path d="m96 180 21-1 8 10-30 5Zm105 2 23-3 9 9-29 9Z" fill="#ab985d" stroke="#4c4d35" stroke-width="2"/>
  <!-- A narrow plaited tail loops away from the low broad body. -->
  <path d="M213 83c18-12 27-6 25 13-3 24 15 32 15 50" fill="none" stroke="#394c3b" stroke-width="10" stroke-linecap="round"/>
  <path d="M213 83c18-12 27-6 25 13-3 24 15 32 15 50" fill="none" stroke="#c2a05d" stroke-width="5" stroke-linecap="round"/>
  <path d="m250 139-7 13 9 12 9-10-4-13Z" fill="url(#mb-plate)" stroke="#384c3c" stroke-width="2.5"/>
  <path d="M74 86c23-32 67-30 101-24 27 4 51 15 50 41-1 30-25 48-64 47l-38-9-26 12-27-22Z" fill="url(#mb-bronze)" stroke="#3f4933" stroke-width="3.5"/>
  <!-- Short offset cast plates describe shoulder muscle without smooth robot armor. -->
  <path d="M81 84c21-23 42-27 60-17l-8 34-19 23-34-5Z" fill="url(#mb-plate)" stroke="#3e5443" stroke-width="3"/>
  <path d="m93 78 22-7 14 4-7 22-24 7-13-8Z" fill="#92a08b"/>
  <path d="m143 70 21 0 9 30-18 4-18-7Zm27 3 23 6 8 21-22 8Zm28 10 15 11 4 16-10 13-15-15Z" fill="#c1a168" stroke="#716a43" stroke-width="2.3"/>
  <path d="m135 111 21 0 6 25-25-4-10-9Zm32 3 22-5 9 14-15 18-15 0Z" fill="#879075" stroke="#626c4a" stroke-width="2"/>
  <path d="M91 123c11 1 19 6 18 18l-17 25 3 19-23 7-5-27 7-24Z" fill="url(#mb-bronze)" stroke="#3f4933" stroke-width="3"/>
  <path d="m81 145 13 2-9 17-9-1Z" fill="#bca770" stroke="#6d724d" stroke-width="1.8"/>
  <path d="M174 128c17-1 23 7 19 25l-9 15 7 20-22 7-13-26 4-26Z" fill="url(#mb-bronze)" stroke="#3f4933" stroke-width="3"/>
  <path d="m169 147 14 2-8 17-9-1Z" fill="#bca770" stroke="#6d724d" stroke-width="1.8"/>
  <path d="m70 182 25-3 10 13-1 8-37 0Zm98 3 22-4 12 12-1 7-39 0Z" fill="url(#mb-plate)" stroke="#384c3c" stroke-width="3"/>
  <path d="m84 188 0 12m94-11 0 11" stroke="#b5ba89" stroke-width="2.5"/>
  <!-- Wide short head carries horizontal flared horns and a heavy hinged muzzle. -->
  <path d="m85 84 13-18 15 0-9 21-14 8m-39-8-21-6 2 14 20 12" fill="#6d9279" stroke="#3e5443" stroke-width="3"/>
  <path d="M73 80c-12-20-21-18-37-20-13-1-21-6-22-16-3 27 23 34 36 35l14 16m24-13c10-22 27-21 42-23 12-2 18-10 21-18 2 25-22 30-34 32l-21 23" fill="url(#mb-horn)" stroke="#716b48" stroke-width="3" stroke-linejoin="round"/>
  <path d="M52 88c7-17 32-21 45-8l10 25-10 27-20 18-33-7-13-23Z" fill="url(#mb-plate)" stroke="#304c40" stroke-width="3.5" stroke-linejoin="round"/>
  <path d="m58 85 23-6 14 12-13 14-25-3-8-8Z" fill="#c8ac6c" stroke="#736b42" stroke-width="2"/>
  <path d="m69 101 13 0 3 24-17 4Z" fill="#6c917a"/>
  <path d="m47 104 14 1-3 9-11-2m38-11 13-3-1 9-10 5" fill="#2a493e"/>
  <path d="m50 106 7 1m32-1 6-3" stroke="#f1d891" stroke-width="3" stroke-linecap="round"/>
  <path d="m45 120 41-1 14 13-7 17-17 9-32-7-12-16Z" fill="url(#mb-bronze)" stroke="#454b34" stroke-width="3"/>
  <path d="m43 125 39-2 9 9-12 8-34-2-6-6Z" fill="#c7b075"/>
  <path d="m46 131 8-3m20 0 8 3" stroke="#4b593e" stroke-width="4" stroke-linecap="round"/>
  <path d="m42 143 17 5 23-3" fill="none" stroke="#5c6141" stroke-width="2.5" stroke-linecap="round"/>
  <path d="m60 153 2 7 13-1 2-7" fill="#b89a5d" stroke="#657049" stroke-width="2"/>
  <g fill="#dfc48d" stroke="#747449" stroke-width="1.2"><circle cx="143" cy="78" r="2.5"/><circle cx="183" cy="87" r="2.5"/><circle cx="128" cy="122" r="2.5"/><circle cx="179" cy="132" r="2.5"/><circle cx="57" cy="91" r="2.5"/></g>
  <path d="m103 115-5 10m54-45 4 15m-5 24 2 8m40-13-4 8m-110 25-2 9" stroke="#d3bd82" stroke-width="2" stroke-linecap="round"/>
`;

function svg(art: string, viewBox: string, width: number, height: number) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBox}" fill="none">${art}</svg>`;
}
const url = (source: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;
function character(art: string, crop: string, spriteWidth: number) {
  const full = svg(art, '0 0 280 210', 280, 210);
  const portrait = svg(art, crop, 140, 140);
  return {full, portrait, artUrl:url(full), portraitUrl:url(portrait), spriteWidth};
}
/** Static geometry shared by full figure, dock portrait and enemy battlefield. */
export const MATERIAL_ART = {
  19: character(TALOS, '70 13 145 145', 112),
  20: character(UMBRELLA, '22 10 240 240', 116),
  21: character(WALL, '24 14 232 232', 124),
  22: character(TRIPOD, '19 12 242 242', 115),
  23: character(BULL, '9 40 150 150', 127),
} as const;
