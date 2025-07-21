# Tools & MCP Integration

AgentPlane supports powerful tool integrations through the Model Context Protocol (MCP), allowing your agents to perform actions, access external data, and integrate with various services.

## What are Tools?

Tools are external functions that your AI agents can call to:
- Access real-time data (web search, databases, APIs)
- Perform actions (send emails, create files, make API calls)
- Process data (analyze files, perform calculations)
- Integrate with services (GitHub, Slack, calendars)

## MCP (Model Context Protocol)

AgentPlane uses MCP to provide a standardized way for agents to interact with external tools and data sources. MCP enables:

- **Standardized Interface**: Consistent tool integration across different providers
- **Resource Access**: Access to files, databases, and external APIs
- **Prompt Templates**: Dynamic prompt generation based on context
- **Tool Discovery**: Automatic detection and registration of available tools

**Important**: AgentPlane currently supports **HTTP and SSE (Server-Sent Events) MCP servers only**. Other transport protocols like WebSockets or stdio are not supported.

## Tool Events in API Responses

When agents use tools, you'll receive real-time events in both APIs:

### Invoke API
Tool usage is included in the final response with execution details.

### Streaming API
Tool events are streamed in real-time as they execute:

```json
{
  "type": "tool_event",
  "content": "",
  "data": {
    "type": "tool_start",
    "tool_name": "web_search",
    "arguments": {
      "query": "latest AI developments 2024"
    }
  }
}
```

## Tool Event Types

### `tool_start`
Indicates a tool is beginning execution.

```json
{
  "type": "tool_start",
  "tool_name": "file_read",
  "arguments": {
    "file_path": "/path/to/file.txt"
  }
}
```

### `tool_result`
Tool execution completed successfully.

```json
{
  "type": "tool_result",
  "tool_name": "web_search",
  "result": "Search results: Recent AI developments include..."
}
```

### `tool_error`
Tool execution failed.

```json
{
  "type": "tool_error",
  "tool_name": "database_query",
  "error": "Connection timeout"
}
```

## Common Tool Categories

### Data Access Tools
- **Web Search**: Search the internet for current information
- **Database Query**: Access structured data from databases
- **File System**: Read and write files
- **API Integration**: Call external REST APIs

### Communication Tools
- **Email**: Send emails and notifications
- **Slack/Teams**: Post messages to team channels
- **SMS**: Send text messages
- **Webhooks**: Trigger external systems

### Development Tools
- **GitHub**: Manage repositories, issues, pull requests
- **Code Execution**: Run code in sandboxed environments
- **Docker**: Manage containerized applications
- **CI/CD**: Trigger builds and deployments

### Productivity Tools
- **Calendar**: Schedule meetings and events
- **Task Management**: Create and manage tasks
- **Document Generation**: Create reports and documents
- **Data Analysis**: Process and analyze datasets

## Working with Tools in Your Application

### Handling Tool Events

```javascript
// JavaScript example
for await (const event of client.stream('agent-id', 'Search for recent AI news')) {
  switch (event.type) {
    case 'tool_event':
      const toolEvent = event.data;
      switch (toolEvent.type) {
        case 'tool_start':
          console.log(`🔧 Starting ${toolEvent.tool_name}...`);
          showToolProgress(toolEvent.tool_name, 'starting');
          break;
        case 'tool_result':
          console.log(`✅ ${toolEvent.tool_name} completed`);
          showToolProgress(toolEvent.tool_name, 'completed');
          break;
        case 'tool_error':
          console.log(`❌ ${toolEvent.tool_name} failed: ${toolEvent.error}`);
          showToolProgress(toolEvent.tool_name, 'error');
          break;
      }
      break;
    case 'token':
      // Handle response tokens
      break;
  }
}
```

### Tool Progress UI

