# 🛡️ EasyData: Security, Privacy, and Compliance Sheet
### A Guide for School Administrators & IT Departments

EasyData is a lightweight, database-backed web application builder designed specifically for teachers and classrooms. It allows educators to use AI assistants (like Google Gemini or Anthropic Claude) to generate custom forms, student showcases, and exit tickets in seconds. 

To ensure student privacy and administrative compliance, EasyData has been engineered from the ground up with a **privacy-first, local-control** architecture.

---

## 💾 1. Data Storage & Architecture
*   **Isolated SQLite Databases**: EasyData uses a "one app = one database" design. Each classroom app generates its own isolated `.sqlite` database file. Student records are never co-mingled in a single monolithic database.
*   **Host Environment Control**: EasyData runs on school-owned infrastructure (either local classroom computers or a secure, private Virtual Private Server). **No student data is sent to EasyData servers or third-party cloud providers.**
*   **No Public File Access**: Uploaded student work (like photos, PDFs, or homework files) is stored in a private directory on the server. Files are never exposed via public static URLs. They can only be viewed using signed, temporary URLs that expire automatically after a set number of seconds.

---

## ⚖️ 2. Data Protection & Compliance (GDPR, FERPA, COPPA)
*   **Data Minimization Warnings**: EasyData contains a built-in semantic analysis engine. If a teacher attempts to create a field that collects high-risk data (e.g., medical info, behavior records, locations, or national IDs), the system flags the field, returns a warning, and requires explicit confirmation before creating the database schema.
*   **Automatic Data Retention**: Apps do not retain student records indefinitely. Each new app is initialized with a recommended retention policy (e.g., automatic deletion at the end of the current school year). Retention schedules can be configured and updated as needed.
*   **Right to Deletion (Erasure)**: Teachers can delete individual records or purge an entire app with a single click. App-level deletion completely erases the SQLite database file and permanently deletes all associated file uploads from disk (no "soft delete" retention).
*   **Export Before Deletion**: Teachers can export the full database schema and data payload in standard format (JSON) before purging, ensuring schools can archive required work offline.

---

## 🔒 3. Technical Security Measures
*   **SQL Identifier Safety**: To prevent SQL Injection attacks, EasyData sanitizes and parameterizes all inputs. Table and column identifiers are validated against strict alphanumeric regular expressions, and reserved database tables are blocked from public endpoints.
*   **File Upload Guardrails**:
    *   **Strict Size Quotas**: Default upload limits are set to 5 MB per file and 50 MB total per classroom app to prevent server storage exhaustion.
    *   **Magic Byte Verification**: EasyData analyzes the internal binary signatures (magic bytes) of uploaded files to ensure they match safe file types (`.jpg`, `.png`, `.webp`, `.pdf`). Malicious executables, HTML pages, or scripts masked with image extensions are automatically blocked.
*   **Rate Limiting & Audit Logs**: API endpoints are protected by rate limiters to prevent brute-force attacks, and an internal audit log records key events (such as app creation, deletion, or schema changes).
*   **Token-Based Authentication**: All API endpoints require bearer tokens generated uniquely for each classroom application. A student interface cannot access database schemas or records belonging to another teacher's app.

---

## 📋 Summary for IT Approval
| Requirement | How EasyData Compliance Works |
| :--- | :--- |
| **Where is data stored?** | On-premise or on the school's private VPS. Under the school's direct control. |
| **Are student photos secure?** | Yes, served only via secure signed URLs with short time-to-live expiration tokens. |
| **Can we purge data?** | Yes, complete app-level deletion removes all databases and files from disk. |
| **Is it safe from hackers?** | Yes, utilizing parameterized queries, safe SQL identifiers, token authentication, and magic-byte file verification. |
