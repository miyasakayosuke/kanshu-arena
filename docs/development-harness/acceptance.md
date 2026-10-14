# Proposed v1 acceptance criteria

This is a proposal drawn from already represented repository behavior. It is not
an assertion that the owner approved a final v1 definition or that all items pass.
The owner must decide final scope. That decision blocks final completion only;
independently authorized defect fixes and validation continue.

1. Core play loop: select a team, enter a battle, issue manual or automatic
   commands, finish playback and return to the arena without unintended auto-start.
2. Battle correctness: deterministic engine tests, supported family/skill rules,
   action-time allied automatic decisions and symmetric turn MP recovery pass.
3. Usability: catalog filtering/detail navigation, keyboard dismissal and focus,
   readable result feedback and narrow viewport flows have evidence.
4. Persistence: accepted team behavior survives the supported reload/navigation
   paths. Any awakening progression or persistent save change requires its own
   approved design, migration and regression evidence; a preview does not authorize it.
5. Visual scope: retain accepted baseline visuals. Rejected v0.20.33 art is not a
   release candidate. Replacement art requires explicit visual acceptance and
   independent rendered-motion/provenance review.
6. Release quality: rights tests/check, full test suite, production build and
   scope-specific QA pass for the exact reviewed commit. Known limitations remain
   explicit; test success is not legal clearance.
7. Deployment: one publisher, exact reviewed commit, confirmed deployment and live
   checks including credits and third-party notices; rollback baseline is recorded.
8. Completion: no mandatory unresolved defect or approval gate, final scope
   confirmed, required work released and explicitly accepted by the owner.

No endless content expansion, speculative optimization, new features or cosmetic
churn is part of “keep developing until complete.” Add tasks only for a concrete
approved requirement or evidence-backed defect within scope. The initial backlog
intentionally separates current work, approval gates and baseline verification.
