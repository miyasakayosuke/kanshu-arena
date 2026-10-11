/**
 * Three original, code-native SVG characters authored directly for this game.
 * The literary/folkloric motifs and the newly invented expressions are separated
 * in docs/demon-art-provenance.md. No reference illustration, traced outline,
 * model, font, sound, motion sample or copied third-party character code was used.
 * Full figures and portraits share exactly the same static source geometry.
 */
const MAMMON = `
  <defs>
    <linearGradient id="dm-cloth" x1=".1" y1="0" x2=".8" y2="1"><stop stop-color="#698b87"/><stop offset=".43" stop-color="#426e72"/><stop offset="1" stop-color="#2e475c"/></linearGradient>
    <linearGradient id="dm-lining" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f0d6a0"/><stop offset="1" stop-color="#af865d"/></linearGradient>
    <linearGradient id="dm-pouch" x1="0" y1="0" x2=".6" y2="1"><stop stop-color="#b69a98"/><stop offset="1" stop-color="#796579"/></linearGradient>
  </defs>
  <ellipse cx="145" cy="196" rx="83" ry="8" fill="#37495b24"/>
  <!-- Asymmetric hanging cloak; no torso rings, horns, wings or religious emblems. -->
  <path d="M113 72c-19 7-28 22-37 49l-17 55c14 5 24-1 32-9-3 16-7 24-14 28 30 11 48-2 65-1 17 0 39 10 63-3-25-27-20-74-43-108Z" fill="url(#dm-cloth)" stroke="#304854" stroke-width="3.5" stroke-linejoin="round"/>
  <path d="M114 81c-7 31-9 77-24 110 14 0 27-8 37-7l8-85Z" fill="url(#dm-lining)"/>
  <path d="M134 92c10 33 4 68-7 92l21 10c13-30 3-70-4-102Z" fill="#30555f"/>
  <path d="M156 96c20 25 14 65 35 89-17-4-31-15-32-31-2-17-2-39-10-57Z" fill="#70918a"/>
  <path d="M86 130c-9 19-8 36-18 42m45-37-8 32m53-36 4 26" fill="none" stroke="#94a598" stroke-width="2.5" stroke-linecap="round"/>
  <!-- Low sleeves finish in two open palms, with a finite set of three loose tokens. -->
  <path d="M96 90c-15 3-19 18-25 20l-18 1 2 21c21 7 35-4 48-17Z" fill="url(#dm-cloth)" stroke="#304854" stroke-width="3"/>
  <path d="m54 112 10 0-1 21-9-1Z" fill="url(#dm-lining)" stroke="#7d705d" stroke-width="2"/>
  <path d="M57 118c-7 1-10-4-14-3-2 2 0 5 3 7-8 0-13-3-15 0-2 4 9 12 18 12l9-4Z" fill="#ddc69c" stroke="#7f7067" stroke-width="2.2" stroke-linejoin="round"/>
  <path d="m37 126 10 3m-3-7 6 2" fill="none" stroke="#9a8470" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M155 88c19-1 25 21 37 22l17-3 5 17c-23 13-43 4-54-11Z" fill="url(#dm-cloth)" stroke="#304854" stroke-width="3"/>
  <path d="m205 108 10-3 6 18-10 4Z" fill="url(#dm-lining)" stroke="#7d705d" stroke-width="2"/>
  <path d="M216 110c5-3 8-9 12-8 3 1 1 6-2 9 6-1 12-7 15-4 3 4-6 14-13 16l-9-1Z" fill="#ddc69c" stroke="#7f7067" stroke-width="2.2" stroke-linejoin="round"/>
  <path d="m228 116 7-5" stroke="#9a8470" stroke-width="1.5" stroke-linecap="round"/>
  <g fill="#efd391" stroke="#a38c64" stroke-width="1.7">
    <path d="m35 99 8-7 8 7-8 8Z"/><path d="m53 85 6-9 8 6-6 10Z"/><path d="m211 87 9-5 7 7-9 5Z"/>
  </g>
  <path d="m41 98 3-2m16-12 2-3m157 7 3-1" stroke="#fff0c6" stroke-width="2" stroke-linecap="round"/>
  <!-- One soft lopsided resource pouch, without a currency sign or brand. -->
  <path d="M145 92c16 13 24 25 34 39" fill="none" stroke="#b7a687" stroke-width="7"/>
  <path d="M145 92c16 13 24 25 34 39" fill="none" stroke="#e3cc9c" stroke-width="2"/>
  <path d="M177 128c-11 9-20 17-21 32-1 20 21 30 40 23 22-7 21-23 9-38-5-7-12-12-14-18Z" fill="url(#dm-pouch)" stroke="#514f64" stroke-width="3"/>
  <path d="M177 137c-10 11-14 27-5 36-1-18 7-27 13-31Z" fill="#d1b4a4"/>
  <path d="M194 149c8 10 10 24-4 29" fill="none" stroke="#6b5b71" stroke-width="3" stroke-linecap="round"/>
  <path d="m175 131 19-3m-19 7 21-3" stroke="#d7bd8d" stroke-width="4" stroke-linecap="round"/>
  <!-- Hood and warm mask make a narrow, watchful face rather than an animal head. -->
  <path d="M108 83c-13-6-18-18-13-34 5-15 22-18 20-30 19 3 43 12 51 31 7 15 2 29-12 37l-22 10Z" fill="url(#dm-cloth)" stroke="#304854" stroke-width="3.5" stroke-linejoin="round"/>
  <path d="M117 29c-12 16-16 30-7 46l-11-6c-8-19 4-30 18-40Z" fill="#8da79b"/>
  <path d="M116 42c12-8 29-6 38 4l-2 22-15 16-19-8-10-16Z" fill="url(#dm-lining)" stroke="#676861" stroke-width="2.3" stroke-linejoin="round"/>
  <path d="m115 52 13 5m12-4 10-4" fill="none" stroke="#4e5157" stroke-width="3.4" stroke-linecap="round"/>
  <ellipse cx="124" cy="60" rx="2.8" ry="4.3" fill="#3f4650"/><ellipse cx="144" cy="57" rx="2.8" ry="4.3" fill="#3f4650"/>
  <path d="m133 60-2 7 5 0m-7 6q7 3 12-3" fill="none" stroke="#8b7563" stroke-width="2" stroke-linecap="round"/>
  <path d="M109 80c13 3 25 3 45-4l-7 17-16 9-19-8Z" fill="url(#dm-lining)" stroke="#676861" stroke-width="2.3"/>
  <path d="m117 87 14 7 13-7" fill="none" stroke="#f9e2ae" stroke-width="2.5" stroke-linecap="round"/>
`;

