// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../services/api.js";
import { LoginForm } from "./LoginForm";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("LoginForm", () => {
  it("renders the login form and registration option", () => {
    render(<LoginForm onLoginSuccess={() => {}} />);

    expect(screen.getByText("TaskApp Login")).toBeTruthy();
    expect(screen.getByLabelText("Email")).toBeTruthy();
    expect(screen.getByLabelText("Password")).toBeTruthy();
    expect(screen.getByText("Don't have an account? Sign up for free")).toBeTruthy();
  });

  it("shows the registration error returned under the error field", async () => {
    vi.spyOn(api, "post").mockRejectedValueOnce({
      isAxiosError: true,
      response: { data: { error: "Email is already registered" } },
    });
    render(<LoginForm onLoginSuccess={() => {}} />);

    fireEvent.click(screen.getByText("Don't have an account? Sign up for free"));
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "existing@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByText("Sign up"));

    expect(await screen.findByText("Email is already registered")).toBeTruthy();
  });

  it("signs in through the demo endpoint", async () => {
    vi.spyOn(api, "post").mockResolvedValueOnce({
      data: { token: "demo-token" },
    });
    const onLoginSuccess = vi.fn();
    render(<LoginForm onLoginSuccess={onLoginSuccess} />);

    fireEvent.click(screen.getByRole("button", { name: "Entrar como invitado / Demo" }));

    expect(await screen.findByRole("button", { name: "Entrar como invitado / Demo" })).toBeTruthy();
    expect(api.post).toHaveBeenCalledWith("/auth/demo");
    expect(onLoginSuccess).toHaveBeenCalledWith("demo-token");
  });

  it("shows a loading state while creating a demo session", async () => {
    vi.spyOn(api, "post").mockImplementationOnce(() => new Promise(() => undefined));
    render(<LoginForm onLoginSuccess={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: "Entrar como invitado / Demo" }));

    const loadingButton = screen.getByRole("button", { name: "Abriendo demo..." });
    expect((loadingButton as HTMLButtonElement).disabled).toBe(true);
  });

  it("explains when the demo endpoint is unreachable", async () => {
    vi.spyOn(api, "post").mockRejectedValueOnce({
      isAxiosError: true,
      request: {},
    });
    render(<LoginForm onLoginSuccess={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: "Entrar como invitado / Demo" }));

    expect(await screen.findByText(
      "Could not connect to the server. Check that the backend is available.",
    )).toBeTruthy();
  });
});
