# A Practical Cost Checklist for Agent and Harness Engineering

> A staged checklist for reducing agent and LLM costs, from prompt hygiene and model selection to tool pruning, trace analysis, and distillation.

- Author: Dipkumar Patel
- URL: https://dipkumar.dev/posts/agents/agent-harness-cost-checklist/
- Published: 2026-04-20
- Updated: 2026-04-22
- Tags: agents, harness, cost, engineering

---

![Abstract hero image showing modular agent systems, token flows, and cost-control checkpoints in a minimal monochrome style with indigo accents](/static/blog_photos/agent-harness-cost-checklist/hero.webp)

## TLDR: Checklist

- [ ] **Make prompt caching actually work: stabilize the prefix and verify hit rates.**
  Keep reusable system prompts and shared chat history stable so the cache has something to hit. Track hit rates, and use provider-specific cache controls when they actually improve savings.
- [ ] **Re-evaluate your default model.**
  The easiest cost win is often switching to a cheaper model that still clears your quality bar on your own eval set.
- [ ] **Right-size the output: reasoning budget and visible tokens.**
  Output tokens are the most expensive tokens you generate. Match both the reasoning budget and the visible response length to the task. Routing does not deserve deep thinking or a paragraph.
- [ ] **Move offline work to batch or flex lanes.**
  Evals, backfills, enrichment, and asynchronous jobs should not be priced like interactive traffic.
- [ ] **Compact context mid-run.**
  Long agent runs keep paying for the same tool outputs and failed turns on every subsequent call. Compaction collapses stale history into summaries so you stop re-paying for yesterday's context on today's call.
- [ ] **Fix your tools: load less, return less, regenerate less.**
  Attaching every tool inflates the prompt before the agent starts. Giant payloads inflate the next call after. And for edit-heavy workflows, regenerating the whole output when most of it is unchanged wastes tokens you never needed to produce.
- [ ] **Make fewer requests and parallelize independent work.**
  A lot of agent cost comes from orchestration shape: too many round trips, too many retries, and too much sequential work.
- [ ] **Collect traces and read them like a cost report.**
  Without traces, you do not know where the repeated waste actually is.
- [ ] **Cap the blast radius.**
  One runaway loop, retry storm, or misconfigured thinking budget can 100x a session's cost before anyone notices. Hard caps on tokens, tool calls, retries, and spend turn unbounded worst cases into bounded ones.
- [ ] **Do not default to an LLM when deterministic logic is enough.**
  The cheapest token is the one you never send.
- [ ] **Turn good traces into cheaper task-specific models.**
  Once the basics are clean, distillation or fine-tuning can move repeated workflows onto smaller models.

## Introduction

Once you hit a certain scale, LLM cost becomes a significant part of your overall cost. You cannot ignore it anymore.
The customer acquisition phase is over, and now you are in the growth phase. You need to know your COGS (Cost of Goods Sold) and make sure the product can stay profitable. This is a simple checklist to help with that. I have ordered it so you can start with the easy wins and then move toward the more complex work.

This is not a silver bullet, and any engineer who has worked on agent systems already knows some of these things. But it is still a good place to start.

### 1. Make prompt caching actually work: stabilize the prefix and verify hit rates

This is the first thing I would check because it is one of the highest-leverage fixes and it is often half-done.
There are really two parts here, and both matter.

**First, keep the prefix stable.** Prompt caching only works when the reusable prefix stays identical. If you keep changing the system prompt, tool order, or early context, there is nothing for the cache to hit.

Teams often destroy cacheability by accident:

- injecting the exact timestamp into the system prompt on every request, even when the current date or a coarse time window would be enough
- adding volatile session metadata high in the prompt
- changing tool definitions or tool order between turns
- stuffing retrieval output ahead of stable instructions

Caching is not magic. You also need to understand how your provider actually implements it. Some providers let you control TTL. Some need explicit cache breakpoints. Some distinguish between implicit and explicit caching. If you do not understand the mechanism, it becomes very easy to think caching is enabled while getting little value from it.

**Second, verify it is working.** A lot of teams clean up the prompt and then never look at the numbers. That means they feel better about caching without knowing whether they actually saved anything. If you already have observability in place, there is a good chance cache-hit data is available somewhere. You just have to look at it routinely.

Questions to ask:

- what is the cache-hit ratio?
- which workflows, agents, or model calls have low cache-hit ratios?
- how much latency and cost benefit are we actually getting from caching?

If you do not measure cache hits, you do not know whether this section is helping or just sounding smart.

