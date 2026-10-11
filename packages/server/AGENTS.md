# Authoritative server

Read [the package guide](README.md). Keep simulation ownership in Miniplex,
replication in Colyseus and persistence in the repository. Validate client
commands and derive ownership from the session. Preserve ordered entity views,
bounded input budgets and reconnect epochs. Test persistence with disposable
databases; retain failure-path and legacy-import coverage. Read legacy saves
only through the offline importer into a new destination.
