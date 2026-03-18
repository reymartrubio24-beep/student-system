import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import App from "../App";

function setAuth(role, extras = {}) {
  window.localStorage.setItem("auth", JSON.stringify({ token: "t", role, username: role, ...extras }));
}

function mockFetch(routes = {}) {
  global.fetch = jest.fn((url, opts = {}) => {
    const path = String(url).replace("http://localhost:4000", "");
    const handler = routes[path] || routes["*"];
    if (!handler) {
      return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } }));
    }
    const { status = 200, body = {} } = typeof handler === "function" ? handler({ url: path, opts }) : handler;
    return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
  });
}

beforeEach(() => {
  window.localStorage.clear();
  jest.resetAllMocks();
});

test("Student UI: shows My Attendance, hides staff Attendance", async () => {
  setAuth("student", { student_id: "2026-0001" });
  mockFetch({
    "/dashboard-stats": { body: { totalStudents: 1, activeSubjects: 0, gradeRecords: 0 } },
    "/students": { body: [{ id: "2026-0001", name: "Stu One", course: "BSCS", year: "1st", email: "s@e", status: "Active" }] },
    "/grades": { body: [] },
    "/subjects": { body: [] },
    "/attendance/my": { body: [] },
    "*": { body: {} }
  });
  render(<App />);
  expect(await screen.findByText("Dashboard")).toBeInTheDocument();
  expect(screen.getByText("My Attendance")).toBeInTheDocument();
  expect(screen.queryByText("Attendance")).not.toBeInTheDocument();
});

test("Teacher UI: Attendance nav visible and loads tables", async () => {
  setAuth("teacher");
  mockFetch({
    "/dashboard-stats": { body: { totalStudents: 2, activeSubjects: 0, gradeRecords: 0, atRiskCount: 0 } },
    "/students": { body: [] },
    "/subjects": { body: [] },
    "/grades": { body: [] },
    "/attendance/tables": { body: [{ id: 1, course_name: "BSCS", class_identifier: "CS101", block_number: "A", academic_year: "2026-2027" }] },
    "*": { body: {} }
  });
  render(<App />);
  expect(await screen.findByText("Attendance")).toBeInTheDocument();
  fireEvent.click(screen.getByText("Attendance"));
  await waitFor(() => expect(screen.getByText("Existing Attendance Tables")).toBeInTheDocument());
  expect(screen.getByText("BSCS")).toBeInTheDocument();
});
