# 小さな物語: eight family-core scenes

Created 2026-10-12 for the existing eight family cores. These are original nine-second, fixed-camera vector paper-theatre adaptations. They do not introduce rarity, collection rewards, currency, ownership conditions, sound, or battle changes. The player is opened only by its clearly labelled button in a monster profile. No automatic loop; controls offer pause, restart, replay, ending, and close. Reduced motion gives three manually stepped stills. Leaving the tab pauses playback. Closing or changing profiles cancels the single scheduled animation frame.

## Sources and adaptation boundaries

Only textual motifs were researched. No source illustration, webpage, translation passage, film frame, music, font, brand, or third-party character design is included.

- Fenrir: [Prose Edda, Gylfaginning](https://sacred-texts.com/book/the-prose-edda/gylfaginning). The smooth silk-like restraint represents Gleipnir, distinguished from the character design's already-broken metal links. The terminal release is inspired by the Ragnarok tradition; the snowy setting and gentle final gesture are original staging, not a claim that the earlier iron-chain tests broke Gleipnir.
- Genbu: [Nara National Research Institute for Cultural Properties, Kitora murals](https://www.nabunken.go.jp/shijin/about/kitora-atlas/mural/post.html). Tortoise and snake, north and winter. The lake, emergence, star placement and movements are invented. No mural image or reconstructed star map was copied.
- Vritra: [Rigveda 1.32](https://en.wikisource.org/wiki/The_Hymns_of_the_Rigveda/Book_1/Hymn_32). Indra defeats the obstruction and releases waters. Distant thunder, an ungory slump aside, and the opening river are visual adaptations; Vritra is not depicted as voluntarily saving the valley.
- Talos: [Apollodorus, Library 1.9.26](https://www.theoi.com/Text/Apollodorus1.html). Bronze guardian patrols Crete and throws stones at approaching ships. The film depicts a patrol and raising a stone, not an attack on visible people. The shoreline, poses and machine anatomy are original.
- Hollow Spring / うつろ泉: wholly game-original character and story. A droplet, playful wobble and bubble companions do not assert an ancient myth or represent additional playable units.
- Mammon: [Catholic Encyclopedia, Mammon](https://www.newadvent.org/cathen/09580b.htm). Personification of wealth and attachment to it. Stacking and catching a coin is an invented allegory, not a canonical episode or an economy feature.
- Draugr: [The Story of Grettir the Strong, chapter XVIII](https://www.gutenberg.org/cache/epub/12747/pg12747-images.html). Burial-mound dead and treasure. The quiet guardian rising is an invented adaptation without the saga's violent encounter. No human remains or gore are shown.
- Janus: [Ovid, Fasti I](https://www.theoi.com/Text/OvidFasti1.html). Gates, beginnings, two faces and key. Opening the door to dawn is an original metaphor, not time travel.

## Artwork and motion authorship

The project’s existing original vectors are reused directly from familyArt, dragonArt, materialArt, slimeArt, demonArt, undeadArt, extraordinaryArt and the storybookFenrir module. New scene backgrounds, stone, smooth binding, water, coins, birds, snow, a connecting underlay behind Vritra’s storm chambers for a continuous falling silhouette, and other props are freshly authored SVG geometry in mythSceneSvg.ts. Actor sections are articulated around explicit pivots; Fenrir uses the source rig's independent head, jaws, ears, feet, mane, tail and links. The camera is fixed, with no copied frame-to-art pull-through or commercial card presentation.

The movie idea was requested in the context of enjoying immersive collectible illustrations. Only the broad concept of a short character-centred scene is used. No reference game's framing, logo, card back, symbols, composition, camera path, assets, text or playback sequence was imported. All new prose was written for this project. There are no new dependencies or bundled fonts/audio/video; review MP4s are generated from the exact scene renderer and are not shipped in the app.

Implementation used AI-assisted vector/code authorship. This record describes the actual creation process; it does not prove rights ownership, non-infringement or legal clearance. Independent expression/similarity review and legal assessment remain separate.

## Verification

Focused automated checks cover all eight launch/end/replay/close flows, one managed RAF, pause/resume, restart/skip, tab hiding, reduced-motion changes and stepped stills, profile identity changes, unmount cleanup, nested scroll lock, inert-state preservation, focus trap/return, and event isolation. Deterministic renderer tests cover finite/clamped timelines, three distinct scene states, no external media, and mythology/adaptation labels.

Raster previews are actual renderer SVG outputs, not browser screenshots or device recordings. Browser layout/performance needs separate verification in the integrated build. Source/artwork checks are inventory/provenance checks, not a legal opinion.
