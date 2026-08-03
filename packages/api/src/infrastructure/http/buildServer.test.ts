import { describe, expect, it } from "vitest";
import { buildServer } from "./buildServer.js";

describe("buildServer", () => {
  it("builds a working Fastify instance", async () => {
    const app = buildServer({ nodeEnv: "test" });

    const response = await app.inject({ method: "GET", url: "/does-not-exist" });

    expect(response.statusCode).toBe(404);
  });

  it("keeps no global state — two instances never share routes", async () => {
    const appA = buildServer({ nodeEnv: "test" });
    const appB = buildServer({ nodeEnv: "test" });
    appA.get("/marker", async () => ({ from: "a" }));

    const responseA = await appA.inject({ method: "GET", url: "/marker" });
    const responseB = await appB.inject({ method: "GET", url: "/marker" });

    expect(responseA.statusCode).toBe(200);
    expect(responseB.statusCode).toBe(404);
  });

  it("assigns a UUID-shaped request id to each request", async () => {
    const app = buildServer({ nodeEnv: "test" });
    let capturedId = "";
    app.get("/id", async (request) => {
      capturedId = request.id;
      return { id: request.id };
    });

    await app.inject({ method: "GET", url: "/id" });

    expect(capturedId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it("silences the logger in test mode by default", () => {
    const app = buildServer({ nodeEnv: "test" });

    expect(app.log.level).toBe("silent");
  });
});
