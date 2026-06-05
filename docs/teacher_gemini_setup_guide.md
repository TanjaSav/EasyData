# 🍎 Teacher's Guide: Building Apps inside gemini.google.com

To allow the standard Gemini Web App (`gemini.google.com`) to build fully functional web apps with backend databases and file storage, we use the custom **EasyData Chrome Extension** included in this repository.

Here is the step-by-step guide to installing the extension and using it to generate apps from your chat box.

---

## 🚀 Instantly Open the Premium Pre-built App

If you want to immediately see and use the fully featured, database-backed **Student Project Showcase & Grading System** app (with Assignments, Student Submissions, Grade Level, Team Members, and Teacher Grading views pre-loaded with sample data), we have already built and seeded it for you!

1. Ensure your local EasyData server is running (see **Step 2** below).
2. Open this link directly in your browser:
   * **Premium App Link**: [http://localhost:3000/generated/7853eb83-ab14-4b0a-abb5-e4dff42cf35f/](http://localhost:3000/generated/7853eb83-ab14-4b0a-abb5-e4dff42cf35f/)
3. You can toggle between the **Student Submission portal** and the **Teacher Grading dashboard** using the tabs at the top!

---

## 📥 Step 1: Install the Chrome Extension

1. Open **Google Chrome** on your computer.
2. In the address bar, type `chrome://extensions/` and press **Enter**.
3. In the top-right corner of the Extensions page, turn on the **Developer mode** toggle.
4. In the top-left corner, click the **Load unpacked** button.
5. In the file explorer, navigate to your project folder and select the `chrome-extention` directory:
   * **Path**: `C:/Users/eldva/Documents/github/easydata/chrome-extention`
6. Click **Select Folder**. The extension **Gemini MCP Connector** will now appear in your list of active extensions.

---

## 🟢 Step 2: Ensure the EasyData Server is Running

The extension talks to a local database server running on your machine.
1. Open your terminal in the `easydata` project folder.
2. Verify or start the server by running:
   ```bash
   npm run dev
   ```
3. Keep this terminal open while using Gemini. You can verify it is running by visiting [http://localhost:3000/health](http://localhost:3000/health) in your browser.

---

## 💬 Step 3: Build Apps inside Gemini (2 Methods)

Now, open [gemini.google.com](https://gemini.google.com) (or [aistudio.google.com](https://aistudio.google.com)) and use one of the two methods below to build your student project app:

### Method A: Right-Click Auto-Build (Fastest)
Use this when you want the AI to design the database, build the user interface, and host it all in a single click:
1. Type your app description in the Gemini chat input box:
   > *“Can you make me an app where students take pictures of their projects at home and turn them in so i can see them”*
2. **Do not press Enter yet.** Highlight/select the text you just wrote.
3. Right-click the highlighted text and select **Create App with EasyData**.
4. A small loading overlay will appear at the bottom right. Wait **15–20 seconds** while the AI creates the tables, compiles the code, and publishes the app.
5. The extension will automatically inject the live app link directly into your chat. Press **Enter** to send it!

---

### Method B: Interactive Chat Building (Step-by-Step)
Use this if you want to chat back-and-forth with Gemini about the app specifications while it builds:
1. Type your request and press **Enter** (or click Send).
2. The extension will automatically hook the submission and let Gemini know it has access to **EasyData tools** (like `create_app`, `create_table`, and `publish_app`).
3. As Gemini responds, it will generate tool call boxes:
   * It will ask to create the application database.
   * It will ask to create the tables (e.g. `submissions`).
   * It will write the HTML and ask to publish the app.
4. The extension automatically intercepts these requests, runs them against your local server, and feeds the database outputs back into the chat.
5. Once completed, Gemini will give you the finished **live URL** right inside the conversation!

---

## 🔍 Accessing and Managing Your Apps

Whenever an app is built, it is stored locally on your server.
* You can open it in any web browser at:
  `http://localhost:3000/generated/{appId}/`
* Uploaded project photos are securely saved in the `uploads/` folder and served dynamically via expiring signed URLs to protect student privacy.
* All data is stored in individual SQLite database files inside the `data/apps/` folder.

---

## 🛠️ Troubleshooting: Extension Reloading & Timeout Fixes

If you previously got stuck on the loading overlay **"Contacting EasyData AI services..."** and nothing happened, this was due to a strict Chrome Manifest V3 policy:
1. **Service Worker Lifetime Limits**: Chrome automatically suspends extension background service workers if a request takes longer than 3–5 minutes. This aborted the generation before the AI could finish compiling.
2. **The Fix**: We completely refactored the extension. The background script now delegates the generation request to the active tab context (`content.js`). Because the browser tab stays open, the network connection is kept alive indefinitely without being aborted by Chrome.

### How to Apply the Fix:
1. Open Google Chrome and go to **`chrome://extensions/`**.
2. Locate the **Gemini MCP Connector** card.
3. Toggle the extension switch **Off**, then toggle it **On** again to clear any cached states.
4. Click the circular **Reload/Refresh** icon on the card.
5. Close your existing **`gemini.google.com`** tab, open a brand-new tab, and go to **`gemini.google.com`**.
6. Try highlighting your prompt, right-clicking, and selecting **Create App with EasyData**. The connection is now maintained in the page context and will successfully load the finished live link!

### 🛑 Usage Limit & Rate Limit Errors (ChatGPT/Codex)
If the loading box returns the error:
> *"You've hit your usage limit. Upgrade to Plus to continue using Codex..."*
This means your free ChatGPT account has temporarily run out of Codex request allowance.

**How to resolve this:**
1. **Use an OpenAI API Key**: If you have an OpenAI API key (pay-as-you-go), open the `.env` file in the root of the `easydata` directory:
   * **File Path**: [C:/Users/eldva/Documents/github/easydata/.env](file:///C:/Users/eldva/Documents/github/easydata/.env)
2. Add a new line with your API key:
   ```env
   OPENAI_API_KEY=your-actual-api-key-here
   ```
3. Restart the EasyData server in your terminal by pressing `Ctrl + C` and running `npm run dev` again. The Codex CLI will automatically detect the key and bypass all ChatGPT account-based usage limits!
4. Alternatively, you can log in to a ChatGPT Plus account in your terminal using:
   ```bash
   npx codex login
   ```
