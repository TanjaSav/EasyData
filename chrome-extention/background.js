chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "enrichWithMCP",
    title: "Enrich with MCP Data",
    contexts: ["selection"],
    documentUrlPatterns: [
      "https://gemini.google.com/*",
      "https://aistudio.google.com/*",
      "https://claude.ai/*"
    ]
  });
  chrome.contextMenus.create({
    id: "createAppWithEasyData",
    title: "Create App with EasyData",
    contexts: ["selection"],
    documentUrlPatterns: [
      "https://gemini.google.com/*",
      "https://aistudio.google.com/*",
      "https://claude.ai/*"
    ]
  });
});

async function consumeStream(res) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
      if (text.includes("data:")) {
        const lines = text.split("\n");
        if (lines.some(line => line.trim().startsWith("data:"))) {
          break;
        }
      }
    }
  } finally {
    try {
      await reader.cancel();
    } catch (e) {}
  }
  return text;
}

function getBaseUrl() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['easyDataServerUrl'], (result) => {
      resolve(result.easyDataServerUrl || "https://easydata.is");
    });
  });
}

async function executeRemoteTool(name, args) {
  const payload = {
    jsonrpc: "2.0",
    method: "tools/call",
    params: {
      name,
      arguments: args
    },
    id: Date.now()
  };

  const baseUrl = await getBaseUrl();
  const url = `${baseUrl}/mcp`;
  const timeoutMs = 25000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream'
    },
    body: JSON.stringify(payload),
    signal: controller.signal
  })
  .then(res => {
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error("HTTP Error: " + res.status);
    return consumeStream(res);
  })
  .catch((err) => {
    clearTimeout(timeoutId);
    throw new Error(`Failed to reach EasyData server: ${err.message || err}`);
  })
  .then(text => {
    const lines = text.split("\n");
    const dataLine = lines.find(line => line.trim().startsWith("data:"));
    if (!dataLine) {
      throw new Error("Invalid response format (missing data line)");
    }
    const jsonStr = dataLine.replace(/^\s*data:\s*/, "").trim();
    const responseObj = JSON.parse(jsonStr);

    if (responseObj.error) {
      throw new Error(responseObj.error.message || JSON.stringify(responseObj.error));
    }
    return responseObj.result;
  });
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.selectionText) {
    const prompt = info.selectionText;
    const baseUrl = await getBaseUrl();

    if (info.menuItemId === "enrichWithMCP") {
      const url = `${baseUrl}/mcp`;

      const payload = {
        jsonrpc: "2.0",
        method: "resources/read",
        params: { 
          uri: `easydata://query?q=${encodeURIComponent(prompt)}` 
        },
        id: 1
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      })
      .then(res => {
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error("HTTP Error: " + res.status);
        return consumeStream(res);
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        throw err;
      })
      .then(text => {
        const lines = text.split("\n");
        const dataLine = lines.find(line => line.trim().startsWith("data:"));
        if (!dataLine) {
          throw new Error("Invalid response format (missing data line)");
        }
        const jsonStr = dataLine.replace(/^\s*data:\s*/, "").trim();
        return JSON.parse(jsonStr);
      })
      .then(data => {
        // Traverse the standard MCP response payload structurally
        let textResult = "No data found.";
        
        if (data && data.result && data.result.contents && data.result.contents[0]) {
          textResult = data.result.contents[0].text || textResult;
        } else if (data && data.result && data.result.text) {
          textResult = data.result.text; // Fallback structure parsing
        }
        
        // Forward the text context payload back into Gemini/Claude's DOM interface
        chrome.tabs.sendMessage(tab.id, { action: "insertMCP", data: `\n\n[MCP Context]:\n${textResult}\n` });
      })
      .catch(error => {
        console.error("MCP Connection Failure:", error);
        chrome.tabs.sendMessage(tab.id, { action: "insertMCP", data: `\n\n[MCP Connection Error: ${error.message}]\n` });
      });
    } else if (info.menuItemId === "createAppWithEasyData") {
      // Delegate the generation to content.js which is already running statically
      chrome.tabs.sendMessage(tab.id, { 
        action: "startGeneration",
        prompt: prompt,
        baseUrl: baseUrl
      });
    }
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "executeTool") {
    executeRemoteTool(request.tool, request.arguments)
      .then(result => sendResponse({ result }))
      .catch(error => sendResponse({ error: error.message }));
    return true; // Keep connection open for asynchronous sendResponse
  }
});
