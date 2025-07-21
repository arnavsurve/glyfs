# Streaming API

The Streaming API provides real-time streaming responses from your AI agents using Server-Sent Events (SSE). Get immediate feedback as the agent generates its response, perfect for interactive applications.

## Endpoint

```
POST /api/agents/{agentId}/invoke/stream
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

**Note**: The request format is identical to the [Invoke API](./invoke-api.md).

## Response Format

The response is a stream of Server-Sent Events (SSE). Each event is a JSON object with the following structure:

```json
{
  "type": "event_type",
  "content": "event_content",
  "data": { /* additional data */ }
}
```

## Event Types

### `metadata`
Initial event with agent information.

```json
{
  "type": "metadata",
  "content": "",
  "data": {
    "agent_id": "7dcf770a-066a-47c7-85ab-731495f99b76"
  }
}
```

### `token`
Individual text chunks as the response is generated.

```json
{
  "type": "token",
  "content": "Hello",
  "data": null
}
```

### `tool_event`
Tool execution events when the agent uses tools.

```json
{
  "type": "tool_event",
  "content": "",
  "data": {
    "type": "tool_start",
    "tool_name": "search",
    "arguments": { /* tool arguments */ }
  }
}
```

Tool event sub-types:
- `tool_start`: Tool execution begins
- `tool_result`: Tool execution completes successfully  
- `tool_error`: Tool execution fails

### `done`
Final event indicating completion with usage statistics.

```json
{
  "type": "done",
  "content": "",
  "data": {
    "response": "Complete response text",
    "usage": {
      "prompt_tokens": 50,
      "completion_tokens": 25,
      "total_tokens": 75
    }
  }
}
```

### `error`
Error event if something goes wrong during generation.

```json
{
  "type": "error",
  "content": "Error description",
  "data": null
}
```

## Examples

### JavaScript/Node.js

```javascript
const response = await fetch('https://your-instance.com/api/agents/your-agent-id/invoke/stream', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer apk_your_api_key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    message: 'Tell me a story about a robot'
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const eventData = JSON.parse(line.substring(6));
      
      switch (eventData.type) {
        case 'metadata':
          console.log('Agent ID:', eventData.data.agent_id);
          break;
        case 'token':
          process.stdout.write(eventData.content);
          break;
        case 'tool_event':
          console.log('Tool event:', eventData.data);
          break;
        case 'done':
          console.log('\nResponse complete:', eventData.data.response);
          console.log('Usage:', eventData.data.usage);
          break;
        case 'error':
          console.error('Error:', eventData.content);
          break;
      }
    }
  }
}
```

### Python

```python
import requests
import json

response = requests.post(
    'https://your-instance.com/api/agents/your-agent-id/invoke/stream',
    headers={
        'Authorization': 'Bearer apk_your_api_key',
        'Content-Type': 'application/json'
    },
    json={
        'message': 'Tell me a story about a robot'
    },
    stream=True
)

for line in response.iter_lines():
    if line:
        line_str = line.decode('utf-8')
        if line_str.startswith('data: '):
            event_data = json.loads(line_str[6:])
            
            if event_data['type'] == 'token':
                print(event_data['content'], end='', flush=True)
            elif event_data['type'] == 'done':
                print(f"\nComplete response: {event_data['data']['response']}")
                print(f"Usage: {event_data['data']['usage']}")
            elif event_data['type'] == 'error':
                print(f"Error: {event_data['content']}")
```

### curl

```bash
curl -N "https://your-instance.com/api/agents/your-agent-id/invoke/stream" \
  -H "Authorization: Bearer apk_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Count to 5 slowly"
  }'
```

### Example Output

```
data: {"type":"metadata","content":"","data":{"agent_id":"7dcf770a-066a-47c7-85ab-731495f99b76"}}

data: {"type":"token","content":"O","data":null}

data: {"type":"token","content":"n","data":null}

data: {"type":"token","content":"e","data":null}

data: {"type":"token","content":"…","data":null}

data: {"type":"done","content":"","data":{"response":"One… Two… Three… Four… Five.","usage":{"prompt_tokens":5,"completion_tokens":12,"total_tokens":17}}}
```

## Error Handling

### Connection Errors
Handle network disconnections gracefully by implementing reconnection logic.

### Parsing Errors
Always wrap JSON parsing in try-catch blocks as malformed events may occur.

### Tool Errors
Tool events may include error states - handle these appropriately in your application.

## Best Practices

1. **Buffer Management**: Handle partial events and buffer incomplete JSON
2. **Reconnection**: Implement automatic reconnection for dropped connections
3. **Error Recovery**: Gracefully handle parsing errors and malformed events
4. **UI Updates**: Update your UI incrementally as tokens arrive
5. **Tool Feedback**: Show tool execution progress to users
6. **Resource Cleanup**: Always close streams and clean up resources

## Use Cases

The Streaming API is ideal for:
- **Interactive Chat**: Real-time conversational interfaces
- **Live Content Generation**: Streaming content creation
- **Progress Feedback**: Showing generation progress to users
- **Tool Visualization**: Displaying tool execution in real-time
- **Responsive UX**: Keeping users engaged during long responses

For simple request/response scenarios, consider the [Invoke API](./invoke-api.md) instead.