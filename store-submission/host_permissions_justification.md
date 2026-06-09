# Chrome Web Store Justification: Host Permissions

This document provides ready-to-use justification statements for the `host_permissions` requested by the **Gemini MCP Connector** extension. You can copy and paste these directly into the **Privacy practices** tab of the Chrome Web Store Developer Dashboard (or similar extension store developer portals).

---

## 1. Quick Reference & Security Philosophy
The host permissions requested are limited specifically to:
1. `https://easydata.is/*` (Production/remote Model Context Protocol endpoint)
2. `http://localhost:3000/*` (Local development/testing endpoint)

These host permissions follow the **Principle of Least Privilege**. Rather than requesting wildcard access to all websites (`<all_urls>` or `*://*/*`), the extension only requests network access to the specific hosts it needs to communicate with.

---

## 2. Option A: Detailed Justification (Recommended)
*Use this version if the form allows for a detailed explanation of the user flow and technical necessity.*

> **Justification Statement:**
> 
> Host permissions for `https://easydata.is/*` and `http://localhost:3000/*` are required for the extension's background service worker to perform network requests (`fetch`) to the EasyData Model Context Protocol (MCP) server.
> 
> Specifically:
> - **Production Access (`https://easydata.is/*`):** When the user triggers the context menu commands, the background service worker makes a POST request to `https://easydata.is/mcp` to fetch context data or coordinate application building services.
> - **Local Development (`http://localhost:3000/*`):** This permission is required to allow developers and advanced users to connect the extension to a local instance of the EasyData server during testing or deployment.
> 
> Without these host permissions declared in the manifest, the browser's security model (CORS and service worker sandboxing) prevents the extension's background worker from making HTTP POST requests to these APIs. We have restricted these host permissions specifically to these two domains to protect user privacy.

---

## 3. Option B: Medium Justification (~600 characters)
*Use this version if there is a moderate character limit.*

> **Justification Statement:**
> 
> Host permissions for `https://easydata.is/*` and `http://localhost:3000/*` are required to enable network communication between the extension's background service worker and the EasyData Model Context Protocol (MCP) server. When a user requests to enrich data or build an app, the background worker performs `fetch` requests to these API endpoints to obtain remote data. Declaring these specific host permissions is necessary to bypass cross-origin restrictions in Manifest V3. No other domains are requested, maintaining user privacy by restricting network access to the minimum required domains.

---

## 4. Option C: Concise Justification (~300 characters)
*Use this version if the text area has a very restrictive character limit (e.g., under 500 characters).*

> **Justification Statement:**
> 
> Required to allow the background service worker to perform HTTP `fetch` requests to `https://easydata.is/mcp` and `http://localhost:3000` (for local development). These network requests are necessary to transmit queries and retrieve MCP resources and tool-call results.

---

## 5. Technical Flow Reference
For your reference during review or verification, the code implements the permissions as follows:
* **Background Fetching**: In [background.js](file:///C:/Users/eldva/Documents/github/easydata/chrome-extention/background.js), the functions `executeRemoteTool` and the context menu click handlers send network payloads to:
  - `https://easydata.is/mcp`
  - `http://localhost:3000` (used for local MCP connections)
