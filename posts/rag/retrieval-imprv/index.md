# How to improve RAG retrieval: recall, precision, and NDCG

> Improve RAG retrieval without sacrificing precision: tune chunking, hybrid search, reranking, filters, and recall/NDCG metrics.

- Author: Dipkumar Patel
- URL: https://dipkumar.dev/posts/rag/retrieval-imprv/
- Published: 2025-03-08
- Updated: 2026-06-17
- Tags: rag

---

# Improving Retrieval in RAG (via Recall, Precision, and NDCG)

## Introduction

Retrieval-Augmented Generation (RAG) is the superhero sidekick that grounds your Large Language Model (LLM) in cold, hard facts. But here's the dirty secret: if your retrieval sucks, your RAG system is just a fancy chatbot with a broken brain. Weak retrieval = missed documents, irrelevant results, and rankings that make no sense.

This guide cuts through the noise. You'll learn how to turbocharge your RAG retrieval with a no-fluff, step-by-step approach to maximize recall, sharpen precision, and nail NDCG. Whether you're a data scientist, developer, or AI enthusiast, this is your playbook to stop screwing around and start getting results. Let's roll.

## The Basics of Retrieval

### Vector Search vs. Full-Text Search

Retrieval is the backbone of RAG, and it's a tug-of-war between two heavyweights: vector search and full-text search. Here's the breakdown:

**Vector Search**: Turns words into numbers (embeddings) to capture meaning. Think of it as a genius librarian who gets that "machine learning frameworks" is related to "neural network libraries" even if the exact words don't match.

*Example*: Query = "machine learning frameworks." Vector search grabs articles about "PyTorch vs TensorFlow comparison" because it understands semantic similarity.

**Full-Text Search**: The old-school keyword matcher. It's like a librarian who only cares about exact titles—if "machine learning frameworks" isn't in the text, you're out of luck.

*Example*: Same query, "machine learning frameworks." Full-text search might miss that PyTorch article unless the phrase matches perfectly, but it'll snag anything with "frameworks" lightning-fast.

Here's a quick comparison:

| Feature | Vector Search | Full-Text Search |
|---------|--------------|------------------|
| Strengths | Semantic understanding | Speed, exact matches |
| Weaknesses | Slower, resource-hungry | Misses context |
| Best For | Complex queries | Simple lookups |

**Why Both Matter**: Hybrid search (vector + keywords) is the cheat code. Combine them, and you get the best of both worlds—broad coverage with pinpoint accuracy.

## Metrics 101 – What to Optimize For

You can't fix what you don't measure. Here's your retrieval holy trinity:

**Recall**: Are you finding all the good stuff?

*Example*: Imagine 100 blog posts about "transformer architecture" exist. Your retriever grabs 85 of them. That's 85% recall. Miss too many, and your LLM is flying blind.

**Precision**: Are you dodging the junk?

*Example*: You retrieve 100 documents for "transformer architecture," but only 70 are relevant (the rest are about "electrical transformers"). That's 70% precision. Too much noise, and your RAG drowns in garbage.

**NDCG** (Normalized Discounted Cumulative Gain): Are the best hits at the top?

*Example*: Picture the perfect ranking: top 5 results about transformer models are gold, next 5 are decent. If your retriever puts electrical engineering papers at #1 and buries the good ML content at #10, your NDCG tanks. High NDCG = happy users.

### The Hierarchy of Needs

1. **Recall First**: Cast a wide net—don't miss the critical docs.
2. **Precision Next**: Trim the fat—keep only what's relevant.
3. **NDCG Last**: Polish the rankings—put the best up top.

## Step 1 – Maximizing Recall

### Why Recall First?

If your retriever misses key documents, your generator's toast. It's like cooking a steak dinner with no steak. Recall is step one—get everything on the table.

### Tactics to Boost Recall

