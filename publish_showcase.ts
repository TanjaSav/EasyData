import fs from "fs";
import { writeGeneratedApp } from "./src/services/generated-app.service.js";

const appId = "7853eb83-ab14-4b0a-abb5-e4dff42cf35f";
const html = fs.readFileSync("./src/mcp/project_app.html", "utf8");

try {
  console.log("Publishing app HTML...");
  const appUrl = writeGeneratedApp(appId, html);
  console.log("App published locally at path:", appUrl);
  
  const localUrl = `http://localhost:3000${appUrl}`;
  console.log("Local server link:", localUrl);
} catch (error) {
  console.error("Error publishing app:", error);
}
