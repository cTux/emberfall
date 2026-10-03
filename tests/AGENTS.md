# Browser test instructions

- Read [development](../docs/development.md) for root versus UI browser commands, ports and save isolation. Build before production browser tests.
- Use independent browser contexts for separate characters. Do not clear an actual player's localStorage or use a live save database.
- Verify observable player outcomes and server agreement. Pair UI/prediction checks with authoritative tests when changing shared rules.
- Prefer explicit simulation timestamps in Node tests over long browser sleeps. Wait for meaningful UI/state conditions in browser tests.
- For rendering claims inspect relevant screenshots; for performance claims report the measured scene, settings and metric. A screenshot or launch alone is not a benchmark.
- Keep generated screenshots, traces and reports in ignored artifact directories. Do not add brittle tests that merely match documentation wording.
