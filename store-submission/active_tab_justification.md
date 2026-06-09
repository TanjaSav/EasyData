# Chrome Web Store Justification: `activeTab` Permission

This document provides ready-to-use justification statements for the `activeTab` permission requested by the **Gemini MCP Connector** extension. You can copy and paste these directly into the **Privacy practices** tab of the Chrome Web Store Developer Dashboard (or similar extension store developer portals).

---

## 1. Quick Reference & Security Philosophy
The `activeTab` permission is used in accordance with the **Principle of Least Privilege**. Instead of requesting broad, persistent host permissions to read and modify all websites the user visits, the extension requests temporary, user-initiated access to the active tab only when the user explicitly interacts with the extension's context menu.

---

## 2. Option A: Detailed Justification (Recommended)
*Use this version if the form allows for a detailed explanation of the user flow and technical necessity.*

> **Justification Statement:**
> 
> The `activeTab` permission is required to enable the core features of the "Gemini MCP Connector" extension, which allows users to enrich Gemini and AI Studio chat sessions with external data and build custom web applications on the fly. 
> 
> Specifically, the permission is used in the following user-initiated flow:
> 1. The user highlights a text prompt in their chat window on `gemini.google.com` or `aistudio.google.com`.
> 2. The user right-clicks and selects one of the context menu options: "Enrich with MCP Data" or "Create App with EasyData".
> 3. Upon this explicit user action, `activeTab` grants temporary permission to target the current tab (`tab.id`) so that the extension background worker can:
>    - Dynamically inject the content script (`content.js`) into the active tab via the `chrome.scripting` API.
>    - Send a message to the content script containing the retrieved results or status updates (e.g. `chrome.tabs.sendMessage(tab.id, ...)`).
>    - Programmatically insert the generated application URL or retrieved context data directly into the active tab's chat input area.
> 
> **Why host permissions were not used:**
> Using `activeTab` ensures that the extension does not run background scripts persistently or read data from any tab unless the user explicitly requests it by clicking our context menu item. This is the most secure and privacy-respecting implementation path.

---

## 3. Option B: Medium Justification (~600 characters)
*Use this version if there is a moderate character limit.*

> **Justification Statement:**
> 
> The `activeTab` permission is used to insert data and application generation links into the user's active Gemini or Google AI Studio chat tab. The extension registers right-click context menu options ("Enrich with MCP Data" and "Create App with EasyData"). When a user highlights text and triggers one of these menu options, `activeTab` grants temporary access to that tab. This allows the extension to dynamically execute `content.js` and send a message to insert the results back into the page's input box. Access is strictly user-triggered and temporary, eliminating the need for broad, persistent website permissions.

---

## 4. Option C: Concise Justification (~300 characters)
*Use this version if the text area has a very restrictive character limit (e.g., under 500 characters).*

> **Justification Statement:**
> 
> Required for temporary, user-triggered access to the active tab. When the user selects text and runs a context menu command ("Enrich with MCP Data" or "Create App with EasyData"), the extension uses `activeTab` to dynamically inject the content script and insert the results directly into the page's text area.

---

## 5. Technical Flow Reference
For your reference during review or verification, the code implements the permission as follows:
* **Triggering Event**: `chrome.contextMenus.onClicked.addListener(async (info, tab) => { ... })`
* **Script Injection**: Uses the active tab's ID to run `chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] })`.
* **Communication**: Sends findings back to the active tab using `chrome.tabs.sendMessage(tab.id, { action: "insertMCP", data: ... })` or `chrome.tabs.sendMessage(tab.id, { action: "startGeneration", prompt: ... })`.