const KOBOLD = `
  <defs>
    <linearGradient id="dk-coat" x1=".2" y1="0" x2=".8" y2="1"><stop stop-color="#b3b6a1"/><stop offset=".48" stop-color="#7e9589"/><stop offset="1" stop-color="#526b6e"/></linearGradient>
    <linearGradient id="dk-soot" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#867c86"/><stop offset="1" stop-color="#4d4c61"/></linearGradient>
    <linearGradient id="dk-cap" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#b9a194"/><stop offset="1" stop-color="#7c6c78"/></linearGradient>
  </defs>
  <ellipse cx="139" cy="194" rx="105" ry="8" fill="#4b545c24"/>
  <!-- A small household spirit with short boots; no muzzle, reptile scales or animal ears. -->
  <path d="M118 166c-7 5-12 11-19 15-9 5-13 15-1 15 13 1 29-2 36-9l-1-17Z" fill="url(#dk-soot)" stroke="#4a4b5b" stroke-width="3"/>
  <path d="M154 168c0 8 3 16 7 19 9 6 22 8 29 3 6-5-2-9-12-11l-5-12Z" fill="url(#dk-soot)" stroke="#4a4b5b" stroke-width="3"/>
  <path d="m103 187 15-4m47 1 9 3" stroke="#b7a4a0" stroke-width="2.5" stroke-linecap="round"/>
  <!-- One sweeping, oversized sleeve stays part of a cloth costume, not a liquid body. -->
  <path d="M111 106c-15-7-26 2-33 14-9 16-9 34-26 40-9 3-19-1-24 5-7 10 15 21 34 20 23-2 44-21 51-44Z" fill="url(#dk-coat)" stroke="#4b6265" stroke-width="3.5" stroke-linejoin="round"/>
  <path d="M91 115c-13 26-13 50-36 56-9 2-16 0-22-2 9 12 29 13 42 4 21-15 24-41 26-54Z" fill="#9faf97"/>
  <path d="M35 169c5-5 14-4 19 1l-5 11c-10 0-16-4-14-12Z" fill="#52616c" stroke="#4b6265" stroke-width="2"/>
  <path d="m40 171 7 2m24-20 5-7m-16 19 6-5" stroke="#d0c7a8" stroke-width="2.4" stroke-linecap="round"/>
  <path d="M116 103c-15 10-22 31-18 51 3 17 14 26 35 27 23 3 41-1 47-17 6-16-3-41-18-55Z" fill="url(#dk-coat)" stroke="#4b6265" stroke-width="3.5"/>
  <path d="M109 123c-8 21-6 39 9 45 6 3 12 3 17 2l-2-51Z" fill="#b7bd9f"/>
  <path d="M140 120c1 18 0 36 8 51l13-4c-11-20-10-35-12-49Z" fill="#718777"/>
  <path d="M150 110c17-11 32-3 37 10l8 20-18 9-15-21Z" fill="url(#dk-coat)" stroke="#4b6265" stroke-width="3"/>
  <path d="m180 135 12-5 7 12-17 9Z" fill="#d2c2a0" stroke="#7d8174" stroke-width="2"/>
  <!-- Bent wooden latch-lifter: deliberately broad, with no blade or pickaxe head. -->
  <path d="m192 141 21-54c3-7 11-7 15-4l10 9-6 8-12-7-19 52Z" fill="#b39065" stroke="#735e58" stroke-width="3" stroke-linejoin="round"/>
  <path d="m198 130 20-42 10 2" fill="none" stroke="#e4c298" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M185 142c0-6 5-10 11-9 7 1 12 6 10 11-3 5-11 8-18 6Z" fill="url(#dk-soot)" stroke="#4a4b5b" stroke-width="2.2"/>
  <path d="m193 141 4-1m-2 5 4-1" stroke="#baaaa6" stroke-width="1.7" stroke-linecap="round"/>
  <path d="m110 145 18-3 4 19-17 4Z" fill="#d7bc99" stroke="#899083" stroke-width="2"/>
  <path d="m111 149 3-1m0 12 3-1m9-15 1 3m2 10-3 1" stroke="#947d68" stroke-width="1.6" stroke-linecap="round"/>
  <path d="m152 151 10-2m-9 6 12-2" stroke="#bdc7a6" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M116 102c-2 8 8 16 20 16 12 0 25-7 25-17" fill="#c9b693" stroke="#767969" stroke-width="2.5"/>
  <!-- Soot face and low folded work cap; neither a dog's head nor a pointed gnome hat. -->
  <path d="M101 72c-7 10-6 25 2 35 9 11 31 13 46 5 13-7 18-21 11-34-8-17-48-22-59-6Z" fill="url(#dk-soot)" stroke="#4a4b5b" stroke-width="3"/>
  <path d="M102 86c1-10 8-15 18-16-5 5-7 9-7 15Z" fill="#a39396"/>
  <path d="M112 90q5-6 10-1m16-2q5-6 10-1" fill="none" stroke="#f0debb" stroke-width="4" stroke-linecap="round"/>
  <path d="M124 102q9 6 16-3" fill="none" stroke="#e7cba4" stroke-width="2.8" stroke-linecap="round"/>
  <path d="m107 99 5 1m37-5 5-2" stroke="#b19191" stroke-width="3" stroke-linecap="round"/>
  <path d="M90 80c-7-5-16-2-22-8-8-9 6-21 24-23 15-2 29 4 44 3 16-1 27 6 29 17l-3 12c-20-6-46-10-72-1Z" fill="url(#dk-cap)" stroke="#655967" stroke-width="3.5" stroke-linejoin="round"/>
  <path d="M76 64c17-11 29-4 47-4 12 0 22-4 30 1-17 1-27 8-40 6-13-2-24-2-37-3Z" fill="#d4bda3"/>
  <path d="M91 75c24-10 48-5 71 0l1 9c-23-6-47-9-67 0Z" fill="#9d8990" stroke="#655967" stroke-width="2.3"/>
  <path d="m138 59 15 4-4 12-15-4Z" fill="#c4c0a5" stroke="#847c78" stroke-width="1.7"/>
  <path d="m140 62-1 3m11 0-1 3m-9 2 3 1" stroke="#837973" stroke-width="1.4" stroke-linecap="round"/>
  <path d="m79 128 3-4m-34 19 4-2m24 40 6-3" stroke="#baa791" stroke-width="3" stroke-linecap="round"/>
`;

