/**
 * Four original code-native SVG figures drawn directly for this game.
 * Historical text motifs and newly invented expression are distinguished in
 * docs/undead-art-provenance.md. No illustration, costume, sprite or motion
 * reference was copied. Portraits reuse exactly the full figure's static paths.
 */
const DRAUGR = `
  <defs>
    <linearGradient id="ud-earth" x1=".12" y1="0" x2=".8" y2="1"><stop stop-color="#b8936a"/><stop offset=".45" stop-color="#90704f"/><stop offset="1" stop-color="#5e5043"/></linearGradient>
    <linearGradient id="ud-cloth" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#e6c39a"/><stop offset=".52" stop-color="#ba966d"/><stop offset="1" stop-color="#89705a"/></linearGradient>
    <linearGradient id="ud-stone" x1=".2" y1="0" x2="1" y2="1"><stop stop-color="#b7b29a"/><stop offset="1" stop-color="#6a7569"/></linearGradient>
  </defs>
  <ellipse cx="140" cy="195" rx="106" ry="8" fill="#6f5c4324"/>
  <!-- Wide planted feet and one heavy burial-cloth torso, without armor or a helmet. -->
  <path d="M91 160 80 181c-12 2-23 7-20 13l44 1 18-14-3-18Z" fill="url(#ud-earth)" stroke="#564d41" stroke-width="3.2" stroke-linejoin="round"/>
  <path d="m152 163 6 22 16 10 48-2c2-9-12-10-24-13l-16-24Z" fill="url(#ud-earth)" stroke="#564d41" stroke-width="3.2" stroke-linejoin="round"/>
  <path d="m68 188 13-1m4-1 10-1m84 3 10 1m5 0 12 0" stroke="#c1a27d" stroke-width="3" stroke-linecap="round"/>
  <path d="M89 69c-20 9-28 35-24 67l14 42c25 9 86 17 124-8l9-45c0-23-19-49-47-54Z" fill="url(#ud-earth)" stroke="#564d41" stroke-width="3.8" stroke-linejoin="round"/>
  <path d="M89 81c-10 30-12 59 2 82 18 10 35 13 56 12-18-26-15-60-27-88Z" fill="#ab8760"/>
  <path d="M187 95c12 21 9 46 0 60l-31 20c30-2 42-15 42-15l8-40Z" fill="#655744"/>
  <!-- A single flat stone rests on the left shoulder; its shallow top is not a shield. -->
  <path d="m49 84 20-19 38-4 14 19-14 12-46 5Z" fill="url(#ud-stone)" stroke="#596155" stroke-width="3.4" stroke-linejoin="round"/>
  <path d="m49 84 51-8 21 4-14 12-46 5Z" fill="#7d8674" stroke="#596155" stroke-width="2" stroke-linejoin="round"/>
  <path d="m68 72 30-5 8 8-42 8Z" fill="#c5c2a7"/>
  <path d="m78 86 5-6 15-2" fill="none" stroke="#5e685c" stroke-width="2" stroke-linecap="round"/>
  <!-- Both arms are blunt and low; the right hand is a visible compact fist. -->
  <path d="M65 98c-17 2-21 23-29 39l2 19 28 7 15-30 9-26Z" fill="url(#ud-earth)" stroke="#564d41" stroke-width="3.2" stroke-linejoin="round"/>
  <path d="m43 134 25 7-5 17-28-7Z" fill="url(#ud-cloth)" stroke="#80684f" stroke-width="2.4"/>
  <path d="M34 150c-10 5-11 18-2 23 6 4 24 6 29-1l4-12-11-7Z" fill="url(#ud-stone)" stroke="#596155" stroke-width="3"/>
  <path d="m34 159 1 9m9-9 1 12m9-9-1 9" stroke="#616b5e" stroke-width="2" stroke-linecap="round"/>
  <path d="M191 86c25 5 31 23 33 41l9 22-26 12-14-20-18-30Z" fill="url(#ud-earth)" stroke="#564d41" stroke-width="3.3"/>
  <path d="m205 135 23-7 7 20-24 11Z" fill="url(#ud-cloth)" stroke="#80684f" stroke-width="2.5"/>
  <path d="M226 145c9-4 20 3 22 10 2 9-2 18-11 21l-19-4-9-13 7-13 10 3Z" fill="url(#ud-stone)" stroke="#596155" stroke-width="3" stroke-linejoin="round"/>
  <path d="m221 154 6 7 9-2m-1-10 1 8m7-5 0 8m-28-3 2 9" fill="none" stroke="#626d5d" stroke-width="2.1" stroke-linecap="round"/>
  <!-- Diagonal wrapping and an oversized burial-cloth knot are invented design choices. -->
  <path d="M105 74c24 22 49 39 88 45l-6 23c-40-9-81-39-97-59Z" fill="url(#ud-cloth)" stroke="#80684f" stroke-width="2.7"/>
  <path d="M100 83c31 27 56 40 87 48" fill="none" stroke="#f2d5ad" stroke-width="3" stroke-linecap="round"/>
  <path d="M80 143c29-3 65-18 92-41l15 16c-24 24-64 42-101 49Z" fill="url(#ud-cloth)" stroke="#80684f" stroke-width="2.7"/>
  <path d="m91 154 41-14" fill="none" stroke="#efd0a3" stroke-width="3" stroke-linecap="round"/>
  <path d="M143 118c-17-18-32-17-35-6-4 12 14 18 29 17-5 12-1 31 5 44l14-11c-8-12-9-21-6-31 14 12 32 10 35-1 3-10-17-19-32-12Z" fill="url(#ud-cloth)" stroke="#80684f" stroke-width="2.8" stroke-linejoin="round"/>
  <path d="m123 117 16 7m18-1 15 6m-30 15 3 15" stroke="#f1d1a4" stroke-width="2.8" stroke-linecap="round"/>
  <path d="m138 117 15-2 5 15-16 5Z" fill="#9b7656" stroke="#80684f" stroke-width="2"/>
  <!-- A solid quiet face sits in ragged earth-colored hair, with no glowing eyes. -->
  <path d="M104 72c-6-15-5-32 6-43 13-12 39-12 51-1 10 9 13 28 9 45l-11 11-45 0Z" fill="#665e4d" stroke="#514e42" stroke-width="3.4" stroke-linejoin="round"/>
  <path d="m107 48-7 27 10-5 1 13 8-7m44-32 10 32-11-5-1 12-9-8" fill="#7c755b" stroke="#514e42" stroke-width="2.4" stroke-linejoin="round"/>
  <path d="M116 36c12-7 29-3 40 6l4 25-14 20-22-2-16-20Z" fill="url(#ud-stone)" stroke="#596155" stroke-width="2.8" stroke-linejoin="round"/>
  <path d="m112 45 11-2 0 19-9-5Z" fill="#ced0b0"/>
  <path d="m118 54 11 2m13 0 10-4" stroke="#4d594c" stroke-width="3.5" stroke-linecap="round"/>
  <path d="m122 59 4 0m18-1 4-1" stroke="#ece7bd" stroke-width="3" stroke-linecap="round"/>
  <path d="m135 56-3 11 5 2m-11 7 16 0" fill="none" stroke="#64715d" stroke-width="2.4" stroke-linecap="round"/>
  <path d="M113 32c9-7 23-8 35-3l11 11-17-4-10 8-4-6-15 5Z" fill="#8d8365"/>
  <path d="m118 28 11-2m20 7 5 4m-64 91-3 7m112-14 3 9m-108 39 7 1" stroke="#c1a176" stroke-width="2.5" stroke-linecap="round"/>
`;

