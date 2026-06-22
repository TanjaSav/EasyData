# 🚀 User Guide: Gemini MCP Connector Extension & App Builder

Welcome to the comprehensive guide for the **Gemini MCP Connector** Chrome Extension. This extension links the standard Google Gemini Web App (`gemini.google.com`) and Google AI Studio (`aistudio.google.com`) with the **EasyData** platform. With this extension, you can instruct Gemini to build database-backed web applications and publish them live.

---

## 1. How to Install and Activate the Extension
Follow these steps to load the extension into Google Chrome:

### Step A: Load the Unpacked Extension in Chrome
1. Open **Google Chrome** on your computer.
2. In the address bar, type `chrome://extensions/` and press **Enter**.
3. In the top-right corner of the Extensions page, toggle the **Developer mode** switch **On**.
4. In the top-left corner, click the **Load unpacked** button.
5. In the file picker dialog, navigate to your project folder and select the `chrome-extention` directory:
   * **Path**: `C:/Users/eldva/Documents/github/easydata/chrome-extention`
6. Click **Select Folder**. The **Gemini MCP Connector** extension will appear in your active extensions list.

### Step B: Connection to easydata.is
The extension is pre-configured to communicate directly with the production cloud service at `https://easydata.is`. You do not need to run a local server or open a terminal. 

---

## 2. Using the Popup Dashboard (Gemini & Claude)
The extension works automatically on both **Google Gemini** (`gemini.google.com` / `aistudio.google.com`) and **Anthropic Claude** (`claude.ai`). You can open the popup menu at any time to check connection status and navigate:

1. Click the extension puzzle icon in the Chrome toolbar.
2. Click **EasyData MCP Connector** to open the dashboard.
3. **Verify Server Status:** Check the connection dot at the bottom of the card to verify if the EasyData server is online.
4. **Quick Navigation:** Click **Launch Gemini** or **Launch Claude** to instantly open the corresponding workspace in a new tab.
5. **Auto-Run:** The extension automatically hooks context menu actions, submit interceptions, and tool-call observers on both platforms without requiring manual toggling.

---

## 3. Workflows: How to Build an App
Once the extension is installed, you can build applications using two different workflows:

### Workflow A: The Right-Click Auto-Build (Recommended)
This is the fastest method. It triggers the EasyData AI services to build your database and UI in a single click:
1. Go to [gemini.google.com](https://gemini.google.com).
2. Type your application idea in the chat input area. **(Do not press Enter yet)**.
3. Highlight/select the text you just wrote.
4. Right-click the selected text and choose **Create App with EasyData**.
5. A loading overlay reading *"Contacting EasyData AI services..."* will appear in the bottom-right corner of the browser.
6. Wait **15–20 seconds** while the system automatically creates the database, provisions tables, structures the frontend UI, and hosts it.
7. The completed live application link and a summary will be automatically typed back into your chat input. Press **Enter** to send it.

### Workflow B: Interactive Chat Building (Step-by-Step)
Use this if you want to collaborate with Gemini on the features of your app and inspect the database creation steps:
1. Go to [gemini.google.com](https://gemini.google.com).
2. Type your request in the chat and press **Enter**.
3. The extension intercepts your submit and appends background instructions explaining EasyData's database capabilities to Gemini.
4. As Gemini responds, it will generate tool execution blocks (e.g. calling `create_app`, `create_table`, or `publish_app`).
5. The extension intercepts these blocks, runs them against the server, and returns the output to the chat.
6. Once the tools finish executing, Gemini will output the final live URL in the chat interface.

---

## 3. How to Write Detailed Prompts (Crucial for Success)
Because Gemini generates the database schema (SQLite) and the entire user interface (HTML/CSS/JS with Tailwind) based on your prompt, **providing detailed instructions is critical**. 

A simple, one-sentence prompt will result in a basic app with generic fields. A detailed prompt tells the AI exactly what columns are required, how the frontend should be structured, and what special interactive features are needed.

### 📐 The anatomy of a perfect app prompt:
1. **Primary Purpose & Users:** Define what the app does and who uses it (e.g. students, teachers, parents).
2. **Database Schema (Tables & Columns):** Specify the fields the app must store. Mention columns like names, dates, text descriptions, numbers, and file/photo paths.
3. **Frontend UI/UX Design & Layout:** Request specific design themes (e.g., responsive Tailwind CSS, clean dark mode, clean typography, tabs, grids).
4. **Key Features & Interactions:**
   * Form inputs (dropdowns, textareas, file uploads).
   * Dashboards (views for submission details, filtering, sorting, or editing).
   * Role-based views (e.g., a "Student Entry Form" and a secure "Teacher Grading Panel").

---

### 🔍 Contrast: Poor Prompt vs. Detailed Prompt

#### ❌ Example of a POOR Prompt:
> *"Make me a school project grading app with a database."*
>
> *Result:* The AI will make assumptions. The database might only have a "name" and "grade" column, the UI will look generic, and upload features or teacher dashboards will be missing.

####  Example of a DETAILED Prompt (Recommended):
> **"Create a database-backed Student Project Showcase & Grading System application.**
> 
> **Database Structure:**
> Create a table called 'submissions' with the following columns:
> - `id` (Primary Key, Auto-increment)
> - `student_name` (Text, required)
> - `project_title` (Text, required)
> - `project_description` (Text)
> - `photo_file_name` (Text - for uploading project photos)
> - `grade` (Text/Integer - for teacher grading)
> - `feedback` (Text - for teacher comments)
> - `grade_level` (Text - dropdown selection for 6th, 7th, or 8th grade)
> - `team_members` (Text - optional list of collaborators)
> - `submitted_at` (Timestamp)
> 
> **User Interface & Views:**
> Build a single-page app utilizing Tailwind CSS with a clean, modern dark mode layout (deep blue background with purple highlights) and glassmorphism cards. Include a tab navigation at the top to toggle between two views:
> 
> 1. **Student Submission Portal (Tab 1):**
>    - A form containing text inputs for Student Name, Project Title, and Team Members.
>    - A dropdown to select the Grade Level.
>    - A file uploader for project photos (mapping to `photo_file_name`).
>    - A textarea for the Project Description.
>    - A submit button that saves records to the database and displays a success notification.
> 
> 2. **Teacher Grading Dashboard (Tab 2):**
>    - A grid showing all student submissions with thumbnail previews of their uploaded project photos.
>    - Filters to sort submissions by Grade Level or Grade Status (Graded vs. Ungraded).
>    - An interactive 'Review & Grade' modal: clicking a submission card opens a detail view with a grading input box (0-100 score) and a feedback textarea. Submitting the grade updates the record in the database."
>
> *Result:* The AI creates a complete, professional application containing all database models, rich user interfaces, custom dashboards, and file handling capabilities.

---

## 4. Managing Your Apps & Data
All applications you create are compiled and hosted on the cloud platform:
* **Viewing Apps:** Open `https://easydata.is/generated/{appId}/` in your browser.
* **Database Location**: Databases are managed securely in the cloud under isolation policies.
* **Automatic Expiration**: Sandbox apps automatically expire and are wiped after 24 hours to protect privacy.

---

## 5. Troubleshooting & Tips

### The Loading Overlay Hangs or Disappears
If the right-click loading screen disappears without pasting the link, your Chrome background service worker may have gone idle.
1. Open Chrome and navigate to `chrome://extensions/`.
2. Find the **Gemini MCP Connector** card.
3. Turn the extension toggle **Off**, then **On** again.
4. Click the circular **Reload** icon on the extension card.
5. Reload your `gemini.google.com` tab and try again.