```typescript
interface ToolExecution {
  name: string;
  status: 'starting' | 'running' | 'completed' | 'error';
  startTime: Date;
  endTime?: Date;
  error?: string;
}

function ToolExecutionComponent({ execution }: { execution: ToolExecution }) {
  return (
    <div className="tool-execution">
      <div className="tool-header">
        <span className="tool-icon">
          {execution.status === 'starting' && '🔧'}
          {execution.status === 'running' && '⏳'}
          {execution.status === 'completed' && '✅'}
          {execution.status === 'error' && '❌'}
        </span>
        <span className="tool-name">{execution.name}</span>
        <span className="tool-status">{execution.status}</span>
      </div>
      {execution.error && (
        <div className="tool-error">{execution.error}</div>
      )}
    </div>
  );
}
```

## Agent Configuration for Tools

When creating agents, you can configure which tools they have access to:

### Web Interface
1. Go to Agent Settings
2. Navigate to Tools & Integrations
3. Enable/disable specific tools
4. Configure tool parameters

### API Configuration
Tools are automatically available to agents based on your MCP server configuration. No additional API configuration is required.

## Tool Security & Permissions

### API Key Security
- Tools use separate API keys and credentials
- Agent API keys cannot access tool configuration
- Tool permissions are managed at the account level

### Tool Isolation
- Each agent can have different tool access
- Tools run in isolated environments
- Tool failures don't affect agent responses

### Rate Limiting
- Tools have their own rate limits
- Tool usage is tracked separately from API usage
- Premium plans have higher tool rate limits

## Best Practices

### Error Handling
```python
def handle_tool_event(event):
    if event['type'] == 'tool_event':
        tool_data = event['data']
        
        if tool_data['type'] == 'tool_error':
            # Log error for debugging
            logger.error(f"Tool {tool_data['tool_name']} failed: {tool_data.get('error')}")
            
            # Show user-friendly message
            show_message(f"Unable to access {tool_data['tool_name']}. Continuing without this data.")
        
        elif tool_data['type'] == 'tool_start':
            # Show progress indicator
            show_progress(f"Accessing {tool_data['tool_name']}...")
```

### Performance Optimization
- Cache tool results when appropriate
- Handle tool timeouts gracefully
- Show progress indicators for long-running tools
- Implement fallback strategies for critical tools

### User Experience
- Clearly indicate when tools are being used
- Show tool execution progress
- Explain tool failures in user-friendly terms
- Allow users to retry failed operations

## Supported MCP Servers

AgentPlane supports MCP servers that use **HTTP or SSE (Server-Sent Events) transport only**:

### HTTP MCP Servers
MCP servers that expose tools and resources over HTTP REST APIs:
- Standard HTTP request/response pattern
- JSON-based communication
- Stateless operations
- Easy to deploy and scale

### SSE MCP Servers
MCP servers that use Server-Sent Events for real-time communication:
- Real-time tool execution updates
- Streaming responses from tools
- Persistent connections for long-running operations
- Event-driven architecture

### Compatible MCP Server Examples
When choosing or building MCP servers for AgentPlane, ensure they support HTTP or SSE transport:

```json
{
  "transport": {
    "type": "http",
    "endpoint": "https://your-mcp-server.com/mcp"
  }
}
```

or

```json
{
  "transport": {
    "type": "sse", 
    "endpoint": "https://your-mcp-server.com/events"
  }
}
```

### Unsupported Transports
- **stdio**: Standard input/output based communication MCP transport is not supported.

## Troubleshooting

### Tool Not Available
- Check if the MCP server is running and accessible via HTTP/SSE
- Verify the MCP server supports HTTP or SSE transport
- Verify tool permissions and API keys
- Ensure the agent has access to the tool

### Tool Execution Timeout
- Tools have default timeouts (usually 30 seconds)
- Long-running operations may need custom timeout handling
- Consider breaking large operations into smaller chunks

### Tool Authentication Errors
- Verify API keys and credentials are correctly configured
- Check if credentials have expired
- Ensure proper permissions for the requested operation

### MCP Server Connectivity
- Ensure your MCP server is accessible over HTTP/HTTPS
- For SSE servers, verify the event stream endpoint is working
- Check network connectivity and firewall settings
- Verify SSL certificates for HTTPS MCP servers

For more detailed information on MCP and building compatible servers, see the [MCP Documentation](https://modelcontextprotocol.io/).
