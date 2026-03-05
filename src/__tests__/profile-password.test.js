import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import App from "../App";

function setAuth(role = "student", extras = {}) {
  window.localStorage.setItem(
    "auth",
    JSON.stringify({ token: "t", role, username: "stud", student_id: "2026-0001", ...extras }),
  );
}

function mockFetch(routes = {}) {
  global.fetch = jest.fn((url, opts = {}) => {
    const path = String(url).replace("http://localhost:4000", "");
    const handler = routes[path] || routes["*"];
    if (!handler) {
      return Promise.resolve(
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }
    const { status = 200, body = {} } =
      typeof handler === "function" ? handler({ url: path, opts }) : handler;
    return Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    );
  });
}

describe("Profile password update", () => {
  it("updates password successfully", async () => {
    setAuth("student");
    mockFetch({
      "/dashboard-stats": { body: { totalStudents: 1, activeSubjects: 0, gradeRecords: 0 } },
      "/students": { body: [{ id: "2026-0001", name: "Student One", course: "BSCS", year: "1st Year", email: "s@e", status: "Active" }] },
      "/grades": { body: [] },
      "/subjects": { body: [] },
      "/auth/change-password": { body: { ok: true } },
      "*": { body: {} },
    });
    render(<App />);
    fireEvent.click(await screen.findByText("Profile"));
    fireEvent.change(screen.getByLabelText("New Password"), { target: { value: "newpass1" } });
    fireEvent.change(screen.getByLabelText("Confirm Password"), { target: { value: "newpass1" } });
    fireEvent.click(screen.getByText("Update Password"));
    await waitFor(() => expect(screen.getByText(/Password updated successfully/)).toBeInTheDocument());
  });

  it("shows validation error when API returns 400", async () => {
    setAuth("student");
    mockFetch({
      "/dashboard-stats": { body: { totalStudents: 1, activeSubjects: 0, gradeRecords: 0 } },
      "/students": { body: [{ id: "2026-0001", name: "Student One", course: "BSCS", year: "1st Year", email: "s@e", status: "Active" }] },
      "/grades": { body: [] },
      "/subjects": { body: [] },
      "/auth/change-password": { status: 400, body: { error: "Invalid password" } },
      "*": { body: {} },
    });
    render(<App />);
    fireEvent.click(await screen.findByText("Profile"));
    fireEvent.change(screen.getByLabelText("New Password"), { target: { value: "a" } });
    fireEvent.change(screen.getByLabelText("Confirm Password"), { target: { value: "a" } });
    fireEvent.click(screen.getByText("Update Password"));
    await waitFor(() => expect(screen.getByText(/Invalid password|Request failed/)).toBeInTheDocument());
  });
});
