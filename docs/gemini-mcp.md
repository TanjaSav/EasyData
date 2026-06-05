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

## 3. Gemini Web App & AI Studio (No-Code App Builder Extension)

To make it as simple as possible for teachers, you do not need to install complex third-party tools or manually enter the EasyData URL. EasyData includes a custom Chrome Extension (`chrome-extention`) that acts as a direct bridge.

### How to install:
1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Turn on the **Developer mode** toggle in the top-right corner.
3. Click the **Load unpacked** button in the top-left corner.
4. Select the `chrome-extention` directory in the downloaded project folder.

### How to use:
1. Open `gemini.google.com` or `aistudio.google.com`.
2. Type your application request in plain English into the chat box (e.g., *"Can you make me an app where students take pictures of their projects at home and turn them in so i can see them"*).
3. **Do not press Enter yet.** Highlight/select the text you just wrote.
4. Right-click the selected text and select **Create App with EasyData**.
5. You will see a loading indicator typed into your chat input: `[EasyData: Building your app, please wait...]`
6. Wait 10-20 seconds. The extension will automatically call the EasyData AI services, provision the database tables, write the client code, and publish the app.
7. Once finished, the live URL and app summary will be automatically typed directly into your chat! You can then press Enter to send the live URL to Gemini for further analysis or prompt editing.

*(Optional)* If you want full interactive tool-calling in the middle of a chat conversation, you can use a community "bridge" extension like **MCP SuperAssistant** or **MCP Bridge** pointing to the public endpoint `https://easydata.is/mcp`.

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
