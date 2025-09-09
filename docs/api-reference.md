# API Reference

Complete reference for the Glyfs API endpoints.

## Authentication

All API endpoints require authentication via agent-specific API keys. See [Authentication](./authentication.md) for details.

```http
Authorization: Bearer apk_your_api_key_here
```

## Base URL

```
https://your-glyfs-instance.com/api
```

## Endpoints

### Agent Invocation

#### POST /agents/{agentId}/invoke

Invoke an agent with a single request/response.

**Path Parameters:**
- `agentId` (string, required): UUID of the agent to invoke

**Request Headers:**
- `Authorization` (string, required): Bearer token with agent API key
- `Content-Type` (string, required): Must be `application/json`

**Request Body:**
```json
{
  "message": "string (required) - The message to send to the agent",
  "history": [
    {
      "role": "user|assistant",
      "content": "string - Message content"
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "response": "string - The agent's complete response",
  "usage": {
    "prompt_tokens": 0,
    "completion_tokens": 0, 
    "total_tokens": 0
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid request format or missing required fields
- `401 Unauthorized`: Invalid or missing API key
- `404 Not Found`: Agent not found
- `500 Internal Server Error`: Server error during generation

---

#### POST /agents/{agentId}/invoke/stream

Invoke an agent with streaming response using Server-Sent Events.

**Path Parameters:**
- `agentId` (string, required): UUID of the agent to invoke

**Request Headers:**
- `Authorization` (string, required): Bearer token with agent API key  
- `Content-Type` (string, required): Must be `application/json`

**Request Body:**
Same as `/invoke` endpoint.

**Response:**
Server-Sent Events stream with `Content-Type: text/event-stream`

**Event Types:**

1. **metadata** - Initial agent information
```json
{
  "type": "metadata",
  "content": "",
  "data": {
    "agent_id": "uuid"
  }
}
```

2. **token** - Individual response tokens
```json
{
  "type": "token", 
  "content": "text_chunk",
  "data": null
}
```

3. **tool_event** - Tool execution events (structure varies by MCP server)
```json
{
  "type": "tool_event",
  "content": "",
  "data": {
    "tool_name": "string",
    "status": "string",
    "result": "any",
    "error": "string|null"
  }
}
```

4. **done** - Stream completion with final response and usage
```json
{
  "type": "done",
  "content": "",
  "data": {
    "response": "complete_response_text",
    "usage": {
      "prompt_tokens": 0,
      "completion_tokens": 0,
      "total_tokens": 0
    }
  }
}
```

5. **error** - Error during generation
```json
{
  "type": "error",
  "content": "error_description",
  "data": null
}
```

**Error Responses:**
Same as `/invoke` endpoint.

## Data Types

### Message
```json
{
  "role": "user|assistant",
  "content": "string"
}
```

### Usage
```json
{
  "prompt_tokens": 0,
  "completion_tokens": 0,
  "total_tokens": 0
}
```

**Note**: Token counts are approximated using `length / 4` and may not reflect actual LLM provider token usage.

## Rate Limiting

Rate limits vary by user tier:
- **Free**: Lower limits for basic usage
- **Pro**: Higher limits for regular usage  
- **Enterprise**: Custom limits

Rate limit details are not currently exposed in response headers.

## Error Handling

All error responses follow this format:

```json
{
  "message": "string - Human readable error description"
}
```

### Common Error Messages

**Authentication:**
- `missing authorization header`
- `invalid authorization header format` 
- `invalid API key format`
- `invalid API key`

**Request Validation:**
- `agentId path parameter is required`
- `invalid agentId format`
- `message is required`
- `Invalid request format`

**Resource Access:**
- `agent not found`
- `Agent owner has not configured {provider} API key`

**Server Errors:**
- `Failed to generate response: {details}`
- `agent context not found`

## SDK Examples

See [Examples](./examples.md) for complete SDK implementations in various programming languages.

## Changelog

### Current Version
- Agent-specific API key authentication
- Support for conversation history
- Streaming responses with Server-Sent Events
- Tool execution events via MCP integration
- Token usage reporting (approximated)

## Support

For API support:
1. Check this documentation for endpoint details
2. Review [Authentication](./authentication.md) for auth issues
3. See [Examples](./examples.md) for working code samples
4. Contact support for enterprise customers