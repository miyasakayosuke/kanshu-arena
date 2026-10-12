/**
 * Original code-native drawings authored directly for this project.
 * No external picture, traced shape, font, logo, or generated bitmap is used.
 * Full bodies and portraits share precisely the same authored SVG geometry.
 */
const TROLL_ARTWORK = `
  <defs>
    <linearGradient id="mx-tr-stone" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#a9bdc3"/><stop offset=".48" stop-color="#718d99"/><stop offset="1" stop-color="#3e596e"/></linearGradient>
    <linearGradient id="mx-tr-cloth" x1="0" y1="0" x2=".2" y2="1"><stop stop-color="#f1c577"/><stop offset=".5" stop-color="#c78b45"/><stop offset="1" stop-color="#966134"/></linearGradient>
    <linearGradient id="mx-tr-moss" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#c7ce8a"/><stop offset="1" stop-color="#738553"/></linearGradient>
  </defs>
  <ellipse cx="139" cy="196" rx="94" ry="8" fill="#283e4725"/>
  <!-- Long shins, a small waist, and low open hands give this stone troll its stance. -->
  <path d="M156 133c15-6 28 4 25 22l-12 21 6 12 18 2 4 10-39 1-12-15 11-25-11-13Z" fill="#516d80" stroke="#2f475a" stroke-width="3.2" stroke-linejoin="round"/>
  <path d="m160 158 13-5-12 27 8 14-13-5-5-13Z" fill="#91a6af"/>
  <path d="m173 190 10 1 6 8-14 1Zm-17 0 10 4 3 6-14-1Z" fill="#b4b8aa" stroke="#526879" stroke-width="1.5"/>
  <path d="M94 130c-10 13-13 29-5 40l5 15-17 4-8 12 40 1 11-12-6-26 15-18Z" fill="url(#mx-tr-stone)" stroke="#2f475a" stroke-width="3.2" stroke-linejoin="round"/>
  <path d="m97 146 15-4-8 21 4 20-10-6-8-17Z" fill="#bcc9c8"/>
  <path d="m80 190 13-1-2 12H73Zm16-2 10-1 6 8-7 7-10-1Z" fill="#b7beb3" stroke="#526879" stroke-width="1.5"/>
  <!-- The back shoulder is a weathered stone shelf, not body armor or a weapon. -->
  <path d="M160 73c17-16 33-12 46 0l8 28-16 16-33-9-18-24Z" fill="#546e7d" stroke="#2f475a" stroke-width="3.3"/>
  <path d="m177 67 14-16 11 12 13-1 10 25-17 13-23-6Z" fill="#899eaa" stroke="#354f60" stroke-width="2.8" stroke-linejoin="round"/>
  <path d="m191 54 2 26 14 14 3-27-9 5Z" fill="#bbc7c7"/><path d="m210 68-8 13 8 7" fill="none" stroke="#607f8b" stroke-width="2"/>
  <path d="M197 100c9-4 17 4 19 15l1 16 17 13 3 15-8 7-15-3-15-17-13-32Z" fill="url(#mx-tr-stone)" stroke="#2f475a" stroke-width="3.3" stroke-linejoin="round"/>
  <path d="m206 110 1 24 16 17 1 9-10-5-16-19-4-19Z" fill="#b1c1c3"/>
  <path d="m217 146 4 15m5-12 5 12m-20-7 3 7" fill="none" stroke="#3e5a6b" stroke-width="2" stroke-linecap="round"/>
  <path d="M82 78c24-13 51-11 77-2l29 29-12 26-29 19-37-8-29-27Z" fill="url(#mx-tr-stone)" stroke="#2f475a" stroke-width="3.5" stroke-linejoin="round"/>
  <path d="m98 91 27-8 26 11 21 22-25 14-32-8-21-17Z" fill="#a9bdc0"/>
  <path d="m113 113 18 12 27-4-9 20-30-4Z" fill="#526c7b"/>
  <!-- A woven ochre work wrap crosses one shoulder, leaving the stony torso legible. -->
  <path d="m91 79 15-2 10 28 48 14-8 15-54-23Z" fill="url(#mx-tr-cloth)" stroke="#735637" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="m98 80 12 28 49 17" fill="none" stroke="#ffe0a0" stroke-width="2.2"/>
  <path d="m104 130 43 8 26-13 7 28-22 7-12-9-8 12-18-5-13-14Z" fill="url(#mx-tr-cloth)" stroke="#735637" stroke-width="2.6" stroke-linejoin="round"/>
  <path d="m114 135 5 19m11-16 4 14m14-9-1 8m18-16 4 16" fill="none" stroke="#936739" stroke-width="2"/>
  <path d="m100 126 14 0 6 11-14 6-10-8Z" fill="#dde0c4" stroke="#60726c" stroke-width="2"/>
  <path d="m105 131 7 1 1 5-7 1Z" fill="#57737b"/>
  <!-- The near arm has broad flattened knuckles and three long stone fingers. -->
  <path d="M86 80c-15-1-27 8-25 24l8 27-22 15-4 18 7 9 19-1 20-20 8-23 5-27Z" fill="url(#mx-tr-stone)" stroke="#2f475a" stroke-width="3.5" stroke-linejoin="round"/>
  <path d="m78 88-10 14 11 32-24 20 1 14 12-4 16-18 9-28-3-23Z" fill="#acc0c1"/>
  <path d="m78 116 14 4-2 14-9 4-6-9Z" fill="#647e8c" stroke="#405d70" stroke-width="1.8"/>
  <path d="m51 154 1 15m7-19 1 18m8-24 1 19" fill="none" stroke="#3d596b" stroke-width="2.2" stroke-linecap="round"/>
  <path d="m45 158 6-2m9-7 6-3m145-31 5 3" fill="none" stroke="#d5ded5" stroke-width="2.2" stroke-linecap="round"/>
  <!-- Tall narrow face, flat stone ears, closed mouth: no tusks, club, or belly. -->
  <path d="m112 47-18-8-9 9 12 20 16-1m48-20 20-6 8 10-15 18-15-2" fill="#90a6ad" stroke="#354f61" stroke-width="2.8" stroke-linejoin="round"/>
  <path d="m96 48 10 8-5 6m74-13-11 10 5 4" fill="none" stroke="#546f7e" stroke-width="2.4"/>
  <path d="M107 31c10-9 36-13 50-4l14 21-6 33-19 20-28-6-14-23Z" fill="url(#mx-tr-stone)" stroke="#2f475a" stroke-width="3.5" stroke-linejoin="round"/>
  <path d="m117 42 16-10 19 4 10 19-9 6 3 20-15 14-18-6-9-19Z" fill="#adbec0"/>
  <path d="m132 47 8-3 6 25-9 8-10-5 5-9Z" fill="#d0d6cd" stroke="#5e7a86" stroke-width="2" stroke-linejoin="round"/>
  <path d="m112 52 13-4 5 7-7 9-10-4Zm35-1 11-3 5 8-7 7-9-3Z" fill="#304b5c"/>
  <path d="m115 55 8-3 3 4-5 5-6-3Zm34-1 7-2 3 4-5 4-5-2Z" fill="#f4ce7b"/>
  <path d="m120 54 1 6m32-6 0 5" stroke="#605133" stroke-width="2"/>
  <path d="m110 49 14-6 7 3m15 0 13-4 5 5" fill="none" stroke="#d0d8ce" stroke-width="4" stroke-linecap="round"/>
  <path d="m122 81 10 3 15-4" fill="none" stroke="#405b6a" stroke-width="2.2" stroke-linecap="round"/>
  <path d="m131 89 12-1m-29-18 6 3m35-5 5-2" fill="none" stroke="#d9ded0" stroke-width="2" stroke-linecap="round"/>
  <!-- A low slate crest with growing moss breaks the head and shoulder outlines. -->
  <path d="m105 36 2-18 15 7 10-14 14 8 12-2 7 21-16-9-15 7-13-4Z" fill="#60798a" stroke="#354f61" stroke-width="2.8" stroke-linejoin="round"/>
  <path d="m111 23 12 8 10-14 3 13 12-5 9 8" fill="none" stroke="#a9bec0" stroke-width="2"/>
  <path d="m104 35 12-5 8 5 9-3 9 5-11 6-12-4-10 3Z" fill="url(#mx-tr-moss)" stroke="#65734f" stroke-width="1.6"/>
  <path d="m176 70 10-7 7 5 10-2 9 8-9 5-12-4-9 4Z" fill="url(#mx-tr-moss)" stroke="#65734f" stroke-width="1.6"/>
  <path d="m81 85 9-5 8 5-1 9-11-1Z" fill="url(#mx-tr-moss)" stroke="#65734f" stroke-width="1.5"/>
  <path d="m148 113 6-8 8 2m-38 41 4 7m55-54 5 4m-19 81 5-1" fill="none" stroke="#b4c5c1" stroke-width="2" stroke-linecap="round"/>
`;

