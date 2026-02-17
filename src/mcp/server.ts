import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools } from "./tools.js";

export async function createMCPServer(): Promise<Server> {
  const server = new Server(
    {
      name: "atlassian-mcp",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  registerTools(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  return server;
}
