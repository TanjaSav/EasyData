# Chrome Web Store Developer Submission Guide (Version 2.0)
**EasyData MCP Connector Extension**

This is a complete, compiled guide containing all required justifications, single-purpose descriptions, developer certifications, and setup instructions for publishing your extension on the Chrome Web Store. 

> [!IMPORTANT]
> This guide is optimized for **manifest version 2.0**, which utilizes static content scripts on targeted domains (Gemini, AI Studio, Claude) and has removed the high-security-risk `scripting` and `http://localhost` permissions.

---

## 📋 Table of Contents
1. [Permission Justifications (`activeTab`, `contextMenus`)](#1-permission-justifications)
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
> The `activeTab` permission is required to enable the core features of the "EasyData MCP Connector" extension. Specifically, when the user highlights a text prompt in their chat window and clicks one of the context menu options ("Enrich with MCP Data" or "Create App with EasyData"), `activeTab` grants temporary permission to target that active tab. 
> 
> This allows the background service worker to send message payloads directly to the tab's content script (`content.js`) using `chrome.tabs.sendMessage`. The content script then updates the chat area with external database context or application creation logs.

---

### B. Justification for `contextMenus`
> **Justification Statement:**
> 
> The `contextMenus` permission is required to display custom commands ("Enrich with MCP Data" and "Create App with EasyData") in the browser's right-click context menu. 
> 
> The context menu is restricted specifically to our supported AI chat platforms (Google Gemini, Google AI Studio, and Anthropic Claude). It provides the primary user interface to invoke the extension's database-linking features. Using context menu commands acts as an explicit user invocation, ensuring that data is only retrieved and sent when actively requested by the user.

---

## 2. Host Permissions Justification
Enter this on the **Privacy practices** tab of the developer console under host permissions.

> **Justification Statement:**
> 
> Host permission for `https://easydata.is/*` is required for the extension's background service worker to make HTTP POST requests (`fetch`) to the EasyData Model Context Protocol (MCP) server. 
> 
> When the user initiates a query or requests application building, the background worker contacts `https://easydata.is/mcp` to retrieve database logs, run query tools, and obtain the resulting hosted application endpoints. Declaring this specific host permission is necessary to bypass cross-origin restrictions in Manifest V3. No other domains are requested, maintaining user privacy by restricting network access to the minimum required domain.

---

## 3. Remotely Hosted Code Declaration
Enter this in the **Developer policy compliance** or **Privacy practices** sections.

> **Declaration Statement:**
> 
> The "EasyData MCP Connector" extension does not execute remotely hosted code. All scripts (`background.js` and `content.js`) are packaged locally within the extension bundle and loaded from the user's local disk.
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
> The single purpose of the EasyData MCP Connector extension is to connect Google Gemini, Google AI Studio, and Anthropic Claude chat interfaces with the EasyData Model Context Protocol (MCP) server. 
> 
> To achieve this, the extension runs a content script that observes the active chat window to parse assistant tool calls, and intercepts user submissions to append backend instruction prompts. It also registers context menu commands on selected text to trigger real-time MCP context fetches and app generation requests. The extension acts solely as a communication bridge and does not perform any unrelated tasks (e.g., ad injection or general web tracking).

---

## 5. Data Usage Certification Checklist
Check all of the following boxes on the **Privacy practices** tab:

* [x] **I certify that my extension complies with the Chrome Web Store Developer Program Policies, including the User Data Policy.**
* [x] **Certify that you do not sell user data to third parties.**
* [x] **Certify that you do not use or transfer user data for purposes that are unrelated to the item's single purpose.**
* [x] **Certify that you do not use or transfer user data to determine creditworthiness or for lending purposes, or to display personalized ads.**

### AI/ML Model Training Declaration:
* **Question:** Do you use user data to train machine learning or AI models?
  * **Answer:** **No**

### Data Collection Declarations (Itemized List):
Under the data types collected by your extension, declare the following:

1. **Website Content / Page Content:**
   * **Declaration:** **Yes (Persistent/Continuous)**
   * **Justification:** The extension runs a content script on `gemini.google.com`, `aistudio.google.com`, and `claude.ai` to read the active chat box value, intercept message submits to append system prompts, and observe the output container for JSON tool calls.
2. **User Activity (Clicks, Keyboard events):**
   * **Declaration:** **Yes**
   * **Justification:** The content script captures keydown events (Enter key) and mouse clicks (Send button) inside the chat interfaces to trigger prompt formatting and start background compilation services.

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
