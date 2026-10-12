/**
 * Original code-native nature creature drawings, authored directly as SVG paths.
 * No reference image, downloaded asset, text, font, or external media is embedded.
 * Each portrait crops the exact same geometry as its full-body battle drawing.
 * Creation and outstanding review questions: docs/nature-original-art-provenance.md.
 */
const DRYAS_ARTWORK = `
  <defs>
    <linearGradient id="no-dy-wood" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#bf9870"/><stop offset=".45" stop-color="#896346"/><stop offset="1" stop-color="#574736"/></linearGradient>
    <linearGradient id="no-dy-leaf" x1="0" y1="0" x2=".6" y2="1"><stop stop-color="#d4db8b"/><stop offset=".5" stop-color="#7d9e5c"/><stop offset="1" stop-color="#3e6c55"/></linearGradient>
    <linearGradient id="no-dy-face" x1="0" y1="0" x2=".5" y2="1"><stop stop-color="#fae6b9"/><stop offset="1" stop-color="#cda577"/></linearGradient>
  </defs>
  <ellipse cx="144" cy="194" rx="86" ry="9" fill="#394d3a25"/>
  <!-- Far branch fingers and the uneven twig crown keep the silhouette botanical. -->
  <path d="M166 103c20-1 24-17 31-31l8-2 3-16 6 0-1 21-11 8-6 29-23 16Z" fill="url(#no-dy-wood)" stroke="#4b4d36" stroke-width="3" stroke-linejoin="round"/>
  <path d="m198 83 17 4 8-10 5 3-10 16-22-1m14-17 15-14 6 2-14 18" fill="url(#no-dy-wood)" stroke="#4b4d36" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M207 69c-9-12-4-25 6-30 8 10 6 25-6 30Z" fill="url(#no-dy-leaf)" stroke="#486c43" stroke-width="2"/>
  <path d="M223 80c0-13 9-22 23-21-1 13-8 21-23 21Z" fill="#aac875" stroke="#486c43" stroke-width="2"/>
  <path d="m211 47-3 20m30-4-14 14" fill="none" stroke="#dae3a0" stroke-width="1.7"/>
  <path d="M99 74 81 48 66 44l-6-18 6-2 6 14 15 3 2-23 6 0 1 25 18 21m45 7 21-27 1-24 7-1 0 19 16-8 4 6-19 13-11 31" fill="url(#no-dy-wood)" stroke="#4b4d36" stroke-width="3" stroke-linejoin="round"/>
  <!-- A low back root and two split front roots form an asymmetric standing pose. -->
  <path d="M151 144c20 6 22 25 24 34l28 9 3 7-31 0-22-12-13-17Z" fill="#6d6044" stroke="#474936" stroke-width="3"/>
  <path d="M115 140c-12 20-7 35-14 44l-19 6-11 11 29-2 14-8 0 11 15-6 7-28Z" fill="url(#no-dy-wood)" stroke="#474936" stroke-width="3" stroke-linejoin="round"/>
  <path d="m101 188 17-14-3 17m-24 6 14-6m17-14 0 19" fill="none" stroke="#d1ad76" stroke-width="2" stroke-linecap="round"/>
  <path d="M145 143c17 3 23 13 20 30l-8 15 11 9 25 4-34 3-19-9-5 6-10-1 17-25-12-15Z" fill="url(#no-dy-wood)" stroke="#474936" stroke-width="3" stroke-linejoin="round"/>
  <path d="m147 164 4 13-9 15 13 7m9 0 12 2" fill="none" stroke="#d1ad76" stroke-width="2" stroke-linecap="round"/>
  <!-- Trunk dress is living bark, with pale exposed grain and layered leaf hips. -->
  <path d="M104 89c15-12 45-13 61 1l-5 26 13 31-18 19-29 5-27-17 7-36Z" fill="url(#no-dy-wood)" stroke="#474936" stroke-width="3.5" stroke-linejoin="round"/>
  <path d="M126 100c13-5 23 0 22 11l-6 17 10 22-12 9-16-13 6-23-9-11Z" fill="url(#no-dy-face)"/>
  <path d="m131 106 7 7-4 12m5 10 6 15m-28-25-2 20 8 11m27-53 3 13-3 13" fill="none" stroke="#735d42" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M104 128c-15 8-19 23-19 38 17-2 29-11 35-27Z" fill="url(#no-dy-leaf)" stroke="#486743" stroke-width="2.5"/>
  <path d="M161 125c18 8 25 21 24 39-20-3-31-13-34-30Z" fill="url(#no-dy-leaf)" stroke="#486743" stroke-width="2.5"/>
  <path d="M110 143c-8 11-7 24-1 34 15-5 22-16 20-29Z" fill="#9db769" stroke="#486743" stroke-width="2.2"/>
  <path d="M152 143c12 9 16 20 12 33-14-2-27-14-27-28Z" fill="#88a863" stroke="#486743" stroke-width="2.2"/>
  <path d="m107 138-15 21m64-23 22 20m-57-7-9 20m31-19 16 19" fill="none" stroke="#d4d790" stroke-width="1.8"/>
  <!-- Left arm cups a seed; its twig digits are visibly separate from the body. -->
  <path d="M107 96c-15 0-24 10-31 22l-17-3-6 9 20 13 13-3 22-20Z" fill="url(#no-dy-wood)" stroke="#474936" stroke-width="3" stroke-linejoin="round"/>
  <path d="m59 119-14-8-8 2 10 10-12 1-2 6 21 1 17 6m-15-17-7-15-6 1 6 15" fill="url(#no-dy-wood)" stroke="#474936" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="m85 113-8 13-13-3" fill="none" stroke="#d1ad76" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M47 94c-9 7-9 16-1 21 10 6 21-1 17-11-2-6-9-8-16-10Z" fill="#d59650" stroke="#77513c" stroke-width="2"/>
  <path d="M49 101c-3 5-2 8 2 11" fill="none" stroke="#f2cc80" stroke-width="2" stroke-linecap="round"/>
  <path d="M53 99c-1-11 4-18 14-19 2 10-3 17-14 19Z" fill="#95b86d" stroke="#4e7248" stroke-width="1.8"/>
  <!-- Leaf collar, wide hollow-wood face, and little plum-coloured eyes. -->
  <path d="M105 83c-16-8-27-5-36 1 6 12 18 19 35 17l-7 14 25-6 13 12 13-17 23 3-8-16 15-11c-17-5-28-4-41 4Z" fill="url(#no-dy-leaf)" stroke="#486743" stroke-width="2.8" stroke-linejoin="round"/>
  <path d="M104 41c18-9 42-4 51 12l3 28-12 19-24 5-23-13-7-25Z" fill="url(#no-dy-wood)" stroke="#474936" stroke-width="3.2"/>
  <path d="M110 51c12-6 28-4 36 7l1 25-10 13-16 1-17-11-3-19Z" fill="url(#no-dy-face)" stroke="#95734f" stroke-width="1.8"/>
  <path d="m110 64 10-5 7 5-2 10-10 1Zm24 0 9-4 6 6-3 9-9-1Z" fill="#6c455a"/>
  <path d="m114 65 5-2 4 3-2 6-5 0Zm23 0 5-1 3 3-2 5-4-1Z" fill="#d9b5c2"/>
  <path d="m118 65 1 7m22-7 0 6" stroke="#57394a" stroke-width="2"/>
  <path d="m108 60 12-4 7 4m8-1 8-3 6 4m-20 9-3 11 6 1m-11 7 9 3 9-4" fill="none" stroke="#856348" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="m96 59-5 9 5 15m57-20 5 11-4 12" fill="none" stroke="#d6ae73" stroke-width="2"/>
  <!-- Individual leaves fan upward, deliberately without a symmetric flower crown. -->
  <path d="M105 56C84 51 76 36 80 21c16 1 29 13 31 29Z" fill="url(#no-dy-leaf)" stroke="#486743" stroke-width="2.4"/>
  <path d="M118 50c-15-17-10-34 2-43 12 10 14 28 4 44Z" fill="#a6c075" stroke="#486743" stroke-width="2.4"/>
  <path d="M130 50c-1-22 14-36 32-34-1 19-13 35-32 39Z" fill="url(#no-dy-leaf)" stroke="#486743" stroke-width="2.4"/>
  <path d="M149 59c5-20 18-28 38-23-4 20-18 29-38 23Z" fill="#729862" stroke="#486743" stroke-width="2.4"/>
  <path d="M100 59C86 60 74 52 68 40c14-6 31 1 38 14Z" fill="#8dab65" stroke="#486743" stroke-width="2.4"/>
  <path d="m86 29 18 24m15-36 2 28m31-20-18 23m43-7-25 14m-76-10 26 11" fill="none" stroke="#e1e6a2" stroke-width="1.8" stroke-linecap="round"/>
  <path d="M130 49c9-9 22-8 31-2-8 9-22 12-31 2Z" fill="#bfd185" stroke="#597d4b" stroke-width="2"/>
  <circle cx="100" cy="50" r="5" fill="#c97e58" stroke="#825b40" stroke-width="1.5"/><circle cx="109" cy="48" r="4" fill="#ecc17a" stroke="#825b40" stroke-width="1.5"/>
`;

