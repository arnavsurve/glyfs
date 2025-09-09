# Glyfs API Documentation

Welcome to the Glyfs API documentation. This guide will help you integrate with Glyfs' powerful AI agent platform programmatically.

## Quick Start

1. **Create an Agent** - Set up your AI agent through the web interface
2. **Generate API Key** - Create an API key for your specific agent
3. **Make API Calls** - Use the API key to interact with your agent

## API Overview

Glyfs provides two main API endpoints for interacting with your agents:

- **[Invoke API](./invoke-api.md)** - Get complete responses in a single request
- **[Streaming API](./streaming-api.md)** - Get real-time streaming responses

## Authentication

All API requests require authentication using agent-specific API keys. Each agent has its own API keys that only provide access to that specific agent.

### API Key Format
API keys have the format: `apk_` followed by a base64-encoded string.

Include your API key in the `Authorization` header:

```bash
Authorization: Bearer apk_your_api_key_here
```

## Base URL

All API endpoints are relative to your Glyfs instance:

```
https://your-glyfs-instance.com/api
```

## Rate Limits

API requests are subject to rate limiting based on your plan. Contact support for enterprise rate limits.

## Error Handling

The API uses standard HTTP status codes and returns JSON error messages:

```json
{
  "message": "Error description"
}
```

Common status codes:
- `200` - Success
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (invalid or missing API key)
- `404` - Not Found (agent doesn't exist)
- `500` - Internal Server Error

### Authentication Errors

| Error | Description |
|-------|-------------|
| `missing authorization header` | No Authorization header provided |
| `invalid authorization header format` | Authorization header doesn't start with "Bearer " |
| `invalid API key format` | API key doesn't start with "apk_" |
| `invalid API key` | API key not found or inactive |

## Support

For API support, please:
- Check the documentation sections
- Review the examples provided
- Contact support for enterprise customers

## Documentation Sections

- [API Reference](./api-reference.md) - Complete API endpoint reference
- [Authentication](./authentication.md) - Detailed authentication guide and API key management
- [Invoke API](./invoke-api.md) - Single request/response API
- [Streaming API](./streaming-api.md) - Real-time streaming API
- [Examples](./examples.md) - Code examples in multiple languages
- [Tools & MCP](./tools.md) - Working with agent tools and MCP servers