/** Original project-authored vector scenery. No external images, fonts or media. */
export const PASTURE_WIDTH = 720;
export const PASTURE_HEIGHT = 540;
export const PASTURE_SCENE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 540" fill="none">
<defs>
  <linearGradient id="sky" x2="0" y2="1"><stop stop-color="#9cd6e0"/><stop offset="1" stop-color="#ecf4d5"/></linearGradient>
  <linearGradient id="meadow" x2=".2" y2="1"><stop stop-color="#b8cf81"/><stop offset="1" stop-color="#6da16a"/></linearGradient>
  <linearGradient id="light" x2=".85" y2="1"><stop stop-color="#f3efb5" stop-opacity=".65"/><stop offset="1" stop-color="#e6eab1" stop-opacity="0"/></linearGradient>
  <linearGradient id="water" x2="0" y2="1"><stop stop-color="#8bcacc"/><stop offset="1" stop-color="#72aeb0"/></linearGradient>
</defs>
<path fill="url(#sky)" d="M0 0h720v540H0z"/>
<circle cx="127" cy="83" r="46" fill="#fff8d4" opacity=".55"/><circle cx="127" cy="83" r="28" fill="#fff8de" opacity=".85"/>
<g fill="#fffcec" opacity=".73"><path d="M239 60c3-13 22-16 30-5 9-17 37-15 43 4 17-4 26 4 29 12H221c2-7 9-12 18-11Z"/><path d="M503 107c6-15 27-17 37-6 6-10 25-12 35 2 15-4 28 5 30 15H481c2-9 11-14 22-11Z"/><path d="M26 129c3-10 17-15 26-7 9-14 27-12 35 0 15-3 28 5 30 14H8c2-6 9-11 18-7Z"/></g>
<path d="M-40 223Q87 85 259 203T760 173V353H-40Z" fill="#8fbd95"/>
<path d="M-40 234Q92 172 221 207T484 197Q621 136 760 241V366H-40Z" fill="#b6d18d"/>
<path d="M-40 287Q89 202 262 249T760 211V417H-40Z" fill="#8db575"/>
<path d="M0 301Q177 231 398 288T720 268V540H0Z" fill="url(#meadow)"/>
<path d="M174 263Q279 294 220 336T155 411Q256 440 325 540H462Q351 430 284 410T291 350Q337 292 221 263Z" fill="#dce0a0" opacity=".55"/>
<path d="M0 247Q190 262 309 311L720 540H0Z" fill="url(#light)"/>
<!-- Small ranch buildings belong to the scenery, behind the party. -->
<g stroke-linejoin="round"><path d="m510 217 52-39 60 30v58l-110 10Z" fill="#ba9270"/><path d="m510 217 54-23 57 14-58-40Z" fill="#816657"/><path d="m499 218 64-56 71 46-9 10-62-40-55 48Z" fill="#f4dfb1"/><path d="m518 222 46-32v80l-46 5Z" fill="#d5ad7b"/><path d="M543 221h18v48l-18 2Z" fill="#6c795e"/><path d="m575 223 32-5v20l-32 5Z" fill="#e2c38c"/><path d="m581 226 20-3v12l-20 3Z" fill="#708b79"/><path d="m592 224 0 13M580 231l22-3" stroke="#efd8aa" stroke-width="3"/>
<path d="M641 219v49l26 1v-48l-12-17Z" fill="#ccbc8d"/><path d="m636 220 19-23 19 23Z" fill="#8b7964"/>
</g>
<!-- Rounded orchard trees, not borrowed foliage textures. -->
<g><path d="m64 203-2 89m8-30 18-23" stroke="#857655" stroke-width="9" stroke-linecap="round"/><path d="M31 210c-26-20-8-61 20-59 7-28 49-23 57-1 31-5 51 39 28 60 11 33-26 49-49 31-28 24-61 0-56-31Z" fill="#6e9b69"/><path d="M37 191c-10-21 8-36 25-30 11-24 39-15 43 4 20-2 31 15 26 29-32-11-59 13-94-3Z" fill="#91b379"/><path d="M678 234v60" stroke="#867655" stroke-width="8"/><path d="M648 236c-20-14-9-42 11-45 8-24 43-20 48 3 25 1 38 28 19 47 3 21-28 31-44 14-19 16-39 1-34-19Z" fill="#7ca66c"/><path d="M657 223c-8-17 1-25 14-24 11-20 30-9 33 7 11-1 18 6 19 13-28-7-46 12-66 4Z" fill="#a6c180"/></g>
<!-- The far fence follows the rolling ground and leaves a central gate. -->
<g stroke="#f0ddb2" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><path d="M-9 289Q87 292 181 278M-8 311Q91 313 183 299M363 275Q544 285 732 306M365 296Q548 307 732 327"/><path d="M15 276v45m57-44v43m55-48v45m55-53v45m183-47v43m59-40v43m59-39v43m59-37v43m59-37v45m59-35v44m56-32v43"/></g>
<g stroke="#987e59" stroke-width="2" opacity=".4"><path d="M18 283v36m57-34v33m55-36v33m55-38v30m183-33v32m59-29v32m59-28v32m59-26v32m59-26v34m59-24v33"/></g>
<!-- Quiet pond and soft foreground grasses. -->
<path d="M541 466c42-23 147-22 187 14v60H534c-35-26-31-52 7-74Z" fill="#9fb982"/><path d="M555 479c46-19 127-16 165 12v49H552c-24-19-24-44 3-61Z" fill="url(#water)"/><g stroke="#c5e6cb" stroke-width="3" stroke-linecap="round" opacity=".8"><path d="M583 493h42m36 19h33m-124 10h23"/></g>
<g fill="#659063"><path d="m5 477 6-37 8 28 11-23-4 37Zm460 43 9-34 5 22 12-28-4 41Zm59-32 8-34 4 24 12-17-8 30Zm172 8 8-39 8 29 8-24 4 44Z"/><path d="m45 358 3-13 4 9 7-12-4 17Zm395-31 4-12 3 8 5-9-1 13Zm-110 166 4-17 5 11 8-12-5 19Z"/></g>
<g fill="#e9edb6"><ellipse cx="46" cy="481" rx="5" ry="2" transform="rotate(-22 46 481)"/><ellipse cx="307" cy="470" rx="5" ry="2" transform="rotate(-22 307 470)"/><ellipse cx="624" cy="365" rx="5" ry="2"/><ellipse cx="196" cy="371" rx="5" ry="2"/><ellipse cx="82" cy="396" rx="5" ry="2"/></g>
<g fill="#eee9c7"><circle cx="28" cy="426" r="3"/><circle cx="38" cy="430" r="2"/><circle cx="482" cy="480" r="3"/><circle cx="491" cy="484" r="2"/><circle cx="659" cy="382" r="3"/><circle cx="668" cy="378" r="2"/></g>
<path d="M0 513Q121 475 243 540H0Z" fill="#83ac70"/><path d="M0 526Q104 499 175 540H0Z" fill="#9fbc7d"/>
</svg>`;
export const PASTURE_ART_URL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(PASTURE_SCENE)}`;
