/**
 * Original code-native dragon drawings, authored as SVG paths for this project.
 * No reference image, downloaded asset, font, logo, audio, or model is embedded.
 * Full figures and portraits deliberately reuse the same authored geometry.
 */
const VRITRA_ARTWORK = `
  <defs>
    <linearGradient id="vr-body" x1="0" y1="0" x2=".5" y2="1"><stop stop-color="#7275b2"/><stop offset=".45" stop-color="#383d78"/><stop offset="1" stop-color="#20274e"/></linearGradient>
    <linearGradient id="vr-copper" x1="0" y1="0" x2=".5" y2="1"><stop stop-color="#f2c18b"/><stop offset=".48" stop-color="#c28054"/><stop offset="1" stop-color="#7c493b"/></linearGradient>
    <linearGradient id="vr-belly" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#cbb6bc"/><stop offset="1" stop-color="#79779c"/></linearGradient>
  </defs>
  <ellipse cx="151" cy="192" rx="112" ry="11" fill="#25284029"/>
  <!-- Broad asymmetric double coil, no limbs or wings. -->
  <path d="M197 143c33 3 56-8 59-24 12 26-7 49-36 47l-28-5Z" fill="url(#vr-copper)" stroke="#272443" stroke-width="3"/>
  <path d="M223 161c32 21 13 40-61 39-76 0-122-21-116-45 5-21 39-38 77-34l10 22c-30-1-55 5-56 15-1 15 55 24 90 22 25-1 33-5 30-12Z" fill="url(#vr-body)" stroke="#252440" stroke-width="4"/>
  <path d="M54 158c15 29 119 34 161 20-18 25-125 25-158 4Z" fill="#7979a0"/>
  <path d="M79 149c12 12 47 17 75 14 34-4 53-17 49-31-4-17-21-21-41-26l10-27c45 7 69 30 66 55-4 35-61 53-106 43-28-5-48-11-53-28Z" fill="url(#vr-body)" stroke="#252440" stroke-width="4"/>
  <path d="M175 99c35 7 54 24 41 41-16 21-57 29-92 22 39 17 100-1 104-29 2-17-23-38-49-42Z" fill="url(#vr-belly)"/>
  <!-- Flat copper scutes break the coil into a dry, plated silhouette. -->
  <g fill="url(#vr-copper)" stroke="#684536" stroke-width="1.7" stroke-linejoin="round">
    <path d="m93 133-14-3-9 8 15 7 15-2Z"/><path d="m61 159-9-1 5 15 13 4-3-10Z"/>
    <path d="m79 180-1 10 15 5 1-10Z"/><path d="m111 186-1 12 16 2 1-11Z"/>
    <path d="m147 189 1 11 17-1-1-11Z"/><path d="m184 186 3 11 17-4-6-10Z"/>
    <path d="m218 172 10 7-8 13-11-8Z"/><path d="m228 139 12 0-4 14-11-4Z"/>
    <path d="m218 115 8-7 11 13-10 5Z"/><path d="m195 100 5-11 14 9-6 9Z"/>
  </g>
  <!-- Upright S neck exposes a pale articulated throat. -->
  <path d="M159 151c-29-9-38-21-37-37 1-15 13-19 10-35-2-15-19-18-22-34l-36-2c-9 26 26 32 25 48-2 19-29 29-21 50 10 27 46 36 81 29Z" fill="url(#vr-body)" stroke="#252440" stroke-width="4" stroke-linejoin="round"/>
  <path d="M91 65c17 10 26 19 19 37-9 19-19 30-5 43 11 11 29 16 47 18-31-14-37-22-33-35 3-13 19-29 13-47-4-11-13-17-22-22Z" fill="url(#vr-belly)"/>
  <g fill="none" stroke="#464766" stroke-width="2"><path d="m101 78 22 2m-14 12 23 0m-27 10 22 6m-29 8 22 6m-21 5 19 4m-14 7 16 0m-4 10 15-4m-1 11 13-7"/></g>
  <!-- Five unlit storm chambers are anatomy; live charge is a separate overlay. -->
  <g fill="#303559" stroke="#bf875f" stroke-width="2.5">
    <path d="m134 77 8-11 11 3 5 12-9 9-12-3Z"/><path d="m146 97 12-7 10 7-1 12-12 5-9-7Z"/>
    <path d="m145 121 12-6 10 8-1 12-14 3-9-8Z"/><path d="m164 143 10-8 12 3 4 12-10 9-12-4Z"/>
    <path d="m193 151 12-4 9 9-4 11-12 3-9-8Z"/>
  </g>
  <g fill="none" stroke="#8884ad" stroke-width="1.6"><path d="m140 77 7-3 3 7m2 20 7-2 2 8m-11 17 8-1 3 7m-11 18 7-3 4 6m12 9 6-1 2 5"/></g>
  <!-- Low, swept horns and a blunt wedge muzzle, offset from the coil. -->
  <path d="M95 41 84 17l16 7 16 21m0 1 5-23 11 9-4 25" fill="url(#vr-copper)" stroke="#493541" stroke-width="3" stroke-linejoin="round"/>
  <path d="M111 44c-13-12-37-13-50-2L49 54l-20 6-4 17 17 11 28 3 28-9 23-20Z" fill="url(#vr-body)" stroke="#252440" stroke-width="3.5" stroke-linejoin="round"/>
  <path d="m48 72 22 8 26-8-8 15-23 11-27-9-10-10Z" fill="url(#vr-copper)" stroke="#513943" stroke-width="2.3"/>
  <path d="m55 49 18-8 20 6-12 8-20 2Z" fill="#8987bb"/><path d="m59 61 15-7 15 7-11 10-17-2Z" fill="#1d2346"/>
  <path d="m64 61 10-3 9 3-8 5-10-1Z" fill="#f4d694"/><path d="m74 58 1 7" stroke="#514440" stroke-width="2"/>
  <path d="m56 55 18-6 16 7" fill="none" stroke="#c28b67" stroke-width="4" stroke-linecap="round"/>
  <path d="m29 69 10-3 8 5-2 5-15 0Z" fill="#8582a2"/><path d="m34 69 4 1" stroke="#2b2b4a" stroke-width="2.5" stroke-linecap="round"/>
  <path d="m42 82 19 3 19-4m16-18 11-4m-14 13 11-3" fill="none" stroke="#302841" stroke-width="2.2" stroke-linecap="round"/>
  <path d="m60 86 2 7 4-8m13-3 1 7 5-10" fill="#ece0c6"/>
  <path d="m112 51 15-9 8 12-15 10m-15 10 17-2-1 10-16 7" fill="url(#vr-copper)" stroke="#503942" stroke-width="2"/>
`;

