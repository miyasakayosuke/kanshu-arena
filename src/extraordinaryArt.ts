/**
 * Original code-native Janus illustration authored directly for this game.
 * Two facing profiles, a key and a threshold are ancient literary motifs;
 * the open stone body, proportions, clothing, colors and paths are new designs.
 * No external picture, traced outline, font, model, animation or character code.
 * Portrait and field figure use the same static geometry. See provenance doc.
 */
const JANUS = `
  <defs>
    <linearGradient id="xj-stone" x1="0" y1="0" x2="1" y2=".7"><stop stop-color="#fbefd2"/><stop offset=".52" stop-color="#d9cba9"/><stop offset="1" stop-color="#a9977f"/></linearGradient>
    <linearGradient id="xj-band" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#8cb1a8"/><stop offset=".5" stop-color="#568d8e"/><stop offset="1" stop-color="#385d72"/></linearGradient>
    <linearGradient id="xj-metal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f3dba0"/><stop offset=".48" stop-color="#cda877"/><stop offset="1" stop-color="#977d67"/></linearGradient>
  </defs>
  <ellipse cx="141" cy="196" rx="71" ry="6" fill="#465e6924"/>
  <!-- Two unequal stone feet are separated by the open threshold, not armor. -->
  <path d="m100 173-12 11-16 4 0 8 47 0 7-17Z" fill="url(#xj-stone)" stroke="#756f68" stroke-width="3" stroke-linejoin="round"/>
  <path d="m153 178 8 18 48 0-2-9-25-11Z" fill="url(#xj-stone)" stroke="#756f68" stroke-width="3" stroke-linejoin="round"/>
  <path d="m79 190 32 0m55 0 30 0" stroke="#fff1d4" stroke-width="2.5" stroke-linecap="round"/>
  <!-- A single continuous arch-shaped body leaves a real empty center. -->
  <path d="M100 85c-15 23-16 59-9 96l26 3-2-47c0-15 8-28 22-28 15 0 22 12 22 29l-3 46 28-4c7-36 5-73-13-96Z" fill="url(#xj-stone)" stroke="#756f68" stroke-width="3.5" stroke-linejoin="round"/>
  <path d="M102 95c-11 28-12 54-6 81l10 1-1-40c0-25 14-39 31-40Z" fill="#f5e9c9"/>
  <path d="M153 99c16 16 17 44 13 77l11-2c6-30 3-56-10-75Z" fill="#a89a81"/>
  <path d="m112 148 0 28m50-27-1 27" fill="none" stroke="#918778" stroke-width="2" stroke-linecap="round"/>
  <path d="M108 92c18-11 43-13 62-3l-6 13c-16-9-35-7-49 3Z" fill="url(#xj-band)" stroke="#4a7077" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="m117 95 15-4 19 0" fill="none" stroke="#b4cec0" stroke-width="2.5" stroke-linecap="round"/>
  <!-- An offset hanging band follows one pillar without filling the doorway. -->
  <path d="M155 98c9 19 4 45 5 62l12 14 3-41c1-15-3-28-8-37Z" fill="url(#xj-band)" stroke="#4a7077" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="m164 111 3 27-1 21" fill="none" stroke="#a7c8b8" stroke-width="2.2" stroke-linecap="round"/>
  <path d="m159 160 13 14-4 10-9-11Z" fill="#d7c49a" stroke="#897f6b" stroke-width="2"/>
  <!-- Quiet bent arms and open palms make the architectural figure a character. -->
  <path d="M101 86c-16-3-25 13-30 24l-19 10 9 14 25-12 24-21Z" fill="url(#xj-stone)" stroke="#756f68" stroke-width="3" stroke-linejoin="round"/>
  <path d="m64 124 17-11 11-15" fill="none" stroke="#fff0d0" stroke-width="3" stroke-linecap="round"/>
  <path d="M56 120c-7-2-14-9-18-6-2 3 4 8 7 10-9 0-18-4-20 0-1 5 14 13 25 12l11-6Z" fill="url(#xj-stone)" stroke="#756f68" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="m33 126 12 4m-3-9 7 4" stroke="#a1947c" stroke-width="1.7" stroke-linecap="round"/>
  <path d="M173 86c15 2 18 20 28 23l17-8 8 14-22 12c-14 3-30-12-37-24Z" fill="url(#xj-stone)" stroke="#756f68" stroke-width="3" stroke-linejoin="round"/>
  <path d="m182 97 14 18 13 1" fill="none" stroke="#fff0d0" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M219 103c4-5 4-13 8-14 4 0 3 8 2 11 5-3 12-7 15-3 2 4-5 13-11 17l-9 0Z" fill="url(#xj-stone)" stroke="#756f68" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="m233 104 5-4" stroke="#a1947c" stroke-width="1.8" stroke-linecap="round"/>
  <!-- Small unbranded open-bow key, off-center and unrelated to any game emblem. -->
  <path d="M52 93c0-8-6-14-14-14s-14 6-14 14 6 14 14 14c4 0 7-1 10-4l16 15 6-6-6-6-4 4-5-5 4-4Z" fill="url(#xj-metal)" stroke="#8d7965" stroke-width="2.5" stroke-linejoin="round"/>
  <circle cx="38" cy="93" r="6" fill="#f4eedb" stroke="#aa8d69" stroke-width="2"/>
  <path d="m31 84 6-2 7 2" fill="none" stroke="#fff0bd" stroke-width="2.3" stroke-linecap="round"/>
  <!-- One head carries two outward-facing profiles, with separate noses and eyes. -->
  <path d="M107 30c16-11 39-10 54 1l4 18 10 14-10 4-2 14-15 10-23 1-17-11-2-13-11-5 11-13Z" fill="url(#xj-stone)" stroke="#756f68" stroke-width="3.2" stroke-linejoin="round"/>
  <path d="M108 32c7-5 15-7 23-7l-2 63-16-10-1-15-8-2 8-12Z" fill="#f7eace"/>
  <path d="m145 27 14 6 2 16 10 13-9 3-2 15-16 9Z" fill="#c8b796"/>
  <path d="m108 46 14 3m29-1 11-3" stroke="#7d7c71" stroke-width="2.5" stroke-linecap="round"/>
  <path d="m109 54 9 1m35 0 9-2" stroke="#3e626c" stroke-width="3.5" stroke-linecap="round"/>
  <path d="m108 73 10 0m37 0 7-2" stroke="#967e6b" stroke-width="2.2" stroke-linecap="round"/>
  <!-- Narrow central seam joins the faces; it is not a third face or a mask. -->
  <path d="m132 27 10 1 2 63-14 0Z" fill="url(#xj-band)" stroke="#527879" stroke-width="2"/>
  <path d="m135 33 2 50" stroke="#accbbb" stroke-width="2.3" stroke-linecap="round"/>
  <path d="M106 30c10-11 43-12 57 1l-1 9c-17-10-36-10-55-1Z" fill="#cbbba0" stroke="#756f68" stroke-width="2.6" stroke-linejoin="round"/>
  <path d="m116 29 13-3 19 2" fill="none" stroke="#fff0cf" stroke-width="2.3" stroke-linecap="round"/>
  <path d="m110 80 16 13 24-1 12-10-1 11-13 9-22-1-15-10Z" fill="url(#xj-band)" stroke="#4a7077" stroke-width="2.3" stroke-linejoin="round"/>
  <path d="m116 90 12 7 17 0" fill="none" stroke="#b8cbbb" stroke-width="2" stroke-linecap="round"/>
  <!-- Four small paving chips suggest converging paths, without status icons. -->
  <path d="m53 178 9-4 8 4-9 5Zm164 0 9-4 8 4-9 5Zm-87 10 7-3 7 3-7 3Zm-45-32 6-3 6 3-6 3Z" fill="#bbc7b7" stroke="#829991" stroke-width="1.6"/>
`;

const svg = (viewBox: string, width: number, height: number) => `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBox}" fill="none">${JANUS}</svg>`;
const full = svg('0 0 280 210', 280, 210);
const portrait = svg('76 14 126 126', 140, 140);
const url = (source: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;
export const EXTRAORDINARY_ART = {36: {full, portrait, artUrl: url(full), portraitUrl: url(portrait), spriteWidth: 116}} as const;
