import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "./api.js";
import { AgentApiError, sendAgentMessage } from "./agent.service.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("sendAgentMessage", () => {
  it("sends the prompt with the bearer token and parses the response", async () => {
    const reply = {
      message: "Task created.",
      executedTools: [{ name: "create_task", args: { title: "Test" }, result: { success: true } }],
    };
    const post = vi.spyOn(api, "post").mockResolvedValueOnce({ data: { success: true, data: reply } });

    await expect(sendAgentMessage("  Create a task  ", "jwt-token")).resolves.toEqual(reply);
    expect(post).toHaveBeenCalledWith(
      "/agent/chat",
      { prompt: "Create a task" },
      { headers: { Authorization: "Bearer jwt-token" } },
    );
  });

  it("rejects malformed success payloads", async () => {
    vi.spyOn(api, "post").mockResolvedValueOnce({
      data: { success: true, data: { message: "Response", executedTools: "invalid" } },
    });

    await expect(sendAgentMessage("Hello", "jwt-token"))
      .rejects.toBeInstanceOf(AgentApiError);
  });

  it("rejects a missing token before making a request", async () => {
    const post = vi.spyOn(api, "post");

    await expect(sendAgentMessage("Hello", " "))
      .rejects.toMatchObject({ status: 401 });
    expect(post).not.toHaveBeenCalled();
  });
});
