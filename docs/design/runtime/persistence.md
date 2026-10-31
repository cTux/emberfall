# Runtime persistence and compatibility

[Back to Game runtime](../new-runtime.md).

## Compatibility

The original runtime and parity tooling are retired. Canonical commands are
`pnpm dev`, `pnpm build`, `pnpm start`, `pnpm test`, `pnpm typecheck` and
`pnpm test:browser`. Existing ports, `PORT_NEW`, `SAVE_PATH_NEW` and browser
storage keys remain compatible. Retained original assets keep their attribution.
The default database directory changes with the package path; see
[operations](../../operations/saves.md#persistence-and-backup) before upgrading a deployment.

Keep 20 Hz simulation, current numbers, wrapped maps, all classes, companions,
training, encounters, graphics preferences, UI, audio and recovery behavior.
Prediction covers movement, aiming and local cast presentation. Camera, shadows,
attachments and sound follow reconciled presentation. Replayed inputs must not
repeat sounds or effects. Server confirmation owns hits, deaths and pickups.
Automatic attack prediction starts from the first confirmed server attack time;
entering training or a forest never invents an initial swing from a snapshot's
timestamp. Established cycles still extrapolate between replies, and manual casts
retain their immediate request-based prediction.
Each confirmed local projectile keeps its server identity and its original visual
heading, even after a sibling projectile disappears. A snapshot timestamp alone
does not reject a future automatic cast before the server's attack phase reaches
it. Shots first discovered after the server launch retain their authoritative
in-flight position and remaining distance instead of restarting at the player.
Confirmed completion, rejection, death, transfers and stale-state limits still
retire visuals; these corrections do not change server damage or projectile range.
Buffered enemy positions cannot retire a local projectile through a speculative
impact; only its visual range limit or authoritative completion ends its flight.

## Persistence

The executable now uses [Steam accounts](../steam-accounts.md) for character ownership
and nickname onboarding/editing. Existing browser saves remain intact; Steam
accounts start fresh. Browser-token authentication remains only in isolated parity
fixtures. Sessions, account tables and public-origin configuration are described
in the account design and [operations](../../operations/steam.md#steam-login-new-runtime).

`@colyseus/database` boots a SQLite schema through Drizzle using Node's synchronous
SQLite connection. Character documents occupy cloud-save slot 0; identity hashes
and world membership use Emberfall tables. Save format versions are distinct from
the cloud-save write revision. Small transactions use compare-and-swap revisions,
validate documents, and atomically save class changes before updating live state.
The repository's isolated SQL adapter is tested against the public Colyseus save
service; dependency upgrades must retain that compatibility.

Autosave runs every five seconds and disconnect also saves. A failed live save
retains state for retry. Shutdown attempts every character, closes transport and
database resources, and reports any failed writes with a nonzero exit status.
There is no asynchronous write queue. A crash can lose progress since the last
successful save. Restart restores village membership, not combat. Legacy import
reads an offline backup into a new destination and refuses to overwrite either
an existing destination or the source. See the
[server guide](../../../packages/server/README.md) for commands and identity
transfer. SQLite and the shared party registry require a single server process.
