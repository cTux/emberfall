# Code structure

[Back to Development and verification](../development.md).

## Code structure

Keep each module focused on one responsibility. Split implementation, declarative
definitions and domain test groups at their ownership boundaries; keep composition
roots small and their dependencies explicit. Oxlint caps JavaScript and TypeScript
files at **249 nonblank lines**, including comments. Blank lines are excluded so
readable spacing does not compete with the size limit. The reviewed
`packages/client/src/rendering/pixi-context.ts` drawing façade has a **260-line cap**:
it implements one drawing interface while state, textures, pools and lifecycle live
in separate modules. Its exception permits no further growth. Extract meaningful
ownership rather than forwarding wrappers or compressed formatting to meet a cap.
Review stylesheet and configuration size by the same responsibility guideline.

Name functions for their actions and values for their domain meaning. Keep guards
and error paths explicit, and break complex expressions into named steps when
that makes their purpose clearer. Short geometry names such as `x` and `y` are
appropriate when their meaning is clear. Human review still checks readability;
passing automated checks alone does not establish a good module boundary.

Represent repeated content choices with typed objects or maps, checked with
`satisfies` where it preserves useful literals. Let existing rules consume those
definitions, as core's drop tables do. Keep side effects and transactions in their
own owners; a configuration table does not replace validation, save ordering or
error handling. Reuse the documented package dependency directions, enforced by
[`package-boundaries.test.ts`](../../tests/package-boundaries.test.ts).
