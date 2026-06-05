import { createApp } from "./src/services/app.service.js";
import { createTable } from "./src/services/table.service.js";

async function main() {
  console.log("Creating new application...");
  const app = createApp("Student Project Showcase", "App for students to upload home projects");
  console.log("App created:", JSON.stringify(app, null, 2));

  console.log("Creating submissions table...");
  const tableResult = createTable(app.id, {
    tableName: "submissions",
    confirmSensitiveData: true,
    columns: [
      { name: "student_name", type: "TEXT" },
      { name: "project_title", type: "TEXT" },
      { name: "project_description", type: "TEXT" },
      { name: "photo_file_name", type: "TEXT" },
      { name: "grade", type: "TEXT" },
      { name: "feedback", type: "TEXT" },
      { name: "grade_level", type: "TEXT" },
      { name: "team_members", type: "TEXT" },
      { name: "submitted_at", type: "TEXT" }
    ]
  });
  console.log("Table created:", JSON.stringify(tableResult, null, 2));
}

main().catch(console.error);
