import { insertRow } from "./src/services/table.service.js";

const appId = "7853eb83-ab14-4b0a-abb5-e4dff42cf35f";

async function main() {
  console.log("Inserting sample submissions...");

  const samples = [
    {
      student_name: "Alex Rivera",
      project_title: "Baking Soda Volcano",
      project_description: "A model volcano made from clay, plaster, and paint. Erupts using a mixture of baking soda, dish soap, red food coloring, and vinegar.",
      photo_file_name: "sample-volcano.jpg",
      submitted_at: new Date().toISOString()
    },
    {
      student_name: "Emily Chen",
      project_title: "Solar Powered Wind Turbine",
      project_description: "A working model of a wind turbine that uses a small solar panel to assist the rotation when wind speeds are low.",
      photo_file_name: "sample-turbine.jpg",
      submitted_at: new Date().toISOString()
    }
  ];

  for (const sample of samples) {
    const result = insertRow(appId, "submissions", sample);
    console.log(`Inserted submission for ${sample.student_name}:`, JSON.stringify(result, null, 2));
  }
}

main().catch(console.error);
