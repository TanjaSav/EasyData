# Connect EasyData MCP to Gemini

This document covers how to connect the EasyData MCP server to Gemini across different environments.

## 1. Gemini CLI (Native Support)

If you are using the [Gemini CLI](https://geminicli.com), you can connect to the EasyData MCP server by editing your configuration file.

### Local (stdio)
Use this if you are running the server locally in the EasyData repository.

1. Locate your Gemini CLI configuration file (usually at `~/.gemini/settings.json`).
2. Add the `easydata` server to the `mcpServers` section:

```json
{
  "mcpServers": {
    "easydata": {
      "command": "npm",
      "args": ["run", "mcp"],
      "cwd": "/path/to/EasyData"
    }
  }
}
```

### Remote (HTTPS)
Use the public EasyData endpoint:

```json
{
  "mcpServers": {
    "easydata": {
      "url": "https://easydata.is/mcp"
    }
  }
}
```

## 2. Android Studio (Native Support)

Android Studio (Ladybug or newer) has built-in support for MCP in its Gemini side-panel.

1. Go to **File > Settings** (or **Android Studio > Settings** on macOS).
2. Navigate to **Tools > AI > MCP Servers**.
3. Check **Enable MCP Servers**.
4. Click **Add** or edit the JSON configuration to include:

```json
{
  "mcpServers": {
    "easydata": {
      "command": "npm",
      "args": ["run", "mcp"],
      "cwd": "/path/to/EasyData"
    }
  }
}
```

## 3. Gemini Web App & AI Studio (Extensions)

The standard web interfaces at `gemini.google.com` and `aistudio.google.com` do not have a native settings menu for MCP yet. You can use community "bridge" extension:

- **MCP SuperAssistant** (Chrome Extension)

This extension allow you to point to a local or remote MCP server and use its tools directly in the chat interface.

## 4. Custom Integration via Gemini API

If you are building your own application using the Gemini API, you can connect to EasyData's MCP server programmatically using the Model Context Protocol SDK.

1. Connect to the EasyData MCP server (via stdio or HTTP).
2. Request tool definitions using `listTools`.
3. Map these tool definitions to Gemini's `FunctionDeclaration` format.
4. Pass them in the `tools` array when calling the Gemini API.
5. Handle `function_call` responses by executing the corresponding MCP tool and returning the result.

## Running the EasyData MCP Server

### Local
In the project root, run:
```bash
npm run mcp
```
This starts the server over `stdio`, suitable for local CLI or IDE integrations.

### Remote
The public endpoint is available at:
`https://easydata.is/mcp`
