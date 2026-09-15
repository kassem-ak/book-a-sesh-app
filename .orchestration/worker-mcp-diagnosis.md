# codex / gemma4 MCP workers: why they will not connect

Diagnosed 2026-09-15. Both servers report `CONNECTION_CLOSED` at session start
and cannot be dispatched to.

## Root cause

Both entries in `C:\Users\kasse\.claude.json` invoke a subcommand that no longer
exists in the installed Codex:

```json
"codex":  { "command": ".../Codex/bin/codex.exe", "args": ["mcp-server"] },
"gemma4": { "command": ".../Codex/bin/codex.exe", "args": ["--oss", "--local-provider", "ollama",
                                                          "--model", "gemma4:12b", ..., "mcp-server"] }
```

Installed version is **codex-cli 0.154.0**, whose subcommand list is:

```
agents  exec  review  login  logout  mcp  plugin  app-server  remote-control
app  completion  update  doctor  sandbox  debug  apply  resume
```

There is no `mcp-server`. Codex documents "If no subcommand is specified,
options will be forwarded to the interactive CLI", so `mcp-server` is parsed as
a *prompt*, the interactive CLI starts, and it exits immediately:

```
$ echo '<initialize jsonrpc>' | codex.exe mcp-server
Error: stdin is not a terminal
```

An immediate exit on stdio is exactly what the host reports as
`CONNECTION_CLOSED`.

## Replacements probed, none work

| Invocation | Result |
|---|---|
| `codex mcp serve` | `error: unrecognized subcommand 'serve'` |
| `codex mcp-server serve` | `error: unrecognized subcommand 'serve'` |
| `codex app-server proxy` | `failed to connect to socket .../app-server-control.sock` |

`codex mcp` in 0.154.0 only **manages external MCP servers** for Codex
(`list` / `get` / `add` / `remove` / `login` / `logout`). It does not make Codex
serve as one. The binary itself is healthy — `codex --version` works and the
file is present at the configured path.

## Options

1. **Pin an older Codex** that still exposed `mcp-server`, and leave the config
   as-is. Verify with
   `codex --help | grep mcp-server` before relying on it.
2. **Drop the two entries** from `.claude.json` so sessions stop trying to
   connect to a server that cannot start, and delegate to in-process subagents
   instead (what this branch's work actually used).
3. Check whether a current Codex ships MCP-server mode under a different name
   (`codex doctor` may help) and update `args` accordingly.

This is a host-configuration fix and needs an interactive session — it cannot be
repaired from inside a run whose workers are already failing to start.

## Follow-up evidence (2026-09-15, second attempt)

Re-probed after the session limit reset. The conclusion is unchanged and now
rests on three independent checks:

1. **Subcommand list.** `codex --help` lists `mcp` (manage *external* MCP
   servers: list / get / add / remove / login / logout). There is no serve mode.
   `codex mcp serve` -> `error: unrecognized subcommand 'serve'`.
2. **Binary strings.** Searching the 298 MB `codex.exe` for `mcp-server` returns
   only `mcpServers` config-key references (plugin.json / .mcp.json handling).
   The subcommand does not exist even as a hidden or deprecated alias.
3. **npm.** `npm view @openai/codex version` is also `0.154.0` - the installed
   build is current, so upgrading restores nothing. Newer tags are
   `0.155.0-alpha.*` prereleases.

So this cannot be repaired by changing the invocation: the capability is absent
from the installed and latest published Codex.

### The only real options

- **Pin an older Codex for the MCP entries**, without touching the current
  install, e.g. `"command": "npx", "args": ["-y", "@openai/codex@<version>",
  "mcp-server"]` once you identify a version that still had it. Verify with
  `npx -y @openai/codex@<version> --help | grep mcp-server` before relying on it.
  I did not install an older build unilaterally - that is a downgrade of your
  tooling and your call.
- **Remove the two entries** so sessions stop attempting a server that cannot
  start, and use in-process subagents (which is what this branch's work used
  throughout).

Until one of those happens, any instruction to "dispatch to codex/gemma4" cannot
be carried out, and work routed to them silently does not happen.
