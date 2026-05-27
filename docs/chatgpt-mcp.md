# Connect EasyData MCP to ChatGPT

This guide explains how to connect the EasyData remote MCP server to ChatGPT so ChatGPT can create apps, inspect schemas, manage tables, and read/write rows through the EasyData MCP tools.

## Requirements

- EasyData must be running on a public HTTPS URL. For production, use `https://easydata.is` or your deployed domain, not `localhost`.
- The MCP endpoint must accept Streamable HTTP requests at:

```text
https://easydata.is/mcp
```

- Your ChatGPT plan must support custom MCP connectors/apps. OpenAI currently documents custom MCP connectors for ChatGPT Plus/Pro users and ChatGPT Business, Enterprise, and Edu workspaces. Full read/write MCP app support is a beta feature for Business, Enterprise, and Edu workspaces.
- For workspace plans, an admin may need to enable developer mode or publish the connector before other users can use it.

Official OpenAI references:

- Building MCP servers for ChatGPT and API integrations: https://platform.openai.com/docs/mcp
- ChatGPT developer mode and MCP apps: https://platform.openai.com/docs/developer-mode
- Apps and connectors in ChatGPT: https://help.openai.com/en/articles/11487775-connector

## 1. Verify the EasyData MCP endpoint

Start or deploy EasyData with these environment variables:

```bash
PUBLIC_BASE_URL=https://easydata.is
EASYDATA_MCP_URL=https://easydata.is/mcp
DATA_DIR=./data/apps
UPLOAD_DIR=./uploads
```

Then verify the service is reachable:

```bash
curl -i https://easydata.is/mcp
```

A browser-style `GET` request should not run MCP tools. EasyData should respond with a method message telling clients to use `POST` for MCP Streamable HTTP. ChatGPT will use the MCP transport directly after the server is added as a connector.

## 2. Enable developer mode in ChatGPT

For Plus or Pro accounts:

1. Open ChatGPT.
2. Go to `Settings`.
3. Open `Connectors` or `Apps and connectors`.
4. Open `Advanced`.
5. Enable `Developer mode`.

For Business, Enterprise, or Edu workspaces:

1. Ask a workspace owner/admin to enable custom MCP apps or developer mode if it is not visible.
2. Use developer mode to test the MCP app privately.
3. Publish or approve the connector in the workspace if other users should use it.

The exact UI labels can change because OpenAI marks full MCP app support as beta.

## 3. Add the EasyData MCP server

In ChatGPT developer mode:

1. Open the connectors/apps area.
2. Choose `Add custom connector`, `Add MCP server`, or the equivalent developer-mode action.
3. Enter a name such as:

```text
EasyData
```

4. Enter the remote MCP server URL:

```text
https://easydata.is/mcp
```

5. Save the connector.
6. Refresh the connector tools if ChatGPT offers a refresh action.

EasyData currently exposes these MCP tools:

- `list_apps`
- `create_app`
- `get_schema`
- `create_table`
- `alter_table`
- `insert_row`
- `query_rows`
- `update_row`
- `delete_row`
- `get_upload_url`

See `docs/mcp-tools.md` for full tool input and output details.

## 4. Test from ChatGPT

Start a new ChatGPT conversation and explicitly ask ChatGPT to use the EasyData connector. Example prompt:

```text
Use the EasyData MCP connector to create a simple classroom reading log app.
Create one table named reading_logs with student_name, book_title, minutes_read, and notes.
Then show me the app id and schema.
```

Expected behavior:

1. ChatGPT lists the EasyData MCP tools.
2. ChatGPT calls `create_app`.
3. ChatGPT calls `create_table`.
4. ChatGPT calls `get_schema`.
5. ChatGPT summarizes the created app and schema.

If ChatGPT does not use the connector automatically, select the connector from the message composer or mention it by name in the prompt.

## 5. Troubleshooting

### ChatGPT cannot connect

Check that EasyData is deployed and reachable over public HTTPS. ChatGPT cannot connect to an MCP server running only on your laptop at `localhost`, and it will stop working if the computer hosting EasyData is closed, sleeping, or offline.

### Method not allowed on `GET /mcp`

This is expected for manual browser checks. MCP clients use `POST` with the Streamable HTTP transport.

### The connector shows no tools

Restart EasyData, then refresh the connector in ChatGPT. Also confirm the deployed server is running the latest code from `main`.

### ChatGPT says the MCP server does not implement the expected specification

OpenAI requires remote MCP servers to expose compatible MCP tools. For search/deep-research style connectors, OpenAI documents required `search` and `fetch` tools. EasyData is a tool/action MCP server, so it is intended for developer-mode/full MCP use where ChatGPT can call the EasyData tools directly.

### Admin approval required

On Business, Enterprise, or Edu workspaces, custom MCP apps may require owner/admin approval before users can connect or use them.

## Security notes

- Do not commit real API keys or secrets. Keep `.env` local or configure secrets in the hosting provider.
- Treat MCP write tools as powerful actions. `create_table`, `insert_row`, `update_row`, and `delete_row` change EasyData state.
- Only connect ChatGPT to MCP servers you control and trust.
- Be careful with data returned by tools. It may be included in ChatGPT context during the conversation.