const EMPUSA = `
  <defs>
    <linearGradient id="de-mantle" x1=".1" y1=".1" x2=".8" y2="1"><stop stop-color="#e3dec2"/><stop offset=".36" stop-color="#a5c4b7"/><stop offset="1" stop-color="#587c8b"/></linearGradient>
    <linearGradient id="de-shadow" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#a590ad"/><stop offset="1" stop-color="#574c72"/></linearGradient>
    <linearGradient id="de-bronze" x1="0" y1="0" x2="1" y2=".4"><stop stop-color="#967053"/><stop offset=".42" stop-color="#e9bc7e"/><stop offset=".65" stop-color="#c79762"/><stop offset="1" stop-color="#8b6454"/></linearGradient>
  </defs>
  <ellipse cx="143" cy="197" rx="83" ry="7" fill="#62546f20"/>
  <!-- One airy manta-like mantle: its lateral points are cloth, not wings or arms. -->
  <path d="M133 65C104 74 89 111 35 103c16 18 28 32 52 39-7 14-19 25-30 31 36 10 72-2 86-17 24 5 44-16 58-41 15-1 30-13 43-28-31 5-48-7-73-15Z" fill="url(#de-shadow)" stroke="#62566f" stroke-width="3.3" stroke-linejoin="round"/>
  <path d="M136 67c-28 18-34 45-64 59-13-4-21-11-28-18 38 6 64-26 84-36Z" fill="#d4c4c0"/>
  <path d="M136 107c-17 20-27 38-51 51-11 6-18 10-23 12 31 5 61-9 77-28Z" fill="#8c799e"/>
  <!-- The other lower contour dissolves into mist; no second metal leg is hidden in the drawing. -->
  <path d="M123 112c-14 20-6 40-19 55-9 11-23 10-26 19 9-2 17 1 24-3-2 8-9 12-14 14 26 3 36-12 44-26 7-14 16-33 12-54Z" fill="url(#de-shadow)" stroke="#62566f" stroke-width="2.6" stroke-linejoin="round"/>
  <path d="M127 132c-5 18-2 36-16 49" fill="none" stroke="#c3b5c0" stroke-width="3" stroke-linecap="round"/>
  <!-- Exactly one visible bronze leg, bent at the knee and ending in an unshod foot. -->
  <path d="M146 113c12 2 17 15 13 27l-12 25 7 19 16 3c6 2 5 7-2 8l-24-1c-5 0-7-3-7-7l-5-25 8-26Z" fill="url(#de-bronze)" stroke="#755b5e" stroke-width="3" stroke-linejoin="round"/>
  <path d="m148 130-8 32 6 26 17 3" fill="none" stroke="#f4d09a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="m142 157 10 5m-8 30 4-6m8 7 3-4" stroke="#a07559" stroke-width="1.6" stroke-linecap="round"/>
  <path d="M130 67c21-14 39-2 60 12 17 11 32 15 51 10-16 12-33 19-50 15-5 11-7 22-17 29-13 10-26 4-35-7-10-14-17-38-9-59Z" fill="url(#de-mantle)" stroke="#597781" stroke-width="3.2" stroke-linejoin="round"/>
  <path d="M151 73c27-2 39 25 75 24-24 9-45-7-60-10-3 15-9 29-5 44-22-16-24-40-10-58Z" fill="#d5ddc5"/>
  <path d="M134 90c-1 17 9 33 21 40-11-22-8-27-3-43Z" fill="#779c9f"/>
  <path d="M180 94c-3 10-7 17-13 24m26-16 11 1m-70-25-3 8" fill="none" stroke="#f4e9ce" stroke-width="2.4" stroke-linecap="round"/>
  <path d="M128 75c-9 18-17 32-36 44-10 6-21 8-32 6 17 11 40 2 57-10 14-10 26-26 27-37Z" fill="url(#de-mantle)" stroke="#597781" stroke-width="2.4" stroke-linejoin="round"/>
  <path d="M129 81c-13 23-27 39-50 43" fill="none" stroke="#ede6ce" stroke-width="3" stroke-linecap="round"/>
  <!-- Pale face framed by a wind-swept fold, without a crown, horns or copied costume. -->
  <path d="M121 77c-12-8-12-25-3-37 12-15 36-10 48-23 6 14-5 23-3 32 3 15-5 28-17 33Z" fill="url(#de-shadow)" stroke="#62566f" stroke-width="3.3" stroke-linejoin="round"/>
  <path d="M121 45c10-10 28-9 37-16-3 10-21 14-27 22Z" fill="#c5b4c2"/>
  <path d="M127 47c9-1 17 4 27 3l1 16-15 17-15-11-6-14Z" fill="#f0dfc6" stroke="#8f8a88" stroke-width="2.1" stroke-linejoin="round"/>
  <path d="m124 58 10 4m10-2 8-3" fill="none" stroke="#665971" stroke-width="3.2" stroke-linecap="round"/>
  <path d="m132 62-1 3m15-5-1 3" stroke="#665971" stroke-width="2.8" stroke-linecap="round"/>
  <path d="m137 72 5-1" stroke="#ac7d83" stroke-width="2.3" stroke-linecap="round"/>
  <path d="M119 73c7 6 20 9 30 1l12 10c-16 10-34 3-42-11Z" fill="#8cafaa" stroke="#597781" stroke-width="2"/>
  <!-- Two small detached mist strokes remain decorative and do not imply a transformation mechanic. -->
  <path d="M73 159c-10 2-14 8-20 9m51 28-11 5m105-72 8-5" fill="none" stroke="#bcb5bf" stroke-width="3" stroke-linecap="round"/>
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
/** Static artwork only. Game-family membership is not a religious classification. */
export const DEMON_ART = {
  29: character(MAMMON, '78 14 113 113', 116),
  30: character(KOBOLD, '65 42 136 136', 110),
  31: character(EMPUSA, '95 12 99 99', 119),
} as const;
