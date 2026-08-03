# Bits per byte (BPB) for LLMs: tokenizer-agnostic loss

> BPB measures LLM loss per UTF-8 byte, making tokenizer comparisons fair. Formula, worked example, and PyTorch-style implementation.

- Author: Dipkumar Patel
- URL: https://dipkumar.dev/posts/llm/bits-per-byte/
- Published: 2025-10-15
- Updated: 2026-06-17
- Tags: llm, tokenizer

---

> Karpathy recently released [nanochat repo](https://github.com/karpathy/nanochat/) which cotains code for **training the best ChatGPT under $100**. While skimming the high level code, I noticed across `bits per bytes` instead of typical `cross entropy` loss. And, i found it interesting, so i decided to dig in. 

### TL;DR

- Bit per byte (BPB) is just cross-entropy measured per byte. We divide cross-entropy by bytes and log(2) to convert to bits.
- Because it’s per byte, BPB is tokenizer-agnostic and lets you compare models fairly even when they use different vocabularies and rules.
- Perplexity and token-level loss change when you change the tokenizer; BPB largely doesn’t.


LLM doesn't predict the text, it predicts the (next) token. But token definitions depend on the tokenizer (BPE, Unigram, merges, special tokens, etc.). Swap tokenizers and the same sentence can become more or fewer tokens. So `per-token` metrics (avg CE, perplexity) change even if the underlying modeling quality didn’t.

Some popular tokenizer choices are:

| Model | Tokenizer | Vocab Size |
|-------|-----------|------------|
| GPT-4 | cl100k_base (BPE) | 100,256 |
| LLaMA 3 | TikToken (BPE) | 128,000 |
| Gemini 2.5 | SentencePiece (Unigram) | 256,000 |
| Claude | closed-source | undisclosed |

Different tokenizers ≠ comparable "tokens". So a model that uses a coarser tokenizer (fewer, longer tokens) can appear to have a lower per-token loss or perplexity, simply because the denominator changed.

Instead of normalizing loss per token, normalize per byte of UTF-8 text that those tokens represent. Then, no matter how you split words into tokens, you're still asking: how many bits, on average, does the model need to encode each byte of text?

### Example: Why Per-Token Metrics Mislead

Consider two models predicting "The Capital of India" -> " is Delhi" (8 bytes in UTF-8, including the space):

**Model A** (coarse tokenizer):
- Tokens: `[" is", " Delhi"]` (2 tokens)
- Per-token loss: `[1.5, 4.5]` nats
- Total loss: 6.0 nats

**Model B** (fine-grained tokenizer):
- Tokens: `[" is", " Del", "hi"]` (3 tokens)  
- Per-token loss: `[1.5, 2.0, 2.5]` nats
- Total loss: 6.0 nats

**Per-token metrics (misleading):**
```bash
Model A avg loss:  6.0 / 2 = 3.0 nats/token
Model B avg loss:  6.0 / 3 = 2.0 nats/token  ← appears better!

Model A perplexity:  exp(3.0) = 20.09
Model B perplexity:  exp(2.0) = 7.39        ← appears better!
```

Model B looks significantly better, but it's the **same 6.0 nats** spread over more tokens.

**Bits-per-byte (fair comparison):**
```bash
Model A BPB:  6.0 / (ln(2) × 8) = 1.08 bits/byte
Model B BPB:  6.0 / (ln(2) × 8) = 1.08 bits/byte  ← identical!
```

BPB correctly shows both models have the same predictive quality. The apparent "improvement" in Model B's per-token metrics was purely an artifact of tokenization granularity.

### Implementation

Below is the simplified and more readable version of the [original code](https://github.com/karpathy/nanochat/blob/master/nanochat/loss_eval.py).

```python
import math
import torch
import torch.distributed as dist

@torch.no_grad()
def evaluate_bpb(model, batches, steps: int, token_bytes: torch.Tensor) -> float:
    """
    Compute Bits-Per-Byte (BPB) over `steps` batches.

    Shapes (your mental model):
      B  = batch size
      Seq = sequence length
      V  = vocab size

    Inputs:
      - model: callable like model(x, y, loss_reduction='none') -> loss per token.
               Expects:
                 x: (B, Seq) token ids (int64)
                 y: (B, Seq) target token ids (int64), may contain ignore_index (<0)
               Returns:
                 loss2d: (B, Seq) per-token loss in NATs (float32/float16)
      - batches: iterable yielding (x, y) as above.
      - steps: number of batches to evaluate.
      - token_bytes: (V,) int64 — byte length of each token id; 0 for special tokens
                     (those should not count toward BPB).

    Notes:
      - BPB = (sum of losses in NATs over *counted* tokens) / (ln(2) * total_counted_bytes)
      - Tokens contribute to the denominator by their byte length; tokens with 0 bytes
        (specials) and ignored targets (<0) are excluded from both numerator & denominator.
    """
    device = model.get_device() if hasattr(model, "get_device") else next(model.parameters()).device

    # Accumulators across steps (and later across ranks)
    sum_nats  = torch.tensor(0.0, dtype=torch.float32, device=device)  # scalar
    sum_bytes = torch.tensor(0,   dtype=torch.int64,   device=device)  # scalar

    token_bytes = token_bytes.to(device=device, dtype=torch.int64)     # (V,)

    batch_iter = iter(batches)
    for _ in range(steps):
        x, y = next(batch_iter)                  # x: (B, Seq), y: (B, Seq)
        x = x.to(device)
        y = y.to(device)

        loss2d = model(x, y, loss_reduction='none')  # (B, Seq) NATs
        loss1d = loss2d.reshape(-1)                  # (B*Seq,)
        y1d    = y.reshape(-1)                       # (B*Seq,)

        if (y1d < 0).any():
            # Mask out ignore_index (<0) before indexing into token_bytes
            valid  = (y1d >= 0)                                      # (B*Seq,)
            ysafe  = torch.where(valid, y1d, torch.zeros_like(y1d))  # (B*Seq,)
            nb     = torch.where(valid, token_bytes[ysafe], torch.zeros_like(y1d))  # (B*Seq,) int64
        else:
            nb = token_bytes[y1d]  # (B*Seq,) int64

        # Count only tokens with positive byte length
        counted = (nb > 0)                             # (B*Seq,) bool
        sum_nats  += (loss1d[counted]).sum()           # scalar
        sum_bytes += nb[counted].sum()                 # scalar int64

    # Distributed sum over all ranks, if initialized
    if dist.is_initialized() and dist.get_world_size() > 1:
        dist.all_reduce(sum_nats,  op=dist.ReduceOp.SUM)
        dist.all_reduce(sum_bytes, op=dist.ReduceOp.SUM)

    total_nats  = float(sum_nats.item())
    total_bytes = int(sum_bytes.item())

    # Guard against division by zero (e.g., all tokens were special/ignored)
    if total_bytes == 0:
        return float("nan")

    bpb = total_nats / (math.log(2.0) * total_bytes)
    return bpb

```
