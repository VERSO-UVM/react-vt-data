# Data Chat eval history

Every Data Chat model comparison, newest first. Add an entry for each run that
informs a decision; don't edit old entries, so earlier results are never lost.
How to run evals: [guides/chat-evals.md](../guides/chat-evals.md). Raw run
files (full transcripts and judge verdicts) stay in
`backend/evals/chat/results/` on the machine that ran them; they aren't
committed.

Unless noted, every run uses the 5 cases in `backend/evals/chat/cases.toml`
(6 questions; one case has a follow-up) and Claude Opus 5.5 as the judge, both
through OpenRouter. **Score** is the share of automatic checks and judge
criteria passed; **quality** is the judge's 1–10 rating. Chat cost excludes
the judge.

Case columns: **Trend** = income-trend, **Rank** = renter-burden-ranking,
**Compare** = home-values-follow-up, **Mix** = jobs-mix, **Limits** =
forecast-limits.

## 2026-10-16: Haiku 5.5 vs Sol vs DeepSeek, 3 repeats (decision run)

- **Setup:** 3 repeats per model, 45 chats. OpenRouter routing with
  `data_collection: "deny"`. Code as committed in `66aee96e`. DeepSeek ran as
  a separate run at the same time with the same settings and was merged in
  (`20261016-192204` into `20261016-192004`).
- **Decision:** Claude Haiku 5.5 became the default model.

| Model               | Score | Quality | Cost / chat | Time / chat | Tokens / chat | Errors |
| ------------------- | ----- | ------- | ----------- | ----------- | ------------- | ------ |
| Claude Haiku 5.5    | 91%   | 7.6/10  | $0.0188     | 18s         | 176,887       | 0      |
| GPT-6.1 Sol         | 89%   | 7.1/10  | $0.0423     | 50s         | 83,107        | 2      |
| DeepSeek V4.1 Flash | 87%   | 7.5/10  | $0.0087     | 19s         | 175,426       | 0      |

| Model               | Trend | Rank | Compare | Mix | Limits |
| ------------------- | ----- | ---- | ------- | --- | ------ |
| Claude Haiku 5.5    | 96%   | 87%  | 82%     | 97% | 96%    |
| GPT-6.1 Sol         | 100%  | 77%  | 100%    | 67% | 100%   |
| DeepSeek V4.1 Flash | 100%  | 87%  | 78%     | 87% | 82%    |

- **Cost of the run:** $0.96 in chat calls (Sol's two failed chats report no
  cost) plus $1.67 for the judge.
- **Notes:** Sol's errors were one turn hitting the new 180 s timeout and one
  running out of steps. Haiku had no case below 82%. DeepSeek is half Haiku's
  price but weaker on Limits and Compare, and OpenRouter serves it through
  about 35 third-party hosts, many running reduced-precision (fp4) builds.

## 2026-10-16: Haiku 5.5 vs Sol vs DeepSeek, 3 repeats (interrupted)

- **Setup:** 3 repeats per model, 45 chats planned. OpenRouter's default
  routing (no `data_collection` setting). Code as committed in `7703a7fc`.
- **What happened:** Sol chats stalled. Two took over 8 minutes and ended in
  errors, and the last one was still waiting after 25 minutes, so the run was
  stopped. The runner then saved only at the end, so the judge's verdicts were
  lost; the numbers below come from the progress log (44 of 45 chats).
- **Led to:** per-turn and per-judgment timeouts, saving after every chat, and
  `evals.chat merge`.

| Model               | Score | Cost / chat | Time / chat | Errors         |
| ------------------- | ----- | ----------- | ----------- | -------------- |
| Claude Haiku 5.5    | 94%   | $0.0155     | 16s         | 0              |
| GPT-6.1 Sol         | 89%   | $0.0482     | 110s        | 2, plus 1 hung |
| DeepSeek V4.1 Flash | 84%   | $0.0117     | 19s         | 0              |

| Model               | Trend | Rank | Compare | Mix | Limits |
| ------------------- | ----- | ---- | ------- | --- | ------ |
| Claude Haiku 5.5    | 100%  | 97%  | 82%     | 93% | 96%    |
| GPT-6.1 Sol         | 100%  | 73%  | 100%    | 60% | 100%   |
| DeepSeek V4.1 Flash | 93%   | 93%  | 71%     | 83% | 82%    |

Sol's Mix average covers 2 chats; the third never finished.

## 2026-10-14: first comparison, Sol vs Luna vs DeepSeek, 1 repeat

- **Setup:** 1 run per model, 15 chats. OpenRouter's default routing. Code in
  `0f65a4b1` (recorded as `a1b31069`, its id before the rebase onto `main`).
- **Led to:** DeepSeek as the cheap candidate to watch; Luna dropped.

| Model               | Score | Quality | Cost / chat | Time / chat | Tokens / chat | Errors |
| ------------------- | ----- | ------- | ----------- | ----------- | ------------- | ------ |
| GPT-6.1 Sol         | 96%   | 8.0/10  | $0.0540     | 43s         | 114,312       | 0      |
| GPT-6 Luna          | 74%   | 5.8/10  | $0.0042     | 40s         | 100,048       | 1      |
| DeepSeek V4.1 Flash | 87%   | 7.6/10  | $0.0108     | 25s         | 211,011       | 0      |

| Model               | Trend | Rank | Compare | Mix | Limits |
| ------------------- | ----- | ---- | ------- | --- | ------ |
| GPT-6.1 Sol         | 100%  | 100% | 100%    | 80% | 100%   |
| GPT-6 Luna          | 100%  | 50%  | 89%     | 30% | 100%   |
| DeepSeek V4.1 Flash | 100%  | 90%  | 67%     | 90% | 89%    |

- **Cost of the run:** $0.34 in chat calls (Luna's failed chat reports no
  cost) plus $0.52 for the judge.
- **Notes:** Luna dropped Essex Junction from the ranking and errored on Mix.
  The judge flagged that DeepSeek's top-10 chart wasn't sorted.

## 2026-10-14: first smoke tests, Sol only

Two small runs while building the suite, both on GPT-6.1 Sol:

| Run           | Cases       | Score      | Chat cost | Judge cost | Finding                                                                                                                                                                 |
| ------------- | ----------- | ---------- | --------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| First         | Trend       | 89%        | $0.036    | $0.022     | All 7 chart attempts failed: through OpenRouter, the chart's `args` field reached the model with no fields listed, so it always sent `{}`. Fixed by listing the fields. |
| After the fix | Trend, Rank | 100%, 100% | $0.121    | $0.058     | Charts worked. Sol sent filter values as single values instead of lists and recovered slowly; the agent now wraps them in lists.                                        |