const LINDWURM_ARTWORK = `
  <defs>
    <linearGradient id="lw-green" x1="0" y1="0" x2=".4" y2="1"><stop stop-color="#9faf65"/><stop offset=".5" stop-color="#657944"/><stop offset="1" stop-color="#354c37"/></linearGradient>
    <linearGradient id="lw-earth" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#e1c784"/><stop offset="1" stop-color="#aa8551"/></linearGradient>
  </defs>
  <ellipse cx="148" cy="190" rx="110" ry="10" fill="#35452d29"/>
  <!-- A low tail hooks around the body as a protective barrier. -->
  <path d="M153 141c27-12 60 6 67-16 6-17-1-43 17-64-1 30 25 37 17 69-8 37-49 44-95 36Z" fill="url(#lw-green)" stroke="#334234" stroke-width="3.5"/>
  <path d="M175 153c43 8 75-9 72-37-1-10-9-21-11-34 1 25 7 37-3 49-9 12-27 15-48 13Z" fill="url(#lw-earth)"/>
  <path d="m238 77 9 8-4 9 11 6-4 10 10 8-8 8 3 11-12 2-2 12-12-3-8 10-11-5-13 7" fill="none" stroke="#b5ab70" stroke-width="4" stroke-linejoin="round"/>
  <!-- Far and near legs are the only two limbs. -->
  <path d="M158 140c19 1 24 15 13 29l-3 8 25 9 2 8-38 1-18-12 9-20-5-10Z" fill="#49633c" stroke="#334234" stroke-width="3" stroke-linejoin="round"/>
  <path d="m169 184 6 9 7-7 5 8 6-2-3-6Z" fill="#ddd2a8" stroke="#6e714d" stroke-width="1.6"/>
  <path d="M77 89c32 5 39 28 76 26 28-2 42 8 36 30-8 31-59 40-91 14-19-15-26-38-40-49Z" fill="url(#lw-green)" stroke="#334234" stroke-width="3.5"/>
  <path d="M75 110c13 5 27 42 51 47 19 3 39-1 53-11-22 26-55 25-76 4-11-11-17-24-28-40Z" fill="url(#lw-earth)"/>
  <g fill="none" stroke="#897d4a" stroke-width="2"><path d="m88 125 8-5m3 17 10-7m1 19 13-11m2 18 11-12m6 14 7-14m10 10 2-13"/></g>
  <g fill="#b5a56a" stroke="#576543" stroke-width="2" stroke-linejoin="round"><path d="m81 93 5-17 11 26m1 1 13-17 4 24m8 2 14-15 3 21m9-2 12-15 5 19m8-1 11-9 5 17"/></g>
  <path d="M126 134c17-5 34 8 32 24l-15 22 3 9 20 4-1 9-39 0-15-13 8-23-8-13Z" fill="url(#lw-green)" stroke="#334234" stroke-width="3.3" stroke-linejoin="round"/>
  <path d="m127 143 18 0 6 9-15 17-12-8Z" fill="#a5b078" stroke="#617443" stroke-width="2"/>
  <path d="m123 191 8-7 7 16-13 1m14-8 7-4 8 12-14 0m13-7 6-2 6 9-10 0" fill="#eee1b6" stroke="#6d7350" stroke-width="1.5"/>
  <!-- Wide plated brow angles across the sheltered space under the neck. -->
  <path d="M89 88 98 67 93 50 78 61 62 58 40 70 32 87 15 101 22 118 43 124 70 115 94 99Z" fill="url(#lw-green)" stroke="#334234" stroke-width="3.5" stroke-linejoin="round"/>
  <path d="m38 72-4-22 16 9 7 13m16-12 3-23 13 11 0 15" fill="url(#lw-earth)" stroke="#45533b" stroke-width="2.5"/>
  <path d="m26 105 20 7 22-5 18-10-13 17-28 12-23-7-7-12Z" fill="url(#lw-earth)" stroke="#576044" stroke-width="2"/>
  <path d="m39 85 19-9 13 7-8 12-18 2Z" fill="#2e4030"/><path d="m44 85 12-5 9 3-7 7-11 1Z" fill="#f7dd86"/><path d="m54 81 1 8" stroke="#334232" stroke-width="2"/>
  <path d="m36 81 17-13 20 10-3 7-17-6-14 8Z" fill="#b3b37c" stroke="#657446" stroke-width="2"/>
  <path d="m24 99 14-6 9 9-10 6-18-1Z" fill="#86965b"/><circle cx="27" cy="101" r="2" fill="#3b4d33"/>
  <path d="m30 113 17 4 22-9" fill="none" stroke="#536043" stroke-width="2" stroke-linecap="round"/>
  <path d="m45 116 3 6 3-7m11-4 1 6 5-9" fill="#f3e8bf"/>
  <path d="m77 84 11-5 4 8-9 7m-8 6 11-3-2 9-10 4" fill="#8d9a5c" stroke="#4f653e" stroke-width="1.8"/>
  <g fill="none" stroke="#b2bd7b" stroke-width="2" stroke-linecap="round"><path d="m96 117 6 5m8-1 6 5m49 7 7 1m36 8 9-3m21-14 3-7m-77 64-5 8"/></g>
`;