**If you want to go deeper:**
- [OpenAI prompt caching](https://platform.openai.com/docs/guides/prompt-caching)
- [Anthropic prompt caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)
- [Google Gemini context caching](https://ai.google.dev/gemini-api/docs/caching/)

### 2. Re-evaluate your default model

This is often the cheapest win because one model switch can change every request that follows.
Too many teams launch with the strongest model available, get the product working, and then never revisit the choice. That is fine in the early stage. It gets expensive later.

Be empirical, not sentimental:

- test a smaller model against your real workload
- do not trust a handful of cherry-picked prompts
- do not assume the model you launched with is still the right price/performance call

Public trackers can help you shortlist candidates, but the real answer has to come from your own eval set. A leaderboard is useful for a first pass. It should not make the final decision for you. Smaller open-source models are also getting better quickly, so they are worth considering if your workload and deployment constraints allow it.

Before building a router, before rewriting the harness, before talking about fine-tuning: if you swapped this model tomorrow, would users notice enough quality loss to justify the bill?

**If you want to go deeper:**
- [Anthropic prompt engineering](https://docs.anthropic.com/en/docs/prompt-engineering)
- [OpenAI cost optimization](https://platform.openai.com/docs/guides/cost-optimization)
- [Artificial Analysis model leaderboard](https://artificialanalysis.ai/leaderboards/models)

### 3. Right-size the output: reasoning budget and visible tokens

Most teams focus on input context and forget that output is where a lot of the bill shows up. In practice, you usually have two dials here, and both need to be controlled.

**First dial: the reasoning budget.** Not every step deserves heavy thinking. Code synthesis, planning, and ambiguous research may need it. Routing, classification, extraction, and simple transforms usually do not.

If you are using a reasoning-capable model for lightweight internal steps, there is a good chance you are overspending.

- hard planning, code synthesis, multi-hop reasoning, or ambiguous research may deserve more thinking
- routing, filtering, extraction, and straightforward transforms usually deserve less

Check your thinking budgets explicitly. If everything is set to ultra thinking by default, there is a good chance you are burning money on tasks that do not need it. Newer models do offer adaptive thinking, and that is a good start, but if you know your domain well, you should still set deliberate limits instead of delegating the whole decision to the model.

**Second dial: the visible response.** A lot of harnesses ask for much more text than the next step or the user actually needs.

- tell the model to be brief when brevity is acceptable
- cap outputs with `max_tokens` or stop conditions where the task allows it
- shorten structured output field names
- collapse verbose schemas where you can
- avoid asking for prose when a compact label or JSON field is enough

The rule is simple: match the budget to the task. If the internal step only needs a label, do not pay for hidden reasoning and a paragraph of visible prose.

**If you want to go deeper:**
- [Anthropic extended thinking](https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking)
- [Google Gemini thinking](https://ai.google.dev/gemini-api/docs/thinking)
- [OpenAI latency optimization](https://platform.openai.com/docs/guides/latency-optimization)

### 4. Move offline work to batch or flex lanes

A surprising amount of agent traffic is not interactive, but many teams still price it as if a user is waiting on every request.

Nightly eval runs, enrichment pipelines, backfills, report generation, and large review jobs do not need low-latency serving. If a workflow can wait, move it to a slower and cheaper lane.

This is a clean win because it does not require better prompts, better models, or smarter agents. It usually just requires queue separation and the discipline not to mix interactive and offline traffic.

If a workflow can wait minutes or hours, it should not be priced like a user-facing request. It is also worth checking provider pricing carefully here, because discounts, batch modes, and slower compute lanes are not packaged the same way across vendors.

**If you want to go deeper:**
- [OpenAI API pricing](https://openai.com/api/pricing/)
- [OpenAI cost optimization](https://platform.openai.com/docs/guides/cost-optimization)
- [OpenAI Flex processing](https://platform.openai.com/docs/guides/flex-processing?api-mode=chat)

### 5. Compact context mid-run

Section 1 was about the stable prefix. This section is about the growing middle that keeps getting bigger during a long run. There are many ways to implement compaction, and you should choose the one that best fits your system.

Long agent runs quietly accumulate cost inside the context window itself. Every tool output, every failed attempt, and every old decision gets re-sent on later calls. That means the model keeps paying to reread things that are no longer useful.

Compaction fixes this by replacing stale history with a shorter summary while keeping the recent turns verbatim. The goal is not to remove useful context. The goal is to stop paying rent on dead context.

Practical moves:

- summarize older turns when the context crosses a token threshold
- drop stale tool outputs once their result has been consumed downstream
- keep the last few turns verbatim so the model still has recent grounding
- write durable facts to an external memory instead of re-sending them every turn

The test: pick a long session and look at the input token count on the last call. If most of it is material the model no longer needs, you are paying rent on dead context.

### 6. Fix your tools: load less, return less, regenerate less

Tools create cost before the call, during the call, and after the call. Most harnesses let all three happen without much control. And when I say tools here, I also mean MCP servers and skills. The same cost patterns apply there too.

**Load less.** Attaching the full tool catalog to every request is a token tax before the model does anything. Start with a smaller default set and load specialized tools only when they are actually needed.

- do not attach every tool to every task
- keep a small default toolset
- defer specialized tools until they are needed
- keep tool descriptions tight enough that the model does not thrash

**Return less.** In many harnesses, the expensive part is not the model alone. It is the amount of junk you keep feeding back into it. Tool calls often return full HTML when only two fields matter, giant JSON blobs when only one status matters, or verbose repeated metadata across every step.

Audit a few traces and ask:

- what is the minimum useful tool result?
- what can be summarized outside the model?
- do I need to send the full output, or only the parts that are actually useful to the model?
- can I send only the changes instead of the whole payload?
- what can be filtered, truncated, or schema-compressed safely?

If your tools return more than the next step needs, you pay twice: once to fetch the data and again to force the model to read it. This topic is deep enough for its own post, but even a basic audit here can remove a surprising amount of waste.

**Regenerate less.** For edit-heavy workflows like code assistants and document pipelines, do not regenerate the whole answer when only a small delta changed. If most of the file or response is stable, optimize for the change, not the entire output.

Also move loops, conditionals, and simple transforms into code where possible. Every repeated control-flow step you take out of prompt context is one less thing the model has to re-read.

**If you want to go deeper:**
- [Anthropic advanced tool use](https://www.anthropic.com/engineering/advanced-tool-use)
- [Anthropic token-efficient tool use](https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/token-efficient-tool-use)
- [OpenAI latency optimization](https://platform.openai.com/docs/guides/latency-optimization)
- [OpenAI Predicted Outputs](https://platform.openai.com/docs/guides/predicted-outputs)

### 7. Make fewer requests and parallelize independent work

This is especially common in larger organizations, where many teams work on different parts of the same product and extra LLM steps get added over time. A lot of agent cost comes from orchestration shape, not single-call pricing.
Too many systems keep making extra requests because the flow was designed step by step and never simplified later.

Many harnesses quietly do too much:

- one call to contextualize
- one call to decide whether to retrieve
- one call to route
- one call to summarize
- one call to format the answer

Sometimes that decomposition is necessary. Often it is just habit.

Two checks to start:

- can multiple sequential LLM steps be merged into one structured response?
- can independent steps run in parallel instead of serially?

Every extra round trip adds cost, latency, and another place to fail. So this section is less about clever orchestration and more about removing unnecessary choreography.

Speculative execution can also help when one path dominates and you can afford to start likely work early. It is not always the right choice, but it is worth testing in high-volume systems.

### 8. Collect traces and read them like a cost report

If you are not storing traces, you are guessing.

Cost problems in agent systems are usually repetitive. The same failed retrieval path, the same tool loop, the same oversized context, the same retry storm, the same reasoning-heavy router call. Trace review is how you find those patterns.

At this stage, the goal is not abstract observability. The goal is operational clarity.
You want to answer questions like these:

- where are the tokens going?
- where are the repeated failures?
- which steps are low-value but high-cost?
- which prompts or tools trigger long outputs again and again?

Once you have traces, you can do something much more valuable than general optimization: targeted removal of repeated waste.

Traces also expose the worst-case shapes that the next section is built to bound.

This is also where traces become more than a debug tool. They become a decision tool. Good trace review tells you whether the real problem is retrieval quality, an oversized tool payload, an overthinking router, a retry storm, or a prompt that keeps pushing the model into unnecessary work. Once you can see that clearly, the next optimization step becomes much easier to choose.

### 9. Cap the blast radius

Every item so far is about reducing cost. This one is different: it is about bounding the *worst case*.

This section is less about saving 10 percent and more about avoiding the day you wake up to a bill that is 10x higher than expected.

Agents fail expensively when they fail. A misconfigured thinking budget, a tool that loops on itself, a retry policy with no ceiling, or a malformed structured output that keeps triggering retries can blow up the bill very quickly.

Hard caps, enforced at the harness level, are the only reliable defense. They do not need to be clever. They need to exist.

- max tokens per user turn
- max tool calls per task
- max retries per tool, not just globally
- max reasoning budget per call
- max retrieval fan-out
- max cost per user per day, with a circuit breaker that degrades gracefully

Structured outputs belong in this chapter too. Provider-native JSON mode, tool-call schemas, and grammar-constrained decoding reduce the malformed-output-to-retry loop. The main win is not shorter responses. The main win is avoiding repeated failure traffic.

This is not optimization. It is blast-radius control. Treat it like a production safety requirement, not a cost-engineering side quest.

A useful test: if a single malformed prompt triggered your agent to loop forever, how much would it cost before something stopped it? If you do not know, that is the number you are exposed to.


### 10. Do not default to an LLM when deterministic logic is enough

This is not glamorous, but it is one of the cleanest long-term cost controls.

If a step is deterministic, rule-based, or cheap to implement directly, every avoided model call is a permanent win.

Common examples:

- checking whether an order value crosses a threshold before routing to a human
- validating whether a payload matches schema before asking the model to repair it
- routing straightforward requests like password reset, pricing, or account status without an LLM in the loop
- applying guardrails and policy checks before the model ever sees the request
- returning precomputed outputs for constrained inputs instead of regenerating them every time
- rendering structured UI states directly instead of asking the model to narrate what the UI already knows

That last one matters more than it seems. Many harnesses ask the model to produce prose the user does not need. If the output is structured or predictable, render it. Do not narrate it just because a language model can.

The cheapest token is the one you never send.

### 11. Turn good traces into cheaper task-specific models

If you are still at seed stage and just trying to get the core product working, this is usually not where your time should go. This is probably the most expensive step in the checklist, and it is not for everyone.

This step comes with a real caveat: it only makes sense at a certain scale and with actual funding behind it.

The rough loop is simple:

1. get a strong prompt working on a frontier model
2. capture high-quality outputs on real tasks
3. build a dataset from those outputs
4. fine-tune or distill into a smaller model for that task

On paper that is clean. In practice, provider fine-tuning costs money upfront and requires prepaid credits or committed spend. If you are not running thousands of calls per day on the same task shape, the savings rarely justify the engineering and compute bill.

Going further and fine-tuning your own open-source 7B–20B model is a completely different game. You need GPU infrastructure, data pipelines, evaluation harnesses, and ML engineering bandwidth. Some teams get there and it pays off. Most teams are not there yet, and spending time here before the earlier steps are clean is a mistake.

The gap between "pay the provider for a closed fine-tune" and "run your own GPU cluster" has narrowed a lot. Managed APIs like Thinking Machines' Tinker, Together AI, and Fireworks now expose LoRA fine-tuning over open-weight models like Qwen, Llama, and DeepSeek while handling the distributed training infrastructure. You keep the weights, which means the resulting model is portable across inference providers. If you have GPU access and want to run it yourself, libraries like Unsloth and Hugging Face PEFT make LoRA and QLoRA tractable on modest hardware.

None of this removes the need for a real eval set, a real dataset, and real ML judgment. It just lowers the activation energy. Pair these tools with techniques like on-policy distillation when a smaller student model needs to match a larger teacher on a specific task shape.

The honest default: if you have a high-volume, stable, repeating task and enough budget to run the experiment properly, investigate it. If you do not, skip this and spend the effort on something earlier in the list.

**Define success criteria before you start.** Without a clear quality floor, distillation is just guesswork.

**If you want to go deeper:**

*Managed LoRA fine-tuning over open-weight models:*
- [Thinking Machines Tinker](https://thinkingmachines.ai/tinker/)
- [Together AI fine-tuning](https://docs.together.ai/docs/fine-tuning-overview)
- [Fireworks AI fine-tuning](https://docs.fireworks.ai/fine-tuning/fine-tuning-models)

*Self-hosted LoRA / QLoRA:*
- [Unsloth](https://github.com/unslothai/unsloth)
- [Hugging Face PEFT](https://huggingface.co/docs/peft/index)

*Technique and closed-weight distillation:*
- [Thinking Machines: LoRA Without Regret](https://thinkingmachines.ai/blog/lora/)
- [Thinking Machines: On-Policy Distillation](https://thinkingmachines.ai/blog/on-policy-distillation/)
- [OpenAI distillation guide](https://platform.openai.com/docs/guides/distillation)

### Closing thought

I kept this checklist deliberately abstract. Provider APIs, pricing pages, and reasoning parameters change every few months. The underlying failure modes (unstable prefixes, oversized tool payloads, unbounded loops, narrating instead of rendering) do not. A checklist that names a specific product would be out of date by the next quarter. One that names a pattern stays useful for longer.

That abstraction also makes the checklist easy to use with agentic coding tools. You can paste one or two bullets from here into Claude Code, Cursor, or a similar assistant, point it at your harness code, and let it hunt. Prompts as simple as *"check whether anything in our system prompt would invalidate prompt caching"* or *"find places where we attach the full tool catalog to every request"* are usually enough to surface real issues. Agents are good at pattern-matching the structural problems this checklist describes. They are less good at judging whether a proposed fix actually saved money. That still needs traces and numbers from production.

So treat this as a review rubric, not a recipe. Walk the list, delegate the mechanical parts to an agent, look at traces where the question is quantitative, and leave the deeper engineering work (routing layers, fine-tuning, distillation) until after the boring work is done. Most cost problems in agent systems are not glamorous. They begin with sloppy harness decisions, and the cheapest token is still the one you never send.