const HEADLESS_DRIVER = `
  <defs>
    <linearGradient id="uh-coat" x1=".08" y1="0" x2=".9" y2="1"><stop stop-color="#876577"/><stop offset=".42" stop-color="#654858"/><stop offset="1" stop-color="#363847"/></linearGradient>
    <linearGradient id="uh-lining" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#caa5a3"/><stop offset="1" stop-color="#957f90"/></linearGradient>
    <linearGradient id="uh-lantern" x1=".18" y1=".08" x2=".82" y2="1"><stop stop-color="#fff2be"/><stop offset=".5" stop-color="#e2b56b"/><stop offset="1" stop-color="#aa7754"/></linearGradient>
  </defs>
  <ellipse cx="142" cy="197" rx="76" ry="6" fill="#65516624"/>
  <!-- Slim reins describe two open curves. No blade, armor plate, shield or mount. -->
  <path d="M76 90C54 73 29 51 36 35c5-12 25-12 30 2 4 13-4 32-7 53-3 19 8 40 25 47" fill="none" stroke="#624f57" stroke-width="3.1" stroke-linecap="round"/>
  <path d="M79 94C56 75 50 50 63 44c12-5 24 7 19 22L70 109c-2 12 3 21 10 29" fill="none" stroke="#b2938c" stroke-width="2.3" stroke-linecap="round"/>
  <path d="m116 161-2 26-11 4c-7 3-7 7 1 8l26-1 5-30Z" fill="#484354" stroke="#393545" stroke-width="2.8" stroke-linejoin="round"/>
  <path d="m150 164 7 29 27 6c8 0 9-5 2-8l-15-8-2-24Z" fill="#484354" stroke="#393545" stroke-width="2.8" stroke-linejoin="round"/>
  <path d="m112 192 13 0m40-2 12 3" stroke="#9a8694" stroke-width="2.4" stroke-linecap="round"/>
  <!-- A tall cloth driving coat separates into two unequal loose tails. -->
  <path d="M113 51c-16 9-20 30-15 53l-17 71 22 4 14-10 2 20 26-11 15 11 23-9-15-74c4-28-3-46-25-57Z" fill="url(#uh-coat)" stroke="#443948" stroke-width="3.5" stroke-linejoin="round"/>
  <path d="M107 104c-3 23-7 46-17 65l14 0 20-56Z" fill="#aa7a8b"/>
  <path d="M136 105c4 34-4 56-10 72l20-8 13 9c-7-25-10-47-10-72Z" fill="#3d3748"/>
  <path d="M157 109c1 27 7 47 16 63l-9-42Z" fill="#a1798c"/>
  <path d="m94 158 10-19m55 15 3 11m-33-8 3-24" stroke="#b9909e" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M103 60c-14 0-19 18-25 25l-20-2-4 14c22 15 40 2 52-14Z" fill="url(#uh-coat)" stroke="#443948" stroke-width="3"/>
  <path d="m54 83 13 3-4 15-13-4Z" fill="url(#uh-lining)" stroke="#725e70" stroke-width="2"/>
  <path d="M54 85c-7-4-10-5-15-2l-2 9 15 5 6-6Z" fill="#b5aaa4" stroke="#6a6972" stroke-width="2.3"/>
  <path d="m40 86 9 4m-8 1 7 3" stroke="#797581" stroke-width="1.8" stroke-linecap="round"/>
  <path d="M155 57c14-1 22 13 31 25l14 4-3 17-18-4-25-23Z" fill="url(#uh-coat)" stroke="#443948" stroke-width="3"/>
  <path d="m190 82 13 3-3 19-14-4Z" fill="url(#uh-lining)" stroke="#725e70" stroke-width="2"/>
  <path d="M200 85c6-3 15 0 17 6l-4 10-13 1-4-8Z" fill="#b5aaa4" stroke="#6a6972" stroke-width="2.3"/>
  <path d="m203 90 8 2m-7 3 7 1" stroke="#797581" stroke-width="1.8" stroke-linecap="round"/>
  <path d="m105 53 14-5 11 19-9 23-15-11 10-8Z" fill="url(#uh-lining)" stroke="#725e70" stroke-width="2.4" stroke-linejoin="round"/>
  <path d="m147 49 16 9-16 16 7 9-19 16-6-32Z" fill="url(#uh-lining)" stroke="#725e70" stroke-width="2.4" stroke-linejoin="round"/>
  <path d="m110 57 11 12-5 12m37-24-17 12 5 12" fill="none" stroke="#dec0b3" stroke-width="2" stroke-linecap="round"/>
  <path d="M103 102c16 5 38 6 58-2l2 10c-22 8-45 7-61 2Z" fill="#ad908b" stroke="#725e70" stroke-width="2.2"/>
  <path d="m136 102 13-1 0 13-14 1Z" fill="#d2b7a0" stroke="#76697a" stroke-width="2"/>
  <path d="m130 86 0 3m-1 8 0 3" stroke="#e7c1a7" stroke-width="3" stroke-linecap="round"/>
  <!-- The empty collar has an uninterrupted dark opening, with no hidden head. -->
  <path d="m112 52-5-25c12 3 31 1 45-4l-5 30-17 12Z" fill="url(#uh-lining)" stroke="#725e70" stroke-width="3" stroke-linejoin="round"/>
  <path d="M109 28c13 5 27 3 41-3l-7 18c-8 5-16 6-27 2Z" fill="#282d39" stroke="#443948" stroke-width="2.3"/>
  <path d="m111 27 5 18 14 11m18-29-6 18-12 11" fill="none" stroke="#e6c0b1" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- An abstract carried head-lantern, not a severed anatomical head. -->
  <path d="M199 120c-5-15-2-25 10-25 12 0 18 11 15 24" fill="none" stroke="#756369" stroke-width="3.5" stroke-linecap="round"/>
  <path d="M199 117c10-6 24-3 29 6l4 20-10 15-18 2-15-12-1-19Z" fill="url(#uh-lantern)" stroke="#88654f" stroke-width="3" stroke-linejoin="round"/>
  <path d="M194 127c3-7 10-9 17-8l-6 31-11-7Z" fill="#fff0bd"/>
  <path d="m188 129 12-4 19 2 11 6m-27 23 18-2" fill="none" stroke="#c48f5d" stroke-width="2.5" stroke-linecap="round"/>
  <path d="m198 134 7 3m11-3 6-4" stroke="#6e5147" stroke-width="3.4" stroke-linecap="round"/>
  <path d="m205 146 10-1" stroke="#8d5e4a" stroke-width="2.5" stroke-linecap="round"/>
  <path d="m211 115 4 1m-11 46 7 1m-48-42 5 0m-67 23 4 1" stroke="#dec0a2" stroke-width="2.4" stroke-linecap="round"/>
`;