const AMPHISBAENA_ARTWORK = `
  <defs>
    <linearGradient id="am-body" x1="0" y1=".2" x2="1" y2=".8"><stop stop-color="#795692"/><stop offset=".42" stop-color="#594775"/><stop offset=".7" stop-color="#8b8ca8"/><stop offset="1" stop-color="#cbd2dc"/></linearGradient>
    <linearGradient id="am-silver" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#edf0e6"/><stop offset="1" stop-color="#a1aabd"/></linearGradient>
  </defs>
  <ellipse cx="138" cy="190" rx="111" ry="10" fill="#3b35532b"/>
  <!-- One continuous open U, with a low crossing fold; each end is a head. -->
  <path d="M57 85c-16 30-4 52 14 65 21 13 51 1 70 4 14 3 16 12 7 16-21 11-63-4-68-20l-23 11c9 31 74 47 117 32 35-12 21-42-8-54-26-12-60 2-76-11-13-10-4-23 4-36Z" fill="url(#am-body)" stroke="#3b3455" stroke-width="4" stroke-linejoin="round"/>
  <path d="M65 115c-3 18 15 38 43 35 24-4 54-4 61 15 4 8-13 17-33 18 31 1 51-11 42-26-12-19-43-20-66-16-30 4-41-5-47-26Z" fill="#b6adc6"/>
  <path d="M140 179c27 8 56 0 64-20 9-19-15-30-15-46 0-16 18-19 23-28l24 16c-5 11-19 18-15 26 8 19 16 35-1 52-18 20-48 27-77 18Z" fill="url(#am-body)" stroke="#3b3455" stroke-width="4"/>
  <path d="M214 104c-16 12-8 20 0 34 17 28-24 50-64 49 45 13 82-10 74-36-4-13-18-23-10-32l12-12Z" fill="url(#am-silver)"/>
  <g fill="none" stroke="#756b8c" stroke-width="2"><path d="m212 116 10 5m-11 7 15 4m-10 7 14 7m-11 3 11 9m-14 3 10 9m-19-1 6 11m-19-4 3 12m-18-8 1 12m-18-9-1 12"/></g>
  <!-- Alternating lozenges travel in both directions rather than repeated spikes. -->
  <g fill="#bdabd1" stroke="#534669" stroke-width="1.5"><path d="m52 117 9-3 5 9-8 4Z"/><path d="m63 139 10-4 7 8-9 5Z"/><path d="m87 151 10-5 9 7-9 6Z"/><path d="m114 153 9-6 9 6-9 7Z"/><path d="m143 156 10-4 7 7-9 6Z"/><path d="m65 167 9-2 7 8-10 3Z"/><path d="m89 182 10-4 9 6-9 6Z"/></g>
  <g fill="#ecece5" stroke="#8b8a9f" stroke-width="1.3"><path d="m199 124 6-5 6 8-7 4Z"/><path d="m205 147 7-6 5 9-7 5Z"/><path d="m197 169 7-3 1 8-8 3Z"/><path d="m179 180 7-4-1 8-7 3Z"/></g>
  <!-- Purple end: high branching brow, broad rounded jaw, copper eye. -->
  <path d="m67 64-6-20-13-8 1-12 12 9 2-15 9 3-1 23 8 18m0 0 8-23 13-4 3 7-10 9-2 19" fill="#ac92bb" stroke="#4c3b63" stroke-width="2.6" stroke-linejoin="round"/>
  <path d="M85 64c-11-14-33-14-45-2l-9 11-19 7 1 19 14 14 27 4 28-17 13-18Z" fill="#7f5f9b" stroke="#3b3455" stroke-width="3.5"/>
  <path d="m20 93 23 7 33-10-9 16-17 13-25-4-12-15Z" fill="#b7a6c5" stroke="#5b4a70" stroke-width="2"/>
  <path d="m42 75 15-7 14 8-11 12-17-3Z" fill="#3e2d54"/><path d="m46 75 11-3 8 4-7 6-10-2Z" fill="#ecc47d"/><path d="m56 73 1 9" stroke="#4b3852" stroke-width="2"/>
  <path d="m37 68 15-8 23 11" fill="none" stroke="#c8abd9" stroke-width="3" stroke-linecap="round"/>
  <path d="m15 87 15-5 9 8-8 5-16-1Z" fill="#ad94bf"/><circle cx="22" cy="88" r="1.8" fill="#584067"/>
  <path d="m28 106 17 3 21-8m16-26 6-3m-9 13 7-3" fill="none" stroke="#624973" stroke-width="2" stroke-linecap="round"/>
  <!-- Silver end: narrow pointed muzzle and a three-blade swept cheek fan. -->
  <path d="m204 69-19-14 2 18-17 0 15 14-13 7 22 8 17-17Z" fill="#aaafc2" stroke="#5e607e" stroke-width="2.7" stroke-linejoin="round"/>
  <path d="m194 76 14 4m-17 8 15-3m-9 9 13-9" fill="none" stroke="#e1e2df" stroke-width="2"/>
  <path d="M204 70c15-12 30-8 39 5l9 12 17 9-5 17-23 6-27-10-15-14Z" fill="url(#am-silver)" stroke="#555672" stroke-width="3.2" stroke-linejoin="round"/>
  <path d="m236 68 3-20-12 10-7 13m-7 4-7-20-6 8 2 17" fill="#bfc5cf" stroke="#555672" stroke-width="2.5"/>
  <path d="m218 83 11-6 15 10-4 9-16-3Z" fill="#4e486a"/><path d="m223 84 6-3 10 6-1 4-11-4Z" fill="#85c9c5"/><path d="m230 83 0 7" stroke="#3f4c62" stroke-width="2"/>
  <path d="m215 79 12-8 18 12" fill="none" stroke="#eef2e8" stroke-width="3" stroke-linecap="round"/>
  <path d="m262 99-12-5-9 9 5 6 18-2Z" fill="#a4b2c2"/><circle cx="258" cy="101" r="1.8" fill="#526078"/>
  <path d="m218 101 22 9 20-2-8 9-17 1-18-9Z" fill="#dbe0df"/><path d="m226 107 16 6 16-3" fill="none" stroke="#66708b" stroke-width="2" stroke-linecap="round"/>
  <path d="m39 109 2 7 4-7m195 5 5 6 1-5" fill="#fff3d5"/>
`;

