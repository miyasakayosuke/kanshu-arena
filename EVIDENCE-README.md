# Compact evidence export

Status: stable recorded evidence snapshot; publication not performed.

Full match ledgers remain local and are deliberately not shipped. Hash inventories identify omitted artifacts; they do not recreate or independently verify them. Exact failed original gates and later successful/failed summaries are retained byte-for-byte. Slime's 4MB deduplicated aggregate archive is retained.

Run from this exported tree with Node v24.19.0:

`node scripts/balance-lab/prepare-public-evidence.mjs verify --root . --out /absolute/new/replay-directory --manifest-sha256 PINNED_HASH`

Use the manifest hash reported by the preparer. Verification checks shipped bytes, reconstructs frozen source and rebuilds the exact schedule, then executes one real selected Dryas residual-loss fixture. No original workspace, full ledger, Git history, node_modules or network is required for this replay. It is not a full-study regeneration.

## Existing link and command limitations

- Existing audit links/paths into omitted packed result chunks or lab-results identify locally preserved artifacts and will not open in this export. Shipped indexes and chunk-manifest files are metadata; their existence does not mean their data payloads were shipped.
- Original full analyzers, packed readers and full-study verifiers remain unchanged and require their original packed roots. They must fail if payloads are absent; the bounded command above is separate.
- Existing historical source reconstruction commands may require their named older source checkout. Exact archived sources and predecessor snapshots are retained, but this bounded demonstration establishes the all-family fixture only.
- See docs/balance-evidence-packaging.md for release checks, interpretation and scope, and evidence-public/link-limitations.json for affected Markdown references. Do not copy this export over an existing evidence archive without reviewing its contents.