const GARUDA_ARTWORK = `
  <defs>
    <linearGradient id="no-ga-red" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#d98753"/><stop offset=".5" stop-color="#ad503d"/><stop offset="1" stop-color="#633548"/></linearGradient>
    <linearGradient id="no-ga-gold" x1="0" y1="0" x2=".4" y2="1"><stop stop-color="#ffe3a0"/><stop offset=".55" stop-color="#dfa655"/><stop offset="1" stop-color="#ad6b3a"/></linearGradient>
    <linearGradient id="no-ga-ivory" x1="0" y1="0" x2=".5" y2="1"><stop stop-color="#fff7d9"/><stop offset="1" stop-color="#d6c69c"/></linearGradient>
  </defs>
  <ellipse cx="143" cy="196" rx="77" ry="9" fill="#5d383b25"/>
  <!-- Broad, open flight wings with individually drawn long russet primary feathers. -->
  <path d="M130 107 94 56 66 38 35 23 13 13 22 46 54 71 18 51 28 76 69 94 26 85 45 111 88 121 53 120 79 139 119 143Z" fill="url(#no-ga-red)" stroke="#643e37" stroke-width="3.2" stroke-linejoin="round"/>
  <path d="M152 111 182 54 208 35 237 23 266 12 258 46 226 69 263 49 252 77 212 95 252 85 235 112 192 122 225 121 201 140 161 145Z" fill="url(#no-ga-red)" stroke="#643e37" stroke-width="3.2" stroke-linejoin="round"/>
  <g fill="url(#no-ga-gold)" stroke="#966044" stroke-width="2" stroke-linejoin="round">
    <path d="M123 104 79 59 37 36 57 64 108 115Z"/>
    <path d="m113 117-46-30-30-17 29 29 39 24Z"/>
    <path d="m107 125-35-14-21-8 24 22 34 9Z"/>
    <path d="m157 106 43-47 41-24-18 28-52 53Z"/>
    <path d="m169 117 45-31 29-18-27 31-38 24Z"/>
    <path d="m173 126 35-16 20-8-23 24-34 9Z"/>
  </g>
  <g fill="none" stroke="#efb57b" stroke-width="1.9" stroke-linecap="round">
    <path d="M19 23 64 64m-40-4 48 34m-36 2 48 22m-19 9 32 9"/>
    <path d="m259 23-44 42m41-6-47 34m36 2-48 24m18 9-32 8"/>
  </g>
  <!-- Smaller coverts make two pale scalloped shelves, a different rhythm to the tips. -->
  <path d="M124 101 99 66 86 55 79 59 87 72 73 65 70 73 84 86 70 81 72 92 94 108 113 121Z" fill="url(#no-ga-ivory)" stroke="#9e794d" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M157 101 179 68 193 54 201 58 193 73 207 64 211 72 197 87 211 80 210 91 185 110 169 122Z" fill="url(#no-ga-ivory)" stroke="#9e794d" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="m89 67 24 35m-30-21 23 24m88-39-26 37m29-22-24 25" fill="none" stroke="#e0b266" stroke-width="2.3"/>
  <!-- Four long tail blades lie between the wide taloned legs. -->
  <path d="M127 143 108 188 109 205 132 187 145 157Z" fill="#884044" stroke="#643e37" stroke-width="2.6"/>
  <path d="m143 148 9 46 13 12 5-26-12-33Z" fill="#884044" stroke="#643e37" stroke-width="2.6"/>
  <path d="m130 146-6 39 10 16 10-23 4-29Z" fill="url(#no-ga-gold)" stroke="#81503b" stroke-width="2.5"/>
  <path d="m145 150 0 36 12 16 1-26-7-26Z" fill="url(#no-ga-ivory)" stroke="#81503b" stroke-width="2.3"/>
  <path d="m125 161-10 29m37-23 9 21" fill="none" stroke="#df9270" stroke-width="2"/>
  <!-- Russet shoulders frame a large ivory breast and a low faceted bronze belt. -->
  <path d="M116 75c15-9 39-7 49 6l13 31-7 28-20 24-27-8-19-27 0-25Z" fill="url(#no-ga-red)" stroke="#643e37" stroke-width="3.3" stroke-linejoin="round"/>
  <path d="m130 83 20 0 13 25-3 19-16 16-17-7-13-24Z" fill="url(#no-ga-ivory)" stroke="#b8915e" stroke-width="2.2"/>
  <path d="m124 101 17 8 14-8m-31 15 17 8 16-9m-28 12 12 8 11-9" fill="none" stroke="#c4a679" stroke-width="2" stroke-linecap="round"/>
  <path d="m107 125 21 12 21 4 24-17-4 16-20 15-22-4-17-14Z" fill="url(#no-ga-gold)" stroke="#805237" stroke-width="2.6" stroke-linejoin="round"/>
  <path d="m140 136 11-2 9 10-10 12-12-7Z" fill="#637d79" stroke="#7c563d" stroke-width="2"/><path d="m147 139 7 5-5 6-6-4Z" fill="#c1e3bd"/>
  <!-- Talons are lifted into a landing pose, not grounded humanoid boots. -->
  <path d="M121 145c-17 6-20 20-16 31l-17 5-10 12 9 2 13-8 15 4 8-5-9-8 9-18Z" fill="url(#no-ga-gold)" stroke="#704936" stroke-width="3" stroke-linejoin="round"/>
  <path d="M162 144c17 4 21 18 19 27l18 9 7 13-10 0-10-10-13-1-6-6 4-17Z" fill="url(#no-ga-gold)" stroke="#704936" stroke-width="3" stroke-linejoin="round"/>
  <path d="m84 186-7 6-1 8 10-7m12-7-7 7 0 7 10-10m14-4-5 7 3 5 5-7m79-10 8 8 2 6 3-9-7-7m-21-2 6 10 7 3-3-10" fill="#f5eed2" stroke="#705847" stroke-width="1.7" stroke-linejoin="round"/>
  <path d="m106 166 10 3m-11 3 8 3m60-12 8 0m-7 6 8 1" fill="none" stroke="#a86e40" stroke-width="2"/>
  <!-- Eagle-like ivory head looks left; a swept three-ribbon crest breaks symmetry. -->
  <path d="m138 47 12-24 14-11-5 25 14-9-5 22 17-6-10 19-23 9Z" fill="url(#no-ga-gold)" stroke="#805538" stroke-width="2.6" stroke-linejoin="round"/>
  <path d="m154 25-10 26m21-14-13 18m22-6-15 10" fill="none" stroke="#ffedb9" stroke-width="1.8"/>
  <path d="M154 50c-9-14-30-15-43-5L97 61l1 18 14 17 15 7 1-12 12 10 2-14 14 5-3-12 10-3-8-11Z" fill="url(#no-ga-ivory)" stroke="#795c40" stroke-width="3" stroke-linejoin="round"/>
  <path d="m108 58-8 9-20 6-7 13 8 11 7-13 15-2 13-12Z" fill="url(#no-ga-gold)" stroke="#795038" stroke-width="2.6" stroke-linejoin="round"/>
  <path d="m88 78 11-4m-18 12 7-3" fill="none" stroke="#a46e3b" stroke-width="1.7" stroke-linecap="round"/>
  <path d="m111 60 16-8 12 7-12 12-14-2Z" fill="#69423f"/><path d="m116 60 10-4 8 3-8 7-9-1Z" fill="#b3d3b3"/>
  <path d="m126 57 0 8" stroke="#394a45" stroke-width="2.5"/><circle cx="122" cy="59" r="1.6" fill="#fffde8"/>
  <path d="m110 56 15-8 15 6" fill="none" stroke="#fff7db" stroke-width="4" stroke-linecap="round"/>
  <path d="m137 70 12-7-4 13-10 7m-19-4 9 4-1 9" fill="none" stroke="#b6a781" stroke-width="2" stroke-linejoin="round"/>
  <path d="m155 89 9 8-2 12m-46-22-7 14 0 12" fill="none" stroke="#e2ad68" stroke-width="2.5" stroke-linecap="round"/>
`;

