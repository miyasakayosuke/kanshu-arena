/**
 * Five original invented liquid creatures, authored directly as SVG geometry by
 * the OpenAI coding assistant for this game. No external illustration, model,
 * font, sound, traced outline or copied character art was used. Full figures
 * and portraits share the exact same drawing; see slime-art-provenance.md.
 */
const HOLLOW_SPRING = `
  <defs>
    <linearGradient id="sl-arch" x1=".1" y1=".1" x2=".8" y2="1"><stop stop-color="#eadac5"/><stop offset=".43" stop-color="#b6a6bb"/><stop offset="1" stop-color="#776881"/></linearGradient>
    <linearGradient id="sl-pool" x1=".1" y1="0" x2=".7" y2="1"><stop stop-color="#d8c5c1"/><stop offset=".56" stop-color="#a78b9c"/><stop offset="1" stop-color="#685e76"/></linearGradient>
    <linearGradient id="sl-film" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff1ce"/><stop offset="1" stop-color="#c2bfa281"/></linearGradient>
  </defs>
  <ellipse cx="136" cy="194" rx="97" ry="10" fill="#57516624"/>
  <!-- A single asymmetric liquid arch stays OPEN at the right; no stacked rings or coils. -->
  <path d="M79 172C42 153 43 112 57 77 70 41 96 20 136 22c37 1 71 22 82 49 7 18 3 36-8 37-9 2-9-12-17-22-13-16-32-25-55-22-23 3-38 20-41 42-3 18 4 32 18 41l-8 26Z" fill="url(#sl-arch)" stroke="#62596c" stroke-width="3.5" stroke-linejoin="round"/>
  <path d="M62 112c-1-36 34-80 70-82 30-2 57 15 72 34-23-17-47-23-70-15-36 11-44 51-38 75l-10 25-18-5Z" fill="url(#sl-film)"/>
  <path d="M200 78c8 13 10 26 15 23 3-10-3-23-12-35" fill="#e9debe"/>
  <path d="M97 107c-5 18 3 34 20 44l-7 14c-25-17-31-37-20-64Z" fill="#746b80"/>
  <!-- The face belongs to the low left bulge, never the empty opening or top arch. -->
  <path d="M56 151c7-23 39-34 62-19 13 9 16 24 34 27 25 5 43-10 59 0 10 6 6 17-3 23-28 18-75 20-114 13-25-4-47-17-38-44Z" fill="url(#sl-pool)" stroke="#62596c" stroke-width="3.5"/>
  <path d="M61 157c8-17 28-23 45-16 7 3 14 12 16 17-28-15-39-6-46 7Z" fill="#f0deca"/>
  <path d="M125 168c25 10 56 0 74-3-13 12-38 18-64 15" fill="#d6bcc1"/>
  <path d="M67 180c26 15 93 22 132-3-13 17-71 25-108 13Z" fill="#76647e"/>
  <ellipse cx="85" cy="158" rx="5.2" ry="8" fill="#453d58"/>
  <ellipse cx="107" cy="156" rx="4" ry="6.8" fill="#453d58"/>
  <ellipse cx="83.8" cy="155" rx="1.3" ry="2.3" fill="#fff1da"/>
  <ellipse cx="106" cy="153.4" rx="1.2" ry="1.8" fill="#fff1da"/>
  <path d="M92 171q6 4 10-2" fill="none" stroke="#594859" stroke-width="2.5" stroke-linecap="round"/>
  <path d="m73 167 4 1m36-3 4-2" stroke="#d89ba3" stroke-width="3" stroke-linecap="round"/>
  <path d="M75 74q4-9 11-15m9-12 6-4m37-13 13 2" stroke="#fff4d8" stroke-width="3" stroke-linecap="round"/>
  <!-- Two small trapped reserves; the live one-use allowance is a separate overlay. -->
  <ellipse cx="64" cy="129" rx="4" ry="6" fill="#d7d3ae" stroke="#91859c" stroke-width="1.5"/>
  <ellipse cx="79" cy="115" rx="3" ry="4" fill="#e5debf"/>
  <path d="M214 138q7-8 12-4 5 7-4 10-7 2-8-6Z" fill="#c5b8bc" stroke="#8d7c94" stroke-width="2"/>
  <path d="M233 163q5-5 8 0 1 6-5 6-5-1-3-6Z" fill="#c9baad"/>
`;

