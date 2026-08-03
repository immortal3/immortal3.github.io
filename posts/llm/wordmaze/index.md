# Wordmaze: a one-shot, verifier-graded puzzle for RL

> Wordmaze is a single-turn word-ladder puzzle with a password constraint, built to be trivially gradable for RL.

- Author: Dipkumar Patel
- URL: https://dipkumar.dev/posts/llm/wordmaze/
- Published: 2026-06-03
- Updated: 2026-06-04
- Tags: llm, rl, grpo, reasoning, dataset

---

I wanted an RL task I could grade with a plain Python function <sup class="cite-ref"><a href="https://arxiv.org/abs/2411.15124" target="_blank" rel="noopener">[1]<span class="cite-tip">Lambert et al. (2024) &middot; Tülu 3 (RLVR) &middot; arXiv:2411.15124</span></a></sup>: no judge model, no human labels. Something a frontier model finds easy and a small one finds hard, so the gap between them is what RL has to close. Wordle is the usual pick, but it drags along multi-turn state and a reward surface that's easy to hack <sup class="cite-ref"><a href="https://arxiv.org/abs/1606.06565" target="_blank" rel="noopener">[2]<span class="cite-tip">Amodei et al. (2016) &middot; Concrete Problems in AI Safety &middot; arXiv:1606.06565</span></a></sup>. So I built a different one.

Numbers first. On the hard config, `gemini-3.1-pro-preview` solves **99.5%** of these puzzles. `gemini-2.5-flash` gets **36.5%**, and it burns a median of **19,374** reasoning tokens per puzzle to do it, about five times what 3.1-pro spends to win. `Qwen3.5-9B` lands at 9.5%, `Qwen3.5-4B` at 2.5%. So the task is cheap to write down, cheap to grade, and it pulls models apart. That's what you want from an RL environment.

This post is about the environment: the puzzle, the verifier, how I generate the data, and what the baselines say. The training story, what happens when you actually point GRPO <sup class="cite-ref"><a href="https://arxiv.org/abs/2402.03300" target="_blank" rel="noopener">[3]<span class="cite-tip">Shao et al. (2024) &middot; DeepSeekMath (GRPO) &middot; arXiv:2402.03300</span></a></sup> <sup class="cite-ref"><a href="https://arxiv.org/abs/2501.12948" target="_blank" rel="noopener">[4]<span class="cite-tip">DeepSeek-AI (2025) &middot; DeepSeek-R1 &middot; arXiv:2501.12948</span></a></sup> at it, is a separate post.

## The puzzle

You get a **start** word and a **goal** word of the same length. Build a path between them under three rules:

1. Change **exactly one letter** per move.
2. Every word in the path must be a valid English word of that length.
3. Reach the goal in at most `max_moves` moves.

That much is a classic word ladder. The twist is a fourth rule, the **password**:

> For each move, look at the letter that changed. If it moved **forward** in the alphabet (`a → z`), write `F`. If it moved **backward** (`z → a`), write `B`. Concatenate those into a string. It must equal the puzzle's password.

So the path isn't just any route from start to goal. It's a route whose *shape* (the forward/backward pattern of its letter changes) spells a specific string. Here's the canonical example, `cold → warm` with password `FFBF`:

```text
cold -> cord -> word -> ward -> warm
        F       F       B       F
```

`l→r` forward, `c→w` forward, `o→a` backward, `d→m` forward: `FFBF`.
The model sees the puzzle as plain text and must reply with only the path, inside a tag:

```text
start: cold
goal: warm
word_length: 4
max_moves: 4
password: FFBF
```

```xml
<answer>cold -> cord -> word -> ward -> warm</answer>
```

That output contract is deliberate. Parsing `<answer>...</answer>` and splitting on ` -> ` is all a verifier needs: no free-text to interpret, no second model in the loop.

<details>
<summary>One dataset row (JSON)</summary>
<pre><code>{
  "id": "wordmaze-13-01800",
  "start": "fold",
  "goal": "gold",
  "word_length": 4,
  "max_moves": 3,
  "password": "BFB",
  "solution": "fold -&gt; bold -&gt; sold -&gt; gold",
  "answer": "&lt;answer&gt;fold -&gt; bold -&gt; sold -&gt; gold&lt;/answer&gt;",
  "path": ["fold", "bold", "sold", "gold"],
  "num_moves": 3
}</code></pre>
Each row also carries a ready-to-use <code>prompt</code> and chat <code>messages</code> (system + user), so you can evaluate or train without assembling anything.
</details>


