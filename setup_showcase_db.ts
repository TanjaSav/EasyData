import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const appId = "7853eb83-ab14-4b0a-abb5-e4dff42cf35f";
const dbPath = path.join("data", "apps", `${appId}.sqlite`);

async function main() {
  console.log(`Rebuilding database structure for showcase app: ${dbPath}`);
  
  if (!fs.existsSync(dbPath)) {
    console.error("Database file does not exist. Please run setup_showcase first or ensure the app exists.");
    process.exit(1);
  }

  const db = new Database(dbPath);

  // 1. Drop existing tables to ensure clean schema
  db.exec("DROP TABLE IF EXISTS submissions;");
  db.exec("DROP TABLE IF EXISTS assignments;");

  // 2. Create assignments table
  db.exec(`
    CREATE TABLE assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      due_date TEXT,
      created_at TEXT
    );
  `);
  console.log("Created table: assignments");

  // 3. Create submissions table with assignment_id, grade, and feedback columns
  db.exec(`
    CREATE TABLE submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assignment_id INTEGER,
      student_name TEXT,
      project_title TEXT,
      project_description TEXT,
      photo_file_name TEXT,
      grade TEXT,
      feedback TEXT,
      grade_level TEXT,
      team_members TEXT,
      submitted_at TEXT
    );
  `);
  console.log("Created table: submissions");

  // 4. Insert sample assignments
  const insertAssignment = db.prepare(`
    INSERT INTO assignments (title, description, due_date, created_at)
    VALUES (?, ?, ?, ?)
  `);

  const ass1 = insertAssignment.run(
    "Baking Soda Volcano",
    "Build a model volcano and trigger a chemical eruption using baking soda, soap, food coloring, and vinegar. Take a photo of the eruption.",
    "2026-06-15",
    new Date().toISOString()
  );
  const ass2 = insertAssignment.run(
    "Solar Powered Wind Turbine",
    "Create a working model of a wind turbine that uses a solar panel to assist rotation when wind speeds are low.",
    "2026-06-20",
    new Date().toISOString()
  );
  const ass3 = insertAssignment.run(
    "Popsicle Stick Bridge",
    "Design and construct a bridge using only popsicle sticks and glue. The bridge must hold at least 5 lbs. Take a photo of your load test.",
    "2026-06-25",
    new Date().toISOString()
  );
  console.log("Inserted 3 sample assignments.");

  // 5. Insert sample submissions linking to the assignments
  const insertSubmission = db.prepare(`
    INSERT INTO submissions (assignment_id, student_name, project_title, project_description, photo_file_name, grade, feedback, grade_level, team_members, submitted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertSubmission.run(
    ass1.lastInsertRowid,
    "Alex Rivera",
    "Volcano Eruption",
    "A model volcano made from clay, plaster, and paint. Erupts using a mixture of baking soda, dish soap, red food coloring, and vinegar.",
    "sample-volcano.jpg",
    "A",
    "Excellent work, Alex! The chemical reaction was very well-contained and your clay design is beautiful.",
    "5th Grade",
    "Solo",
    new Date().toISOString()
  );

  insertSubmission.run(
    ass2.lastInsertRowid,
    "Emily Chen",
    "Solar Assisted Turbine",
    "A working model of a wind turbine that uses a small solar panel to assist the rotation when wind speeds are low.",
    "sample-turbine.jpg",
    null, // ungraded
    null,
    "6th Grade",
    "Emily Chen, Marcus Vance",
    new Date().toISOString()
  );

  console.log("Inserted 2 sample submissions.");
  db.close();
  console.log("Database rebuild complete!");
}

main().catch(console.error);
