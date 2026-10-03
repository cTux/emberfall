# Documentation instructions

- The [index](README.md) routes readers to the source of truth. Keep specs about behavior, designs about implementation and plans about sequencing/status.
- Preserve requirement IDs. Mark implemented behavior, accepted future constraints and undecided proposals explicitly.
- Check code and tests when moving old README prose; remove superseded statements rather than preserving contradictions. Do not change runtime behavior just to match a stale paragraph.
- Maintain the feature map when adding/removing a feature. Link exact source/test files and use repo-relative links so documentation works in every checkout.
- Keep detailed component guidance in `packages/ui/README.md`, which is rendered in Storybook. Keep third-party attribution with shipped assets.
- Validate formatting, relative paths/anchors and requirement-to-design coverage. Linked tests identify coverage; do not claim they ran without execution evidence.
- Keep root AGENTS short; place package-specific rules in the relevant package. Follow [skill maintenance](development.md#maintaining-documentation-and-skills) for repo skills.
