---
domain: llm-inference
goal: "Choose models, quants, and flags with informed reasoning — then understand the internal architecture well enough to follow a paper."
updated: 2026-08-24
tags: [learning, understand, plan]
---

# Plan — LLM inference foundations

## Roots
- R1: matrix x vector transforms a vector into another — user already holds (probe q3 correct)
- R2: FP32/FP16 = more/fewer bits = more/less precision — user already holds (probe q4 correct)
- R3: quantize = reduce bits per weight — user already holds (probe q5 correct)
- R4: KV cache stores keys/values to avoid recalculation — user already holds (probe q7 correct)
- R5: spec. decoding = small model proposes, large verifies — user already holds (probe q9 correct)

## Nodes

| ID | Label | Type | Status | Edge from | Motivation |
|----|-------|------|--------|-----------|------------|
| N1 | forward pass: matrix x vector layer by layer | derive | complete | R1 | a model has millions of weights — what does it do with them? |
| N2 | logits -> softmax -> probabilities -> sampling | derive | complete | N1 | last layer produces numbers but they're not probabilities — what's missing? |
| N3 | embeddings: token -> vector | derive | complete | N1 | the input vector — where does it come from? |
| N4 | tensor = multidimensional array | derive | complete | N3 | what do you call a multidimensional table of numbers? |
| N5 | attention: query searches, key responds, value contributes | derive | in-progress | N1, R4 | between the linear layers there's something that adds intelligence — what? |
| N6 | KV cache sizing: bytes per token | derive | pending | N5 | the cache grows per token — how much memory does it consume? |
| N7 | how quantization works: scale + offset per block | derive | pending | R2, R3 | if 16 bits already works — why not go to 4? |
| N8 | importance matrix: which weights matter most | derive | pending | N7 | not all weights tolerate the same loss |
| N9 | GGUF: structure, metadata, tensors | derive | pending | N7 | the quantized model — what file format stores it? |
| N10 | safetensors vs GGUF: use cases | derive | pending | N9 | and safetensors? why two formats? |
| N11 | memory estimation: model + KV cache + drafters | derive | pending | N6 | KV cache dominates RAM — how to estimate if 2 models fit? |
| N12 | MTP: prediction heads inside the model itself | derive | pending | R5 | the draft model is a separate file — can we avoid that dependency? |
| N13 | DFlash: proprietary drafter vs integrated MTP | derive | pending | N12 | DFlash is another type of drafter — what's different? |
| N14 | why verification is parallelizable | derive | pending | N12 | verifying N tokens at once is faster than generating 1 — why? |
| N15 | sampling params: temperature, top-p, top-k | derive | pending | N2 | temperature, top-p, top-k — what do they control exactly? |
| N16 | scaling laws: loss decreases predictably with compute, data, params | derive | pending | N1, R3 | why are models the sizes they are? can we predict performance before training? |
| N17 | chinchilla scaling: compute-optimal ratio of params to tokens | derive | pending | N16 | we know loss is predictable — so what's the optimal model size for a given budget? |
| N18 | emergent abilities and phase transitions | derive | pending | N16, N17 | scaling laws predict loss — but do capabilities also scale smoothly? |
| N19 | MoE scaling: why sparse beats dense at same compute | derive | pending | N16, N5 | MoE activates fewer params per token — how does that change the scaling equation? |
| N20 | hands-on: explore a real model's code | derive | pending | N1, N4, N7 | I want to see inside and touch things |

## Session boundary
Session 1: N1-N5. N1-N4 complete. N5 in-progress (taught, quiz pending).
Next session: finish N5 quiz, then N6-N10.
Scaling laws branch (N16-N19) available after N1 prerequisite.
