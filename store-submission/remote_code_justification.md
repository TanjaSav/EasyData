# Chrome Web Store Justification: Remotely Hosted Code / Remote Code Policy

This document provides ready-to-use statements regarding the **Remotely Hosted Code** policy for the **Gemini MCP Connector** extension. You can copy and paste these directly into the **Privacy practices** or **Developer policy compliance** sections of the Chrome Web Store Developer Dashboard.

---

## 1. Executive Summary & Policy Compliance
**Does this extension execute remotely hosted code? No.**

The Gemini MCP Connector extension complies fully with the Chrome Web Store's Manifest V3 policy against executing remotely hosted code. All executable code (including the service worker [background.js](file:///C:/Users/eldva/Documents/github/easydata/chrome-extention/background.js) and the content script [content.js](file:///C:/Users/eldva/Documents/github/easydata/chrome-extention/content.js)) is packaged locally within the extension zip file and loaded from the user's local disk.

---

## 2. Option A: Detailed Justification (Recommended)
*Use this version if you need to explain the extension's data exchange architecture and prove compliance.*

> **Justification Statement:**
> 
> The "Gemini MCP Connector" extension does not execute remotely hosted code within the extension or page context. All scripts ([background.js](file:///C:/Users/eldva/Documents/github/easydata/chrome-extention/background.js) and [content.js](file:///C:/Users/eldva/Documents/github/easydata/chrome-extention/content.js)) are packaged locally within the extension bundle and loaded from the local package.
> 
> The extension performs API operations and data serialization as follows:
> 1. **Data-Only API Queries:** The extension sends user-initiated queries to a remote API (`https://easydata.is/mcp`) and receives structured JSON responses. No JavaScript is received or executed from these API calls.
> 2. **Independent Remote Web Apps:** The extension allows users to request the creation of web applications. The creation and hosting of these applications happen entirely on the remote server (`https://easydata.is`). Once created, a live URL (e.g. `https://easydata.is/apps/uuid`) is sent back as raw text and pasted into the chat box. These generated apps run completely independently in their own sandbox on the web, and no remote code from them is executed, injected, or evaluated by the extension.
> 
> Because all execution logic is local, the extension does not bypass Chrome's security restrictions and is fully aligned with the Manifest V3 security guidelines.

---

## 3. Option B: Medium Justification (~600 characters)
*Use this version if there is a moderate character limit.*

> **Justification Statement:**
> 
> The extension does not execute remotely hosted code. All JavaScript files ([background.js](file:///C:/Users/eldva/Documents/github/easydata/chrome-extention/background.js) and [content.js](file:///C:/Users/eldva/Documents/github/easydata/chrome-extention/content.js)) are bundled locally. The extension communicates with the remote endpoint `https://easydata.is` solely via standard JSON API requests to transmit selected text prompts and retrieve Model Context Protocol (MCP) data. The resulting web applications are hosted independently on the EasyData web platform and are not executed in the extension context. All code execution remains strictly local, adhering to Manifest V3 policy.

---

## 4. Option C: Concise Justification (~300 characters)
*Use this version if the text area has a very restrictive character limit (e.g., under 500 characters).*

> **Justification Statement:**
> 
> The extension does not execute remotely hosted code. All scripts are packaged locally. The extension only uses standard HTTPS fetch calls to send prompts and receive structured JSON data from `https://easydata.is`. No external script injection or eval is performed.

---

## 5. Technical Design Verification
* **Content Script Injection**: Script injection in [background.js](file:///C:/Users/eldva/Documents/github/easydata/chrome-extention/background.js) only references files from the local package:
  ```javascript
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content.js'] // Fully local script
  });
  ```
* **No Eval / External CDNs**: There are no references to `eval()`, `new Function()`, or script injection of CDN links (e.g., raw CDN URLs) in the entire extension codebase.
