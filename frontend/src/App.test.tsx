// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App.js";
import { api } from "./services/api.js";

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("author attribution", () => {
  it.each([false, true])("shows a safe GitHub link when authenticated is %s", (authenticated) => {
    if (authenticated) {
      localStorage.setItem("token", "test-token");
      vi.spyOn(api, "get").mockResolvedValue({ data: [] });
    }

    render(<App />);

    expect(screen.getByText(/Built by Arnau Jimenez/)).toBeTruthy();
    const link = screen.getByRole("link", { name: "GitHub" });
    expect(link.getAttribute("href")).toBe("https://github.com/ArnauJimenez");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });
});