const CROW_TENGU_ARTWORK = `
  <defs>
    <linearGradient id="no-ct-feather" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#668b96"/><stop offset=".35" stop-color="#354e67"/><stop offset="1" stop-color="#21283f"/></linearGradient>
    <linearGradient id="no-ct-cloak" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#8fa095"/><stop offset=".45" stop-color="#566d66"/><stop offset="1" stop-color="#304c4c"/></linearGradient>
    <linearGradient id="no-ct-orange" x1="0" y1="0" x2=".5" y2="1"><stop stop-color="#e9ac71"/><stop offset="1" stop-color="#a95646"/></linearGradient>
  </defs>
  <ellipse cx="149" cy="196" rx="74" ry="9" fill="#2438492b"/>
  <!-- Only one wing opens: a tall swept fan behind a compact, leaning body. -->
  <path d="M157 100 174 68 203 47 217 26 220 60 231 47 229 81 243 66 235 102 247 90 232 125 238 118 225 150 196 164 168 145Z" fill="url(#no-ct-feather)" stroke="#253344" stroke-width="3.3" stroke-linejoin="round"/>
  <g fill="#4d7081" stroke="#2c3c50" stroke-width="2.2" stroke-linejoin="round">
    <path d="M172 120 206 65 214 44 207 83 181 132Z"/>
    <path d="m183 133 34-53 7-16-10 40-20 35Z"/>
    <path d="m194 142 31-40 10-19-13 41-15 23Z"/>
    <path d="m204 151 19-25 12-13-14 31-12 13Z"/>
  </g>
  <path d="m183 109 17-30m-7 49 18-33m-8 46 17-25" fill="none" stroke="#7fa2a5" stroke-width="1.8" stroke-linecap="round"/>
  <!-- Short tapering tail, behind two long bent legs. -->
  <path d="m160 135 38 26 11 23-27-11 3 11-24-16-17-23Z" fill="#263449" stroke="#202d3c" stroke-width="3" stroke-linejoin="round"/>
  <path d="m168 149 25 24m-34-16 12 17" fill="none" stroke="#617d89" stroke-width="2"/>
  <path d="M147 142c-3 14-14 23-12 33l11 12-5 9-11-5-8-18 8-29Z" fill="#405367" stroke="#253344" stroke-width="3"/>
  <path d="M168 141c8 12 9 27 0 40l-4 10 18 3 6 7-33 2-8-10 9-18-5-27Z" fill="url(#no-ct-feather)" stroke="#253344" stroke-width="3" stroke-linejoin="round"/>
  <path d="m126 169 13-5 3 8-15 6Zm28 8 15 3-4 10-15-4Z" fill="url(#no-ct-orange)" stroke="#6a4c45" stroke-width="2"/>
  <path d="m135 185-12 7-14 2-4 6 23 0 14-9m16 8-7 6m16-5 1 5m7-4 4 4" fill="none" stroke="#253344" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="m109 197-4 3m18-6-2 5m29 0-3 5m17-4 1 4m10-3 4 3" fill="none" stroke="#d6c9a8" stroke-width="2.3" stroke-linecap="round"/>
  <!-- A lopsided mountain cloak supplies a quiet sage wedge, not a large bird breast. -->
  <path d="M110 85c22-10 44-6 55 8l8 32 13 30-25 10-27-8-21 1 3-19-16-16-7-20Z" fill="url(#no-ct-cloak)" stroke="#2a4148" stroke-width="3.2" stroke-linejoin="round"/>
  <path d="m122 99 15 17-5 34 27 9-12-25 11-32-18-9Z" fill="#c4c6a4" stroke="#596e64" stroke-width="2.2"/>
  <path d="m138 107 8 9-7 26m-31-26 10 11 3 21m37-24 7 21 12 6" fill="none" stroke="#a1b29a" stroke-width="2" stroke-linecap="round"/>
  <path d="m112 136 10 11-6 10 15-5 9 7-4-20-13-15Z" fill="#71877a"/>
  <path d="m106 87-13 13 17 15 14-8 17 6 15-17-14-14Z" fill="url(#no-ct-orange)" stroke="#664b45" stroke-width="2.6" stroke-linejoin="round"/>
  <path d="m144 98 17 16 20-5-9 13 4 13-21-9-17-18Z" fill="url(#no-ct-orange)" stroke="#664b45" stroke-width="2.4" stroke-linejoin="round"/>
  <path d="m153 115 14 7m-66-20 10 7 9-3" fill="none" stroke="#f3c48a" stroke-width="1.8"/>
  <!-- A forearm extends to an independent five-leaf wind fan. -->
  <path d="M113 111c-11 1-20 10-27 16l-17-5-4 7 17 11 10-2 27-15Z" fill="url(#no-ct-feather)" stroke="#253344" stroke-width="2.8"/>
  <path d="m106 118-14 15-8-2m-11-3-9-4m6 8-9-4" fill="none" stroke="#8aa6a3" stroke-width="1.8" stroke-linecap="round"/>
  <path d="m67 125-15-41" stroke="#b08a53" stroke-width="5" stroke-linecap="round"/>
  <path d="M53 106C36 100 27 88 31 74c16 3 24 16 22 32Z" fill="#72968b" stroke="#3d625d" stroke-width="2.3"/>
  <path d="M54 104C39 88 39 70 49 57c13 12 14 29 5 47Z" fill="#adc4a1" stroke="#3d625d" stroke-width="2.3"/>
  <path d="M56 105c-2-22 8-37 24-41 5 18-5 33-24 41Z" fill="#87ae98" stroke="#3d625d" stroke-width="2.3"/>
  <path d="M57 107c7-18 23-24 37-18-3 16-21 23-37 18Z" fill="#608979" stroke="#3d625d" stroke-width="2.3"/>
  <path d="M54 103c-11-26-7-39-1-52 9 16 9 36 1 52Z" fill="#c4d1a6" stroke="#3d625d" stroke-width="2.2"/>
  <path d="m36 79 16 22m-2-34 5 33m20-28-19 30m30-8-27 11" fill="none" stroke="#d7dfb6" stroke-width="1.6"/>
  <!-- A long low black beak, tiny ochre cap, and single cheek ruff identify the crow. -->
  <path d="M109 39c18-8 38 0 46 15l-2 25-9 18-17-8-18 6-8-15-8-7 4-20Z" fill="url(#no-ct-feather)" stroke="#253344" stroke-width="3.2" stroke-linejoin="round"/>
  <path d="m114 35 2-18 20-3 12 13-4 13-19 6Z" fill="url(#no-ct-orange)" stroke="#614941" stroke-width="2.6" stroke-linejoin="round"/>
  <path d="m117 18 15 4 14 6-18 5-14-3Zm10 15 0 9 16-4 2-9Z" fill="#d7b782" stroke="#896548" stroke-width="1.6"/>
  <path d="m122 44 12-1 9 10-11-3-12 4Z" fill="#6f8e99"/>
  <path d="M104 57 88 61 68 78l-11 14 20-4 21-6 14-11Z" fill="#283b4b" stroke="#202e3d" stroke-width="2.7" stroke-linejoin="round"/>
  <path d="m67 84 22-15 15-4-8 11Z" fill="#779197"/><path d="m64 89 24-9 14-3" fill="none" stroke="#171f2f" stroke-width="2" stroke-linecap="round"/>
  <path d="m104 58 14-7 11 7-10 11-13-3Z" fill="#192a3a"/><path d="m108 58 10-3 7 3-7 7-9-2Z" fill="#e8c27c"/>
  <path d="m117 55 1 9" stroke="#383d3b" stroke-width="2.2"/><circle cx="114" cy="58" r="1.4" fill="#fff4c2"/>
  <path d="m101 54 15-9 15 7" fill="none" stroke="#98adb0" stroke-width="3" stroke-linecap="round"/>
  <path d="m137 62 10-3-3 14 13-2-11 14-13-3 3 8-13-10 2-9Z" fill="#657f8a" stroke="#34475a" stroke-width="2" stroke-linejoin="round"/>
  <path d="m139 68-4 9 6 2m-25-3 7 8" fill="none" stroke="#a4b5ad" stroke-width="1.7" stroke-linecap="round"/>
  <path d="M144 109c8 7 9 14 4 24l-7 2-5-6 5-6-5-9Z" fill="url(#no-ct-feather)" stroke="#253344" stroke-width="2.5"/>
  <path d="m140 126 7 3m-8 1 6 3" stroke="#a2b6ad" stroke-width="1.5" stroke-linecap="round"/>
`;

