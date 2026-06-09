# Chrome Web Store Justification: `scripting` Permission

This document provides ready-to-use justification statements for the `scripting` permission requested by the **Gemini MCP Connector** extension. You can copy and paste these directly into the **Privacy practices** tab of the Chrome Web Store Developer Dashboard (or similar extension store developer portals).

---

## 1. Quick Reference & Security Philosophy
The `scripting` permission is required to use the `chrome.scripting` API to dynamically inject [content.js](file:///C:/Users/eldva/Documents/github/easydata/chrome-extention/content.js) into the active Gemini/AI Studio tab when the user triggers the context menu. This dynamic injection approach is a key security feature: it ensures the extension only runs scripts inside a page when the user explicitly requests it, rather than persistently running scripts on all matching pages.

---

## 2. Option A: Detailed Justification (Recommended)
*Use this version if the form allows for a detailed explanation of the user flow and technical necessity.*

> **Justification Statement:**
> 
> The `scripting` permission is required to execute the extension's content script ([content.js](file:///C:/Users/eldva/Documents/github/easydata/chrome-extention/content.js)) on the active tab's page context.
> 
> When the user selects text on `gemini.google.com` or `aistudio.google.com` and triggers one of our custom context menu actions ("Enrich with MCP Data" or "Create App with EasyData"), the background service worker ([background.js](file:///C:/Users/eldva/Documents/github/easydata/chrome-extention/background.js)) intercepts the event. 
> 
> Using the `chrome.scripting.executeScript` API, the background script dynamically injects `content.js` into the target active tab. This injected content script is then responsible for:
> 1. Observing the chat container for Model Context Protocol (MCP) tool calls.
> 2. Directing responses and live URLs back into the typing area of the Gemini text box.
> 3. Displaying status loaders to the user during long-running tasks.
> 
> **Why dynamic scripting is preferred over persistent content scripts:**
> Instead of registering a broad, persistent content script that runs on page load and continuously consumes system resources or processes page contents, we use the `scripting` API to inject code dynamically on-demand. This significantly reduces the extension's permissions fingerprint and respects user privacy.

---

## 3. Option B: Medium Justification (~600 characters)
*Use this version if there is a moderate character limit.*

> **Justification Statement:**
> 
> The `scripting` permission is required to dynamically inject the extension's content script ([content.js](file:///C:/Users/eldva/Documents/github/easydata/chrome-extention/content.js)) into the active tab when a user clicks the context menu ("Enrich with MCP Data" or "Create App with EasyData"). The dynamic execution of scripts is performed using the `chrome.scripting.executeScript` API. The content script is needed to communicate with the page's chat interface and insert the external MCP data or application links. By injecting the script dynamically instead of running it persistently, we ensure user privacy and optimize browser performance.

---

## 4. Option C: Concise Justification (~300 characters)
*Use this version if the text area has a very restrictive character limit (e.g., under 500 characters).*

> **Justification Statement:**
> 
> Required to use the `chrome.scripting.executeScript` API to inject the local content script ([content.js](file:///C:/Users/eldva/Documents/github/easydata/chrome-extention/content.js)) into the active chat tab on-demand. This allows the extension to interact with the text area and display processing indicators when a user triggers context menu options.

---

## 5. Technical Flow Reference
For your reference during review or verification, the code implements the permission as follows:
* **Background Injection Code**: In [background.js](file:///C:/Users/eldva/Documents/github/easydata/chrome-extention/background.js):
  ```javascript
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content.js']
  });
  ```
