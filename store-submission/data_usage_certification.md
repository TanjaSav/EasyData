# Chrome Web Store: Data Usage Certification Guide

This document lists the specific checkboxes, questions, and certifications required on the **Privacy practices** tab of the Chrome Web Store Developer Dashboard, along with the correct answers for the **Gemini MCP Connector** extension.

---

## 1. Developer Declarations (Checkboxes)
In the **Data usage** section, you will be asked to check several boxes to certify your compliance. You must check **all** of the following to proceed with publishing:

* [x] **I certify that my extension complies with the Chrome Web Store Developer Program Policies, including the User Data Policy.**
  > *Why:* The extension only accesses the active tab upon explicit user click/selection and does not collect or transmit user data for any purpose other than executing the user's requested MCP operations.

* [x] **Certify that you do not sell user data to third parties.**
  > *Why:* The extension does not collect, store, or sell any personal or browsing data.

* [x] **Certify that you do not use or transfer user data for purposes that are unrelated to the item's single purpose.**
  > *Why:* Data is only passed to the EasyData API endpoints explicitly requested by the user to execute the Model Context Protocol tools.

* [x] **Certify that you do not use or transfer user data to determine creditworthiness or for lending purposes, or to display personalized ads.**
  > *Why:* The extension has no advertising integrations or credit scoring functionalities.

---

## 2. AI / Machine Learning Certification (If Applicable)
If prompted with questions regarding whether user data is used to train artificial intelligence or machine learning models:

* **Question:** Do you use user data to train machine learning or AI models?
* **Answer:** **No**
  > *Why:* The extension acts strictly as a real-time gateway/bridge. It does not store user prompts, browser activity, or context data to train or fine-tune any AI/ML models.

---

## 3. Data Collection Declaration (Itemized List)
If the dashboard asks you to check off which types of user data your extension collects:

* **Website Content / Page Content:** Select **Yes (Only when explicitly invoked)**
  > *Justification:* The extension only accesses the text highlighted by the user on `gemini.google.com` or `aistudio.google.com` when the user right-clicks and selects an EasyData context menu action. This data is temporarily processed to invoke the Model Context Protocol server.
* **Personally Identifiable Information (PII) / Authentication:** Select **No**
  > *Justification:* The extension does not collect usernames, emails, passwords, or authentication keys.
* **User Activity (Browsing History, Clicks):** Select **No**
  > *Justification:* The extension does not track general browsing behavior or search history. It only listens to clicks on its own context menu items.