const NAGA_ARTWORK = `
  <defs>
    <linearGradient id="no-ng-blue" x1="0" y1="0" x2=".6" y2="1"><stop stop-color="#7386c0"/><stop offset=".45" stop-color="#414c8b"/><stop offset="1" stop-color="#2c345b"/></linearGradient>
    <linearGradient id="no-ng-coral" x1="0" y1="0" x2=".5" y2="1"><stop stop-color="#f4c6ad"/><stop offset=".5" stop-color="#cf8e8a"/><stop offset="1" stop-color="#9a5e77"/></linearGradient>
    <linearGradient id="no-ng-gold" x1="0" y1="0" x2=".6" y2="1"><stop stop-color="#f5deb0"/><stop offset="1" stop-color="#ad8b58"/></linearGradient>
    <radialGradient id="no-ng-pearl"><stop stop-color="#fffbeb"/><stop offset=".6" stop-color="#d5e6dc"/><stop offset="1" stop-color="#86afa9"/></radialGradient>
  </defs>
  <ellipse cx="153" cy="195" rx="107" ry="10" fill="#3938542b"/>
  <!-- The tail rises into a small open hook; an offset broad loop anchors the figure. -->
  <path d="M180 150c32 7 49-3 44-22-4-13 2-28 16-33-6 16 2 26 8 40 10 25-11 42-48 43l-28-10Z" fill="url(#no-ng-blue)" stroke="#363653" stroke-width="3.3"/>
  <path d="M235 102c-9 14 7 25 7 39-1 21-28 29-48 28" fill="none" stroke="#bca0b9" stroke-width="4" stroke-linecap="round"/>
  <path d="M144 144c-36-11-77-5-90 12-22 31 21 46 73 46 50 0 81-4 93-18 12-15-3-26-31-31l-31 9c28 4 39 9 31 14-12 8-54 10-82 4-21-4-29-10-18-15 9-5 36-5 55 1Z" fill="url(#no-ng-blue)" stroke="#363653" stroke-width="3.8" stroke-linejoin="round"/>
  <path d="M59 174c16 27 123 29 152 8-18 27-124 28-150 3Z" fill="url(#no-ng-coral)"/>
  <path d="M91 159c24-8 50-3 67 7" fill="none" stroke="#9c9dcc" stroke-width="3" stroke-linecap="round"/>
  <g fill="none" stroke="#916b88" stroke-width="1.8"><path d="m76 184-3 8m17-4-1 8m17-5 0 8m16-6 1 7m16-7 1 7m16-8 2 7m15-9 3 7m13-10 4 5"/></g>
  <!-- A wide coral hood has seven hand-shaped panels and a dark scalloped outer rim. -->
  <path d="M121 29c-22-16-45-11-55 4-10 15-13 48-7 64l17-5-5 19 19-5 0 20 19-8 12 14 19-15 23 8 0-19 18 4-6-17 17 1c4-20-1-45-12-60-14-16-36-17-59-5Z" fill="url(#no-ng-blue)" stroke="#363653" stroke-width="3.5" stroke-linejoin="round"/>
  <path d="M119 40C94 18 71 33 70 58l4 28 18-6 8 26 18-11 13 13 17-14 15 11 2-26 17 4-3-27c-4-27-27-35-53-15Z" fill="url(#no-ng-coral)" stroke="#8b6782" stroke-width="2.4" stroke-linejoin="round"/>
  <g fill="none" stroke="#b17887" stroke-width="2.2" stroke-linecap="round"><path d="M116 62 82 41m37 32-45-13m49 23-41 4m49 4-27 11m29-40 24-22m-21 30 39-13m-37 24 37 3m-39 7 25 10"/></g>
  <path d="M91 45c-7-6-12 0-9 8 3 9 10 14 15 12 6-3 1-14-6-20Z" fill="#f6d7bb" stroke="#b98089" stroke-width="1.7"/>
  <path d="M158 43c8-6 12 1 9 9-3 8-10 13-15 10-5-3-1-13 6-19Z" fill="#f6d7bb" stroke="#b98089" stroke-width="1.7"/>
  <path d="m88 47 4 10m68-10-4 9" stroke="#93637e" stroke-width="2.5" stroke-linecap="round"/>
  <!-- Upright neck flows to the right into the foreground coil in one continuous body. -->
  <path d="M111 67c-2 26-5 42 2 62 8 23 37 26 48 35 8 7-4 18-25 17-20-1-37-8-45-6 7 19 58 27 83 10 30-19 13-42-9-52-18-8-21-20-19-37l3-27Z" fill="url(#no-ng-blue)" stroke="#363653" stroke-width="3.4" stroke-linejoin="round"/>
  <path d="M121 78c-7 34-4 53 20 66 15 7 31 11 32 22 1 8-8 15-21 18 26-1 38-16 23-30-14-13-33-16-36-32-3-13-1-29 0-43Z" fill="url(#no-ng-coral)"/>
  <g fill="none" stroke="#a5768a" stroke-width="1.8"><path d="m121 91 17 1m-18 11 18 2m-16 10 18 2m-14 10 19-2m-12 11 20-4m-9 12 18-5m-7 12 18-4m-8 13 15-1m-9 10 10 4m-18 4 5 6"/></g>
  <!-- Slender arms curve around an unlettered pearl, with a clear hole between them. -->
  <path d="M112 92c-12 3-15 15-21 20l-20-2-3 8 23 7 11-6 17-15Z" fill="url(#no-ng-blue)" stroke="#363653" stroke-width="2.8" stroke-linejoin="round"/>
  <path d="M145 95c8 2 10 10 6 21l-10 10-22-3-1-7 18 1 5-10-2-8Z" fill="url(#no-ng-blue)" stroke="#363653" stroke-width="2.8" stroke-linejoin="round"/>
  <path d="m98 109 7 9m34-2 8 5" stroke="#dfc89f" stroke-width="5"/>
  <path d="m74 113-7-7-7 0 4 8-8 0 0 5 17 4 9-5m41 1-6-5-10 1-1 5 8 1-7 3 3 4 14-3" fill="#b5a2c4" stroke="#514564" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="87" cy="105" r="17" fill="url(#no-ng-pearl)" stroke="#789891" stroke-width="2.3"/>
  <path d="M82 94c-7 2-9 9-6 13" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
  <path d="m81 119 5 1 5-1m-17-6 4 2m22-2-4 2" fill="none" stroke="#dac2c7" stroke-width="3.3" stroke-linecap="round"/>
  <!-- Flat gold collar and small tail scutes provide restraint rather than generic armour. -->
  <path d="m108 84 14 8 18-2 12-9-2 12-11 8-18 0-13-9Z" fill="url(#no-ng-gold)" stroke="#876d54" stroke-width="2.2"/>
  <path d="m124 96 8 0 3 10-7 6-7-7Z" fill="#89bfb6" stroke="#856e58" stroke-width="1.7"/>
  <g fill="#9a95be" stroke="#51527a" stroke-width="1.4"><path d="m60 161 10-5 5 5-10 5Z"/><path d="m83 152 12-3 4 5-12 3Z"/><path d="m183 190 9-5 5 3-10 6Z"/><path d="m207 167 7-4 5 4-9 5Z"/><path d="m230 150 6-7 4 4-7 7Z"/></g>
  <!-- Small rounded serpent face, side fins and a central pearl-shaped forehead scale. -->
  <path d="M115 42c10-7 24-7 33 1l6 18-5 18-16 10-21-8-7-18Z" fill="url(#no-ng-blue)" stroke="#363653" stroke-width="3" stroke-linejoin="round"/>
  <path d="m111 62-10-5-5 8 11 12m44-15 9-6 5 8-12 13" fill="#b293b7" stroke="#514967" stroke-width="2" stroke-linejoin="round"/>
  <path d="M112 68c8 7 22 10 37 0l-4 13-12 8-17-6Z" fill="#ddb8bb" stroke="#8b7292" stroke-width="1.8"/>
  <path d="m111 55 11-5 8 6-6 10-11-2Zm25 1 11-5 6 7-5 8-10-2Z" fill="#292f51"/>
  <path d="m115 56 7-2 4 3-4 6-6-2Zm24 1 7-2 4 3-4 5-6-2Z" fill="#dfd797"/>
  <path d="m121 54 0 9m24-8 0 8" stroke="#4c4b5c" stroke-width="2"/>
  <path d="m111 51 9-5 11 6m6-1 10-5 6 5" fill="none" stroke="#a9abcc" stroke-width="2.7" stroke-linecap="round"/>
  <path d="m129 42 4-9 6 9-5 9Z" fill="#e4d7ad" stroke="#998d80" stroke-width="1.7"/>
  <path d="m121 73 8 3 11-3m-13-4 2 0m4 0 2 0" fill="none" stroke="#79607c" stroke-width="1.7" stroke-linecap="round"/>
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

/** The registry is keyed by existing game IDs; no names or gameplay are changed. */
export const NATURE_ORIGINAL_ART = {
  3: character(DRYAS_ARTWORK, '61 4 128 128', 111),
  6: character(GARUDA_ARTWORK, '71 7 133 133', 127),
  9: character(CROW_TENGU_ARTWORK, '62 8 137 137', 112),
  10: character(NAGA_ARTWORK, '58 9 138 138', 116),
} as const;