const BANSHEE_ARTWORK = `
  <defs>
    <linearGradient id="mx-ba-veil" x1="0" y1="0" x2=".6" y2="1"><stop stop-color="#a8cbd8"/><stop offset=".44" stop-color="#5c829f"/><stop offset="1" stop-color="#304365"/></linearGradient>
    <linearGradient id="mx-ba-mist" x1="0" y1="0" x2=".65" y2="1"><stop stop-color="#fff5de"/><stop offset=".48" stop-color="#cadfe0"/><stop offset="1" stop-color="#769dae"/></linearGradient>
    <linearGradient id="mx-ba-hair" x1="0" y1="0" x2=".5" y2="1"><stop stop-color="#40456d"/><stop offset="1" stop-color="#1e334e"/></linearGradient>
    <linearGradient id="mx-ba-tear" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#edbfc8"/><stop offset="1" stop-color="#b486a9"/></linearGradient>
  </defs>
  <ellipse cx="146" cy="192" rx="93" ry="8" fill="#30405b20"/>
  <!-- Separate wind-carried veil ends surround a narrow, hovering silhouette. -->
  <path d="M131 45c-25-24-64-9-70 15-4 15 7 22-7 34-19 15-31 34-20 52-1-17 17-23 30-31 26-15 14-34 24-42 9-8 22-1 32-3Z" fill="url(#mx-ba-veil)" stroke="#334b68" stroke-width="3" stroke-linejoin="round"/>
  <path d="M121 44c-23-16-45-5-49 12-4 14 3 22-5 37-7 12-20 16-25 28 12-11 24-12 31-24 10-17 2-27 8-39 6-11 22-11 40-14Z" fill="#9bbdc8"/>
  <path d="M151 28c28-20 60-4 61 20 1 28 41 25 42 50 2 22-20 28-8 49-30-14-24-31-13-43 15-15-20-19-30-30-14-13-8-27-22-27l-17 13Z" fill="url(#mx-ba-hair)" stroke="#2f425f" stroke-width="3"/>
  <path d="M179 33c31-4 16 29 44 42 16 8 26 16 20 31" fill="none" stroke="#9abfcf" stroke-width="3" stroke-linecap="round"/>
  <path d="M199 80c28 12 8 29 26 43 14 12 10 28-3 39 6-20-18-24-22-39-4-13 9-21-1-43Z" fill="#7189ae" stroke="#3b5274" stroke-width="2.5"/>
  <!-- The lower robe curls back into itself, with no feet or opaque backdrop. -->
  <path d="M107 90c20-17 45-11 59 8l3 27 24 30 29 6-14 13-34-3 3 14 28 9-24 8-35-10-8-18-13 10-20-1 5-13-26 11-23-3 28-24-1-33Z" fill="url(#mx-ba-veil)" stroke="#344866" stroke-width="3.3" stroke-linejoin="round"/>
  <path d="M121 97c-5 28-23 53-15 64 5 7 25 4 36-8-6 21 1 34 26 42-29-3-39-16-35-29-16 14-39 19-46 10 24-17 7-35 19-56Z" fill="url(#mx-ba-mist)"/>
  <path d="M145 99c20 28 10 45 27 56l29 12-31-6c-21-9-11-35-26-43Z" fill="#adc7d0"/>
  <path d="M123 138c-13 23-1 31 5 30m28-28c-2 22 8 29 17 29m-70-25-9 17" fill="none" stroke="#465b7b" stroke-width="2.3" stroke-linecap="round"/>
  <path d="M164 184c12 11 25 10 32 10m-81-19 11-7m-20 12-8 0" fill="none" stroke="#bdd9da" stroke-width="2.1" stroke-linecap="round"/>
  <!-- An open reaching sleeve and one cupped hand make a quiet lamenting gesture. -->
  <path d="M109 92 90 84 75 65 61 70l13 38 32 20 18-16Z" fill="url(#mx-ba-veil)" stroke="#344866" stroke-width="3" stroke-linejoin="round"/>
  <path d="m71 74 9 25 23 17-9-20-14-18Z" fill="#bdd2d4"/>
  <path d="m103 101-4 27-15 6 9-19-10-3Z" fill="#415b7b" stroke="#344866" stroke-width="2.1"/>
  <path d="m62 73-9-10-3-14 4-2 6 13 1-23 5 0 2 21 7-18 4 2-5 23 6-6 5 3-8 12-6 2Z" fill="url(#mx-ba-mist)" stroke="#4c6980" stroke-width="2.2" stroke-linejoin="round"/>
  <path d="m60 61 5 6 8-1m-7-12 1 7" fill="none" stroke="#839cab" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M158 91c17-4 26 4 28 21l-12 21-27-6 4-16 17 4-2-14Z" fill="url(#mx-ba-veil)" stroke="#344866" stroke-width="3"/>
  <path d="m169 100 8 12-8 13-14-3 4-8 10 3Z" fill="#b9d3d5"/>
  <path d="m151 113-7-6-1-14 4-6 4 3-1 9 6 2 2-13 4 0 3 12-5 14Z" fill="url(#mx-ba-mist)" stroke="#4c6980" stroke-width="2" stroke-linejoin="round"/>
  <path d="m150 101 6 5 5-5" fill="none" stroke="#8b9cae" stroke-width="1.6"/>
  <!-- An ivory teardrop face sits inside an asymmetric, high looping veil. -->
  <path d="M100 68c-13-25 2-49 26-54 27-6 50 11 52 33l-9 51-12 21-3-36-18 12-23-8-13 24-5-20Z" fill="url(#mx-ba-hair)" stroke="#2f425f" stroke-width="3.2" stroke-linejoin="round"/>
  <path d="M101 61c1-32 35-49 58-32l11 20-16-10-14-13-21 10-10 29Z" fill="#91b6c8"/>
  <path d="M117 42c5-10 27-13 37-2l5 25-7 19-16 12-17-13-8-21Z" fill="url(#mx-ba-mist)" stroke="#4e6382" stroke-width="2.5"/>
  <path d="m145 39 7 19-4 22-12 12 16-8 7-19-5-23Z" fill="#a9c2cf"/>
  <path d="m119 56 10-4 5 6-8 7-8-3Zm21 0 9-4 6 5-4 7-9-2Z" fill="#33445f"/>
  <path d="m122 57 6-2 3 3-6 4-4-2Zm20 0 6-2 4 3-3 3-6-1Z" fill="#d6ecda"/>
  <path d="m117 52 11-4 7 4m5-1 9-3 5 3" fill="none" stroke="#6e7c99" stroke-width="2.4" stroke-linecap="round"/>
  <path d="m125 64-3 16-5-7 3-10Zm20-1 2 14 4-5-2-9Z" fill="url(#mx-ba-tear)"/>
  <path d="m136 62-3 11 5 2" fill="none" stroke="#91a4b3" stroke-width="1.6" stroke-linecap="round"/>
  <path d="M133 81c1-4 5-4 6 0l-1 5-3 1Z" fill="#57607e"/>
  <path d="M129 25c-13 20-21 32-16 55l-8 24c1-17-13-30-8-48 5-19 18-30 32-31Z" fill="url(#mx-ba-hair)" stroke="#344a69" stroke-width="2.4"/>
  <path d="M127 29c-14 16-24 36-20 52" fill="none" stroke="#a2c0d0" stroke-width="2.4" stroke-linecap="round"/>
  <path d="M144 24c-4 18 4 24 16 33 15 11 7 31 19 40-6-20 11-34-8-49-12-8-17-15-17-20Z" fill="url(#mx-ba-hair)" stroke="#344a69" stroke-width="2.4"/>
  <path d="M149 30c-1 15 17 17 22 29 5 9 0 17 4 25" fill="none" stroke="#a0bdce" stroke-width="2.6" stroke-linecap="round"/>
  <path d="m127 98 11 7 8-8 5 10-13 13-16-13Z" fill="#d3dddd" stroke="#536e88" stroke-width="2"/>
  <path d="m134 109 5-3 5 3-2 9-5 3-4-6Z" fill="url(#mx-ba-tear)" stroke="#6b6c8b" stroke-width="1.6"/>
  <!-- Detached droplets belong to the lament, with ample transparent breathing room. -->
  <path d="M44 114c1 5 5 8 5 12 0 7-9 7-9 1 0-4 3-7 4-13Z" fill="#a8c6cf" opacity=".8"/>
  <path d="M212 147c1 5 5 8 5 12 0 6-8 6-8 0 0-3 2-7 3-12Z" fill="#a8c6cf" opacity=".8"/>
  <path d="M64 152c-7 6-9 13-5 19m160 3c9 1 15-3 17-9" fill="none" stroke="#8cb0c2" stroke-width="2.3" stroke-linecap="round" opacity=".8"/>
`;

