# Instruction Aware Embeddings

> Why Your Retriever is Failing and How Context Can Save It - Instruction Aware Embeddings

- Author: Dipkumar Patel
- URL: https://dipkumar.dev/posts/rag/instruction-aware-embeddings/
- Published: 2025-07-08
- Updated: 2026-03-14
- Tags: rag, embedding

---

# Why Your Retriever is Failing and How Context Can Save It

Imagine asking "I want to buy apple" – do you mean Apple Inc. stock, the latest iPhone, or simply fruit? Without context, your retriever may serve you the wrong results.

---

## 1. What Is the Problem in Your Retriever & Embedding?  
Modern retrievers map queries and documents into high-dimensional vectors (embeddings) and rank by cosine similarity. But when a query is **ambiguous**, plain embeddings struggle:  
- They collapse multiple meanings of "apple" into one vector.  
- The top results can mix stock guides, product pages, and nutrition articles.

You might think this is a hypothetical scenario that rarely occurs in practice. However, here's a real-world example from Google Deep Research that illustrates the issue:

```text
Query: "We want to create a simple presentation on MCP server. We want to discuss why it's needed, current limitations, and potential use cases.

We also want to highlight its technical challenges.

Let's write a concise presentation for this."
```
![image](/static/blog_photos/context-gemini.png)

It returned information about "Unisys ClearPath MCP" rather than the intended "Model Control Protocol (MCP)" proposed by Anthropic. This real-world misalignment underscores how context-less embeddings can derail retrieval.  


---

## 2. Missing Context in Embedding  
Embeddings encode **semantic similarity** but lack task or intent signals. Out of the box, they answer the question:  
> "Which documents *sound* most like this query?"  

They don't know if "apple" refers to finance, technology, or groceries—so they return a blend of all.

---

## 3. How Does It Work Without Context?  
Using script's results (see [gist](https://gist.github.com/immortal3/6af71b0f9be87489d13a7e0f2cf68120)), here's the **plain embedding** behavior for "I want to buy apple" with OpenAI and Qwen models:

```text
📝 Query: 'I want to buy apple'
🔍 Using plain query (no instruction)

🤖 OpenAI Model Results:
1. How to Buy Apple Stock   (Score: 0.536)
2. Where to Buy Apples      (Score: 0.497)
3. iPhone 15 Pro Purchase   (Score: 0.455)

🤖 Qwen Model Results:
1. Where to Buy Apples       (Score: 0.604)
2. How to Buy Apple Stock    (Score: 0.594)
3. Health Benefits of Apples (Score: 0.501)
```

Both embeddings mix stock, fruit, and product topics. The **Qwen** model edges out OpenAI by a small margin, but neither is decisively focused.



