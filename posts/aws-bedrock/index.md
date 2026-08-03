# AWS Bedrock Converse API: one endpoint for Claude, Llama, and Mistral

> How to call Amazon Bedrock Converse API, pass messages and inference config, and handle common model-specific validation errors.

- Author: Dipkumar Patel
- URL: https://dipkumar.dev/posts/aws-bedrock/
- Published: 2024-06-13
- Updated: 2026-06-17
- Tags: llm, ai

---

Amazon Bedrock is a fully managed service that makes high-performing foundation models (FMs) from leading AI startups and Amazon available for your use through a unified API. You can choose from a wide range of foundation models to find the model that is best suited for your use case. Amazon Bedrock also offers a broad set of capabilities to build generative AI applications with security, privacy, and responsible AI. With Amazon Bedrock, you can easily experiment with and evaluate top foundation models for your use cases, privately customize them with your data using techniques such as fine-tuning and Retrieval Augmented Generation (RAG), and build agents that execute tasks using your enterprise systems and data sources. [1]

AWS BedRock's Converse API is a single endpoint that allows you to chat with any model. Indeed, **the single endpoint** is, I believe, the best feature of AWS BedRock. Let's visit this endpoint and see how it works.

```python

model_id = "anthropic.claude-3-sonnet-20240229-v1:0"

inference_config = {"temperature": 0.5}
additional_model_fields = {"top_k": 200}

# Send the message.
response = bedrock_client.converse(
    modelId=model_id,
    messages=messages,
    system=system_prompts,
    inferenceConfig=inference_config,
    additionalModelRequestFields=additional_model_fields
)
```

By changing `model_id`, you can switch between different models. 

I think AWS BedRock should have used the same standards as OpenAI's client rather than creating their own
But, hey, it's still a single endpoint. right ?... 
I should be just able to switch models by changing model_id. right ?....

![AWS BedRock Endpoint](https://i.imgflip.com/5bgun8.jpg?a477264=400x400)

## Hidden Gotcha of Converse API

### Not every model is available

AWS BedRock has LLama3, Anthropic Claude, Mistral and their own Titan. But, It doesn't have OpenAI models like GPT-4/GPT-4o. This might not be a deal breaker, depending on what you are trying to achieve.
You can check the availability of models in [AWS Bedrock Models](https://docs.aws.amazon.com/bedrock/latest/userguide/models-supported.html)

### Not every model has system prompt, or multi-modality support

If you check converse API parameters, you will see that there is a parameter called `system`. This parameter is used to provide system prompt to the model. However, not every model supports system prompts. (Because they were not trained with system prompts). If you're switching between models via code using ENV/Flags/Config, you might need to handle edge cases where a system prompt is unavailable for the given `modelId`. Otherwise, It will throw an Exception. (Ideally, i think it should just give a warning) 
AWS has a [nice table](https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference.html#conversation-inference-supported-models-features) to check if given model has system prompt.

The same goes for multi-modality. If your messages include images, switching between models might not be straightforward.

### Not every model has same context window

I mean this is on you, but again good reminder.

### Advance Prompt technique like Prefilling Assistant Message

```python
# code copied from https://eugeneyan.com//writing/prompting/#prefill-claudes-responses
input = """
<description>
The SmartHome Mini is a compact smart home assistant available in black or white for 
only $49.99. At just 5 inches wide, it lets you control lights, thermostats, and other 
connected devices via voice or app—no matter where you place it in your home. This 
affordable little hub brings convenient hands-free control to your smart devices.
</description>

Extract the <name>, <size>, <price>, and <color> from this product <description>.

Return the extracted attributes within <attributes>.
"""

messages=[
    {
        "role": "user",
        "content": input,
    },
    {
        "role": "assistant",
        "content": "<attributes><name>"  # Prefilled response
    }
]
# raise error_class(parsed_response, operation_name)
# botocore.errorfactory.ValidationException: An error occurred (ValidationException) when calling the Converse  
# operation: The model that you are using requires the last turn in the conversation to be a user message. Add a 
# user message to the conversation and try again.
```

If you're using advanced prompting techniques, such as Prefilling Assistant Messages [3], where you pre-populate the message with text designated as 'assistant', you need to be cautious when switching between models. Not all models are compatible with this technique and their is validation check which will raise exception.

So, Overall, We are still far away from having a unified API for all models. I will update this article if i find anything new. 

## References
[1] https://docs.aws.amazon.com/bedrock/latest/userguide/what-is-bedrock.html

[2] https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference.html#conversation-inference-supported-models-features

[3] https://eugeneyan.com//writing/prompting/#prefill-claudes-responses
