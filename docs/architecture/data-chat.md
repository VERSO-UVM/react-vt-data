# Data Chat: options and recommendation

Status: v0 implemented on branch `db/data-chat` (2026-10-01); later phases are proposals.

A chat agent that answers open-ended questions about the warehouse ("which
towns in Addison County lost population since 2010?", "is median rent rising
faster than income in Rutland?"), shows its sources, and can hand results to
the existing charts and working report. It ships behind a **feature flag**. The
eventual target is a hard **$300/month** cap.

Decisions so far:

- **Model:** GPT-6.1 Sol by default, reached through OpenRouter so any model is
  a config change (`CHAT_MODEL`). Compare candidates with the eval suite before
  switching: [guides/chat-evals.md](../guides/chat-evals.md).
- **Feature flag:** backend environment flag only. No invite codes or per-user gating.
- **v0 has no database and no spend cap.** Chats live in the browser's
  localStorage, and the browser sends the conversation history with each request,
  so the server stores nothing. The budget ledger, accounts, and server-side chat
  storage wait until the team settles on storage. See [v0 scope](#v0-scope).

## v0 scope

| In v0                                                                                   | Deferred until storage is decided                   |
| --------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `CHAT_ENABLED` flag and `GET /api/chat/status`                                          | Spend ledger and the monthly cap                    |
| `POST /api/chat` SSE route, stateless (history comes from the client, capped in size)   | Accounts and login                                  |
| The data tools, in-process (with previews trimmed for the model)                        | Server-side chat history and conversation logging   |
| `render_chart` tool using data references, and `POST /api/chat/data` to resolve them    | PDF report blocks                                   |
| `/chat` page; chats saved in localStorage like the working report                       | Session workspace handles that persist across turns |
| Per-turn bounds: output length, tool-loop iterations, maximum history size              |                                                     |
| In-memory per-IP rate limit (same approach as the MCP's; per worker, resets on restart) |                                                     |
| A dedicated OpenRouter key with a credit limit, which hard-stops requests once spent    |                                                     |

**Risk with no spend cap:** once the flag is on, nothing in our code limits
total monthly spend. Until the ledger exists, the per-turn bounds, the
in-memory rate limit, and the OpenRouter key's credit limit are the only
protection. So keep `CHAT_ENABLED` off in production, and turn it on only in a
UVM-only QA environment (on the VACC, not reachable from the internet) for
internal testers. That environment is a prerequisite for enabling chat anywhere.

## v0 implementation map

| Piece                | Where                                                                                           |
| -------------------- | ----------------------------------------------------------------------------------------------- |
| Flag + mount         | `backend/api/main.py` (`CHAT_ENABLED`), settings in `backend/chat/config.py`                    |
| Agent (Pydantic AI)  | `backend/chat/agent.py`: data tools with trimmed previews, `render_chart`, event streaming      |
| Chart contract       | `backend/chat/charts.py`: `ChartSpec`, `DataRef`, `resolve_rows`                                |
| Routes               | `backend/chat/router.py`: `GET /api/chat/status`, `POST /api/chat` (SSE), `POST /api/chat/data` |
| Offline model        | `backend/chat/demo.py` (`CHAT_MODEL=demo`), for UI work without an API key                      |
| Tests                | `backend/tests/test_chat.py` (fixture warehouse + demo model, no network)                       |
| Page                 | `frontend/src/app/chat/page.tsx`; nav link in `HeaderMenu` appears only when status is enabled  |
| Client, store, chart | `frontend/src/components/Chat/` (localStorage store, SSE client, `ChatChart`)                   |
| Report chart         | `frontend/src/components/Charts/AgentChart.tsx` (subtype `AgentChart`, works in working report) |
| Deploy               | `frontend/nginx.conf` (`/api/chat` unbuffered + client IP), `justfile` `chat_container_env`     |

Run locally with the demo model: `CHAT_ENABLED=1 CHAT_MODEL=demo just local-api`
and `just local-frontend`, then open `/chat`.

## Constraints from the current codebase

These narrow the options more than any vendor choice does.

| Fact                                                                                                                                              | Consequence                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend is a static export (`output: 'export'`) served by nginx, plus a GitHub Pages build                                                       | No Next.js API routes or server actions. The agent loop has to live in FastAPI (or a new service). Node-only libraries such as the Vercel AI SDK server need a new Node process. |
| `data_tools.DataToolService` + `TOOL_MODELS` already back the MCP server, and `docs/guides/mcp.md` anticipates "the application's internal agent" | The nine MCP tools can be called **in-process** from the agent, with no HTTP hop and no bearer token, reusing the same Pydantic schemas. This works with any model provider.     |
| MCP instructions say "No arbitrary SQL is accepted"                                                                                               | Adding a SQL tool reverses a deliberate decision. It needs its own guardrails (see tier T2).                                                                                     |
| API container mounts `/data` read-only                                                                                                            | The spend ledger needs a new small writable volume (e.g. `/state`, SQLite).                                                                                                      |
| No user accounts on the site, and the flag is on-for-everyone or off                                                                              | Once enabled, the endpoint is anonymous and public. **Abuse, not ordinary use, is the main cost risk.** Caps must be global and per-client.                                      |
| `NEXT_PUBLIC_*` values are inlined at build time                                                                                                  | Drive visibility from a backend status endpoint, so flipping the flag needs an API restart, not a frontend rebuild.                                                              |
| nginx already sets `proxy_buffering off` for `/api/mcp`                                                                                           | Add the same for `/api/chat` so streamed (SSE) responses aren't buffered.                                                                                                        |
| Multiple uvicorn workers keep separate in-memory counters (noted in `.env.example` for the MCP rate limit)                                        | Budget accounting must use shared storage (SQLite with WAL is fine), not process memory.                                                                                         |

## Decision 1: who runs the agent loop

| Option                                                                        | What you build                                       | Pros                                                                                                                                                                    | Cons                                                                                                             |
| ----------------------------------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **A. Pydantic AI in FastAPI** (provider-neutral)                              | `/api/chat` SSE route, tool functions, budget hooks  | Pydantic-native like `data_tools`. Usage tracking per run. **Swap GPT-6.1 Sol for Claude or others with a config change**, which lets us compare models on an eval set. | Provider-specific features (hosted tools, caching knobs) may lag or need escape hatches.                         |
| B. OpenAI Agents SDK (Python) in FastAPI                                      | Same as A                                            | First-party loop for OpenAI models, with function tools, MCP support, sessions, and tracing.                                                                            | Ties the loop to one provider. Switching later means rewriting the harness.                                      |
| C. Raw provider SDK, hand-written loop                                        | Same as A, plus the loop                             | Full control, no framework.                                                                                                                                             | We maintain streaming, retries, and tool plumbing ourselves, and again for each provider.                        |
| D. Provider-hosted agent platform (OpenAI AgentKit, Anthropic Managed Agents) | Agent config, a thin proxy, our MCP exposed publicly | Hosted loop and sandbox, less code.                                                                                                                                     | Data has to go through a public MCP endpoint. Platform lock-in. Less control over UX and cost accounting.        |
| E. Node service with the Vercel AI SDK                                        | A new container next to nginx                        | `useChat` and streaming UI out of the box. Provider-neutral.                                                                                                            | Adds a third runtime to the pod. Has to call Python tools over HTTP (MCP). Duplicates what FastAPI already does. |

**Recommendation: A (Pydantic AI).** The model choice is the decision most likely to change, and the pricing tiers move every few months. A provider-neutral loop in our own backend keeps that a config value. The frontend can still use a chat UI kit (e.g. assistant-ui, or the AI SDK's `useChat` with a custom transport) against the FastAPI SSE stream. You don't need a Node server for the client side. If we commit to OpenAI for good, B is the reasonable alternative.

## Decision 2: which tools the agent gets

The options stack: each one adds to the ones before it.

| Tier                                             | Capability                                                                                                                                                                                                                                                     | Risk / cost                                                                                                                                                                                                                                                                   |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **T1. The nine MCP tools, in-process**           | Discover, describe, search, query, compare, timeseries, zoning, export. Already bounded (rows, bytes, timeout, concurrency) and provenance-aware.                                                                                                              | Lowest. Weak at "rank all 250 towns by X": the model has to page through results and do the math itself.                                                                                                                                                                      |
| **T2. Read-only SQL over DuckDB**                | Real "random queries": joins, ranks, growth rates, across datasets.                                                                                                                                                                                            | Has to be locked down: a separate read-only connection, `SELECT` only (check the parsed statement type), `enable_external_access=false` + `lock_configuration`, `memory_limit`/`threads`, a timeout, row caps, and geometry columns excluded. Reverses the MCP's no-SQL rule. |
| **T3. Session workspace ("virtual filesystem")** | Every query result is saved as a named handle (a session-scoped DuckDB temp table or Parquet file). The model sees a preview plus the handle, and later SQL, charts, or exports reference the handle. Keeps context small and makes multi-step analysis cheap. | Low. Needs TTL cleanup on the `/state` volume. An in-memory dict FS with `ls/read/write` tools is the simpler variant; DuckDB tables are more useful for data.                                                                                                                |
| **T4. `render_chart` tool**                      | The model returns a structured chart spec that the frontend renders with the existing `Charts/` components. **"Add to working report"** reuses the `ItemsProvider` store.                                                                                      | Low. Structured output only, no code. This is the feature that makes the chat part of the app rather than a separate demo.                                                                                                                                                    |
| **T5. Code execution sandbox**                   | pandas, statistics, matplotlib, and files for anything SQL can't express.                                                                                                                                                                                      | See Decision 3.                                                                                                                                                                                                                                                               |

**Recommendation:** ship T1 + T3 + T4 first, then T2 behind its own flag after a security review, and T5 only if real usage shows questions SQL can't answer. T1–T4 are our own Python functions, so they work with any provider.

## Charts and reports: pass references, not data

The agent never restates a table to make a chart, and it doesn't need a file
system. A chart is a **data reference plus an encoding**:

```json
{
  "kind": "line",
  "title": "Median household income, Addison and Chittenden counties",
  "data": {
    "tool": "get_timeseries",
    "args": {
      "dataset_id": "acs5_ts_household_income",
      "location_ids": ["50001", "50007"]
    }
  },
  "x": "year",
  "y": "median_household_income",
  "series": "name"
}
```

That's a few dozen tokens however large the result is.

- **The reference is the handle.** The warehouse is read-only and versioned, so
  re-running the same tool call returns the same rows. Nothing needs to be stored
  between turns, which fits the no-database v0. Later the reference can also be
  SQL text (tier T2), which is how derived numbers (growth rates, top-10 lists)
  get charted without the model computing them.
- **Who resolves it:** the browser posts the reference to `POST /api/chat/data`,
  which runs the same read-only data tool (following pages up to a row cap) and
  returns rows to the chart component. Saved chats in localStorage keep only the
  spec, so they stay small and re-fetch on load.
- **What the model sees:** data tool results are trimmed to a preview (first rows
  plus counts) before they reach the model. The model reads enough to write the
  narrative; full rows go to the browser by reference. This is also the biggest
  lever on token cost, since tool results are re-sent on every loop iteration.
- **Fits the existing types:** `ItemDataRef` in `frontend/src/types/cachedCharts.ts`
  describes exactly this, though nothing uses it yet. Agent charts become ordinary
  `ChartItem`s with a `dataRef`, so "Add to working report" works with the current
  store.

**Chart kinds:** `line` (change over years), `bar` (compare places or
categories; named categories draw as horizontal bars), `stacked_bar` and
`area` (parts of a whole, split by a series column), and `table` (rows to
scan; saved as subtype `renderTableAgent` so PDF export prints every row).
Together they cover the visual forms of the app's existing charts except maps
and scatter plots. References can point at `query_data`, `get_timeseries`,
`compare_places`, or `get_zoning_summary`, and can rank rows with `sort_by`
and `top`.

**One row per point:** `render_chart` rejects a spec when several rows land on
the same x (and series) value, which would silently hide all but one (the
issue #106 failure). The error names the columns that tell those rows apart,
so the agent can filter them (e.g. one `variable` or `quarter`) or use one as
the series.

**PDF reports** use the same pattern. A report is an ordered list of blocks:
markdown narrative (written by the model, quoting only the few numbers it
discusses), chart blocks (spec plus reference), and table blocks (reference plus
columns, never inlined rows). The frontend renders the blocks with existing
components and exports through the working report's PDF path (the repo already
has `html2pdf.js`, `jspdf`, and `@react-pdf/renderer`). If we later want PDFs
built on the server (emailed reports, for example), the same block list can be
rendered with a headless browser.

A sandbox (Decision 3) only matters for charts our components can't draw or
analysis SQL can't express. Those produce static images that don't match the
app, so they're a later fallback, not the main path.

## Decision 3: sandbox options (if we need T5)

| Option                                                                            | How data gets in                                                              | Cost model                                                                | Notes                                                                                                                                                   |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **OpenAI Code Interpreter** (hosted container, matches the chosen model)          | Upload extracts (e.g. a T3 handle exported to CSV/Parquet) as container files | $0.03 per 20-minute session for a 1 GB container (larger sizes cost more) | No extra vendor or keys. The container can't reach our API. Check whether it can call our function tools from inside; if not, we must stage data first. |
| Anthropic code execution tool (if we switch to Claude)                            | Programmatic tool calling: code in the container calls our tools as functions | 1,550 free container-hours/month per org, then $0.05/hr                   | Best fit if the model moves to Claude.                                                                                                                  |
| E2B                                                                               | We upload extracts, or the sandbox calls our API                              | Per-second compute, free tier                                             | Provider-neutral and built for AI code interpreters. Firecracker microVMs. Good Python SDK.                                                             |
| Modal Sandboxes                                                                   | Same; can also mount volumes                                                  | Per-second compute, monthly free credit                                   | Python-first and fits our backend. Can also host batch jobs later.                                                                                      |
| Daytona                                                                           | Same                                                                          | Per-second compute, free credit                                           | Fast start, persistent workspaces, self-host option.                                                                                                    |
| Vercel Sandbox                                                                    | Same                                                                          | Active-CPU billing                                                        | Best fit if we were on Vercel/Next server. We're not, so it adds an account without much benefit.                                                       |
| Cloudflare Sandbox / Containers                                                   | Same                                                                          | Workers paid plan + usage                                                 | Good if the agent itself ran on Workers. Weak fit for a Python backend.                                                                                 |
| Self-hosted on the UVM VM (rootless podman + gVisor, or a locked-down subprocess) | Direct, read-only mount of the warehouse                                      | No marginal cost                                                          | We have no root on the VM. Running untrusted model-written code next to production data on a university VM is a security and ops burden we don't need.  |
| In-browser (Pyodide / DuckDB-WASM)                                                | Ship small extracts to the client                                             | Free                                                                      | Cute, but the warehouse is ~700 MB, and results become invisible to the agent unless sent back.                                                         |

Third-party rates change often. Check current pricing before you pick one. **Recommendation:** hold off until QA and the evals show questions that the data tools (and later SQL) can't answer. When we need one, use a provider-neutral sandbox (E2B or Modal): models now go through OpenRouter, which doesn't expose providers' hosted interpreters, and a neutral sandbox keeps model choice a config value. See [Adding a sandbox later](#adding-a-sandbox-later).

## Adding a sandbox later

A sketch, so the work is scoped when the time comes:

1. **A `run_python` tool** taking `code` and `inputs`: a list of data references, the same `DataRef` charts use. The backend resolves each reference with `resolve_rows`, writes it into the sandbox as a CSV or Parquet file, runs the code (pandas available) with a time and memory limit, and returns stdout plus a small table preview to the model.
2. **Isolation:** the sandbox gets only those files. No network, no secrets, no warehouse access, and a fresh sandbox per question.
3. **Showing results:** computed rows aren't a warehouse query, so a chart can't reference them. Either let `render_chart` accept a small inline table (capped rows) for sandbox output, or save the output as a session table first, which needs the storage decision (tier T3).
4. **Limits and cost:** a separate `CHAT_SANDBOX` flag, a cap on executions per question, and sandbox time recorded next to token cost in the eval results.
5. **Evals first:** add cases that need computation (growth rates across all towns, correlations) and run them before and after, so the sandbox earns its place with numbers.

## Decision 4: what $300 buys

Rough per-question estimate for an agentic answer: ~5 model calls, ~75K input tokens total (mostly re-sent context), ~4K output tokens. Assumes ~80% of input is served from the prompt cache. **These are planning numbers.** Models use very different numbers of reasoning tokens for the same question, so measure real usage in the first week before trusting any comparison.

| Model                    | Input / cached input / output per MTok | ≈ cost per question | ≈ questions per $300 |
| ------------------------ | -------------------------------------- | ------------------- | -------------------- |
| **GPT-6.1 Sol** (chosen) | $2.00 / $0.10 / $10.00                 | $0.08               | ~3,600               |
| Claude Sonnet 5.5        | $2.00 / $0.20 / $10.00                 | $0.09               | ~3,300               |
| Claude Opus 5.5          | $4.00 / $0.20 / $20.00                 | $0.17               | ~1,750               |

GPT-6.1 Sol and Sonnet 5.5 have the same list price. Sol's cheaper cache reads give it a small edge on long agent loops. Both are about half the cost of Opus 5.5. Sol's input and output rates double and 1.5×, respectively, past 272K input tokens. Our conversations should stay well under that, but cap context per conversation to be sure. Keep the system prompt and tool list byte-stable at the start of every request so caching keeps working.

## Budget cap design (deferred, not in v0)

This needs server storage, so it waits for the storage decision. Defense in
depth, from the inside out:

1. **Per-turn bounds**: a maximum output length, a cap on tool-loop iterations (e.g. 8), and a lower reasoning effort for simple lookups.
2. **Per-conversation cap** (e.g. $0.50 or a token ceiling). Past it, the UI suggests starting a new chat.
3. **Per-client throttle**: questions per hour/day keyed on an anonymous cookie plus a hashed IP. With the flag on for everyone, this is what stops a single scraper from draining the month.
4. **Global monthly ledger** (SQLite on `/state`, WAL mode, shared across workers):
   - Before a turn: **reserve** a worst-case estimate. Refuse if `spent + reserved + estimate > cap`. Reserving prevents concurrent requests from overshooting together.
   - After each model response: settle the actual cost from reported usage (input, cached input, cache writes, output) × a price table in config, plus sandbox time if used.
   - Window resets on the 1st of the month (America/New_York). Optional soft threshold (e.g. 80%) to lower effort or switch to a cheaper model.
5. **Provider backstop**: a dedicated key with a hard spend limit slightly above the app cap. Both providers support one (checked 2026-10-16):
   - **OpenRouter:** an optional credit limit per API key. Once it's spent, that key's requests fail even if the account has credit. The docs give 402 ("insufficient credits") in one place and 403 with `error.metadata.limit_source: "openrouter_key_limit"` in another. A limit can reset on a schedule or never; `GET /api/v1/key` shows what's left.
   - **OpenAI** (only for a direct `openai:` model): a project or organization hard limit, which must be switched on ("Enforce a hard limit"); spend alerts alone don't block anything. Hitting it returns 429 with `project_spend_limit_exceeded` (or `organization_spend_limit_exceeded`).
   - Enforcement isn't instant on OpenAI, so spend can slightly exceed the limit; set it a little under what we can afford.
   - **Known gap:** the chat only recognizes 402 as "usage limit reached". An OpenRouter 403 key-limit error would read as "isn't configured", and an OpenAI 429 spend-limit error as "busy, try again". Reading `limit_source` or the error code from the response body would fix both.
6. **Reconcile** (optional, later): a nightly job compares the ledger with the provider's usage/cost API.

When the cap is reached, `GET /api/chat/status` returns `{ "available": false, "resets_at": "2026-11-01" }` and the UI shows: _"Data Chat has reached its monthly usage limit and will be back on November 1."_

## Feature flag design

One backend environment flag:

- `CHAT_ENABLED` (backend env). The chat router is only mounted when it's set, the same pattern as `MCP_ENABLED`. Off means the endpoints don't exist.
- The frontend calls `GET /api/chat/status` → `{ enabled, available, resets_at }`. The nav entry and chat page render only when `enabled` is true. If the call fails or the route is missing (flag off, or the GitHub Pages build with no API), chat stays hidden.
- Flipping the flag needs an API restart, not a frontend rebuild.

Trade-off: there's no "on for testers only" state. To test in production we turn it on for everyone, so the per-client throttle and global cap have to be in place before the first time we enable it. Local and staging testing just set the flag in `.env`.

## Proposed request flow

```
Browser (/chat, Mantine UI)
  │  POST /api/chat  (SSE stream)  ── cookie: anonymous client id
  ▼
FastAPI chat router (mounted only if CHAT_ENABLED)
  ├─ v0: in-memory rate limit + per-turn bounds
  │  later: throttle → reserve → (loop) → settle       ── SQLite /state
  ├─ Pydantic AI agent (model from config, default GPT-6.1 Sol; streaming)
  │     tools: 9 data tools (DataToolService, in-process)
  │            workspace handles (session temp tables)
  │            render_chart → ChartItem spec
  │            [later] sql_query (read-only DuckDB) · sandbox
  └─ streams text, tool activity, chart specs, citations → UI
```

## Phased plan

| Phase | Scope                                                                                                                                                                                      |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0     | **v0**: `CHAT_ENABLED` flag + status endpoint, stateless `/api/chat` SSE route, the nine data tools in-process, `/chat` page with localStorage history, in-memory rate limit. No database. |
| 0.5   | Once storage is decided: `/state` volume, spend ledger + monthly cap with tests, then decide on accounts.                                                                                  |
| 1     | Session workspace handles, `render_chart` + "add to working report", source/provenance display, conversation logging (with a notice) for evals.                                            |
| 2     | Read-only SQL tool behind its own flag after a security review; a small eval set of real planner questions, which we also use to compare GPT-6.1 Sol against Claude Sonnet 5.5.            |
| 3     | Sandbox, if evals show the need. Otherwise skip.                                                                                                                                           |

## Decisions from review (2026-10-16)

- **SQL (tier T2):** yes, behind its own flag. Log every query so we can check
  that pre-written tools weren't the better choice, verify results with evals,
  and promote queries that keep coming up into proper tools (cheaper and more
  consistent). Logging needs the storage decision, or a log file to start.
- **Conversation logging:** when we add it, show a banner on the chat page;
  ask for consent once there are user accounts.
- **Where chat runs:** UVM-only QA environment first (see v0 scope).
- **Sandbox:** hold until QA shows the need (see Adding a sandbox later).

## Still open

1. Budget: the monthly amount, and whether heavy users could ever bring their
   own OpenRouter key or pay for more (a question for Emma).
2. Which model becomes the default: compare GPT-6.1 Sol and DeepSeek V4.1
   Flash with `--repeat 3`, and check where OpenRouter routes DeepSeek requests
   and what those providers retain.

## Sources

- OpenRouter limits (per-key credit limits): https://openrouter.ai/docs/api-reference/limits
- OpenAI spend limits: https://developers.openai.com/api/docs/guides/spend-limits

- OpenAI API pricing: https://developers.openai.com/api/docs/pricing (GPT-6.1 Sol rates, Code Interpreter containers)
- Claude rates and code-execution pricing: Anthropic API docs, as of 2026-09-25
