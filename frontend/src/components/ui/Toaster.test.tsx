import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Toaster } from "./Toaster";

describe("Toaster", () => {
  it("renders nothing when toasts array is empty", () => {
    const { container } = render(<Toaster toasts={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders a toast message", () => {
    render(<Toaster toasts={[{ id: 1, message: "Task created" }]} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Task created");
  });

  it("renders multiple toasts", () => {
    render(
      <Toaster
        toasts={[
          { id: 1, message: "First" },
          { id: 2, message: "Second" },
        ]}
      />,
    );
    const alerts = screen.getAllByRole("alert");
    expect(alerts).toHaveLength(2);
    expect(alerts[0]).toHaveTextContent("First");
    expect(alerts[1]).toHaveTextContent("Second");
  });

  it("has live region for screen readers", () => {
    const { container } = render(
      <Toaster toasts={[{ id: 1, message: "Hello" }]} />,
    );
    const region = container.querySelector('[aria-live="assertive"]');
    expect(region).not.toBeNull();
  });
});
