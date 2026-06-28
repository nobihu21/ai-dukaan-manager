import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import parseVoiceCommand from "./api/parseVoiceCommand";

function localApiPlugin() {
  return {
    name: "local-api",
    configureServer(server: { middlewares: { use: (path: string, handler: (request: any, response: any) => void) => void } }) {
      server.middlewares.use("/api/parseVoiceCommand", async (request, response) => {
        if (request.method !== "POST") {
          response.statusCode = 405;
          response.setHeader("Content-Type", "application/json");
          response.end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }

        const chunks: Buffer[] = [];
        for await (const chunk of request) chunks.push(Buffer.from(chunk));

        try {
          request.body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
        } catch {
          request.body = "{";
        }

        const vercelResponse = {
          setHeader(name: string, value: string) {
            response.setHeader(name, value);
            return this;
          },
          status(code: number) {
            response.statusCode = code;
            return this;
          },
          json(payload: unknown) {
            response.setHeader("Content-Type", "application/json; charset=utf-8");
            response.end(JSON.stringify(payload));
            return this;
          },
        };

        await parseVoiceCommand(request, vercelResponse as never);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), localApiPlugin()],
  server: {
    port: 5173,
  },
});
