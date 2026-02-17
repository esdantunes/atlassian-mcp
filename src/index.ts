import "dotenv/config";
import { createMCPServer } from "./mcp/server.js";

async function main() {
  try {
    await createMCPServer();
    console.error("Atlassian MCP server running on stdio");
  } catch (error) {
    console.error("Failed to start MCP server:", error);
    process.exit(1);
  }
}

main();
