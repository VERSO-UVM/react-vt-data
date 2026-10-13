# Comparing models for Data Chat

Data Chat reaches its model through [OpenRouter](https://openrouter.ai), so any
tool-capable model is one setting away. The eval suite answers "is this model
good enough, and what does it cost?" with numbers instead of impressions: every
model answers the same chats, automatic checks and a judge model grade them
against real warehouse data, and a local page shows the answers side by side.

## Setup

Add an OpenRouter key to the repository's `.env` (give it a credit limit in the
OpenRouter dashboard):

```dotenv
OPENROUTER_API_KEY=sk-or-...
```

## Run a comparison

```sh
just chat-eval openai/gpt-6.1-sol openai/gpt-6-luna deepseek/deepseek-v4.1-flash
```

Models are OpenRouter slugs. Each one plays every chat in
`backend/evals/chat/cases.toml`, then the judge grades each chat. Progress
prints as chats finish, followed by a summary:

```text
Model                         Score  Quality  $/chat   Time/chat  Tokens   Errors
openai/gpt-6.1-sol            96%    8.0/10   $0.0540  43s        114,312  0
openai/gpt-6-luna             74%    5.8/10   $0.0042  40s        100,048  1
deepseek/deepseek-v4.1-flash  87%    7.6/10   $0.0108  25s        211,011  0
```

Options go after the models:

| Option            | Use                                                                      |
| ----------------- | ------------------------------------------------------------------------ |
| `--cases ID ...`  | Only these cases (`just chat-eval-cases` lists them)                     |
| `--repeat N`      | Play each chat N times; models vary run to run, so use 3 before deciding |
| `--judge SLUG`    | A different judge (default `anthropic/claude-opus-5.5`)                  |
| `--no-judge`      | Automatic checks only, no judge cost                                     |
| `--concurrency N` | Chats running at once (default 3)                                        |

To find candidates, list tool-capable models by price (cheapest output first):

```sh
just chat-eval-models
just chat-eval-models qwen
```

Without `just`: `cd backend && uv run python -m evals.chat run --models ...`.

## Compare the answers

```sh
just chat-eval-ui
```

Then open <http://localhost:3000/chat/evals/>. Pick a run and up to a few
models. The page shows the summary table (best value in each column in bold),
then each case with one column per model: its score, the judge's summary,
anything that failed and why, and the full answer with its charts rendered
exactly as in the chat. Read the transcripts, not just the scores: the judge is
good but not infallible.

Runs are saved as JSON in `backend/evals/chat/results/` (ignored by git). Share
a run by sending its file; drop it into someone else's results folder to view it.

## How scoring works

- **Automatic checks** (free): the chat finishes without an error, each answer
  stays under `max_words` (250), and, when the case sets `expect_chart`, a
  chart or table of one of those kinds appears.
- **Judge criteria**: the case's own criteria plus three general ones (no
  invented numbers; clear and concise; charts fit the question). The judge
  sees the questions, the answers, the tools the agent used, the first rows of
  every chart, and the case's reference data pulled live from the warehouse.
  It passes or fails each criterion with a reason.
- **Score** is the share of checks and criteria passed. **Quality** is the
  judge's overall 1–10 rating for a planner relying on the answer.
- **Cost** is what OpenRouter reported for the chat's model calls (judge cost
  is printed separately). A chat that ended in an error shows no cost.

A first full run (5 chats × 3 models) cost $0.34 in chat calls (one errored
chat not counted) plus $0.52 for the judge, so judging dominates when the
candidates are cheap.

## Add a case

Append to `backend/evals/chat/cases.toml`:

```toml
[[case]]
id = "zoning-table"                 # lowercase, unique
title = "Table: zoning districts"
capability = "table"                # free text, shown as a tag
turns = ["List every zoning district in Middlebury with its type and acres."]
expect_chart = ["table"]            # optional automatic check
criteria = [
  "Lists every district in the reference with its type and acres.",
  "Warns that overlay acres overlap base districts and shouldn't be summed.",
]

[[case.reference]]
label = "Middlebury zoning districts"
tool = "query_data"
args = { dataset_id = "zoning_districts", filters = { town = ["Middlebury town"] } }
```

Guidelines:

- **One behavior per criterion**, so a failure says exactly what went wrong.
- **Compare to the reference, don't hard-code numbers** ("matches the
  reference"), so the case survives a warehouse rebuild. If a reference pins a
  year, update it when newer data lands.
- **References are ground truth for the judge.** Any data tool works; add
  `sort_by` and `top` to rank rows. Check that a reference returns what you
  expect before relying on it.
- **Multi-turn cases** list several `turns`; later turns see earlier answers,
  as in the real chat.
- Run `just test-chat` after editing; it validates every case and reference.

## Switch the chat's model

Set `CHAT_MODEL` in `.env` to any slug that did well, then restart the API:

```dotenv
CHAT_MODEL=deepseek/deepseek-v4.1-flash
```

`CHAT_MODEL` also accepts any Pydantic AI model string (`openai:...`,
`anthropic:...`) and `demo`, a scripted offline model for UI work.