const JIANGSHI = `
  <defs>
    <linearGradient id="uj-fold" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#a6c6bb"/><stop offset=".44" stop-color="#669b96"/><stop offset="1" stop-color="#456c75"/></linearGradient>
    <linearGradient id="uj-skin" x1=".1" y1="0" x2=".8" y2="1"><stop stop-color="#e0dcca"/><stop offset="1" stop-color="#a6adae"/></linearGradient>
    <linearGradient id="uj-hair" x1=".2" y1="0" x2="1" y2="1"><stop stop-color="#676c7e"/><stop offset="1" stop-color="#394859"/></linearGradient>
  </defs>
  <ellipse cx="141" cy="196" rx="79" ry="6" fill="#475d6922"/>
  <!-- Two bare feet hover above the shadow in a compact hopping pose. -->
  <path d="m101 157-9 14 0 9-14 1c-6 3-5 8 2 9l24-1 13-17-1-13Z" fill="url(#uj-skin)" stroke="#687e85" stroke-width="2.8" stroke-linejoin="round"/>
  <path d="m152 159 2 15 15 7 20-4c7-2 6-8-1-9l-13 1-5-14Z" fill="url(#uj-skin)" stroke="#687e85" stroke-width="2.8" stroke-linejoin="round"/>
  <path d="m79 183 1 5m5-6 1 6m6-7 1 6m81-15 1 6m5-7 2 6m4-7 2 5" stroke="#7e9396" stroke-width="1.7" stroke-linecap="round"/>
  <!-- Squared folded cloth and unequal sleeves are inventions, not a period uniform. -->
  <path d="m92 90 65-6 27 21-3 58-48 9-46-8-4-54Z" fill="url(#uj-fold)" stroke="#436c78" stroke-width="3.4" stroke-linejoin="round"/>
  <path d="m93 106 18 3-4 47 21 8-35-6Z" fill="#b2d0ba"/>
  <path d="m152 103 22 11-4 41-32 10 16-22Z" fill="#568488"/>
  <path d="m92 147 29 9 59-8-1 15-46 9-46-8Z" fill="#b8c6ac" stroke="#718f89" stroke-width="2.3" stroke-linejoin="round"/>
  <path d="m91 155 31 8 50-8" fill="none" stroke="#e1dfbd" stroke-width="2.4" stroke-linecap="round"/>
  <!-- The long left sleeve turns a bracket around the upper body. -->
  <path d="M96 94c-17 2-27 10-28 24l-20-4 1-27-24 1-5 51 34 11c21 2 34-6 42-24l11-14Z" fill="url(#uj-fold)" stroke="#436c78" stroke-width="3.4" stroke-linejoin="round"/>
  <path d="m26 103 9 0-2 30 24 7c13-1 22-7 28-16-5 17-15 22-29 22l-30-10Z" fill="#aad0b9"/>
  <path d="m24 84 27 0 2 16-29 3Z" fill="#cfccb2" stroke="#718f89" stroke-width="2.3"/>
  <path d="M28 84c-4-7-8-10-6-14 2-3 6 2 9 4l0-17c1-6 5-5 7 0l1 13 4-9c2-4 6-2 5 3l-2 10c8-7 11-4 8 2l-6 10Z" fill="url(#uj-skin)" stroke="#687e85" stroke-width="2.4" stroke-linejoin="round"/>
  <path d="m31 77 9 2 2 6" fill="none" stroke="#8b9b9c" stroke-width="1.8" stroke-linecap="round"/>
  <!-- The shorter right sleeve ends lower, rather than mirroring the left arm. -->
  <path d="M164 96c16-7 28 0 30 12l2 15 18-1 3 24-29 5-12-15-17-20Z" fill="url(#uj-fold)" stroke="#436c78" stroke-width="3.2" stroke-linejoin="round"/>
  <path d="m178 108 7 20 14 12 14-2" fill="none" stroke="#add0bb" stroke-width="3" stroke-linecap="round"/>
  <path d="m209 118 14 0 3 30-15 1Z" fill="#cfccb2" stroke="#718f89" stroke-width="2.3"/>
  <path d="M222 121c5-6 8-16 12-14 3 1 1 8-1 13 7-3 16-3 17 1 0 3-9 4-14 7 11-1 17 3 13 6-3 2-12 0-15 2 8 3 9 7 5 9-3 1-9-3-13-2Z" fill="url(#uj-skin)" stroke="#687e85" stroke-width="2.4" stroke-linejoin="round"/>
  <path d="m226 127 5 3-4 7" fill="none" stroke="#8b9b9c" stroke-width="1.8" stroke-linecap="round"/>
  <path d="m100 88 16-5 25 23 24-19 14 15-40 32-44-30Z" fill="#c9cbb0" stroke="#718f89" stroke-width="2.6" stroke-linejoin="round"/>
  <path d="m101 96 37 28 29-24" fill="none" stroke="#f0e5c3" stroke-width="2.8" stroke-linecap="round"/>
  <path d="m138 124 8 7-8 7-8-7Z" fill="#b2937e" stroke="#6f7c80" stroke-width="2"/>
  <path d="m147 132 10 8m-3-14 10 8" stroke="#c1d4be" stroke-width="2.6" stroke-linecap="round"/>
  <!-- Loose hanging hair and bare feet follow text motifs; there is no hat or forehead paper. -->
  <path d="M98 68c-2-24 10-41 33-43 26-3 43 15 44 39l-4 39-12-3-6 6-15-7-14 6-10-7-16 5Z" fill="url(#uj-hair)" stroke="#384f62" stroke-width="3.2" stroke-linejoin="round"/>
  <path d="m109 54-4 42 6-4 7-31m43-8 3 44 6-4-2-29" fill="#85939b"/>
  <path d="M115 47c14-8 30-5 43 4l3 22-8 20-29 0-15-17Z" fill="url(#uj-skin)" stroke="#687e85" stroke-width="2.7" stroke-linejoin="round"/>
  <path d="m115 54 4 19 6 8-7-1-5-10Z" fill="#f0ebd0"/>
  <path d="m119 61 11 2m14 0 11-3" stroke="#506675" stroke-width="3.1" stroke-linecap="round"/>
  <path d="m124 67 0 5m25-5 0 5" stroke="#445c6b" stroke-width="3.8" stroke-linecap="round"/>
  <path d="m135 69-1 7 4 1m-6 8 9-1" fill="none" stroke="#7d8e91" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M109 49c6-13 24-18 38-11l15 16-18-6-7 9-8-7-15 4Z" fill="#5c7080"/>
  <path d="m115 40 11-5 15 1m11 9 5 6m-97 79 7-5m116 19 5 5" fill="none" stroke="#9cb0b0" stroke-width="2.5" stroke-linecap="round"/>
`;

