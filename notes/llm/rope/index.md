# Positional Encoding and RoPE

> A compact note on sinusoidal positional encoding, its key components, and how that geometry leads to RoPE.

- Author: Dipkumar Patel
- URL: https://dipkumar.dev/notes/llm/rope/
- Published: 2026-04-18
- Tags: llm, transformer, attention

---

## Sinusoidal positional encoding

Transformers do not have recurrence, so token order must be injected explicitly. The original paper does that with a fixed sinusoidal positional encoding:

```text
PE(pos, 2i)   = sin(pos / 10000^(2i/d))
PE(pos, 2i+1) = cos(pos / 10000^(2i/d))
```

This looks strange at first, but the geometric intuition is simple: every pair of dimensions behaves like a tiny clock running at its own speed.

Rewrite the denominator as a frequency term:

```text
omega_i = 10000^(-2i/d)
```

Then each pair is:

```text
(sin(pos * omega_i), cos(pos * omega_i))
```

- `pos` tells us how far to move around the circle.
- `i` picks the frequency band.
- Small `i` means fast rotation.
- Large `i` means slow rotation.

The full positional vector is just many such rotating pairs concatenated together.

## Two components of sinusoidal positional encoding

The formula is easier to understand if you separate its two moving parts.

### 1. Position term

`pos` is the token position. As `pos` increases, every sinusoidal pair advances.

- Position `0` gives a fixed starting point.
- Position `1`, `2`, `3`, ... rotates each pair further.
- So `pos` controls phase.

### 2. Frequency term

The term `10000^(-2i/d)` decides how quickly each pair rotates.

- Lower-index pairs rotate quickly and capture short-range changes.
- Higher-index pairs rotate slowly and capture coarse, long-range structure.
- Using many frequencies makes positions easier to distinguish over long sequences.

There is also a structural detail worth calling out: each frequency is represented by two coordinates, `sin` and `cos`, so that one logical frequency becomes a 2D point on the unit circle.

## Tiny example

If `d = 4`, there are two pairs:

```text
PE(pos) = [
  sin(pos),
  cos(pos),
  sin(0.01 * pos),
  cos(0.01 * pos)
]
```

For positions `0`, `1`, and `2`:

```text
PE(0) = [0, 1, 0, 1]

PE(1) ~= [0.84, 0.54, 0.01, 0.99995]

PE(2) ~= [0.91, -0.42, 0.02, 0.9998]
```

The first pair changes quickly. The second barely moves. That mix of fast and slow clocks is the core idea.

## Why sine and cosine appear together

The important property is not just that sine and cosine are smooth. The useful property is that a position shift becomes a linear rotation.

For a single frequency `omega`:

```text
[ sin(omega * (p + k)) ]   [  cos(omega * k)   sin(omega * k) ] [ sin(omega * p) ]
[ cos(omega * (p + k)) ] = [ -sin(omega * k)   cos(omega * k) ] [ cos(omega * p) ]
```

So moving from position `p` to position `p + k` is just a rotation in the 2D plane.

This is the bridge to RoPE: relative position is already hiding inside sinusoidal encoding as rotation.

## RoPE

Standard sinusoidal encoding adds position to the token embedding:

```text
x_pos = e_token + PE(pos)
```

RoPE instead applies position by rotating the query and key vectors:

```text
q' = R(pos) q
k' = R(pos) k
```

This changes the role of positional information:

- Standard sinusoidal encoding is additive.
- RoPE is multiplicative: it rotates `q` and `k`.
- Rotation preserves norm and changes direction.
- Since attention depends on query-key alignment, rotation is a natural way to encode relative offsets.

For one 2D pair `(x0, x1)` at position `p`:

```text
theta_i = base^(-2i/d)
angle = p * theta_i

x0_new = x0 * cos(angle) - x1 * sin(angle)
x1_new = x0 * sin(angle) + x1 * cos(angle)
```

RoPE does not invent a new geometry. It makes the rotation structure explicit and applies it directly where attention uses it.

## RoPE code

```python
import numpy as np

def rope_angles(seq_len: int, dim: int, base: float = 10000.0):
    assert dim % 2 == 0
    positions = np.arange(seq_len)[:, None]                      # [seq_len, 1]
    freqs = base ** (-np.arange(0, dim, 2) / dim)               # [dim/2]
    angles = positions * freqs[None, :]                         # [seq_len, dim/2]
    return np.cos(angles), np.sin(angles)

def rotate_half(x: np.ndarray) -> np.ndarray:
    x_even = x[..., ::2]
    x_odd = x[..., 1::2]
    x_rot = np.stack((-x_odd, x_even), axis=-1)
    return x_rot.reshape(x.shape)

def apply_rope(x: np.ndarray, cos: np.ndarray, sin: np.ndarray) -> np.ndarray:
    # x: [..., seq_len, dim]
    cos = np.repeat(cos, 2, axis=-1)
    sin = np.repeat(sin, 2, axis=-1)
    return (x * cos) + (rotate_half(x) * sin)
```

Use RoPE on `q` and `k` after projection and before attention score computation.

## References

- Vaswani et al., Attention Is All You Need: https://arxiv.org/abs/1706.03762
- Su et al., RoFormer: Enhanced Transformer with Rotary Position Embedding: https://arxiv.org/abs/2104.09864
- Hugging Face Transformers internal RoPE utilities: https://huggingface.co/docs/transformers/en/internal/rope_utils