const RIBBON_DROP = `
  <defs>
    <linearGradient id="sr-body" x1="0" y1=".2" x2="1" y2=".8"><stop stop-color="#f4cca0"/><stop offset=".5" stop-color="#da9678"/><stop offset="1" stop-color="#b96660"/></linearGradient>
    <linearGradient id="sr-back" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#b86362"/><stop offset="1" stop-color="#714e61"/></linearGradient>
  </defs>
  <ellipse cx="143" cy="183" rx="115" ry="8" fill="#80556120"/>
  <!-- One long open ribbon, a linear runner with no circular coil or pointed droplet head. -->
  <path d="M24 152c20 11 37 9 47-5 12-17 8-46 26-62 10-9 28-11 40-3l17 14-13 15c-15-10-26-14-34-2-10 14-11 50-31 64-18 13-41 7-52-4-10-10-12-18 0-17Z" fill="url(#sr-back)" stroke="#754d58" stroke-width="3"/>
  <path d="M24 152c23 13 42 8 48-15 4-17 10-41 22-49 10-7 17-9 26-7-22 6-30 35-30 58-2 31-36 48-63 24Z" fill="url(#sr-body)"/>
  <path d="M107 97c13-10 30 0 43 17 14 18 26 30 43 20l22 15c-27 31-52 12-74-13-14-16-23-22-35-19Z" fill="url(#sr-body)" stroke="#754d58" stroke-width="3"/>
  <path d="M117 101c15 4 25 26 47 38 10 5 19 6 27 2-16 13-31 3-48-13-10-11-16-19-26-27Z" fill="#f7d6ac"/>
  <path d="M178 135c5-21 23-34 46-30 18 3 32 14 31 25-1 15-21 25-43 27-19 1-37-6-34-22Z" fill="url(#sr-body)" stroke="#754d58" stroke-width="3.3"/>
  <path d="M186 129c8-16 24-18 39-14l14 7c-22-7-39 0-49 13Z" fill="#ffe2b5"/>
  <path d="M194 146c21 7 45 1 58-13-4 17-40 26-55 18Z" fill="#b37070"/>
  <path d="M206 111c4-11 6-22 18-29 7-4 13-2 13 2-12 3-17 17-18 28Z" fill="#e9b18c" stroke="#825a61" stroke-width="2.2"/>
  <path d="m231 126 8-2" stroke="#5b4055" stroke-width="4" stroke-linecap="round"/>
  <ellipse cx="211" cy="130" rx="4" ry="6" fill="#583d51"/>
  <ellipse cx="210" cy="128" rx="1.1" ry="1.7" fill="#fff0cd"/>
  <path d="M217 143q6 2 10-3" fill="none" stroke="#704958" stroke-width="2.2" stroke-linecap="round"/>
  <path d="m201 138 4 1m30-5 3-1" stroke="#f3ccb2" stroke-width="3" stroke-linecap="round"/>
  <path d="M39 168q12 3 20-1M80 136l3-12m14-25 5-4m52 34 9 7" fill="none" stroke="#ffd9ac" stroke-width="2.3" stroke-linecap="round"/>
  <path d="M98 171q5-6 10-2c5 4 0 9-6 8-5-1-7-3-4-6Z" fill="#e1ac87"/>
  <ellipse cx="134" cy="177" rx="8" ry="3" fill="#c68a78"/>
  <path d="m156 172 8 0" stroke="#edc89e" stroke-width="3" stroke-linecap="round"/>
`;