const VETALA = `
  <defs>
    <linearGradient id="uv-bark" x1=".1" y1="0" x2=".9" y2="1"><stop stop-color="#b29aac"/><stop offset=".5" stop-color="#856d85"/><stop offset="1" stop-color="#5e546c"/></linearGradient>
    <linearGradient id="uv-knot" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#e0aaa0"/><stop offset="1" stop-color="#9d6479"/></linearGradient>
    <linearGradient id="uv-face" x1=".1" y1="0" x2=".8" y2="1"><stop stop-color="#b5b2c4"/><stop offset="1" stop-color="#e4dfd0"/></linearGradient>
  </defs>
  <ellipse cx="143" cy="196" rx="57" ry="5" fill="#6b627321"/>
  <!-- A spare broken branch suspends the inverted figure, not a weapon or staff. -->
  <path d="m84 27 36-9 31 2 24-9 36 7-35 0-26 11-27-3-32 8Z" fill="#a29188" stroke="#726b73" stroke-width="2.8" stroke-linejoin="round"/>
  <path d="m106 22-8-10 5 16m72-11 7-10m10 12 6 8" fill="none" stroke="#726b73" stroke-width="3" stroke-linecap="round"/>
  <path d="m116 23 12-1 20 3m27-9 10-1" stroke="#d2bbaa" stroke-width="2.2" stroke-linecap="round"/>
  <!-- Two thin hooked feet are at the top; a large abdominal cloth knot is below them. -->
  <path d="M137 78 119 51l7-24-5-6c-3-6 3-9 7-4l7 9-3 21 22 26Z" fill="url(#uv-bark)" stroke="#665770" stroke-width="3" stroke-linejoin="round"/>
  <path d="m126 29 3-10 8-3m-14 5-6-5m5 30 7 8" fill="none" stroke="#665770" stroke-width="3" stroke-linecap="round"/>
  <path d="M150 80 173 49l-8-23 4-8c3-6 8-3 7 2l-1 6 10 24-20 36Z" fill="url(#uv-bark)" stroke="#665770" stroke-width="3" stroke-linejoin="round"/>
  <path d="m173 23 8-6m-4 30-10 16m-40-32-2 15 15 22" fill="none" stroke="#d0b4ba" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M137 76c-9 14-9 33-3 46l6 12 13-2c7-22 16-40 11-53Z" fill="url(#uv-bark)" stroke="#665770" stroke-width="3"/>
  <path d="M140 90c-5 13-4 26 2 36l5-15 0-20Z" fill="#cfb8c2"/>
  <path d="m143 99 11 3m-13 5 10 3m-9 5 5 2" stroke="#786680" stroke-width="2.2" stroke-linecap="round"/>
  <!-- Narrow elbow angles and thread-like fingers differ from a flowing cloak. -->
  <path d="M137 113c-6-9-16-21-24-29L94 95l1 15-7 3-4-20 24-20c6-3 10 0 14 5l26 28Z" fill="url(#uv-bark)" stroke="#665770" stroke-width="2.8" stroke-linejoin="round"/>
  <path d="m93 110-9 6 3 7m5-11 5 9-2 7m-9-7-6 4" fill="none" stroke="#74617c" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M155 112c8-8 16-18 20-25l19 18-4 19 7 4 8-26-25-27c-4-3-10-2-13 3l-23 28Z" fill="url(#uv-bark)" stroke="#665770" stroke-width="2.8" stroke-linejoin="round"/>
  <path d="m192 121-5 11 4 6m5-13 7 8-2 7m-10-9-7 5" fill="none" stroke="#74617c" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="m108 80 18 19m53-16 18 20-3 11" fill="none" stroke="#c7a8bc" stroke-width="2.4" stroke-linecap="round"/>
  <!-- One oversized maroon knot anchors the thin body; it is not a currency pouch. -->
  <path d="M144 81c-15-22-31-28-38-16-7 12 11 27 31 28-4 12-15 21-26 24l11 9c17-8 22-18 27-33 15 8 31 6 34-4 4-14-15-19-30-12Z" fill="url(#uv-knot)" stroke="#8b6079" stroke-width="2.7" stroke-linejoin="round"/>
  <path d="m116 68 17 14m22 1 15 4m-30 17-15 15" stroke="#f0c2ab" stroke-width="2.6" stroke-linecap="round"/>
  <path d="m138 78 15-3 6 15-18 6Z" fill="#b67989" stroke="#8b6079" stroke-width="2.2"/>
  <!-- The head is visibly upside down: chin above eyes, hair hanging toward the ground. -->
  <path d="M126 134c-12 9-15 28-7 44l16 6 6 16 6-12 16 11-1-15 13 3-5-25c-1-18-10-29-24-32Z" fill="url(#uv-bark)" stroke="#665770" stroke-width="3" stroke-linejoin="round"/>
  <path d="M143 122 130 132l-5 23 12 17 21-2 9-20-11-22Z" fill="url(#uv-face)" stroke="#7c768b" stroke-width="2.7" stroke-linejoin="round"/>
  <path d="m130 144 5 18 8 5-9-3-5-11Z" fill="#f4e8d3"/>
  <path d="m139 134 8 1m-6 9 2-6 4 4" fill="none" stroke="#8d8196" stroke-width="2.3" stroke-linecap="round"/>
  <path d="m132 152 7-1m12 1 7-2" stroke="#5c5e79" stroke-width="3.3" stroke-linecap="round"/>
  <path d="m132 158 9 1m9 0 8-2" stroke="#817a92" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M128 162c9 10 18 12 32 2l6 17-11-7-2 11-11-9-5 6-10-9Z" fill="#bda2ba"/>
  <path d="m126 172 6 6m22 0 5 8m6-16 3 8" stroke="#dfbfc7" stroke-width="2.1" stroke-linecap="round"/>
  <!-- Sparse reverse-running thread decorates the supporting role; no bubble, flower or holy emblem. -->
  <path d="M87 121c-18 19-19 44-4 52 9 4 21 0 25-7m91-29c17 13 12 32-3 38l-12 4" fill="none" stroke="#b2cbc2" stroke-width="2.4" stroke-linecap="round"/>
  <path d="m96 175 7-13m-2 16 7-12m79 7 3 9m4-12 4 9" stroke="#829f9f" stroke-width="2.4" stroke-linecap="round"/>
`;

const dataUrl = (source: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;
function character(paths: string, portraitViewBox: string, spriteWidth: number) {
  const frame = (viewBox: string, width: number, height: number) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBox}" fill="none">${paths}</svg>`;
  const full = frame('0 0 280 210', 280, 210);
  const portrait = frame(portraitViewBox, 140, 140);
  return {full, portrait, artUrl: dataUrl(full), portraitUrl: dataUrl(portrait), spriteWidth};
}

/** Static drawings only; the game's family grouping makes no religious claim. */
export const UNDEAD_ART = {
  32: character(DRAUGR, '83 15 113 113', 120),
  33: character(HEADLESS_DRIVER, '86 17 160 160', 116),
  34: character(JIANGSHI, '89 20 106 106', 116),
  35: character(VETALA, '75 53 152 152', 112),
} as const;