const QUETZALCOATL_ARTWORK = `
  <defs>
    <linearGradient id="mx-qu-body" x1="0" y1="0" x2=".5" y2="1"><stop stop-color="#dbbc65"/><stop offset=".42" stop-color="#9d964b"/><stop offset="1" stop-color="#426552"/></linearGradient>
    <linearGradient id="mx-qu-feather" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#a2e2ba"/><stop offset=".35" stop-color="#45ae9d"/><stop offset=".7" stop-color="#237f89"/><stop offset="1" stop-color="#1c506f"/></linearGradient>
    <linearGradient id="mx-qu-belly" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#ffedaf"/><stop offset="1" stop-color="#c7954e"/></linearGradient>
    <linearGradient id="mx-qu-coral" x1="0" y1="0" x2=".6" y2="1"><stop stop-color="#f3ac83"/><stop offset="1" stop-color="#b35c53"/></linearGradient>
  </defs>
  <ellipse cx="146" cy="193" rx="108" ry="8" fill="#284d4427"/>
  <!-- Two feather fans grow from the back of a limbless serpentine body. -->
  <g fill="url(#mx-qu-feather)" stroke="#285e64" stroke-width="2.5" stroke-linejoin="round">
    <path d="M125 118C93 102 50 77 39 42c25 6 45 31 53 43L65 23c31 11 46 42 49 60L104 14c25 17 35 54 33 76l14-39c12 33 4 54-9 71Z"/>
    <path d="M144 119c14-47 51-88 94-92-13 22-38 34-53 51l65-31c-6 21-34 39-51 46l63-10c-11 23-41 31-66 32l49 10c-22 17-66 12-91 8Z"/>
  </g>
  <path d="m45 48 82 70M70 30l58 82M108 23l25 83m-43-17 8 13m139-67-83 88m86-68-74 65m86-29-79 32m57 1-63 5" fill="none" stroke="#bfedc1" stroke-width="2.2" stroke-linecap="round"/>
  <path d="m57 66 8 17m15-28 4 20m28-30-2 17m108-11 3-12m-24 36 18-7m-8 35 20-1" fill="none" stroke="#236970" stroke-width="2" stroke-linecap="round"/>
  <g fill="#d7e9b7" stroke="#337a75" stroke-width="1.6">
    <path d="m101 93-16-9 9 15 20 14Z"/><path d="m116 90-11-14 3 20 17 18Z"/>
    <path d="m131 90-1-19-8 17 11 29Z"/><path d="m161 96 13-18-2 21-21 20Z"/>
    <path d="m177 105 24-12-11 17-32 15Z"/><path d="m181 118 27-1-17 10-32 4Z"/>
  </g>
  <!-- A long tail spills out of the low coil into three broad, curling plumes. -->
  <path d="M188 154c32 0 50-14 58-35 6 28-1 47-36 51Z" fill="url(#mx-qu-body)" stroke="#3b5c4d" stroke-width="3"/>
  <path d="M212 165c31-17 35-44 46-49-7 27 11 53-11 66-16 10-37 6-43-2Z" fill="url(#mx-qu-feather)" stroke="#285e64" stroke-width="2.6"/>
  <path d="M205 176c34 5 47-13 61-8-17 7-18 28-40 29-15 1-28-6-32-12Z" fill="url(#mx-qu-feather)" stroke="#285e64" stroke-width="2.6"/>
  <path d="M183 183c17 5 33 14 48 13-23 13-51 7-59-5Z" fill="#49a792" stroke="#285e64" stroke-width="2.6"/>
  <path d="M215 175c24 2 37-20 37-42m-46 52c28 8 37-7 50-13m-70 18 33 8" fill="none" stroke="#b2e0b5" stroke-width="2" stroke-linecap="round"/>
  <!-- The exposed belly follows a single asymmetric open coil. -->
  <path d="M106 94c-19 10-39 27-45 47-13 44 38 58 91 48 35-7 64-20 65-40 1-20-29-28-54-23l-7 23c22-5 36-2 34 5-3 12-47 24-76 17-25-6-26-21-9-34l21-14Z" fill="url(#mx-qu-body)" stroke="#365749" stroke-width="3.8" stroke-linejoin="round"/>
  <path d="M73 151c2 31 59 33 105 14 14-5 20-12 19-18 17 15-13 31-48 36-42 9-72-1-76-16Z" fill="url(#mx-qu-belly)"/>
  <path d="m79 167-3 7m14-1-1 10m14-8 0 11m14-9 2 11m13-12 3 12m12-15 4 11m10-17 5 11m8-16 7 9m4-16 9 7" fill="none" stroke="#947a49" stroke-width="1.7"/>
  <path d="M164 129c-7-11-25-15-34-25-12-14-5-28 1-40l-28-12c-16 21-22 44-5 61 17 18 46 20 61 36Z" fill="url(#mx-qu-body)" stroke="#365749" stroke-width="3.5"/>
  <path d="M111 68c-12 21-7 35 13 47 13 8 27 11 35 21l-1 11c-14-15-42-21-51-34-10-14-11-26-6-37Z" fill="url(#mx-qu-belly)"/>
  <path d="m102 83 13 3m-14 9 15-1m-11 13 14-6m-6 16 12-9m-2 16 10-10m2 15 8-10m3 14 6-9" fill="none" stroke="#968450" stroke-width="1.7"/>
  <!-- Overlapping short feathers make a shoulder ruff, with no costume or emblem. -->
  <g fill="url(#mx-qu-feather)" stroke="#2b6b6c" stroke-width="1.8" stroke-linejoin="round">
    <path d="m121 87 22-15-6 19-14 10Z"/><path d="m127 100 26-11-12 18-16 5Z"/>
    <path d="m139 111 24-4-13 14-17 0Z"/><path d="m153 119 24 2-17 9-15-3Z"/>
    <path d="m82 125-16-8 8 20 9 5Z"/><path d="m71 144-18-3 10 17 10 1Z"/>
    <path d="m91 180-16 4 19 10 10-4Z"/><path d="m116 185-12 11 20 3 10-10Z"/>
  </g>
  <path d="m132 87-4 7m15 6-10 5m19 9-11 3m-69 14 7 5m-13 14 5 3" fill="none" stroke="#d6e9b6" stroke-width="1.6" stroke-linecap="round"/>
  <!-- Narrow serpent snout and a soft curved crest are anatomical, without jewelry. -->
  <path d="M115 46c-4-12 2-27 16-35-2 13 10 19 8 33l-9 15Z" fill="url(#mx-qu-coral)" stroke="#79594b" stroke-width="2.4"/>
  <path d="M136 48c9-18 29-22 40-18-15 7-14 25-30 31Z" fill="url(#mx-qu-feather)" stroke="#2b6666" stroke-width="2.4"/>
  <path d="M111 45c9-7 29-3 37 8l-4 20-19 12-23 0-14-6-28-4-9-12 4-14 25-5 15-8Z" fill="url(#mx-qu-body)" stroke="#365749" stroke-width="3.2" stroke-linejoin="round"/>
  <path d="m55 62 22 6 25 1 27-7-9 15-22 9-28-5-16-8Z" fill="url(#mx-qu-belly)" stroke="#6a6946" stroke-width="2"/>
  <path d="m91 44 20-3 16 9-8 7-16-6-13 4Z" fill="#e8cf80"/>
  <path d="m96 55 14-6 13 8-10 10-15-2Z" fill="#294e4a"/>
  <path d="m100 56 10-3 8 4-6 6-11-1Z" fill="#faeeb0"/><path d="m109 53 1 9" stroke="#5a5c3f" stroke-width="2.4"/>
  <path d="m92 51 17-8 17 9" fill="none" stroke="#b96d51" stroke-width="3.2" stroke-linecap="round"/>
  <path d="m58 53 15-4 8 7-9 5-15-2Z" fill="#bdba68"/><path d="m63 53 5 1" stroke="#4c6a4c" stroke-width="2.3" stroke-linecap="round"/>
  <path d="m64 71 18 4 20-2" fill="none" stroke="#795e42" stroke-width="2" stroke-linecap="round"/>
  <path d="m81 75 4 6 3-6m12-2 3 5 4-8" fill="#fff0c0"/>
  <path d="m133 54 15-6 9 5-12 12-13 3m0 5 15-5 5 5-13 11-11-1" fill="url(#mx-qu-feather)" stroke="#2b6666" stroke-width="2" stroke-linejoin="round"/>
  <path d="m121 26 7 18m29-8-13 14m-7 11 10-5m-14 23 10-5" fill="none" stroke="#e2eac0" stroke-width="1.8" stroke-linecap="round"/>
  <g fill="#e4cc7e" stroke="#737b4f" stroke-width="1.2"><path d="m89 129 7-4 5 6-7 4Z"/><path d="m80 144 6-4 5 6-7 4Z"/><path d="m100 161 7-4 6 4-7 4Z"/><path d="m133 165 7-5 6 3-6 5Z"/><path d="m172 137 7-4 6 4-7 3Z"/></g>
`;

