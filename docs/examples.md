# API Examples

This page provides comprehensive examples for integrating with Glyfs APIs in various programming languages and frameworks.

## Table of Contents

- [JavaScript/TypeScript](#javascripttypescript)
- [Python](#python)
- [Go](#go)
- [PHP](#php)
- [cURL](#curl)
- [Postman](#postman)

## JavaScript/TypeScript

### Simple Invoke API Client

```typescript
interface AgentResponse {
  response: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

class GlyfsClient {
  constructor(
    private baseUrl: string,
    private apiKey: string
  ) {}

  async invoke(agentId: string, message: string, history?: Array<{role: string, content: string}>): Promise<AgentResponse> {
    const response = await fetch(`${this.baseUrl}/api/agents/${agentId}/invoke`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message,
        history: history || []
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'API request failed');
    }

    return response.json();
  }

  async *stream(agentId: string, message: string, history?: Array<{role: string, content: string}>) {
    const response = await fetch(`${this.baseUrl}/api/agents/${agentId}/invoke/stream`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message,
        history: history || []
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'API request failed');
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(line.substring(6));
              yield eventData;
            } catch (e) {
              console.warn('Failed to parse SSE event:', line);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

// Usage
const client = new AgentPlaneClient('https://your-instance.com', 'apk_your_api_key');

// Invoke API
const response = await client.invoke('agent-id', 'Hello world!');
console.log(response.response);

// Streaming API
for await (const event of client.stream('agent-id', 'Tell me a story')) {
  if (event.type === 'token') {
    process.stdout.write(event.content);
  } else if (event.type === 'done') {
    console.log('\nFinal response:', event.data.response);
  }
}
```

### React Hook for Streaming

```typescript
import { useState, useCallback } from 'react';

interface StreamEvent {
  type: string;
  content: string;
  data: any;
}

export function useAgentStream(baseUrl: string, apiKey: string) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [response, setResponse] = useState('');
  const [events, setEvents] = useState<StreamEvent[]>([]);

  const streamMessage = useCallback(async (
    agentId: string,
    message: string,
    onToken?: (token: string) => void,
    onEvent?: (event: StreamEvent) => void
  ) => {
    setIsStreaming(true);
    setResponse('');
    setEvents([]);

    try {
      const client = new AgentPlaneClient(baseUrl, apiKey);
      
      for await (const event of client.stream(agentId, message)) {
        setEvents(prev => [...prev, event]);
        
        if (event.type === 'token') {
          setResponse(prev => prev + event.content);
          onToken?.(event.content);
        }
        
        onEvent?.(event);
        
        if (event.type === 'done' || event.type === 'error') {
          break;
        }
      }
    } catch (error) {
      console.error('Streaming error:', error);
    } finally {
      setIsStreaming(false);
    }
  }, [baseUrl, apiKey]);

  return {
    isStreaming,
    response,
    events,
    streamMessage
  };
}
```

## Python

### Simple Client

```python
import requests
import json
from typing import Generator, Dict, Any, Optional, List

class AgentPlaneClient:
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url
        self.api_key = api_key
        self.headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
    
    def invoke(self, agent_id: str, message: str, history: Optional[List[Dict]] = None) -> Dict[str, Any]:
        """Send a message to an agent and get complete response."""
        response = requests.post(
            f'{self.base_url}/api/agents/{agent_id}/invoke',
            headers=self.headers,
            json={
                'message': message,
                'history': history or []
            }
        )
        response.raise_for_status()
        return response.json()
    
    def stream(self, agent_id: str, message: str, history: Optional[List[Dict]] = None) -> Generator[Dict[str, Any], None, None]:
        """Stream response from an agent."""
        response = requests.post(
            f'{self.base_url}/api/agents/{agent_id}/invoke/stream',
            headers=self.headers,
            json={
                'message': message,
                'history': history or []
            },
            stream=True
        )
        response.raise_for_status()
        
        for line in response.iter_lines():
            if line:
                line_str = line.decode('utf-8')
                if line_str.startswith('data: '):
                    try:
                        event_data = json.loads(line_str[6:])
                        yield event_data
                    except json.JSONDecodeError:
                        continue

# Usage example
client = AgentPlaneClient('https://your-instance.com', 'apk_your_api_key')

# Simple invoke
response = client.invoke('agent-id', 'What is AI?')
print(response['response'])

# Streaming with progress
print("Streaming response:")
full_response = ""
for event in client.stream('agent-id', 'Tell me about quantum computing'):
    if event['type'] == 'token':
        print(event['content'], end='', flush=True)
        full_response += event['content']
    elif event['type'] == 'tool_event':
        print(f"\n[Tool: {event['data'].get('tool_name', 'unknown')}]")
    elif event['type'] == 'done':
        print(f"\n\nUsage: {event['data']['usage']}")
        break
```

### Async Client with aiohttp

```python
import aiohttp
import asyncio
import json
from typing import AsyncGenerator, Dict, Any, Optional, List

class AsyncAgentPlaneClient:
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
    
    async def invoke(self, agent_id: str, message: str, history: Optional[List[Dict]] = None) -> Dict[str, Any]:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f'{self.base_url}/api/agents/{agent_id}/invoke',
                headers=self.headers,
                json={'message': message, 'history': history or []}
            ) as response:
                response.raise_for_status()
                return await response.json()
    
    async def stream(self, agent_id: str, message: str, history: Optional[List[Dict]] = None) -> AsyncGenerator[Dict[str, Any], None]:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f'{self.base_url}/api/agents/{agent_id}/invoke/stream',
                headers=self.headers,
                json={'message': message, 'history': history or []}
            ) as response:
                response.raise_for_status()
                
                async for line in response.content:
                    line_str = line.decode('utf-8').strip()
                    if line_str.startswith('data: '):
                        try:
                            event_data = json.loads(line_str[6:])
                            yield event_data
                        except json.JSONDecodeError:
                            continue

# Usage
async def main():
    client = AsyncAgentPlaneClient('https://your-instance.com', 'apk_your_api_key')
    
    # Stream response
    async for event in client.stream('agent-id', 'Explain machine learning'):
        if event['type'] == 'token':
            print(event['content'], end='', flush=True)

asyncio.run(main())
```

## Go

```go
package main

import (
    "bufio"
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "strings"
)

type AgentPlaneClient struct {
    BaseURL string
    APIKey  string
    Client  *http.Client
}

type Message struct {
    Role    string `json:"role"`
    Content string `json:"content"`
}

type InvokeRequest struct {
    Message string    `json:"message"`
    History []Message `json:"history,omitempty"`
}

type InvokeResponse struct {
    Response string `json:"response"`
    Usage    *Usage `json:"usage,omitempty"`
}

type Usage struct {
    PromptTokens     int `json:"prompt_tokens"`
    CompletionTokens int `json:"completion_tokens"`
    TotalTokens      int `json:"total_tokens"`
}

type StreamEvent struct {
    Type    string      `json:"type"`
    Content string      `json:"content"`
    Data    interface{} `json:"data"`
}

func NewAgentPlaneClient(baseURL, apiKey string) *AgentPlaneClient {
    return &AgentPlaneClient{
        BaseURL: baseURL,
        APIKey:  apiKey,
        Client:  &http.Client{},
    }
}

func (c *AgentPlaneClient) Invoke(agentID, message string, history []Message) (*InvokeResponse, error) {
    req := InvokeRequest{
        Message: message,
        History: history,
    }

    body, err := json.Marshal(req)
    if err != nil {
        return nil, err
    }

    httpReq, err := http.NewRequest("POST", 
        fmt.Sprintf("%s/api/agents/%s/invoke", c.BaseURL, agentID),
        bytes.NewReader(body))
    if err != nil {
        return nil, err
    }

    httpReq.Header.Set("Authorization", "Bearer "+c.APIKey)
    httpReq.Header.Set("Content-Type", "application/json")

    resp, err := c.Client.Do(httpReq)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        return nil, fmt.Errorf("API error: %d", resp.StatusCode)
    }

    var result InvokeResponse
    if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
        return nil, err
    }

    return &result, nil
}

func (c *AgentPlaneClient) Stream(agentID, message string, history []Message, eventHandler func(StreamEvent)) error {
    req := InvokeRequest{
        Message: message,
        History: history,
    }

    body, err := json.Marshal(req)
    if err != nil {
        return err
    }

    httpReq, err := http.NewRequest("POST",
        fmt.Sprintf("%s/api/agents/%s/invoke/stream", c.BaseURL, agentID),
        bytes.NewReader(body))
    if err != nil {
        return err
    }

    httpReq.Header.Set("Authorization", "Bearer "+c.APIKey)
    httpReq.Header.Set("Content-Type", "application/json")

    resp, err := c.Client.Do(httpReq)
    if err != nil {
        return err
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        return fmt.Errorf("API error: %d", resp.StatusCode)
    }

    scanner := bufio.NewScanner(resp.Body)
    for scanner.Scan() {
        line := scanner.Text()
        if strings.HasPrefix(line, "data: ") {
            var event StreamEvent
            if err := json.Unmarshal([]byte(line[6:]), &event); err != nil {
                continue // Skip malformed events
            }
            eventHandler(event)
        }
    }

    return scanner.Err()
}

// Usage
func main() {
    client := NewAgentPlaneClient("https://your-instance.com", "apk_your_api_key")

    // Simple invoke
    response, err := client.Invoke("agent-id", "What is Go?", nil)
    if err != nil {
        panic(err)
    }
    fmt.Println(response.Response)

    // Streaming
    fmt.Println("Streaming response:")
    err = client.Stream("agent-id", "Tell me about Go programming", nil, func(event StreamEvent) {
        switch event.Type {
        case "token":
            fmt.Print(event.Content)
        case "done":
            fmt.Println("\nResponse complete!")
        case "error":
            fmt.Printf("Error: %s\n", event.Content)
        }
    })
    if err != nil {
        panic(err)
    }
}
```

## PHP

```php
<?php

class GlyfsClient {
    private $baseUrl;
    private $apiKey;
    
    public function __construct($baseUrl, $apiKey) {
        $this->baseUrl = $baseUrl;
        $this->apiKey = $apiKey;
    }
    
    public function invoke($agentId, $message, $history = []) {
        $data = [
            'message' => $message,
            'history' => $history
        ];
        
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $this->baseUrl . '/api/agents/' . $agentId . '/invoke',
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($data),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $this->apiKey,
                'Content-Type: application/json'
            ]
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode !== 200) {
            throw new Exception('API request failed with code: ' . $httpCode);
        }
        
        return json_decode($response, true);
    }
    
    public function stream($agentId, $message, $eventCallback, $history = []) {
        $data = [
            'message' => $message,
            'history' => $history
        ];
        
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $this->baseUrl . '/api/agents/' . $agentId . '/invoke/stream',
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($data),
            CURLOPT_WRITEFUNCTION => function($ch, $data) use ($eventCallback) {
                $lines = explode("\n", $data);
                foreach ($lines as $line) {
                    if (strpos($line, 'data: ') === 0) {
                        $eventData = json_decode(substr($line, 6), true);
                        if ($eventData) {
                            call_user_func($eventCallback, $eventData);
                        }
                    }
                }
                return strlen($data);
            },
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $this->apiKey,
                'Content-Type: application/json'
            ]
        ]);
        
        curl_exec($ch);
        curl_close($ch);
    }
}

// Usage
$client = new AgentPlaneClient('https://your-instance.com', 'apk_your_api_key');

// Simple invoke
$response = $client->invoke('agent-id', 'What is PHP?');
echo $response['response'] . "\n";

// Streaming
echo "Streaming response:\n";
$client->stream('agent-id', 'Tell me about PHP', function($event) {
    switch ($event['type']) {
        case 'token':
            echo $event['content'];
            break;
        case 'done':
            echo "\nResponse complete!\n";
            break;
        case 'error':
            echo "Error: " . $event['content'] . "\n";
            break;
    }
});
?>
```

## cURL

### Basic Invoke Request

```bash
curl -X POST "https://your-instance.com/api/agents/your-agent-id/invoke" \
  -H "Authorization: Bearer apk_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is artificial intelligence?"
  }'
```

### Invoke with History

```bash
curl -X POST "https://your-instance.com/api/agents/your-agent-id/invoke" \
  -H "Authorization: Bearer apk_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What about machine learning?",
    "history": [
      {
        "role": "user",
        "content": "What is artificial intelligence?"
      },
      {
        "role": "assistant",
        "content": "Artificial intelligence (AI) is a field of computer science..."
      }
    ]
  }'
```

### Streaming Request

```bash
curl -N "https://your-instance.com/api/agents/your-agent-id/invoke/stream" \
  -X POST \
  -H "Authorization: Bearer apk_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Tell me a short story"
  }'
```

## Postman

### Collection Setup

1. **Create Environment Variables**:
   - `base_url`: `https://your-instance.com`
   - `api_key`: `apk_your_api_key`
   - `agent_id`: `your-agent-id`

2. **Invoke Request**:
   - Method: `POST`
   - URL: `{{base_url}}/api/agents/{{agent_id}}/invoke`
   - Headers:
     - `Authorization`: `Bearer {{api_key}}`
     - `Content-Type`: `application/json`
   - Body (raw JSON):
     ```json
     {
       "message": "Hello world!"
     }
     ```

3. **Streaming Request**:
   - Method: `POST`
   - URL: `{{base_url}}/api/agents/{{agent_id}}/invoke/stream`
   - Headers:
     - `Authorization`: `Bearer {{api_key}}`
     - `Content-Type`: `application/json`
   - Body (raw JSON):
     ```json
     {
       "message": "Tell me about space"
     }
     ```

### Pre-request Script

```javascript
// Generate conversation history dynamically
pm.globals.set("history", JSON.stringify([
    {
        "role": "user",
        "content": "Previous question"
    },
    {
        "role": "assistant", 
        "content": "Previous response"
    }
]));
```

These examples should cover most common integration scenarios. Choose the approach that best fits your tech stack and requirements.