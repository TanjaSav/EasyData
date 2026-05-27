# Connect EasyData MCP to ChatGPT and Claude

This document covers the minimum setup for using the same EasyData MCP server from ChatGPT and Claude.

## MCP URL

Use the remote MCP endpoint:

```text
https://easydata.is/mcp
```

Do not use `localhost` for ChatGPT or Claude cloud clients. They need a public HTTPS URL.


## AI Plan Requirements

ChatGPT:

- Full MCP support, including write/modify actions, is currently for ChatGPT Business, Enterprise, and Edu workspaces.
- Workspace admins may need to enable developer mode and approve or publish the connector.
- Some UI labels and permissions may change because ChatGPT MCP apps are still beta.

Claude:

- Custom remote MCP connectors are available on Claude Free, Pro, Max, Team, and Enterprise plans.
- Free users may be limited to one custom connector.
- Team and Enterprise organizations may require an Owner or Primary Owner to add the connector first.

Always check the current plan and workspace settings if the MCP connector menu is not visible.

## Connect in ChatGPT

1. Open ChatGPT settings.
2. Go to connectors, apps, or developer mode.
3. Add a custom MCP connector.
4. Name it `EasyData`.
5. Use this URL:

```text
https://easydata.is/mcp
```

6. Save it and refresh the tools if ChatGPT offers that option.

When prompting ChatGPT, explicitly say:

```text
Use the EasyData MCP connector.
```

## Connect in Claude

1. Open Claude settings.
2. Go to connectors or integrations.
3. Add a custom connector / remote MCP server.
4. Name it `EasyData`.
5. Use this URL:

```text
https://easydata.is/mcp
```

6. Enable the connector for the chat.

When prompting Claude, explicitly say:

```text
Use EasyData MCP.
```

## Available EasyData Tools

EasyData exposes these MCP tools:

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
- `publish_app`

The assistant should use MCP tools to create the app, create tables, insert sample rows, inspect schema, and publish the generated HTML page.

## Good Test Prompt

```text
Use EasyData MCP. Create a simple one-page website called "Workout Tracker".

Create one table called "workouts" with these columns:
- exercise_name TEXT
- duration_minutes INTEGER
- difficulty TEXT
- workout_date TEXT

The website should allow users to add, edit, delete, and view workouts in a table.
Add 3 sample workouts automatically.
Deploy the website and provide the public HTTPS URL.
Finally show the database schema and sample data.
```

