// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TaskForm } from "./TaskForm";

afterEach(cleanup);

describe("TaskForm", () => {
  it.each(["", "   "])("warns and does not create a task for an empty title", (title) => {
    const onAddTask = vi.fn();
    render(<TaskForm onAddTask={onAddTask} />);
    const input = screen.getByRole("textbox", { name: "Task name" });
    fireEvent.change(input, { target: { value: title } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(onAddTask).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toBe("Please enter a task name");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe("task-title-error");
  });

  it("clears the warning and submits a trimmed title", () => {
    const onAddTask = vi.fn();
    render(<TaskForm onAddTask={onAddTask} />);
    const input = screen.getByRole("textbox", { name: "Task name" }) as HTMLInputElement;
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    fireEvent.change(input, { target: { value: "  Buy bread  " } });

    expect(screen.queryByRole("alert")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(onAddTask).toHaveBeenCalledOnce();
    expect(onAddTask).toHaveBeenCalledWith("Buy bread");
    expect(input.value).toBe("");
  });
});