const ZILANT_ARTWORK = `
  <defs>
    <linearGradient id="zi-teal" x1="0" y1="0" x2=".6" y2="1"><stop stop-color="#8bc6b4"/><stop offset=".45" stop-color="#3c918c"/><stop offset="1" stop-color="#245b65"/></linearGradient>
    <linearGradient id="zi-wing" x1="0" y1="0" x2=".6" y2="1"><stop stop-color="#f2e4b8"/><stop offset=".5" stop-color="#d1d6b3"/><stop offset="1" stop-color="#83b3a5"/></linearGradient>
    <linearGradient id="zi-water" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#c7f4ed"/><stop offset="1" stop-color="#449cad"/></linearGradient>
  </defs>
  <ellipse cx="151" cy="190" rx="96" ry="9" fill="#294c5124"/>
  <!-- Offset narrow wings: a high sail and a wide, lower fan. -->
  <path d="M134 117c2-30 19-65 44-97l1 30 15-8-4 34 19-9-13 36 18-3-23 28-38 18Z" fill="url(#zi-wing)" stroke="#3b7777" stroke-width="3" stroke-linejoin="round"/>
  <path d="m177 23-23 100 36-49m-36 49 42-21m-42 21 40 0" fill="none" stroke="#669b8e" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M130 123c25-21 69-38 126-44l-15 18 18 9-25 15 14 15-32 1 3 18-37-7-28 1Z" fill="url(#zi-wing)" stroke="#337174" stroke-width="3" stroke-linejoin="round"/>
  <path d="m251 82-107 52 87-17m-86 17 64 4m-64-4 34 12" fill="none" stroke="#73a894" stroke-width="2.4"/>
  <path d="m150 130 35-25 21-11-8 8-41 27m22 10 26-3" fill="none" stroke="#fff0ca" stroke-width="2" stroke-linecap="round"/>
  <!-- A threadlike curled tail and long upright neck make a light silhouette. -->
  <path d="M152 147c17 8 7 37 25 40 19 3 39-5 41-16 8 15-7 27-28 29-30 3-35-14-46-24l-13-19Z" fill="url(#zi-teal)" stroke="#265864" stroke-width="3"/>
  <path d="m151 167 15 20c9 12 32 11 45-1" fill="none" stroke="#b8dbc2" stroke-width="3" stroke-linecap="round"/>
  <path d="M100 76c-11 23 2 35 22 41 18 5 39 15 36 32-4 22-34 30-53 16-20-16-17-33-27-48-7-12-14-32 1-49Z" fill="url(#zi-teal)" stroke="#265864" stroke-width="3.3"/>
  <path d="M86 81c-7 19 6 31 17 38 6 6 6 29 14 40 6 9 22 8 30 0-16 4-22-4-23-15-3-22-24-28-25-45l-3-18Z" fill="#eee3bc"/>
  <g fill="none" stroke="#9bb1a0" stroke-width="1.6"><path d="m89 99 10-3m-6 15 12-6m-3 14 10-6m-7 14 12-5m-8 16 13-4m-9 13 12-4m-7 12 11-6"/></g>
  <!-- Small suspended feet do not form a grounded heavy stance. -->
  <path d="m140 158 8 6-6 16 12 2 5 7-21-1-6-7 1-17Z" fill="url(#zi-teal)" stroke="#265864" stroke-width="2.5"/>
  <path d="m120 163-2 19-16 7-3 6 23-3 8-11 1-16Z" fill="url(#zi-teal)" stroke="#265864" stroke-width="2.5"/>
  <path d="m103 190 6-2-3 6m9-7 5-1-1 6m26-9 6 3-3 3" fill="#f4e7c3" stroke="#7a9b92" stroke-width="1.2"/>
  <!-- Fine swept antenna-horns and a soft, long river-beak face. -->
  <path d="m80 60-6-20 6-11 5 24m7 8 7-26 9-4-8 29" fill="#eee0b7" stroke="#417875" stroke-width="2.4" stroke-linejoin="round"/>
  <path d="M98 60c-8-13-28-12-36-1L47 77l-22 11 0 9 15 7 23-3 27-17 15-14Z" fill="url(#zi-teal)" stroke="#265864" stroke-width="3" stroke-linejoin="round"/>
  <path d="m27 94 16 5 20-3 18-10-10 14-27 10-17-8Z" fill="#eee4c3" stroke="#537f7d" stroke-width="1.8"/>
  <path d="m59 71 11-9 15 4-9 13-13 0Z" fill="#245761"/><path d="m63 71 8-5 9 1-7 9-7-1Z" fill="#d7eca8"/><path d="m71 67 1 8" stroke="#32645d" stroke-width="2"/>
  <path d="m56 65 11-9 18 3" fill="none" stroke="#b4dbc0" stroke-width="3" stroke-linecap="round"/>
  <path d="m31 89 9-3m-1 16 16-1" fill="none" stroke="#4c8786" stroke-width="1.7" stroke-linecap="round"/>
  <path d="m91 73 20-3-11 12-14 1m-3 8 18-3-10 10-12-2" fill="#9ac8b0" stroke="#437d7a" stroke-width="1.8"/>
  <!-- Cupped forelimbs hold an unlettered, open water droplet. -->
  <path d="M120 124c-5-3-11 2-16 12l-13 7 3 7 18-9 13-9Z" fill="url(#zi-teal)" stroke="#306770" stroke-width="2.5"/>
  <path d="M91 130c-11-1-14 8-10 16l12 5 7-5-12-6 9-5Z" fill="url(#zi-teal)" stroke="#306770" stroke-width="2.5"/>
  <path d="M92 113c-3 9-15 16-14 25 1 13 24 15 29 3 5-11-10-18-15-28Z" fill="url(#zi-water)" stroke="#4c8995" stroke-width="2"/>
  <path d="M91 124c-3 6-8 9-7 14 0 4 3 6 6 6" fill="none" stroke="#efffeb" stroke-width="3" stroke-linecap="round"/>
  <path d="m87 149 10 0m-14-3 4 2m17-4-3 3" fill="none" stroke="#dcddba" stroke-width="3" stroke-linecap="round"/>
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
/** Family modules add art once; dock, details and canvas all use the registry. */
export const DRAGON_ART = {
  15: character(VRITRA_ARTWORK, '16 12 157 157', 127),
  16: character(LINDWURM_ARTWORK, '7 30 165 165', 118),
  17: character(AMPHISBAENA_ARTWORK, '0 10 280 280', 125),
  18: character(ZILANT_ARTWORK, '13 25 159 159', 116),
} as const;
export const VRITRA_SVG = DRAGON_ART[15].full;
export const VRITRA_ART_URL = DRAGON_ART[15].artUrl;
export const VRITRA_PORTRAIT_SVG = DRAGON_ART[15].portrait;
export const VRITRA_PORTRAIT_URL = DRAGON_ART[15].portraitUrl;
export const LINDWURM_SVG = DRAGON_ART[16].full;
export const LINDWURM_ART_URL = DRAGON_ART[16].artUrl;
export const LINDWURM_PORTRAIT_SVG = DRAGON_ART[16].portrait;
export const LINDWURM_PORTRAIT_URL = DRAGON_ART[16].portraitUrl;
export const AMPHISBAENA_SVG = DRAGON_ART[17].full;
export const AMPHISBAENA_ART_URL = DRAGON_ART[17].artUrl;
export const AMPHISBAENA_PORTRAIT_SVG = DRAGON_ART[17].portrait;
export const AMPHISBAENA_PORTRAIT_URL = DRAGON_ART[17].portraitUrl;
export const ZILANT_SVG = DRAGON_ART[18].full;
export const ZILANT_ART_URL = DRAGON_ART[18].artUrl;
export const ZILANT_PORTRAIT_SVG = DRAGON_ART[18].portrait;
export const ZILANT_PORTRAIT_URL = DRAGON_ART[18].portraitUrl;
