import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import App from "../App";

function setAuth() {
  window.localStorage.setItem("auth", JSON.stringify({ token: "t", role: "student", username: "stud", student_id: "S-1" }));
}

function mockFetch(routes = {}) {
  global.fetch = jest.fn((url, opts = {}) => {
    const path = String(url).replace("http://localhost:4000", "");
    const handler = routes[path] || routes["*"];
    if (!handler) {
      return Promise.resolve(new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } }));
    }
    const { status = 200, body = {} } = typeof handler === "function" ? handler({ url: path, opts }) : handler;
    return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
  });
}

test("Student nav does not show assign permit and My Permits has no add button", async () => {
  setAuth();
  mockFetch({
    "/dashboard-stats": { body: { totalStudents: 1, activeSubjects: 0, gradeRecords: 0 } },
    "/students": { body: [{ id: "S-1", name: "Student One", course: "BSCS", year: "1st", email: "s@e", status: "Active" }] },
    "/my-permits": { body: [] },
    "/grades": { body: [] },
    "/subjects": { body: [] },
    "*": { body: {} }
  });
  render(<App />);
  expect(await screen.findByText("My Permits")).toBeInTheDocument();
  // Ensure Student Permits (admin) nav item is not present
  expect(screen.queryByText("Student Permits")).not.toBeInTheDocument();
  fireEvent.click(screen.getByText("My Permits"));
  await waitFor(() => expect(screen.getByText("🎫 My Permits")).toBeInTheDocument());
  // No add button or assign in student view
  expect(screen.queryByText("+ Add Permit")).not.toBeInTheDocument();
  expect(screen.queryByText(/Assign Permit/i)).not.toBeInTheDocument();
});
