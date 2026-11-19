import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AgentChatBox } from "./AgentChatBox.js";

describe("AgentChatBox", () => {
  it("renders the agent chat prompt and composer", () => {
    const markup = renderToStaticMarkup(
      <AgentChatBox token="jwt-token" onUnauthorized={() => {}} />,
    );

    expect(markup).toContain("Task assistant");
    expect(markup).toContain("How can I help you?");
    expect(markup).toContain('id="agent-prompt"');
    expect(markup).toContain('aria-label="Send message"');
  });
});
