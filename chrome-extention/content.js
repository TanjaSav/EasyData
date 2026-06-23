if (!window.mcpListenerAdded) {
  // Keep track of processed tool calls in memory so re-renders of the DOM don't trigger them again
  const processedCalls = new Set();

  function dispatchInputEvents(input, text) {
    const beforeInputEvent = new InputEvent('beforeinput', {
      bubbles: true,
      cancelable: true,
      data: text,
      inputType: 'insertText'
    });
    input.dispatchEvent(beforeInputEvent);

    const inputEvent = new InputEvent('input', {
      bubbles: true,
      cancelable: true,
      data: text,
      inputType: 'insertText'
    });
    input.dispatchEvent(inputEvent);
  }

  function findChatInput() {
    return document.querySelector('rich-textarea div[contenteditable="true"]') ||
           document.querySelector('div[contenteditable="true"]') ||
           document.querySelector('textarea');
  }

  function findSendButton() {
    return document.querySelector('button[aria-label*="Send message"]') ||
           document.querySelector('button[aria-label*="Send Message"]') ||
           document.querySelector('button.send-button') ||
           document.querySelector('.send-button-container button') ||
           document.querySelector('button[aria-label*="Run"]') ||
           document.querySelector('.run-button button') ||
           document.querySelector('.run-button') ||
           document.querySelector('button[aria-label*="send"]');
  }

  function isAssistantGenerating() {
    const sendBtn = findSendButton();
    if (sendBtn) {
      const text = (sendBtn.textContent || "").toLowerCase();
      const label = (sendBtn.getAttribute('aria-label') || "").toLowerCase();
      
      // Check if the button acts as a Stop button
      if (text.includes("stop") || label.includes("stop")) {
        return true;
      }
    }

    // Check if a dedicated stop button is visible (common in Claude and newer Gemini UI)
    const stopBtn = document.querySelector('button[aria-label*="Stop"], button[aria-label*="stop"]');
    if (stopBtn && (stopBtn.offsetWidth > 0 || stopBtn.offsetHeight > 0)) {
      return true;
    }
    
    // Check for progress bars/loading states ONLY if they are currently visible on screen
    const loadingIndicators = document.querySelectorAll('mat-progress-bar, .assistant-loading, .is-generating, [class*="progress-bar"], [class*="loading-indicator"]');
    for (const indicator of loadingIndicators) {
      if (indicator.offsetWidth > 0 || indicator.offsetHeight > 0) {
        return true; // A visible loading indicator exists
      }
    }
    
    return false;
  }

  function showLoading(message = "Building your EasyData App...") {
    const existing = document.getElementById("easydata-loading-overlay");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "easydata-loading-overlay";
    overlay.style.position = "fixed";
    overlay.style.bottom = "24px";
    overlay.style.right = "24px";
    overlay.style.backgroundColor = "#0D121F";
    overlay.style.border = "1px solid rgba(139, 92, 246, 0.5)";
    overlay.style.borderRadius = "12px";
    overlay.style.color = "#F3F4F6";
    overlay.style.padding = "16px 24px";
    overlay.style.boxShadow = "0 10px 30px rgba(0, 0, 0, 0.5)";
    overlay.style.zIndex = "999999";
    overlay.style.fontFamily = "'Outfit', system-ui, -apple-system, sans-serif";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.gap = "12px";
    overlay.style.transition = "all 0.3s ease";

    overlay.innerHTML = `
      <div style="
        width: 20px;
        height: 20px;
        border: 3px solid rgba(139, 92, 246, 0.2);
        border-top: 3px solid #8B5CF6;
        border-radius: 50%;
        animation: easydata-spin 1s linear infinite;
      "></div>
      <div style="font-size: 14px; font-weight: 500; letter-spacing: -0.01em;">
        ${message}
      </div>
      <style>
        @keyframes easydata-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;
    document.body.appendChild(overlay);
  }

  function hideLoading() {
    const overlay = document.getElementById("easydata-loading-overlay");
    if (overlay) {
      overlay.style.opacity = "0";
      setTimeout(() => overlay.remove(), 300);
    }
  }

  function sendResultToChat(resultText) {
    const input = findChatInput();
    if (input) {
      input.focus();
      
      // Clear and type cleanly using browser execCommands so the assistant's state stays in sync
      if (input.tagName === 'TEXTAREA') {
        input.value = resultText;
        dispatchInputEvents(input, resultText);
      } else {
        const htmlText = resultText
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/\n/g, "<br>");
        document.execCommand('selectAll', false, null);
        document.execCommand('delete', false, null);
        document.execCommand('insertHTML', false, htmlText);
        dispatchInputEvents(input, resultText);
      }
      
      // Slightly longer timeout to ensure editor updates text model fully
      setTimeout(() => {
        const sendBtn = findSendButton();
        if (sendBtn) {
          sendBtn.click();
        }
      }, 350);
    }
  }

  function executeToolCall(tool, args, callKey) {
    showLoading(`Running EasyData: ${tool}...`);
    
    // 1. UUID Validation check for tool calls that require a database reference
    const uuidRequiredTools = ["create_table", "alter_table", "insert_row", "query_rows", "update_row", "delete_row", "publish_app"];
    if (uuidRequiredTools.includes(tool) && args && args.appId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(args.appId)) {
        const errorMsg = `[EasyData Tool Error]: Invalid appId format: "${args.appId}". You must use the 36-character UUID 'id' returned from the 'create_app' tool. Do not use the app name or any other string. Please run 'create_app' first, wait for the response, and use that UUID for subsequent calls.`;
        hideLoading();
        sendResultToChat(errorMsg);
        return;
      }
    }

    if (tool === "publish_app" && args && typeof args.html === "string") {
      args.html = args.html
        .replace(/https?:\/\/(?:api\.)?easydata\.is(?:\/v1)?\/apps/g, "/apps")
        .replace(/https?:\/\/(?:api\.)?easydata\.is(?:\/v1)?\/api/g, "/apps")
        .replace(/https?:\/\/(?:api\.)?easydata\.is(?:\/v1)?/g, "")
        .replace(/\/api\/apps\//g, "/apps/")
        .replace(/\/api\/(?=\$\{[^}]+\}\/tables\/)/g, "/apps/")
        .replace(/\/api\/([0-9a-f-]{36})\/tables\//gi, "/apps/$1/tables/")
        .replace(/method:\s*(["'])PATCH\1/g, "method: 'PUT'");

      args.html = args.html.replace(
        /\/api\/rows\/\$\{([^}]+)\}\/\$\{([^}]+)\}/g,
        (_match, appExpression, tableExpression) =>
          "/apps/${" + appExpression + "}/tables/${" + tableExpression + "}/rows"
      );

      args.html = args.html.replace(
        /\/api\/\$\{([^}]+)\}\/\$\{([^}]+)\}/g,
        (_match, appExpression, tableExpression) =>
          "/apps/${" + appExpression + "}/tables/${" + tableExpression + "}/rows"
      );

      args.html = args.html.replace(
        /\/apps\/\$\{([^}]+)\}\/api\/\$\{([^}]+)\}/g,
        (_match, appExpression, tableExpression) =>
          "/apps/${" + appExpression + "}/tables/${" + tableExpression + "}/rows"
      );
    }

    try {
      chrome.runtime.sendMessage({
        action: "executeTool",
        tool: tool,
        arguments: args
      }, (response) => {
        hideLoading();
        
        let resultText = "";
        if (response && response.error) {
          resultText = `[EasyData Tool Error]: ${response.error}\nNow respond to the user showing this error.`;
        } else if (response && response.result) {
          resultText = `[EasyData Tool Result]:\n\`\`\`json\n${JSON.stringify(response.result, null, 2)}\n\`\`\`\nNow proceed with the next step or output the final hosted URL to the user.`;
        } else {
          resultText = `[EasyData Tool Error]: No response received from server.\nNow respond to the user.`;
        }
        
        sendResultToChat(resultText);
      });
    } catch (e) {
      hideLoading();
      sendResultToChat(`[EasyData Tool Error]: Extension message dispatcher failed. Please reload the page to reactivate. Error: ${e.message}`);
    }
  }

  function checkForToolCalls() {
    // ONLY run tools if assistant is NOT actively generating/typing its response
    if (isAssistantGenerating()) {
      return;
    }

    // Expand search to include custom classes used by rich code block viewers
    const codeElements = document.querySelectorAll('pre, code, .code-block, [class*="code-block"], [class*="code-viewer"]');
    for (const el of codeElements) {
      const text = el.textContent || "";
      if (!text.includes("easydata-call") && !text.includes('"tool"')) continue;
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;
      
      try {
        const call = JSON.parse(jsonMatch[0]);
        if (call.tool) {
          const callKey = `${call.tool}:${JSON.stringify(call.arguments)}`;
          if (processedCalls.has(callKey)) continue;
          processedCalls.add(callKey);
          
          el.setAttribute('data-easydata-processed', 'true');
          executeToolCall(call.tool, call.arguments, callKey);
        }
      } catch (e) {
        // Wait until JSON is completely typed/formed
      }
    }
  }

  // Intercept submits and append the EasyData tools description
  let isSubmittingWithEasyData = false;

  function interceptSubmit(e) {
    if (isSubmittingWithEasyData) return;
    
    const input = findChatInput();
    if (!input) return;
    
    const text = input.innerText || input.value || "";
    if (!text.trim()) return;
    
    // Do not append instructions if this is a tool result or already active
    if (
      text.includes("EasyData Mode: Active") || 
      text.includes("[EasyData Tool Result]") || 
      text.includes("[EasyData Tool Error]") ||
      text.includes("easydata-call")
    ) {
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    const systemPrompt = `\n\n[SYSTEM INSTRUCTION: EasyData Mode is ACTIVE.
You must act as an automated app builder using the EasyData MCP tools. Do NOT write explanations, instructions, or raw code snippets (like HTML/CSS/JS) to the user. Instead, you MUST execute the tools sequentially to create, structure, and publish the app.

To invoke a tool, you must output EXACTLY ONE JSON block inside a code block marked with "easydata-call" like this:
\`\`\`easydata-call
{
  "tool": "tool_name",
  "arguments": { ... }
}
\`\`\`

Available Tools:
- create_app (name: string, description: string) -> Starts app creation. Returns a UUID "id" (appId).
- create_table (appId: string, tableName: string, columns: Array<{name: string, type: "TEXT"|"INTEGER"|"REAL"|"BOOLEAN"}>, confirmSensitiveData: boolean) -> Creates database tables.
- alter_table (appId: string, tableName: string, columns: Array<{name: string, type: "TEXT"|"INTEGER"|"REAL"|"BOOLEAN"}>, confirmSensitiveData: boolean) -> Adds columns.
- publish_app (appId: string, html: string) -> Publishes a single-file HTML frontend.

CRITICAL PROTOCOL:
1. You MUST call "create_app" first.
2. Once you receive the tool result containing the "id" (appId), use that exact UUID to call "create_table" for the "submissions" table (with columns: student_name, project_title, project_description, photo_file_name, grade, feedback, grade_level, team_members, submitted_at).
3. Call "publish_app" with the appId and the complete HTML code. The HTML code must be a premium single-file UI with responsive styling (using Tailwind CSS), student photo uploads, and a teacher grading/feedback dashboard.
4. You must output ONLY the JSON code block and wait for the tool execution result. Never output normal text or explanations along with the tool call.]`;

    input.focus();
    
    if (input.tagName === 'TEXTAREA') {
      input.value = text + systemPrompt;
      dispatchInputEvents(input, systemPrompt);
    } else {
      // Append cleaner to contenteditable div
      const selection = window.getSelection();
      if (selection) {
        const range = document.createRange();
        range.selectNodeContents(input);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      const htmlPrompt = systemPrompt
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>");
      document.execCommand('insertHTML', false, htmlPrompt);
      dispatchInputEvents(input, systemPrompt);
    }
    
    isSubmittingWithEasyData = true;
    setTimeout(() => {
      const sendBtn = findSendButton();
      if (sendBtn) {
        sendBtn.click();
      }
      isSubmittingWithEasyData = false;
    }, 350);
  }

  // Hook capture phase events to intercept clicks on send and enter keydowns
  document.addEventListener('click', (e) => {
    const sendBtn = findSendButton();
    if (sendBtn && (sendBtn === e.target || sendBtn.contains(e.target))) {
      interceptSubmit(e);
    }
  }, true);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      const input = findChatInput();
      if (input && (input === e.target || input.contains(e.target))) {
        interceptSubmit(e);
      }
    }
  }, true);

  // Set up listeners for message commands
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "insertMCP") {
      const inputBox = findChatInput();
      if (inputBox) {
        inputBox.focus();
        if (inputBox.tagName === 'TEXTAREA') {
          inputBox.value = request.data;
          dispatchInputEvents(inputBox, request.data);
        } else {
          const htmlData = request.data
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\n/g, "<br>");
          document.execCommand('insertHTML', false, htmlData);
          dispatchInputEvents(inputBox, request.data);
        }
      } else {
        alert("Please ensure your typing cursor is active inside the chat input area before clicking the option.");
      }
    } else if (request.action === "showLoading") {
      showLoading(request.message);
    } else if (request.action === "hideLoading") {
      hideLoading();
    } else if (request.action === "startGeneration") {
      const prompt = request.prompt;
      const baseUrl = request.baseUrl || "https://easydata.is";
      showLoading("Contacting EasyData AI services...");
      
      const url = `${baseUrl}/ai/create-app`;

      const performFetch = async (url) => {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ prompt })
        });
        if (!res.ok) {
          let errMsg = `HTTP Error ${res.status}`;
          try {
            const errData = await res.json();
            if (errData && errData.message) {
              errMsg = errData.message;
            } else if (errData && errData.error) {
              errMsg = errData.error;
            }
          } catch (_) {}
          throw new Error(errMsg);
        }
        return res.json();
      };

      performFetch(url)
        .then((data) => {
          hideLoading();
          const resultText = `\n\n[EasyData App Generated Successfully!]\nApp Name: ${data.appName || 'Custom Showcase App'}\nLive URL: ${data.fullUrl || data.appUrl}\nSummary: ${data.summary || 'App published successfully.'}\n`;
          sendResultToChat(resultText);
        })
        .catch((error) => {
          console.error("EasyData Generation Failure:", error);
          hideLoading();
          sendResultToChat(`\n\n[EasyData App Generation Error: ${error.message}]\n`);
        });
    }
  });

  // Watch the page for message output streams
  const observer = new MutationObserver(() => {
    checkForToolCalls();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  window.mcpListenerAdded = true;
}
