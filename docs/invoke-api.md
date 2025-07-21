# Invoke API

The Invoke API provides a simple request/response interface for interacting with your AI agents. Send a message and receive a complete response in a single HTTP request.

## Endpoint

```
POST /api/agents/{agentId}/invoke
```

## Authentication

Include your API key in the Authorization header:

```
Authorization: Bearer apk_your_api_key_here
```

## Request Format

### Headers
- `Content-Type: application/json`
- `Authorization: Bearer {your_api_key}`

### Body

```json
{
  "message": "Your question or prompt here",
  "history": [
    {
      "role": "user",
      "content": "Previous user message"
    },
    {
      "role": "assistant", 
      "content": "Previous assistant response"
    }
  ]
}
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `message` | string | Yes | The message/prompt to send to the agent |
| `history` | array | No | Previous conversation history for context |

### History Format

Each history item should contain:
- `role`: Either "user" or "assistant"
- `content`: The message content

## Response Format

```json
{
  "response": "The agent's complete response text",
  "usage": {
    "prompt_tokens": 50,
    "completion_tokens": 25,
    "total_tokens": 75
  }
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `response` | string | The complete response from the agent |
| `usage` | object | Token usage statistics (optional) |
| `usage.prompt_tokens` | number | Tokens used for the input prompt |
| `usage.completion_tokens` | number | Tokens used for the response |
| `usage.total_tokens` | number | Total tokens used |

## Examples

### Basic Request

```bash
curl -X POST "https://your-instance.com/api/agents/your-agent-id/invoke" \
  -H "Authorization: Bearer apk_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is the capital of France?"
  }'
```

### Response

```json
{
  "response": "The capital of France is Paris.",
  "usage": {
    "prompt_tokens": 8,
    "completion_tokens": 7,
    "total_tokens": 15
  }
}
```

### Request with History

```bash
curl -X POST "https://your-instance.com/api/agents/your-agent-id/invoke" \
  -H "Authorization: Bearer apk_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What about Italy?",
    "history": [
      {
        "role": "user",
        "content": "What is the capital of France?"
      },
      {
        "role": "assistant",
        "content": "The capital of France is Paris."
      }
    ]
  }'
```

### Response with History

```json
{
  "response": "The capital of Italy is Rome.",
  "usage": {
    "prompt_tokens": 25,
    "completion_tokens": 7,
    "total_tokens": 32
  }
}
```

## Error Responses

### Invalid API Key
```json
{
  "message": "invalid or expired api key"
}
```

### Missing Message
```json
{
  "message": "message is required"
}
```

### Agent Not Found
```json
{
  "message": "Agent not found"
}
```

## Best Practices

1. **Include History**: For multi-turn conversations, always include relevant history for better context
2. **Handle Errors**: Implement proper error handling for network issues and API errors
3. **Rate Limiting**: Respect rate limits and implement exponential backoff for retries
4. **Token Management**: Monitor token usage to optimize costs

## Use Cases

The Invoke API is ideal for:
- **Simple Q&A**: Single question, single answer scenarios
- **Batch Processing**: Processing multiple independent requests
- **Integration**: Embedding AI responses in existing applications
- **Automation**: Automated workflows that need complete responses

For real-time streaming responses, see the [Streaming API](./streaming-api.md) documentation.