const FOLD_WARD = `
  <defs>
    <linearGradient id="sf-film" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#e4dfb1"/><stop offset=".45" stop-color="#a9b588"/><stop offset="1" stop-color="#658579"/></linearGradient>
    <linearGradient id="sf-shade" x1="0" y1="0" x2="1" y2=".4"><stop stop-color="#567c72"/><stop offset="1" stop-color="#aabb90"/></linearGradient>
  </defs>
  <ellipse cx="141" cy="193" rx="97" ry="8" fill="#49685d25"/>
  <!-- A soft pleated membrane is a planar shield, not a hard wall or umbrella. -->
  <path d="M39 167c1-15 16-29 18-52 3-20-5-36 7-47 10-10 25 4 36-3 12-7 11-22 26-24 13-2 18 13 30 13 15 0 21-12 34-6 13 6 9 23 19 29 9 5 21-2 28 7 8 11-3 30 0 47 3 19 17 32 8 45-12 19-30 1-45 13-15 11-30-8-44-2-15 7-30 11-41-1-13-13-23 11-39 2-15-8-39 0-37-21Z" fill="url(#sf-film)" stroke="#4f7366" stroke-width="3.5" stroke-linejoin="round"/>
  <path d="M63 73c11 0 12 11 21 8l-1 86-17 13c-6-29 4-73-3-107Z" fill="url(#sf-shade)"/>
  <path d="M100 65c10-6 12-17 24-19-14 40-4 95-9 138l-18-12c8-36-3-71 3-107Z" fill="#dee0b0"/>
  <path d="M124 46c-9 40 2 91-3 133l19-11c-3-36 8-66-3-111Z" fill="#72998b"/>
  <path d="M159 59c13 0 17-10 29-7-3 32 14 77 4 120l-18 13c-7-39 2-84-15-126Z" fill="#d7d9a8"/>
  <path d="M188 52c-4 36 13 80 4 120l19 9c6-37-7-63-2-99-13-5-9-21-21-30Z" fill="#779785"/>
  <path d="M218 86c7 0 12-2 15 2-13 36 7 59 1 77-6-8-10-11-17-10 3-25-5-44 1-69Z" fill="#c8d0a0"/>
  <path d="M47 168c21 4 29-13 42-9 16 5 28 22 45 14 15-7 26-3 39 5 18 11 29-20 44-12 7 4 16 3 22-3" fill="none" stroke="#bfd0ac" stroke-width="4" stroke-linecap="round"/>
  <path d="M71 93c-2 17 2 37-1 53m38-65c-1 22 3 53-1 71m36-80c5 23 0 54 1 68m42-57c3 15 7 33 5 48m30-36 0 25" fill="none" stroke="#dce5be" stroke-width="2" stroke-linecap="round"/>
  <!-- Offset narrow eyes sit on neighboring folds; a tiny vertical mouth stays legible. -->
  <path d="m134 113 10 2m13-6 9-3" stroke="#355b51" stroke-width="4" stroke-linecap="round"/>
  <ellipse cx="151" cy="133" rx="3.3" ry="5" fill="#476758"/>
  <path d="m128 126 6 1m31-3 5-2" stroke="#c5b780" stroke-width="3" stroke-linecap="round"/>
  <path d="m120 60 2-7m62 11 1-5m-37 95 1-7m-87 18 5 1" stroke="#f2ebc5" stroke-width="3" stroke-linecap="round"/>
  <ellipse cx="50" cy="179" rx="5" ry="3" fill="#9daf87"/>
  <ellipse cx="243" cy="190" rx="6" ry="2.5" fill="#a6b78d"/>
`;

