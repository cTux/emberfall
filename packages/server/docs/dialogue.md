# Village dialogue setup and troubleshooting

[Back to Authoritative game server](../README.md).

Code paths in this guide are relative to `packages/server` unless prefixed with another package or repository directory.

## Village dialogue

Village NPCs use a local [Ollama](https://docs.ollama.com/api/chat) service. The
server defaults to `http://127.0.0.1:11434` and `llama3.2:3b`, a roughly 2 GB
model download. No API key is required. OpenCode's free tier rejects external
applications, so `OPENCODE_API_KEY` is no longer used for dialogue.

### Windows setup in G:\AI

From the repository root in PowerShell:

```powershell
pwsh -NoProfile -File scripts/setup-ollama.ps1
```

The script downloads the official signed installer to `G:\AI\downloads`, installs
binaries in `G:\AI\Ollama`, sets the user environment variable `OLLAMA_MODELS` to
`G:\AI\models`, disables cloud features with `OLLAMA_NO_CLOUD=1`, starts Ollama on
loopback and pulls `llama3.2:3b`. Follow the installer prompts. Quit any existing
Ollama tray application or `ollama serve` process before running setup so the
storage settings take effect. Ollama may still keep configuration, tray logs and
installer temporary files in standard Windows profile directories; model files
and installed binaries use G:\AI. The helper's server logs go to `G:\AI\logs`.
See the official [Windows installation guidance](https://docs.ollama.com/windows).

For a smaller download and lower memory needs, run the helper with
`-Model llama3.2:1b` (roughly 1.3 GB), and set `OLLAMA_MODEL=llama3.2:1b` in
Emberfall's root `.env`. Speed depends on the server's CPU/GPU and RAM.

Optional server configuration in the repository-root `.env`:

```dotenv
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.2:3b
```

`OLLAMA_BASE_URL` and `OLLAMA_MODEL` belong only to the game server; restart it
after edits. `OLLAMA_MODELS` and `OLLAMA_NO_CLOUD` configure the **Ollama process**,
so putting them only in Emberfall's `.env` does not configure an already running
Ollama service. The setup helper persists those two variables for your Windows
user. Restart Ollama after changing them. Requests use native `/api/chat`,
non-streaming output, a 60-second deadline for model loading, bounded generation
and a ten-minute model keep-alive. No model download or service installation runs
automatically from the game server. Cloud model tags are rejected and no paid or
external fallback is used.

Ollama must run on the machine hosting the **game server**, even when the client
is hosted on GitHub Pages. For a separate backend, install Ollama there or configure
a private Ollama endpoint reachable by that backend. Keep port 11434 private;
the browser never needs access to it. On later sessions, start Ollama from its
installed app or run `& 'G:\AI\Ollama\ollama.exe' serve` with the configured user.

### Check and troubleshoot

From the repository root, test the production provider without starting a world
or opening a database (loads the same environment files as server startup):

```sh
node --env-file-if-exists=.env --env-file-if-exists=packages/server/.env packages/server/scripts/check-npc-dialogue.ts
```

The check exits nonzero if the model cannot supply a valid line. Each failed
attempt logs `provider: ollama`, the model, reason (`http`, `network`, `timeout`,
or `invalid_response`), HTTP status or known network error code when available,
elapsed time, deadline and retry delay. The requests run on the server and do not
appear in the browser's Network panel. Cooling requests and world cancellation
stay quiet. Prompts, responses and raw exceptions are never logged.
The first valid response after a failure logs `NPC dialogue provider recovered`
with the provider and model; subsequent healthy responses stay quiet.

`ECONNREFUSED` usually means Ollama is not running or the address is wrong. HTTP
404 usually means the configured model has not been pulled; run
`& 'G:\AI\Ollama\ollama.exe' pull llama3.2:3b`. HTTP 503 can indicate insufficient
resources or an overloaded queue. A timeout includes model loading and generation;
try the smaller model or inspect `ollama ps` and the service logs. An invalid
response includes a safe `validationFailure` code: `missing_body`,
`response_too_large`, `invalid_json`, `incomplete`, `missing_text`, `empty_text`,
`text_too_long` or `control_characters`. These distinguish validation failures
without exposing model output. Line breaks and tabs are folded into spaces;
valid replies retain their full text within the 32 KiB response limit. Spoken text
is capped at 32,768 characters, including for injected providers. Empty answers
and other control/format characters still fail.

If the provider fails, the village visibly receives Silenced and retries after
its cooldown; movement and trading continue. Successful replies restore voices.
Tests inject the HTTP request or dialogue provider and require no installed model.
