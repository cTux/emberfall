# New authoritative server

Read [the package guide](README.md). Keep simulation ownership in Miniplex,
replication in Colyseus and persistence in the repository. Validate client
commands and derive ownership from the session. Preserve ordered entity views,
bounded input budgets and reconnect epochs. Test persistence with disposable
databases; retain failure-path and legacy-import coverage. Do not import the
original server/common/client packages or write their saves.