1. **Query Expansion**: Make your query a beast by adding synonyms or related terms.

   *Example*: Query = "transformer models." Expand it to "attention mechanisms," "BERT architecture," "language model design." 

   *What to do*: 
   - Check out WordNet for traditional expansion
   - Use an LLM for contextual expansion or even re-writing to multiple different queries. In production, run all these expansions in parallel and merge results.

2. **Hybrid Search**: Merge vector and keyword results like a DJ mixing tracks. Use reciprocal rank fusion (1/rank) to blend the scores.

   *Example*: Query = "transformer models." Vector search finds "attention mechanism design," while full-text grabs "BERT model implementations." Fusion ranks them smartly.

   *What to do*: 
   - Use a hybrid search engine like [Pinecone](https://www.pinecone.io/learn/hybrid-search/), [Qdrant](https://qdrant.tech/articles/hybrid-search/), or [TurboPuffer](https://turbopuffer.com/docs/hybrid)

3. **Fine-Tune Embeddings**: Generic embeddings suck for niche domains. Train on your data—say, medical literature or financial reports—for better matches.

   *Example*: Fine-tune on a dataset of ML research papers. Now "transformer architecture" queries snag "multi-head attention mechanism" docs too.

   *What to do*: 
   - Do it yourself: fine-tune [BAAI/bge-small](https://huggingface.co/BAAI/bge-small-en) on your own data and benchmark it against current embeddings
   - Follow LlamaIndex's [guide on embedding fine-tuning](https://docs.llamaindex.ai/en/latest/examples/finetuning/embeddings/finetune_embedding/)
   - Take inspiration from Glean, which fine-tunes embeddings for each customer ([Video](https://www.youtube.com/watch?v=jTBsWJ2TKy8))

4. **Chunking Strategy**: Break documents into bite-sized pieces. Smaller chunks (e.g., 256 tokens) catch more, but overlap them (e.g., 50 tokens) to keep context.

   *Example*: An ML research paper on "transformer models" split into 500-token chunks might miss a key implementation detail. Shrink to 250 tokens with overlap, and you nab it.

   *Pro Tip*: 
   - Depending on your embedding model and domain, benchmark chunk size and overlap to find the best balance.

## Step 2 – Precision Tuning

### Why Precision Matters

You've got a pile of docs—now ditch the trash. Precision ensures your RAG isn't wading through irrelevant sludge.

### Precision-Boosting Strategies

1. **Re-Rankers**: Run a heavy-hitter model (e.g., BERT cross-encoder) on your top 50-100 results to rescore them.

   *Example*: Query = "transformer architecture." Initial retrieval grabs 100 docs, including some about "electrical power transformers." A re-ranker kicks out the electrical engineering stuff, keeping ML architecture gold.

   *What to do*: 
   - Use Cohere's Rerank API, it's dead simple to integrate
   - For brave souls, try open-source options such as [ColBERT](https://github.com/stanford-futuredata/ColBERT) and [BAAI/bge-reranker-base](https://huggingface.co/BAAI/bge-reranker-base)

2. **Metadata Filtering**: Use tags like date, category, or source to slice the fat.

   *Example*: Query = "transformer models." Filter out docs older than 2020 or from non-ML domains—bam, instant precision boost.

   *What to do*: 
   - Implement with vector databases like Pinecone, TurboPuffer, or Qdrant that support metadata filtering

3. **Thresholding**: Set a similarity cutoff (e.g., cosine > 0.5) to trash low-confidence matches.

   *Example*: Query = "transformer architecture." Docs below 0.5 might be random electrical engineering content—drop 'em and keep the signal.

   *What to do*: 
   - Configure similarity score thresholds in your vector database query APIs

## Step 3 – NDCG Optimization

### Why Ranking Matters

You've maximized recall and precision—now make sure the gold is at the top. With LLMs having finite token limits, the order of retrieval can make or break your RAG system. If your best content is buried at position #30, your LLM might never see it.

### Ranking Improvement Strategies

1. **Reranking**: Use re-rankers to filter and re-rank your results. This helps to improve both precision and NDCG.

2. **User Feedback Integration**: Capture what users actually find valuable and use it to improve your rankings.

   *Example*: Users consistently reference information from the third document in your RAG answers for "transformer applications." Your system learns to boost similar documents higher for that query, dramatically improving NDCG.

   *What to do*:
   - **Track interactions**: Implement explicit feedback (thumbs up/down) and implicit signals (time spent, follow-up questions)
   - **Build feedback loops**: Create a simple database that stores query-document pairs with user ratings
   - **Implement active learning**: Prioritize collecting feedback on borderline documents where the system is uncertain
   - **Curate your corpus**: Ruthlessly remove consistently low-rated documents from your vector database—this is a game-changer that most teams overlook
   - **Apply immediate boosts**: For frequent queries, manually boost documents with positive feedback by 1.2-1.5x in your ranking algorithm

   *Pro Tip*: Don't wait for perfect data—start with a simple "Was this helpful?" button after each RAG response, and you'll be shocked how quickly you can improve rankings with even sparse feedback.

3. **Context is King**: Leverage conversation history to supercharge your retrieval relevance.

   *Example*: A user asks "What are the best frameworks?" after discussing PyTorch for 10 minutes. Without context, you might return generic framework docs. With context, you nail it with PyTorch-specific framework comparisons.

   *What to do*:
   - **Store conversation history**: Keep the last 3-5 exchanges in a context window
   - **Question rewriting**: Use the history to expand ambiguous queries
   - **Context-aware filtering**: Use topics from previous exchanges to filter metadata

   *Pro Tip*: Don't just append history blindly—it creates noise. Instead, extract key entities and concepts from previous exchanges and use them to enrich your current query. For example, if discussing "transformer models for NLP tasks," extract "transformer" + "NLP" as context boosters.

### Measuring NDCG Improvement

Don't fly blind—benchmark your changes:

1. Create a test set with queries and human-judged relevance scores
2. Calculate NDCG@k (typically k=5 or k=10) before and after changes
3. Aim for at least 5-10% lift in NDCG to justify implementation costs

*Pro Tip*: Let's do some LLM math that won't make your brain explode! Focus on NDCG@k based on your document size, because your poor LLM can only eat so many tokens before it gets a tummy ache.

Here's a real-world example with numbers so simple even your coffee-deprived morning brain can handle them:

- Your average document: 10,000 tokens (that's a chatty document!)
- Your fancy GPT-4o: 128,000 token capacity (big brain energy!)
- Your context + prompt: ~3,000 tokens (the appetizer)

Now for the main course calculation:
10,000 tokens × 10 documents = 100,000 tokens
100,000 tokens + 3,000 tokens = 103,000 tokens

103,000 < 128,000... We're good! 🎉

## Conclusion: Build a Retrieval Flywheel

Here's the game plan:

1. **Hybrid Search**: Max out recall—grab everything.
2. **Re-Rankers**: Sharpen precision—ditch the junk.
3. **Contextual Ranking**: Make sure the gold is at the top.

This isn't a one-and-done deal. It's a flywheel—every tweak spins it faster. Experiment with chunk sizes, thresholds, and models. Small wins stack up to massive gains.

**Final Tip**: Don't guess—test. Try a 0.7 threshold vs. 0.9. Swap 256-token chunks for 512. Data beats dogma.

## Retrieval Cheat Sheet

| Step | Goal | Tactics |
|------|------|---------|
| 1. Recall | Grab everything | Query Expansion, Hybrid Search, Fine-Tuning, Chunking |
| 2. Precision | Ditch the junk | Re-Rankers, Metadata Filters, Thresholds |
| 3. NDCG | Perfect rankings | Reranking, User Feedback, Context |

That's it—your RAG retrieval is now a lean, mean, result-spitting machine. Go forth and dominate!