const IFRIT_ARTWORK = `
  <defs>
    <linearGradient id="mx-if-fire" x1="0" y1="0" x2=".4" y2="1"><stop stop-color="#ffe7a0"/><stop offset=".34" stop-color="#f6a13f"/><stop offset=".72" stop-color="#dc5438"/><stop offset="1" stop-color="#9d3440"/></linearGradient>
    <linearGradient id="mx-if-coal" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#725669"/><stop offset=".5" stop-color="#41394e"/><stop offset="1" stop-color="#242d40"/></linearGradient>
    <linearGradient id="mx-if-hot" x1="0" y1="0" x2=".6" y2="1"><stop stop-color="#fff9c5"/><stop offset="1" stop-color="#ffbd60"/></linearGradient>
  </defs>
  <ellipse cx="146" cy="194" rx="99" ry="9" fill="#663d4430"/>
  <!-- The spirit rises from a crooked corkscrew of fire rather than standing on legs. -->
  <path d="M116 128c-23 17-25 34-9 45-22-5-41 3-41 14 1 15 35 18 48 8-16 0-30-3-25-7 8-8 28 1 43 5 35 12 72-2 69-25-1-9-7-15-5-26-23 10-19 24-28 27-12 3-21-4-15-11l17-18Z" fill="url(#mx-if-fire)" stroke="#713b42" stroke-width="3" stroke-linejoin="round"/>
  <path d="M137 139c-23 17-16 32 9 35 20 2 33-7 41-18-4 27-42 31-62 14-10-9-9-19 2-33Z" fill="url(#mx-if-hot)"/>
  <path d="M111 182c22 1 44 16 66 0-12 19-33 12-47 9Z" fill="#ffd885"/>
  <path d="M98 172c-19-5-20-21-10-33-1 15 20 16 10 33Z" fill="#ed8046" stroke="#874543" stroke-width="2.2"/>
  <path d="M194 179c24-3 35-19 30-33 15 16 2 38-27 42Z" fill="#e77543" stroke="#874543" stroke-width="2.2"/>
  <path d="m87 151 7 9m114 12 9-12m-83 20 10 3" fill="none" stroke="#ffda87" stroke-width="2.3" stroke-linecap="round"/>
  <!-- Ragged flame shoulders surround a compact, faceted basalt torso. -->
  <path d="M85 107c-19-16-24-40-15-57 4 17 19 15 20 33 3-22 20-26 15-47 22 19 2 43 17 54l43-4c17-18 11-32 27-44-3 22 15 32 9 53 8-6 13-15 12-24 21 21 8 44-10 55Z" fill="url(#mx-if-fire)" stroke="#7a4044" stroke-width="3" stroke-linejoin="round"/>
  <path d="M83 100c-7-14-10-22-8-31 7 12 12 21 8 31Zm103-12c9-10 3-18 7-25 0 18 14 21 7 35Z" fill="url(#mx-if-hot)"/>
  <path d="m98 82 27 0 22 6 21-5 28 19-10 28-26 19-40-2-28-21-5-26Z" fill="url(#mx-if-coal)" stroke="#352e43" stroke-width="3.5" stroke-linejoin="round"/>
  <path d="m101 92 22-5 11 16-11 15-24-7Zm44 11 25-14 16 15-9 17-27-2Z" fill="#785a68"/>
  <path d="m120 123 14-9 13 11 15-4 12 8-14 16-34-3Z" fill="#574354"/>
  <path d="m124 87 11 16-11 20 11 14-2 9m35-59-24 20 6 17 11 5m-68-21 17 9-2 15" fill="none" stroke="#f59150" stroke-width="2.6" stroke-linejoin="round"/>
  <path d="m135 103 4 6-3 14m10-17 4-3m-27 26 4 5m30-1 5 1" fill="none" stroke="#ffe6a3" stroke-width="1.6" stroke-linecap="round"/>
  <!-- One open palm offers a separate ember; the other arm curls a heavy stone fist. -->
  <path d="M95 87c-12-7-28 0-30 15l-3 21-19-2-7 16 19 11 27-9 14-22 9-16Z" fill="url(#mx-if-coal)" stroke="#352e43" stroke-width="3.2" stroke-linejoin="round"/>
  <path d="m77 98-5 27-18 8-11-7-3 10 15 6 21-9 15-28Z" fill="#856271"/>
  <path d="m69 111 10 3 8-9m-33 28 6 7 13-6" fill="none" stroke="#f29356" stroke-width="2.4" stroke-linejoin="round"/>
  <path d="m37 124-7-7-1-10 5-2 5 13 4 4 2-14 5-1 1 17 6-11 5 1-4 19-12 7-13-4Z" fill="url(#mx-if-coal)" stroke="#352e43" stroke-width="2.4" stroke-linejoin="round"/>
  <path d="m34 118 6 7 8 2 6-3m-15 7 10 3" fill="none" stroke="#ffa75e" stroke-width="1.9" stroke-linecap="round"/>
  <path d="M184 95c9-6 23-3 28 10l4 20 18 11-2 21-17 10-22-13-8-26-9-19Z" fill="url(#mx-if-coal)" stroke="#352e43" stroke-width="3.3" stroke-linejoin="round"/>
  <path d="m198 104 8 21 13 13 8 3-4 15-10 5-11-10-4-24-10-16Z" fill="#775969"/>
  <path d="m196 117 10 8-2 10 12 8m-16 8 10-5 14 6" fill="none" stroke="#f09154" stroke-width="2.4" stroke-linejoin="round"/>
  <path d="m210 133 9 0 13 9-3 15-13 7-11-9-2-14Z" fill="#514051" stroke="#352e43" stroke-width="2.3"/>
  <path d="m211 136 1 10 8 9m-1-18 1 8 8 5m-17 6 6 3" fill="none" stroke="#f8a260" stroke-width="1.8" stroke-linecap="round"/>
  <!-- The face is a split basalt lantern inside a wind-swept flame crown. -->
  <path d="M111 83c-27-22-14-41-14-54 8 11 16 8 17 17 1-19 25-23 20-39 19 9 5 32 18 37 7-16 25-13 24-28 20 25-12 33-4 47 17-3 20-13 20-13 7 19-11 37-32 45Z" fill="url(#mx-if-fire)" stroke="#864244" stroke-width="3" stroke-linejoin="round"/>
  <path d="M121 52c-9-10 14-25 15-35 6 19-13 19-6 35m26 2c-1-8 10-15 18-21-4 12-14 19-11 28" fill="url(#mx-if-hot)"/>
  <path d="m115 48 20-8 21 10 11 23-8 19-20 10-22-13-9-21Z" fill="url(#mx-if-coal)" stroke="#352e43" stroke-width="3" stroke-linejoin="round"/>
  <path d="m120 50 14-5 4 17-11 8-14-2Zm26 3 9 1 7 15-14 1-7-8Z" fill="#936e79"/>
  <path d="m116 67 16-3 5 9-13 5-7-4Zm26 6 6-9 13 5-4 9-11 0Z" fill="#241e33"/>
  <path d="m119 69 12-2 3 5-10 3-5-2Zm26 3 5-5 8 4-3 4-8 0Z" fill="#fff0ad"/>
  <path d="m129 67-2 7m24-5-1 6" stroke="#ed904b" stroke-width="2.1"/>
  <path d="m135 45 4 14-3 18 6 7-3 15" fill="none" stroke="#fca358" stroke-width="2.8" stroke-linejoin="round"/>
  <path d="m139 62-2 13 5 8" fill="none" stroke="#fff2b5" stroke-width="1.4"/>
  <path d="m123 85 12 3 12-4 7 1-12 8-9 0Z" fill="#ee914f" stroke="#704452" stroke-width="1.4"/>
  <path d="m117 59 12-3m19 2 8 4" fill="none" stroke="#d2938a" stroke-width="2.5" stroke-linecap="round"/>
  <!-- Small ember flakes support the flame silhouette without animation or a glow card. -->
  <path d="M44 67c-6 8-13 13-12 23 2 13 20 13 25 3 6-13-10-15-9-30l-4 13Z" fill="url(#mx-if-fire)" stroke="#9e4b42" stroke-width="2.2"/>
  <path d="M44 81c-5 6-8 10-4 14 5 5 11-2 8-7l-4-7Z" fill="url(#mx-if-hot)"/>
  <path d="m79 35-6-7 1-9 7 8Z" fill="#f9b360" stroke="#a35b48" stroke-width="1.5"/>
  <path d="m204 58 4-12 7-4-1 10Z" fill="#f8a85c" stroke="#a35b48" stroke-width="1.5"/>
  <path d="m241 110-2-9 5-7 3 10Z" fill="#ed8551" stroke="#a35b48" stroke-width="1.5"/>
  <path d="m69 176-7-5 0-7 7 6Z" fill="#f3ad65"/>
  <path d="m180 195 9-5 6 2-9 6Z" fill="#ffd18a"/>
`;

function svg(artwork: string, viewBox: string, width: number, height: number) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBox}" fill="none">${artwork}</svg>`;
}
const url = (source: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;
function character(artwork: string, crop: string, spriteWidth: number) {
  const full = svg(artwork, '0 0 280 210', 280, 210);
  const portrait = svg(artwork, crop, 140, 140);
  return { full, portrait, artUrl: url(full), portraitUrl: url(portrait), spriteWidth };
}

/** These existing IDs retain their names, family assignments, stats, and gameplay. */
export const MIXED_ORIGINAL_ART = {
  1: character(TROLL_ARTWORK, '74 6 139 139', 109),
  4: character(BANSHEE_ARTWORK, '79 7 120 120', 115),
  5: character(QUETZALCOATL_ARTWORK, '43 5 151 151', 124),
  8: character(IFRIT_ARTWORK, '87 3 116 116', 112),
} as const;
