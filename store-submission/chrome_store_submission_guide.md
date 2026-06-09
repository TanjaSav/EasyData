# Chrome Web Store Developer Submission Guide
**Gemini MCP Connector Extension**

This is a complete, compiled guide containing all required justifications, single-purpose descriptions, developer certifications, and setup instructions for publishing your extension on the Chrome Web Store.

---

## 📋 Table of Contents
1. [Permission Justifications (`activeTab`, `contextMenus`, `scripting`)](#1-permission-justifications)
2. [Host Permissions Justification](#2-host-permissions-justification)
3. [Remotely Hosted Code Declaration](#3-remotely-hosted-code-declaration)
4. [Single Purpose Description](#4-single-purpose-description)
5. [Data Usage Certification Checklist](#5-data-usage-certification-checklist)
6. [Account Configuration (Publisher Contact Email)](#6-account-configuration-publisher-contact-email)
7. [Store Screenshot Preview](#7-store-screenshot-preview)

---

## 1. Permission Justifications
Enter these justifications on the **Privacy practices** tab of the Chrome Web Store developer console under the respective permissions.

### A. Justification for `activeTab`
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

### B. Justification for `contextMenus`
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

### C. Justification for `scripting`
> **Justification Statement:**
> 
> The `scripting` permission is required to execute the extension's content script (`content.js`) on the active tab's page context.
> 
> When the user selects text on `gemini.google.com` or `aistudio.google.com` and triggers one of our custom context menu actions ("Enrich with MCP Data" or "Create App with EasyData"), the background service worker (`background.js`) intercepts the event. 
> 
> Using the `chrome.scripting.executeScript` API, the background script dynamically injects `content.js` into the target active tab. This injected content script is then responsible for:
> 1. Observing the chat container for Model Context Protocol (MCP) tool calls.
> 2. Directing responses and live URLs back into the typing area of the Gemini text box.
> 3. Displaying status loaders to the user during long-running tasks.
> 
> **Why dynamic scripting is preferred over persistent content scripts:**
> Instead of registering a broad, persistent content script that runs on page load and continuously consumes system resources or processes page contents, we use the `scripting` API to inject code dynamically on-demand. This significantly reduces the extension's permissions fingerprint and respects user privacy.

---

## 2. Host Permissions Justification
Enter this on the **Privacy practices** tab of the developer console under host permissions.

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

## 3. Remotely Hosted Code Declaration
Enter this in the **Developer policy compliance** or **Privacy practices** sections.

> **Declaration Statement:**
> 
> The "Gemini MCP Connector" extension does not execute remotely hosted code within the extension or page context. All scripts (`background.js` and `content.js`) are packaged locally within the extension bundle and loaded from the local package.
> 
> The extension performs API operations and data serialization as follows:
> 1. **Data-Only API Queries:** The extension sends user-initiated queries to a remote API (`https://easydata.is/mcp`) and receives structured JSON responses. No JavaScript is received or executed from these API calls.
> 2. **Independent Remote Web Apps:** The extension allows users to request the creation of web applications. The creation and hosting of these applications happen entirely on the remote server (`https://easydata.is`). Once created, a live URL (e.g. `https://easydata.is/apps/uuid`) is sent back as raw text and pasted into the chat box. These generated apps run completely independently in their own sandbox on the web, and no remote code from them is executed, injected, or evaluated by the extension.
> 
> Because all execution logic is local, the extension does not bypass Chrome's security restrictions and is fully aligned with the Manifest V3 security guidelines.

---

## 4. Single Purpose Description
Enter this on the **Privacy practices** tab under the Single Purpose section.

> **Single Purpose Statement:**
> 
> The single purpose of the Gemini MCP Connector extension is to connect the Google Gemini and Google AI Studio web interfaces with the EasyData Model Context Protocol (MCP) server. 
> 
> The extension fulfills this single purpose by providing a right-click context menu interface that allows users to enrich their chat inputs with database resources and invoke the automated EasyData application creation service. It acts solely as a communication bridge, transferring text prompts highlighted by the user to the EasyData API and typing the results back into the web-based chat interface. The extension does not perform any unrelated tasks, such as tracking search history, showing ads, or scraping other web content.

---

## 5. Data Usage Certification Checklist
Check all of the following boxes on the **Privacy practices** tab:

* [x] **I certify that my extension complies with the Chrome Web Store Developer Program Policies, including the User Data Policy.**
* [x] **Certify that you do not sell user data to third parties.**
* [x] **Certify that you do not use or transfer user data for purposes that are unrelated to the item's single purpose.**
* [x] **Certify that you do not use or transfer user data to determine creditworthiness or for lending purposes, or to display personalized ads.**

### Additional Questions:
* **Question:** Do you use user data to train machine learning or AI models?
  * **Answer:** **No**
* **Website Content / Page Content Collection:**
  * **Declaration:** Select **Yes (Only when explicitly invoked)**. The extension only reads the user's highlighted text when they explicitly click the context menu item to run an action.

---

## 6. Account Configuration (Publisher Contact Email)
If you see a warning about a missing contact email:

1. Go to the [Chrome Web Store Developer Console Settings](https://chrome.google.com/webstore/devconsole).
2. Click **Developer Account** or the **Gear Settings** icon on the bottom-left sidebar.
3. In **Account info**, enter your email under the **Contact email** field.
4. Click save and check your email inbox for a verification email from Google. **Click the link in that email to verify the address.**

---

## 7. Store Screenshot Preview
Upload the generated 1280x800 screenshot found at [extension_screenshot.png](file:///C:/Users/eldva/Documents/github/easydata/store-submission/extension_screenshot.png) to fulfill the media requirement:

![Chrome Web Store Screenshot Preview](/C:/Users/eldva/Documents/github/easydata/store-submission/extension_screenshot.png)