## Design choices

My goal was to build a task such that i could run RL on it with limited compute, and it can't be easily cheated through.


**Single turn, not a multi-turn dialogue.** Wordle is a multi-turn game: the model guesses, gets feedback, guesses again, and the prompt accumulates state. Now, during RL, you can still treat it as single turn, by giving previous guesses as part of the prompt. But, Reward isn't very clear in this setting. Wordmaze is designed to be a single shot. The model reads a fixed prompt and emits a complete answer. Everything the verifier needs is in that one string, which keeps rollout cost low and grading simple. So, i don't end up spending my savings on RL training.

**A constraint the model can't bluff past.** The password is the point. Without it, a word ladder has many valid solutions and a model can stumble into any one of them. Even with password, there are still many valid solutions, but at least the model has to plan. The password forces planning: you have to find a path whose letter-change directions spell a specific pattern, so most valid ladders are wrong answers. It also makes the task *character-level*. To get the password right you have to know which letter changed between two words and whether it went up or down the alphabet.

There are lot of knobs that can be tuned when you generate the dataset. For example, Password length (number of moves), Word length, Vocabulary size, etc. This knobs can be tuned to generate different difficulty levels of the task. We will talk about this in more detail in the later sections.


## The verifier

Grading is a pure function. Extract the path from `<answer>...</answer>`, split on ` -> `, and run a fixed list of checks. There are no learned components and no partial-credit heuristics baked into the truth label. Every check is a boolean:


| Check | Passes when |
|---|---|
| `valid_format` | parses to ≥2 same-length words |
| `starts_correctly` | first word == start |
| `reaches_goal` | last word == goal |
| `within_max_moves` | ≤ `max_moves` steps |
| `exact_moves` | exactly `max_moves` steps |
| `one_letter_changes` | each step changes one letter |
| `all_valid_words` | every word in the dictionary |
| `correct_word_length` | every word the right length |
| `password_matches` | computed F/B == password |
| `fully_valid` | all of the above |

`fully_valid` is the metric we care about in the evaluation. The per-check booleans are what make the dataset useful for RL: instead of a sparse 0/1 signal, you have multiple booleans which can be used to shape a overall reward.

**`at most` versus `exactly`.** The prompt asks the model to reach the goal "in at most `max_moves` moves," but the verifier tracks both `within_max_moves` and `exact_moves`. That difference matters. If the reward only says "valid path that reaches the goal," a model can learn the shortcut: emit a two-word answer like `<answer>cold -> warm</answer>`, pass the loose checks, and ignore the password. More on that in the training post. For now, this is why the verifier reports both checks.

Here's the verifier as a toy. The start and goal are fixed; fill the blanks between them, one word per step, and watch every check resolve as you go:

<div class="wm-try" id="wm-try">
  <div class="wmt-head">
    <span class="wmt-spec">fill the ladder in <b id="wmt-moves"></b> moves &middot; password <b id="wmt-pw"></b></span>
    <button type="button" class="wmt-btn wmt-mini" id="wmt-new">New puzzle</button>
  </div>
  <div class="wmt-desc">Build a word ladder: change exactly one letter each step to get from the first word to the last, in the number of moves shown. For each step, <b>F</b> means the changed letter moved forward in the alphabet and <b>B</b> means backward; the F/B string has to spell the password.</div>
  <div class="wmt-line" id="wmt-line"></div>
  <div class="wmt-cap">Type each step one letter per box; it auto-advances. The changed letter lights up green; the box turns red if the step isn't a valid one-letter word. The F/B under each arrow builds the password. <em>Words are checked against a wordfreq English list, loaded in the background.</em></div>
  <div class="wmt-pwrow">
    <span class="wmt-pwlabel">password</span>
    <span class="wmt-pwcells" id="wmt-pwcells"></span>
    <span class="wmt-verdict" id="wmt-verdict"></span>
  </div>
  <div class="wmt-controls">
    <button type="button" class="wmt-btn" id="wmt-reset">Reset</button>
    <button type="button" class="wmt-btn" id="wmt-sol">Show a solution</button>
  </div>
  <div class="wmt-checks" id="wmt-checks"></div>
</div>