const BUBBLE_BRANCH = `
  <defs>
    <linearGradient id="sb-stem" x1=".2" y1="0" x2=".7" y2="1"><stop stop-color="#e8b6b8"/><stop offset=".5" stop-color="#c88c9b"/><stop offset="1" stop-color="#906e84"/></linearGradient>
    <radialGradient id="sb-bubble" cx=".33" cy=".23" r=".85"><stop stop-color="#fff0d5"/><stop offset=".5" stop-color="#e7c7ba"/><stop offset=".82" stop-color="#b993aa"/><stop offset="1" stop-color="#827a92"/></radialGradient>
  </defs>
  <ellipse cx="141" cy="195" rx="81" ry="8" fill="#80576624"/>
  <!-- A dendritic liquid body bears seven separated terminal bubbles, no animal head or limbs. -->
  <path d="M119 186c-1-23 8-34 3-47-4-12-27-17-39-30-7-7-7-19-17-24l11-13c13 7 12 22 21 27l22 9c-1-28-19-35-21-57l17-4c-1 23 22 33 25 57 11-23 4-47 14-60l15 6c-12 17 1 37-6 58 8-12 30-8 36-26l16 7c-9 23-27 17-39 35-7 11 0 24-12 33 2 12 16 20 13 30-7 17-49 20-59-1Z" fill="url(#sb-stem)" stroke="#805e7a" stroke-width="3.2" stroke-linejoin="round"/>
  <path d="M113 55c0 18 20 32 23 53-1 17-9 19-6 35 5 24-4 29-3 40" fill="none" stroke="#efd0c0" stroke-width="5" stroke-linecap="round"/>
  <path d="M140 151c13-16 7-29 14-40 7-12 5-31 7-44M128 126c-7-16-29-9-39-24m68 39c3-23 23-18 35-34" fill="none" stroke="#e8b5b6" stroke-width="3" stroke-linecap="round"/>
  <path d="M126 171c-8 4-18 10-20 17-3 10 18 12 35 12 19-1 43-4 44-14 0-9-15-8-18-13" fill="url(#sb-stem)" stroke="#805e7a" stroke-width="3"/>
  <path d="M116 187c11 5 36 5 51-1" fill="none" stroke="#f0cfc1" stroke-width="4" stroke-linecap="round"/>
  <g fill="url(#sb-bubble)" stroke="#9c788e" stroke-width="2.4">
    <circle cx="69" cy="76" r="22"/><circle cx="109" cy="42" r="24"/>
    <circle cx="164" cy="39" r="17"/><circle cx="210" cy="79" r="25"/>
    <circle cx="227" cy="124" r="14"/><circle cx="66" cy="130" r="13"/>
    <circle cx="189" cy="151" r="12"/>
  </g>
  <path d="m210 96 12 17M83 119l-9 6m90 17 15 7" stroke="#b6859b" stroke-width="6" stroke-linecap="round"/>
  <g fill="none" stroke="#fff4d8" stroke-width="3" stroke-linecap="round">
    <path d="M54 72q1-9 10-11M94 39q1-10 10-13m51 9q1-6 6-7M194 75q2-10 11-12m15 57 3-4m-164 15 1-4m125 20 2-2"/>
  </g>
  <!-- Face remains on the trunk below the branching junction. -->
  <path d="M134 150q4-5 8 0m8-2q4-5 8 0" fill="none" stroke="#573d60" stroke-width="3.2" stroke-linecap="round"/>
  <path d="M143 160q3 5 7-1" fill="none" stroke="#6f4b6b" stroke-width="2.5" stroke-linecap="round"/>
  <ellipse cx="131" cy="157" rx="3" ry="2" fill="#edb9ab"/><ellipse cx="161" cy="155" rx="3" ry="2" fill="#edb9ab"/>
  <circle cx="189" cy="25" r="4" fill="#efd8bd" stroke="#ba96a6" stroke-width="1.5"/>
  <circle cx="42" cy="106" r="3" fill="#dfb7b2"/>
`;

