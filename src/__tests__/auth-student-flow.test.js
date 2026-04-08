import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import App from "../App";

function setupFetch() {
  const calls = [];
  global.fetch = jest.fn((url, opts = {}) => {
    const path = String(url).replace("http://localhost:4000", "");
    calls.push({ path, opts });
    if (path === "/auth/login") {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            token: "t",
            role: "student",
            username: "stud",
            student_id: "2026-0001",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    }
    if (path === "/students") {
      return Promise.resolve(
        new Response(
          JSON.stringify([
            {
              id: "2026-0001",
              name: "Stu One",
              course: "BSCS",
              year: "1st",
              email: "s@e.c",
              status: "Active",
            },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    }
    if (path === "/grades") {
      return Promise.resolve(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }
    if (path === "/subjects") {
      return Promise.resolve(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }
    if (path === "/dashboard-stats") {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            totalStudents: 1,
            activeSubjects: 0,
            gradeRecords: 0,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    }
    if (path === "/students/2026-0001/tuition-balance") {
      return Promise.resolve(
        new Response(
          JSON.stringify({ id: "2026-0001", tuition_balance: 0 }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    }
    if (path.startsWith("/payments/2026-0001")) {
      return Promise.resolve(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }
    return Promise.resolve(
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  });
  return calls;
}

beforeEach(() => {
  window.localStorage.clear();
});

test("student login wires student_id through to payments view", async () => {
  const calls = setupFetch();
  render(<App />);

  const usernameInput = screen.getAllByRole("textbox")[0];
  const passwordInput = screen
    .getByText("Password")
    .parentElement.querySelector("input");
  fireEvent.change(usernameInput, { target: { value: "stud" } });
  fireEvent.change(passwordInput, { target: { value: "pw" } });
  fireEvent.click(screen.getByRole("button", { name: "Login" }));

  await waitFor(() =>
    expect(screen.getByText("Dashboard")).toBeInTheDocument(),
  );

  fireEvent.click(screen.getByText("Payments"));

  await waitFor(() =>
    expect(screen.getByText("My Balance")).toBeInTheDocument(),
  );

  expect(
    calls.some(
      (c) =>
        c.path.startsWith("/payments/2026-0001") &&
        (c.opts.method || "GET") === "GET",
    ),
  ).toBe(true);
});