<style>
.wm-try { border: 1px solid #e5e5e5; border-radius: 6px; background: #fafafa; padding: 20px; margin: 25px 0; font-family: inherit; }
.wm-try * { font-family: inherit; }
.wmt-head { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; font-size: 0.85em; color: #6b7280; padding-bottom: 12px; border-bottom: 1px solid #e5e5e5; margin-bottom: 16px; }
.wmt-spec b { color: #000; letter-spacing: 1px; margin: 0 2px; }
.wmt-mini { margin-left: auto; }
.wmt-line { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-bottom: 8px; }
.wmt-chip { padding: 9px 11px; border: 1px solid #6366f1; border-radius: 5px; background: rgba(99,102,241,0.08); font-weight: 600; letter-spacing: 3px; color: #000; }
.wmt-word { display: inline-flex; gap: 3px; padding: 3px; border: 1px solid transparent; border-radius: 6px; }
.wmt-tile { width: 30px; height: 38px; text-align: center; border: 1px solid #d0d0d0; border-radius: 5px; font-weight: 600; font-size: 1.05em; color: #000; padding: 0; }
.wmt-tile:focus { outline: none; border-color: #6366f1; box-shadow: 0 0 0 2px rgba(99,102,241,0.18); }
.wmt-tile.hot { color: #15803d; border-color: #15803d; background: rgba(21,128,61,0.12); }
.wmt-word.ok .wmt-tile { border-color: #bfe0c9; }
.wmt-word.bad .wmt-tile { border-color: #f0a6b5; }
.wmt-word.bad .wmt-tile.hot { color: #be123c; border-color: #be123c; background: #fff5f7; }
.wmt-arrow { display: inline-flex; flex-direction: column; align-items: center; min-width: 24px; color: #9ca3af; }
.wmt-arrow .a-sym { font-size: 0.95em; line-height: 1; }
.wmt-arrow .a-fb { font-size: 0.72em; font-weight: 700; height: 1.1em; color: #6366f1; }
.wmt-arrow .a-fb.bad { color: #be123c; }
.wmt-desc { color: #4b5563; font-size: 0.82em; line-height: 1.55; margin-bottom: 16px; }
.wmt-desc b { color: #15803d; }
.wmt-cap { color: #6b7280; font-size: 0.8em; margin-bottom: 16px; line-height: 1.5; }
.wmt-pwrow { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; border-top: 1px solid #e5e5e5; padding-top: 14px; font-size: 0.9em; }
.wmt-pwlabel { color: #6b7280; }
.wmt-pwcells { display: inline-flex; gap: 5px; }
.wmt-cell { width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; border: 1px solid #e5e5e5; border-radius: 4px; background: #fff; font-weight: 700; color: #9ca3af; }
.wmt-cell.wmt-set { color: #6366f1; border-color: #6366f1; background: rgba(99,102,241,0.10); }
.wmt-verdict { font-weight: 700; color: #15803d; }
.wmt-controls { display: flex; flex-wrap: wrap; gap: 10px; margin: 16px 0; }
.wmt-btn { font-family: inherit; font-size: 0.88em; border: 1px solid #d0d0d0; background: #fff; color: #000; padding: 7px 12px; border-radius: 4px; cursor: pointer; }
.wmt-btn:hover { border-color: #6366f1; color: #6366f1; }
.wmt-checks { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 22px; border-top: 1px solid #e5e5e5; padding-top: 14px; }
.wmt-row { display: flex; align-items: center; gap: 8px; font-size: 0.85em; }
.wmt-ic { width: 16px; height: 16px; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; font-size: 0.7em; font-weight: 700; flex: 0 0 auto; }
.wmt-ic.ok { background: rgba(21,128,61,0.12); color: #15803d; }
.wmt-ic.no { background: rgba(190,18,60,0.10); color: #be123c; }
.wmt-row code { font-size: 0.95em; color: #374151; }
.wmt-row .wmt-detail { color: #9ca3af; margin-left: 2px; }
@media (max-width: 600px) { .wmt-checks { grid-template-columns: 1fr; } .wmt-tile { width: 26px; height: 34px; } }
</style>
<script src="/static/wordmaze-try.js"></script>

The widget checks each word against a wordfreq English list (the common 4- and 5-letter words), fetched on demand. The grader is a touch more lenient: it accepts any word wordfreq has frequency data for, so an obscure word the widget rejects might still pass there.

## Generating the dataset


Puzzles are built backwards, the way a mystery writer starts with the culprit and works back to the clues. This is how your favourite murder mystery novel was written probably.

Start with a solution path, then read the constraints off it. The generator ([`create_dataset.py`](https://huggingface.co/datasets/immortal3/wordmaze/blob/main/create_dataset.py)) does this:

1. **Vocabulary.** Take the top 10,000 English words by frequency (via `wordfreq`), keep only pure `[a-z]` strings, and drop proper nouns: a blocklist of countries, major cities, US states, plus first names from NLTK. Common words keep the puzzles readable and keep the neighbor graph dense.
2. **Neighbor graph.** For each word length, build a graph where words are nodes and an edge connects two words that differ in exactly one position. The trick is bucketing by wildcard pattern (`c*ld`, `co*d`, …) so you find neighbors in linear passes instead of comparing every pair. There are many ways to do this and honestly, this is itself a leetcode coding interview question.
3. **Random walks.** Sample simple paths (no repeated words) of the requested length, then read off the start, goal, and password from each path. Because the password is *derived* from the walk, every generated puzzle is solvable by construction.
4. **Dedup and split.** Drop duplicates keyed on `(start, goal, password, length, moves)`, shuffle, assign stable IDs, and split 80/10/10 into train/validation/test.

A few notes to keep in mind. 
- Six-letter graphs are sparse, so random walks dead-end far more often than four-letter ones, and the generator logs thousands of failed attempts to fill the longer buckets. 
- Your sampled `path` is not the *only* solution, a model that finds a different valid path is still correct, which is why you grade with the verifier and never string-match against the reference. 
- Verifier has different dictionary than our dataset generation script, in dataset generation, we only use top 10k words by frequency, but the verifier uses the entire wordfreq English list.

Two configs are released, both 2,000 puzzles split 1,600 / 200 / 200:

- **`m3-4`**: 4-6 letter words, 3-4 moves. The easier curriculum config.
- **`m4-6`**: 4-6 letter words, 4-6 moves. The harder one, and the default.

Both live on the Hub at [`immortal3/wordmaze`](https://huggingface.co/datasets/immortal3/wordmaze), together with the generator script. It's self-contained (dependencies declared inline), so `uv run` builds the environment on the fly. Regenerate `m4-6` with:

```bash
uv run create_dataset.py \
  --move-counts 4-6 --word-lengths 4-6 \
  --num-examples 2000 --seed 42
```


## Baselines


This is the most fun part, also where you lose money if you don't have free credits.



Here is the baseline on the hard `m4-6` test split:

![Wordmaze m4-6 test leaderboard: gemini-3.1-pro 99.5%, 3.5-flash 83.5%, 2.5-flash 36.5%, Qwen3.5-9B 9.5%, Qwen3.5-4B 2.5%](/static/blog_photos/wordmaze/fig-leaderboard.png)


The top models basically solve it: 3.1-pro at 99.5%, 3.5-flash at 83.5%. The small open models are stuck in single digits, 9.5% for the 9B and 2.5% for the 4B. That gap, near-perfect at the top and almost nothing at the bottom, is the whole reason I made the dataset.

Accuracy alone hides the more interesting part, though. Here it is plotted against how much each model thinks (its reasoning tokens):

![Fully-valid rate versus median reasoning tokens for the three Gemini models on Wordmaze m4-6](/static/blog_photos/wordmaze/fig-frontier-budget.png)

Look at the weakest of the three. `gemini-2.5-flash` scores 36.5%, and not because it ran out of room to think. The opposite. It uses a median of 19,374 reasoning tokens <sup class="cite-ref"><a href="https://arxiv.org/abs/2201.11903" target="_blank" rel="noopener">[5]<span class="cite-tip">Wei et al. (2022) &middot; Chain-of-Thought Prompting &middot; arXiv:2201.11903</span></a></sup> per puzzle, against 3.1-pro's 4,100, and still loses. On six-move puzzles its median goes past 60k. In the plot, the dot is each model's median and the diamond is its slow tail (the 95th percentile). Both flash models hit the 63k token cap on their worst puzzles; 3.1-pro's worst (about 10k) is still below 2.5-flash's typical puzzle. So 2.5-flash isn't really reasoning, it's flailing: it searches, second-guesses, and never lands. **More thinking time isn't the fix. A better model is.** <sup class="cite-ref"><a href="https://arxiv.org/abs/2408.03314" target="_blank" rel="noopener">[6]<span class="cite-tip">Snell et al. (2024) &middot; Scaling LLM Test-Time Compute &middot; arXiv:2408.03314</span></a></sup> The stronger model gets there with less thinking, not more.


Where do the failures concentrate? Format and word-validity are nearly free for everyone. Even 2.5-flash gets 98% valid format and 80% valid words. The puzzle lives in two checks: `one_letter_changes` and `password_matches`. 2.5-flash matches the password only 44% of the time. The character-level bookkeeping, which letter changed and in which direction, is what separates the models.

The open models fail the same way, only harder. Stripped of a reasoning budget the 4B collapses toward zero, 4% on `one_letter_changes` in direct-answer mode. A concrete 4B failure, on a four-move puzzle:

```text
<answer>stark -> shark -> shore -> shire -> share</answer>
```

Every word is real. But `shark -> shore` changes two letters, not one, so the path is not a valid ladder and the password can't even be computed. The model produced plausible English and quietly broke the rule that makes it track characters.

## Difficulty as a dial: m3-4 vs m4-6

Everything above is the hard config. Wordmaze also ships an easier one, and together they form a clean difficulty ladder: m3-4 is 3-4 moves, m4-6 is 4-6, same vocabulary and rules, just more steps to plan and a longer password to satisfy. Running the full frontier sweep on both turns the difficulty knob and shows who actually holds up.


<aside class="sidenote">The Qwen rows are thinking-mode runs; the 9B m3-4 number is a partial run (n=40). vLLM merges their reasoning into the completion, so they can't appear in the token plot below.</aside>

| model | m3-4 (3-4 moves) | m4-6 (4-6 moves) |
|---|---|---|
| gemini-3.1-pro-preview | 99.5% | 99.5% |
| gemini-3.5-flash | 95.5% | 83.5% |
| gemini-2.5-flash | 56.5% | 36.5% |
| Qwen3.5-9B (open) | 32.5% | 9.5% |
| Qwen3.5-4B (open) | 18.5% | 2.5% |

The strongest model barely notices: 3.1-pro is 99.5% on both configs. The weaker ones drop as puzzles get longer, and 2.5-flash drops the most. But the two averages hide what's really going on. It's clearer move by move.

![Accuracy and median reasoning tokens versus move count for the three Gemini models](/static/blog_photos/wordmaze/fig-difficulty.png)

The chart plots accuracy and thinking against the number of moves, one line per config. The two lines meet at four moves, which tells us the difficulty comes from how many moves a puzzle needs, not from which config it came from. That's the dial I lean on in the training post. 3.1-pro stays flat near 100% from three moves to six, and its thinking only creeps up, about 1.4k tokens to 5.7k. 2.5-flash goes the other way on both: accuracy falls from 65% to 17%, and its thinking jumps from 6k to 63k on the six-move puzzles. Ten times the effort, a sixth of the wins. Harder puzzles should cost more thought, sure, but for a good model that cost stays small, and for a weak one it blows up <sup class="cite-ref"><a href="https://arxiv.org/abs/2506.06941" target="_blank" rel="noopener">[7]<span class="cite-tip">Shojaee et al. (2025) &middot; The Illusion of Thinking &middot; arXiv:2506.06941</span></a></sup>.

Mean versus median says the same thing more sharply. For 3.1-pro the two are close (on m4-6, median 4.1k, mean 4.7k), so almost every puzzle costs about the same. For 2.5-flash the mean sits well above the median (median 19k, mean 31k; on m3-4 the mean is triple the median). That gap means a handful of puzzles send it spiraling into tens of thousands of tokens with nothing to show. 3.5-flash has those bad puzzles too, but it usually still gets the answer. 2.5-flash usually doesn't.

Wall-clock time tells the same story. On the m3-4 runs I also logged how long each request took. At the median, 3.5-flash is fastest (12s), 3.1-pro a bit slower at 19s (bigger model, fewer tokens), and 2.5-flash slowest at 33s. The tail is where it hurts: 3.1-pro and 3.5-flash stay under about 40 seconds 90% of the time, but 2.5-flash's slowest 10% run over four minutes. Its average is 92 seconds, nearly triple its median, the same runaway tail, now in seconds instead of tokens. The best model isn't the quickest per puzzle, but it's the only one you'd trust on a deadline.

The open models ride the same ladder, one tier down (the bottom two rows above): they slide with difficulty exactly like the flash models, only starting far lower.

## The tokenization barrier

Remember the two checks every model flunked: `one_letter_changes` and `password_matches`. Both are about letters, and that turns out to be the whole problem.

Here's a real answer from gemini-2.5-flash:

```text
<answer>chips -> ships -> shops -> shots -> steps</answer>
```

It reads like a clean ladder. But look at the last step. `shots -> steps` changes three letters at once (h→t, o→e, t→p), not one. The model wrote it down anyway. To you the mistake is obvious, you just look at the spelling. The model can't look at the spelling that easily, and that's the catch.

A language model doesn't read letters, it reads tokens <sup class="cite-ref"><a href="https://arxiv.org/abs/1508.07909" target="_blank" rel="noopener">[8]<span class="cite-tip">Sennrich et al. (2016) &middot; Subword Units (BPE) &middot; arXiv:1508.07909</span></a></sup>. A short word like `shots` or `steps` is usually a single token, one number to the model. And those two numbers are unrelated: nothing in them tells the model which letters the words share or where they differ. So to answer "did exactly one letter change?", the model can't just glance at the spelling. It has to recall each word letter by letter, line the two up, and compare, all in its head, in words.

The password is harder still. For every move the model has to find which letter changed *and* decide whether it moved forward or backward in the alphabet (`l → r` is forward, so `F`). That's two small character puzzles per step, on top of searching for a valid path. Frontier models grind through it with thousands of tokens of scratch work. A 4B can't keep that up, so it falls apart.

So here's a test. If the tokenizer is the problem, handing the model the letters should help. I reran the 4B with every word spelled out with spaces, `c o l d` instead of `cold`. Now each letter is its own token, which is the idea behind character-level models <sup class="cite-ref"><a href="https://arxiv.org/abs/2105.13626" target="_blank" rel="noopener">[9]<span class="cite-tip">Xue et al. (2021) &middot; ByT5 &middot; arXiv:2105.13626</span></a></sup> <sup class="cite-ref"><a href="https://arxiv.org/abs/2103.06874" target="_blank" rel="noopener">[10]<span class="cite-tip">Clark et al. (2021) &middot; CANINE &middot; arXiv:2103.06874</span></a></sup>:

![Char-spacing roughly doubles a 4B's character-level pass rates on Wordmaze m3-4](/static/blog_photos/wordmaze/fig-tokenization.png)

It worked. One-letter steps doubled, password matches nearly doubled, and fully-valid went from 18.5% to 26.5%, even though spacing makes the text about twice as long, so the model has *less* room to work, not more. Handing it the letters helped more than the extra length hurt. That's a strong hint the tokenizer, not raw smarts, is a real part of why small models struggle here.

## What's next

That's the environment: a one-shot puzzle, a pure-function verifier with a per-check signal, a reproducible generator, and a baseline gap that runs from 99.5% at the frontier down to single digits for a 4B. The gap is the whole motivation. A small open model can *almost* do this when you give it room to reason, which is the regime where RL might help: there's a non-zero success rate to amplify.

The next post is the training story: what happens when you point GRPO at a 4B and try to close that gap. It does not go the way you'd hope. The first honest result is that a naive pipeline made the model *worse* than its untrained base, by learning to game the very checks above. That failure, what it says about reward design, and whether RL can push a model past what its base already does <sup class="cite-ref"><a href="https://arxiv.org/abs/2504.13837" target="_blank" rel="noopener">[11]<span class="cite-tip">Yue et al. (2025) &middot; Limits of RLVR &middot; arXiv:2504.13837</span></a></sup>, is part two.

The dataset is on the [Hub](https://huggingface.co/datasets/immortal3/wordmaze) if you want to point a model at it. If you beat 3.1-pro, I'd like to know how.

<style>
.cite-ref { font-size: 0.72em; line-height: 0; white-space: nowrap; }
.cite-ref a { position: relative; color: #6366f1; font-weight: 700; text-decoration: none; padding: 0 2px; border-radius: 3px; transition: background 0.12s; }
.cite-ref a:hover { background: rgba(99,102,241,0.15); }
.cite-tip { position: absolute; left: 50%; bottom: 165%; transform: translateX(-50%); width: 250px; max-width: 70vw; background: #1a1a1a; color: #fff; font-size: 12px; font-weight: 400; line-height: 1.45; text-align: left; padding: 8px 11px; border-radius: 6px; box-shadow: 0 6px 18px rgba(0,0,0,0.20); opacity: 0; visibility: hidden; transition: opacity 0.15s; z-index: 60; pointer-events: none; white-space: normal; }
.cite-ref a:hover .cite-tip, .cite-ref a:focus .cite-tip { opacity: 1; visibility: visible; }
.cite-list { list-style: none; padding-left: 0; counter-reset: cite; font-size: 0.9em; }
.cite-list li { counter-increment: cite; position: relative; padding-left: 34px; margin-bottom: 11px; line-height: 1.5; color: #374151; }
.cite-list li::before { content: "[" counter(cite) "]"; position: absolute; left: 0; top: 0; color: #6366f1; font-weight: 700; font-variant-numeric: tabular-nums; }
.cite-list a { color: #6366f1; text-decoration: none; }
.cite-list a:hover { text-decoration: underline; }
@media (prefers-reduced-motion: reduce) { .cite-ref a, .cite-tip { transition: none; } }
</style>

## References

<ol class="cite-list">
<li id="ref-1"><em>Tülu 3: Pushing Frontiers in Open Language Model Post-Training</em>. Lambert et al. (2024). Introduces RLVR (RL from verifiable rewards). <a href="https://arxiv.org/abs/2411.15124" target="_blank" rel="noopener">arXiv:2411.15124</a></li>
<li id="ref-2"><em>Concrete Problems in AI Safety</em>. Amodei et al. (2016). On reward hacking and specification gaming. <a href="https://arxiv.org/abs/1606.06565" target="_blank" rel="noopener">arXiv:1606.06565</a></li>
<li id="ref-3"><em>DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models</em>. Shao et al. (2024). Introduces Group Relative Policy Optimization (GRPO). <a href="https://arxiv.org/abs/2402.03300" target="_blank" rel="noopener">arXiv:2402.03300</a></li>
<li id="ref-4"><em>DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning</em>. DeepSeek-AI (2025). <a href="https://arxiv.org/abs/2501.12948" target="_blank" rel="noopener">arXiv:2501.12948</a></li>
<li id="ref-5"><em>Chain-of-Thought Prompting Elicits Reasoning in Large Language Models</em>. Wei et al. (2022). <a href="https://arxiv.org/abs/2201.11903" target="_blank" rel="noopener">arXiv:2201.11903</a></li>
<li id="ref-6"><em>Scaling LLM Test-Time Compute Optimally can be More Effective than Scaling Model Parameters</em>. Snell et al. (2024). <a href="https://arxiv.org/abs/2408.03314" target="_blank" rel="noopener">arXiv:2408.03314</a></li>
<li id="ref-7"><em>The Illusion of Thinking: Understanding the Strengths and Limitations of Reasoning Models via the Lens of Problem Complexity</em>. Shojaee et al. (2025). Reasoning models vs puzzle complexity. <a href="https://arxiv.org/abs/2506.06941" target="_blank" rel="noopener">arXiv:2506.06941</a></li>
<li id="ref-8"><em>Neural Machine Translation of Rare Words with Subword Units</em>. Sennrich et al. (2016). Byte-pair encoding. <a href="https://arxiv.org/abs/1508.07909" target="_blank" rel="noopener">arXiv:1508.07909</a></li>
<li id="ref-9"><em>ByT5: Towards a Token-Free Future with Pre-trained Byte-to-Byte Models</em>. Xue et al. (2021). <a href="https://arxiv.org/abs/2105.13626" target="_blank" rel="noopener">arXiv:2105.13626</a></li>
<li id="ref-10"><em>CANINE: Pre-training an Efficient Tokenization-Free Encoder for Language Representation</em>. Clark et al. (2021). <a href="https://arxiv.org/abs/2103.06874" target="_blank" rel="noopener">arXiv:2103.06874</a></li>
<li id="ref-11"><em>Does Reinforcement Learning Really Incentivize Reasoning Capacity in LLMs Beyond the Base Model?</em>. Yue et al. (2025). <a href="https://arxiv.org/abs/2504.13837" target="_blank" rel="noopener">arXiv:2504.13837</a></li>
</ol>
