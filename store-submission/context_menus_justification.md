# Chrome Web Store Justification: `contextMenus` Permission

This document provides ready-to-use justification statements for the `contextMenus` permission requested by the **Gemini MCP Connector** extension. You can copy and paste these directly into the **Privacy practices** tab of the Chrome Web Store Developer Dashboard (or similar extension store developer portals).

---

## 1. Quick Reference & Security Philosophy
The `contextMenus` permission is required to integrate the extension directly into the browser's right-click context menu. This is the primary user-facing entry point for invoking the extension's core features on demand, ensuring that the extension remains completely inactive until a user explicitly requests an action on highlighted text.

---

## 2. Option A: Detailed Justification (Recommended)
*Use this version if the form allows for a detailed explanation of the user flow and technical necessity.*

> **Justification Statement:**
> 
> The `contextMenus` permission is required to create and display custom context menu options when a user highlights text on a webpage (specifically Google Gemini or AI Studio). 
> 
> The extension registers two context menu commands:
> 1. "Enrich with MCP Data"
> 2. "Create App with EasyData"
> 
> These context menu options act as the user interface (UI) entry point for the extension. Without the `contextMenus` permission, users would have no direct, context-aware mechanism to trigger the Model Context Protocol (MCP) data lookup or the application-building process. This permission ensures a clean, seamless integration with the user's natural workflow by exposing these tools directly via a right-click on selected text.
> 
> **Security & Privacy Benefit:**
> Using a context menu item acts as an explicit user invocation. This allows us to pair it with `activeTab` to gain temporary access to only the page the user is currently working on, rather than requesting broad, persistent access to all tabs.

---

## 3. Option B: Medium Justification (~600 characters)
*Use this version if there is a moderate character limit.*

> **Justification Statement:**
> 
> The `contextMenus` permission is required to display the extension's primary entry points ("Enrich with MCP Data" and "Create App with EasyData") in the browser's right-click menu when text is selected. When a user highlights a prompt in Gemini or AI Studio and right-clicks, these options allow them to invoke the extension's functions. This permission is necessary to provide a native, context-aware user interface. It also serves as an explicit user action trigger, allowing the extension to operate securely and only run on demand.

---

## 4. Option C: Concise Justification (~300 characters)
*Use this version if the text area has a very restrictive character limit (e.g., under 500 characters).*

> **Justification Statement:**
> 
> Required to register context menu items ("Enrich with MCP Data" and "Create App with EasyData") shown when text is highlighted. This provides the primary user interface to invoke the extension's features on demand directly from the right-click menu.

---

## 5. Technical Flow Reference
For your reference during review or verification, the code implements the permission as follows:
* **Creation on Installation**: 
  ```javascript
  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: "enrichWithMCP",
      title: "Enrich with MCP Data",
      contexts: ["selection"]
    });
    ...
  });
  ```
* **Event Handling**: `chrome.contextMenus.onClicked.addListener(async (info, tab) => { ... })`