## 4. Introducing Qwen & Replicating the Same Thing in OpenAI  
The [Qwen3-Embedding-8B model](https://qwenlm.github.io/blog/qwen3-embedding/) is **instruction-aware**, trained to accept task descriptions alongside queries. When we add a "grocery shopping" instruction:

```python
# Minimal instruction-aware query construction
instruction = "Given a grocery shopping question, retrieve fruit purchase information"
query = "I want to buy apple"
instructed_query = f"Instruction: {instruction}\nQuery: {query}"
```

![image](/static/blog_photos/context-qwen.png)

---

**Visualizing the Flow:**

```text
User Query: "I want to buy apple"
        |
        v
[Plain Embedding Model]
        |
        v
Results: [Stock guides, iPhones, fruit articles]  <-- Mixed, ambiguous

User Query + Instruction: "Given a grocery shopping question, retrieve fruit purchase information\nI want to buy apple"
        |
        v
[Instruction-Aware Embedding Model]
        |
        v
Results: [Fruit purchase guides, grocery info]  <-- Focused, relevant
```

---

### Focused Scenario Performance Gains

Below is a comparison of similarity scores for the **correct document** in each use case, showing how instruction-aware embeddings shift the focus within the same model. 
Note, OpenAI does not support instruction-aware embeddings yet, but we tried to run the same instruction-aware query with OpenAI's embedding model. As you can see, it did not work very well and it's clear, instruction-aware embeddings need to be supported by the model and it's not just a matter of adding a prefix to the query.

| Scenario                         | Model  | Plain Score | Instruction Score | Δ Score   |
|----------------------------------|--------|-------------|-------------------|-----------|
| Financial (Stock Purchase)       | OpenAI | 0.536       | 0.472             | −0.064    |
| Financial (Stock Purchase)       | Qwen   | 0.594       | 0.743             | +0.149    |
| Technology (iPhone Purchase)     | OpenAI | 0.455       | 0.393             | −0.062    |
| Technology (iPhone Purchase)     | Qwen   | *<0.501*    | 0.512             | **↑**     |
| Grocery (Fruit Purchase)         | OpenAI | 0.497       | 0.502             | +0.005    |
| Grocery (Fruit Purchase)         | Qwen   | 0.604       | 0.680             | +0.076    |

*Note:* Qwen did not surface the iPhone doc in its top-3 plain results (score <0.501), yet it rises to #2 (0.512) with instruction.

**What does this mean?**  
Notice how Qwen's instruction-aware mode dramatically increases the relevance score for the correct document, while OpenAI's model barely changes or even drops. This demonstrates that simply adding instructions to the query only works if the model is trained to use them.

---

## 5. Alternative: Query Rewriting

Embeddings also benefit when the query itself carries the necessary context. Instead of relying solely on instruction-aware models, you can rewrite the user's query using chat history or domain knowledge to inject focus. For example:

- **Original Query:** "I want to buy apple"
- **Rewritten Query:** "Where can I buy fresh apples at my local grocery store?"

Such rewrites embed context directly into the text, allowing plain embedding models to retrieve the correct documents (fruit vendors, grocery guides) without specialized instructions. This technique can be automated via:

- A chat interface that remembers previous messages and reformulates queries.
- A domain-specific rewriter that maps generic queries to more precise, vocabulary-rich versions.

By combining query rewriting with embeddings, you get the best of both worlds: minimal model changes and focused retrieval.

---

## 6. What You Can Do About It

Facing ambiguous queries? You have four straightforward strategies:

1. **Instruction-aware embeddings**
   - Use models like Qwen3-Embedding-8B that accept contextual instructions.
   - Best for: New projects or high-priority use cases.
   - Trade-offs: Requires switching your embedding provider.

2. **Query rewriting**
   - Rewrite queries to inject context (e.g., "Where can I buy fresh organic apples?").
   - Best for: Legacy systems or teams using plain embedding models.
   - Trade-offs: Requires building and maintaining rewriting logic.

3. **Hybrid approach**
   - Combine query rewriting for immediate gains with instruction-aware models for future migrations.
   - Best for: Teams seeking a phased adoption strategy.
   - Trade-offs: More complex workflow but balances risk and reward.

4. **Ask clarifying questions**
   - Detect vague or ambiguous queries and prompt the user for more details before retrieving.
   - Best for: Interactive search interfaces and chatbots.
   - Trade-offs: Requires a conversational UI and may add extra steps to user interactions.

Choose the strategy that fits your team's resources and goals, and start by tackling your most ambiguous queries first.

---

## 7. Closing Thoughts  
- **Missing context** in embeddings is the core challenge for ambiguous queries.  
- **Instruction-aware embeddings** (like Qwen3-Embedding-8B) deliver _stronger_ task focus, dramatically improving top-ranked results.  
- You can mimic this in OpenAI by manually adding instructions, but specialized models yield bigger gains.  

**What should you do next?**  
- Audit your current retrieval system for ambiguous queries.
- Experiment with instruction-aware models if available.
- Implement query rewriting where needed to improve retrieval focus.

Embrace instruction-aware retrieval to resolve ambiguity and serve exactly what users intend—every time.  

---

*References:*  
- Qwen3 Embedding model card: [Hugging Face](https://qwenlm.github.io/blog/qwen3-embedding/)  
- Code example and full script: [compare.py on GitHub Gist](https://gist.github.com/immortal3/6af71b0f9be87489d13a7e0f2cf68120)