const KNEADED_FIST = `
  <defs>
    <linearGradient id="sk-body" x1=".2" y1="0" x2=".7" y2="1"><stop stop-color="#d9b692"/><stop offset=".45" stop-color="#b87d70"/><stop offset="1" stop-color="#795568"/></linearGradient>
    <linearGradient id="sk-pressure" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ebc596"/><stop offset="1" stop-color="#c0917e"/></linearGradient>
  </defs>
  <ellipse cx="140" cy="191" rx="111" ry="10" fill="#75556529"/>
  <g transform="translate(0 38) scale(1 .8)">
  <!-- Exactly six low, radial pressure lobes; one body, no humanoid arm or glove. -->
  <path d="M110 99c-16-27-4-50 23-50 22-1 35 18 32 36 18-22 47-20 59-1 13 19 0 39-17 46 26-1 47 10 45 29-2 18-26 26-48 18-1 21-22 28-42 16-11-7-17-19-20-28-8 24-29 34-48 25-17-8-17-29-8-42-25 13-49 5-53-12-5-22 20-35 42-28 9 2 17 0 35-9Z" fill="url(#sk-body)" stroke="#734f61" stroke-width="3.5" stroke-linejoin="round"/>
  <path d="M118 85c-7-18 1-28 15-27 18 2 22 12 21 29-12-9-23-10-36-2Z" fill="url(#sk-pressure)"/>
  <path d="M176 98c9-18 28-24 39-11 9 12-2 29-14 29 1-8-9-17-25-18Z" fill="url(#sk-pressure)"/>
  <path d="M215 141c16-4 28 3 28 13-1 12-20 15-33 8 9-5 10-12 5-21Z" fill="#dcae88"/>
  <path d="M174 168c5 11 16 16 24 9-7 14-22 16-32 6l-8-14Z" fill="#ca9b84"/>
  <path d="M92 163c-8 15 2 26 16 24 12-1 19-10 21-20-13 10-25 9-37-4Z" fill="#c79984"/>
  <path d="M42 129c2-13 25-17 37-7-15-1-23 4-23 13l-8 2Z" fill="#ecc397"/>
  <!-- Kneaded dimples radiate toward the six soft knuckles, with a compressed, weight-bearing footprint. -->
  <path d="M115 98c-5 9-5 18 0 23m47-28c-7 9-9 18-7 26m42 14-18-2m16 25-22-10m-28 16-7-17m-35 10 11-14m-30-9 21-4" fill="none" stroke="#945f6b" stroke-width="3" stroke-linecap="round"/>
  <path d="M96 123c7-24 39-32 63-21 23 10 29 39 8 53-19 12-53 7-67-7-7-7-9-16-4-25Z" fill="url(#sk-body)"/>
  <path d="M104 120c15-15 43-16 58-3-18-9-37-5-49 8Z" fill="#efd0a3"/>
  <path d="M102 145c16 12 42 17 61 3" fill="none" stroke="#a7797c" stroke-width="3" stroke-linecap="round"/>
  <ellipse cx="121" cy="130" rx="4.3" ry="6" transform="rotate(-12 121 130)" fill="#573d52"/>
  <ellipse cx="147" cy="128" rx="4.3" ry="6" transform="rotate(12 147 128)" fill="#573d52"/>
  <path d="m115 120 10 2m18-2 9-4" stroke="#694654" stroke-width="3" stroke-linecap="round"/>
  <path d="M129 143q6-3 11 0" fill="none" stroke="#614554" stroke-width="2.6" stroke-linecap="round"/>
  <path d="m109 139 5 1m41-3 5-1" stroke="#e7b499" stroke-width="3" stroke-linecap="round"/>
  <path d="M127 61l7-1m57 25 7 1m35 63 3 2m-61 33 5 1m-78-5 6 1m-59-55 5-3" stroke="#f9dcb0" stroke-width="3" stroke-linecap="round"/>
  </g>
`;

function svg(art: string, viewBox: string, width: number, height: number) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBox}" fill="none">${art}</svg>`;
}
const url = (source: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;
function character(art: string, crop: string, spriteWidth: number) {
  const full = svg(art, '0 0 280 210', 280, 210);
  const portrait = svg(art, crop, 140, 140);
  return {full, portrait, artUrl: url(full), portraitUrl: url(portrait), spriteWidth};
}
/** Static source geometry is reused in cards, the dock and enemy-only battlefield. */
export const SLIME_ART = {
  24: character(HOLLOW_SPRING, '34 12 214 214', 119),
  25: character(RIBBON_DROP, '12 8 248 248', 126),
  26: character(FOLD_WARD, '32 8 221 221', 119),
  27: character(BUBBLE_BRANCH, '35 9 212 212', 114),
  28: character(KNEADED_FIST, '24 19 234 234', 127),
} as const;
