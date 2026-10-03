# Shared UI instructions

Read the [component guide](README.md) before changing components or theme. It is also the live Storybook guide; keep its import working.

- Keep components controlled: presentation and callbacks belong here; fetching, storage, clocks, routing, authorization and gameplay remain in the host.
- Reuse existing components and MUI primitives. Export public components/types from `src/index.ts` and demonstrate meaningful states in Storybook.
- Follow the guide's theme/styling hierarchy and preserve accessible names, focus, keyboard behavior and reduced motion.
- Use this package's typecheck, build and relevant browser tests; also verify client consumers for changed APIs. Do not mistake a Storybook example for server behavior.
