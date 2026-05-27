import {
  getGeneratedAppFullUrl,
  getPublicBaseUrl,
  writeGeneratedApp,
} from "../services/generated-app.service.js";
import { spawn } from "child_process";
import { Router } from "express";
import { z } from "zod";

const router = Router();

const createAppRequestSchema = z.object({
  prompt: z.string().min(10).max(4000),
});

const createAppResponseSchema = z.object({
  appName: z.string().optional(),
  appId: z.string().min(1),
  apiToken: z.string().optional(),
  summary: z.string().optional(),
  schema: z.unknown().optional(),
  html: z.string().min(1),
});

type CodexUsage = {
  input_tokens?: number;
  cached_input_tokens?: number;
  output_tokens?: number;
  reasoning_output_tokens?: number;
  total_tokens?: number;
};

function getBaseUrl() {
  return getPublicBaseUrl();
}

function getMcpUrl() {
  return process.env.EASYDATA_MCP_URL || `${getBaseUrl()}/mcp`;
}

function getCodexCliPath() {
  return process.env.CODEX_CLI_PATH || "codex";
}

function getCodexCliTimeoutMs() {
  const timeout = Number(process.env.CODEX_CLI_TIMEOUT_MS);

  if (Number.isFinite(timeout) && timeout > 0) {
    return timeout;
  }

  return 300000;
}

function getCodexModel() {
  return process.env.CODEX_MODEL;
}

function getCodexModelLabel() {
  return getCodexModel() || "codex-cli-default";
}

// Accepts both strict JSON and JSON wrapped in surrounding CLI text.
function extractJsonObject(text: string) {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");

    if (start === -1 || end === -1 || end <= start) {
      throw new Error("Codex response did not contain a JSON object");
    }

    return JSON.parse(trimmed.slice(start, end + 1));
  }
}


// Reads Codex JSONL events and keeps only the final assistant message and usage.
function extractCodexResult(stdout: string) {
  let finalMessage = "";
  let usage: CodexUsage | undefined;

  for (const line of stdout.split("\n")) {
    const trimmed = line.trim();

    if (!trimmed.startsWith("{")) {
      continue;
    }

    try {
      const event = JSON.parse(trimmed) as {
        type?: string;
        item?: { type?: string; text?: string };
        usage?: CodexUsage;
      };

      if (event.type === "item.completed" && event.item?.type === "agent_message") {
        finalMessage = event.item.text ?? "";
      }

      if (event.type === "turn.completed" && event.usage) {
        usage = {
          ...event.usage,
          total_tokens:
            event.usage.total_tokens ??
            (event.usage.input_tokens ?? 0) + (event.usage.output_tokens ?? 0),
        };
      }
    } catch {
      continue;
    }
  }

  if (!finalMessage) {
    throw new Error("Codex did not return a final agent message");
  }

  return { text: finalMessage, usage };
}
// Gives Codex a narrow contract so the route can validate and publish the result.
function buildCodexPrompt(userPrompt: string) {
  const baseUrl = getBaseUrl();
  const mcpUrl = getMcpUrl();

  return `
You create small EasyData applications for non-technical teachers.

Use the remote EasyData MCP server named "easydata" to:
1. create an EasyData app,
2. create the tables needed by the user's request,
3. inspect the schema when helpful.

Then return only one JSON object and no markdown.

JSON shape:
{
  "appName": "string",
  "appId": "string",
  "apiToken": "string",
  "summary": "string",
  "schema": {},
  "html": "<!doctype html>..."
}

The html must be a complete single-file app. It must load Tailwind CSS with <script src="https://cdn.tailwindcss.com"></script> in the <head> and use Tailwind utility classes for layout, spacing, typography, forms, buttons, cards, and tables. Avoid custom <style> blocks unless a tiny amount of app-specific CSS is truly necessary. It should use fetch() against this same origin, for example:
${baseUrl}/apps/{appId}/tables/{tableName}/rows

The html may embed the created appId and apiToken so the page works immediately. Keep the UI simple, useful, and focused on the requested workflow. Do not include explanations outside JSON.

EasyData MCP HTTP endpoint:
${mcpUrl}

User request:
${userPrompt}
`.trim();
}

function runCodexCli(prompt: string) {
  const cliPath = getCodexCliPath();
  const timeoutMs = getCodexCliTimeoutMs();
  const args = ["exec", "--json", "--ephemeral"];
  const model = getCodexModel();

  if (model) {
    args.push("--model", model);
  }

  args.push(
    "--dangerously-bypass-approvals-and-sandbox",
    "-C",
    process.cwd(),
    prompt
  );

  return new Promise<{ text: string; usage: CodexUsage | undefined }>((resolve, reject) => {
    // Run Codex as a child process so long app-generation requests do not block Express.
    const child = spawn(cliPath, args, {
      cwd: process.cwd(),
      shell: false,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let didTimeout = false;

    // Force a bounded runtime; otherwise a stuck CLI process would leave the request open.
    const timer = setTimeout(() => {
      didTimeout = true;
      child.kill("SIGTERM");
    }, timeoutMs);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });

    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });

    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.on("close", (code) => {
      clearTimeout(timer);

      if (didTimeout) {
        reject(new Error(`Codex CLI timed out after ${timeoutMs}ms`));
        return;
      }

      if (code !== 0) {
        reject(
          new Error(
            `Codex CLI exited with code ${code}. ${stderr.trim() || "No stderr output."}`
          )
        );
        return;
      }

      resolve(extractCodexResult(stdout));
    });
  });
}

router.post("/create-app", async (req, res) => {
  const parsed = createAppRequestSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid request body",
      details: parsed.error.flatten(),
    });
  }

  try {
    const codexResult = await runCodexCli(buildCodexPrompt(parsed.data.prompt));
    const generated = createAppResponseSchema.parse(extractJsonObject(codexResult.text));
    const appUrl = writeGeneratedApp(generated.appId, generated.html);

    if (codexResult.usage) {
      console.log(
        "[ai/create-app] codex usage:",
        JSON.stringify({ appId: generated.appId, codexModel: getCodexModelLabel(), ...codexResult.usage })
      );
    }

    return res.status(201).json({
      appId: generated.appId,
      appName: generated.appName ?? "",
      summary: generated.summary ?? "",
      schema: generated.schema ?? null,
      appUrl,
      fullUrl: getGeneratedAppFullUrl(appUrl),
      codexModel: getCodexModelLabel(),
      codexUsage: codexResult.usage ?? null,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Failed to create app with Codex CLI",
      message: error.message,
    });
  }
});

export default router;
