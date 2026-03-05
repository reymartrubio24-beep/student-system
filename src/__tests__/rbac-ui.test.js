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
      return Promise.resolve(
        new Response(JSON.stringify({ ok: true, note: "no-mock" }), { status: 200, headers: { "Content-Type": "application/json" } })
      );
    }
    const { status = 200, body = {} } = typeof handler === "function" ? handler({ url: path, opts }) : handler;
    return Promise.resolve(
      new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })
    );
  });
}

beforeEach(() => {
  window.localStorage.clear();
  jest.resetAllMocks();
});

test("Student UI: nav guards and dashboard hides at-risk", async () => {
  setAuth("student", { student_id: "2026-0001" });
  mockFetch({
    "/dashboard-stats": { body: { totalStudents: 100, activeSubjects: 3, gradeRecords: 5 } },
    "/students": { body: [{ id: "2026-0001", name: "Test Student", course: "BSCS", year: "1st Year", email: "a@b.c", status: "Active" }] },
    "/grades": { body: [] },
    "/subjects": { body: [] },
    "/my-permits": { body: [] },
    "*": { body: {} }
  });
  render(<App />);

  // Nav items visible
  expect(await screen.findByText("Dashboard")).toBeInTheDocument();
  expect(screen.getByText("Grades")).toBeInTheDocument();
  expect(screen.getByText("My Permits")).toBeInTheDocument();
  expect(screen.getByText("Payments")).toBeInTheDocument();
  expect(screen.getByText("Profile")).toBeInTheDocument();

  // Nav items hidden
  expect(screen.queryByText("Student Search")).not.toBeInTheDocument();
  expect(screen.queryByText("Students")).not.toBeInTheDocument();
  expect(screen.queryByText("Subjects")).not.toBeInTheDocument();
  expect(screen.queryByText("Student Permits")).not.toBeInTheDocument();

  // Dashboard cards
  await waitFor(() => expect(screen.getByText("Total Students")).toBeInTheDocument());
  expect(screen.queryByText("At-Risk Students")).not.toBeInTheDocument();
});

test("Teacher UI: nav guards include search, students, subjects, grades, permits", async () => {
  setAuth("teacher");
  mockFetch({
    "/dashboard-stats": { body: { totalStudents: 100, activeSubjects: 12, gradeRecords: 500, atRiskCount: 7 } },
    "/students": { body: [] },
    "/grades": { body: [] },
    "/subjects": { body: [] },
    "/teacher/rooms": { body: [] },
    "*": { body: {} }
  });
  render(<App />);
  expect(await screen.findByText("Student Search")).toBeInTheDocument();
  expect(screen.getByText("Students")).toBeInTheDocument();
  expect(screen.getByText("Subjects")).toBeInTheDocument();
  expect(screen.getByText("Grades")).toBeInTheDocument();
  expect(screen.getByText("Student Permits")).toBeInTheDocument();
});

test("Cashier UI: shows payments and permits, not subjects", async () => {
  setAuth("cashier");
  mockFetch({
    "/dashboard-stats": { body: { totalStudents: 100, activeSubjects: 0, gradeRecords: 0, atRiskCount: 0 } },
    "/students": { body: [] },
    "/grades": { body: [] },
    "/subjects": { status: 403, body: { error: "Forbidden" } },
    "*": { body: {} }
  });
  render(<App />);
  expect(await screen.findByText("Student Search")).toBeInTheDocument();
  expect(screen.getByText("Students")).toBeInTheDocument();
  expect(screen.getByText("Student Permits")).toBeInTheDocument();
  expect(screen.getByText("Payments")).toBeInTheDocument();
  expect(screen.queryByText("Subjects")).not.toBeInTheDocument();
});

test("Registrar UI: subjects and grades available", async () => {
  setAuth("register");
  mockFetch({
    "/dashboard-stats": { body: { totalStudents: 100, activeSubjects: 10, gradeRecords: 100 } },
    "/students": { body: [] },
    "/grades": { body: [] },
    "/subjects": { body: [] },
    "*": { body: {} }
  });
  render(<App />);
  expect(await screen.findByText("Student Search")).toBeInTheDocument();
  expect(screen.getByText("Students")).toBeInTheDocument();
  expect(screen.getByText("Subjects")).toBeInTheDocument();
  expect(screen.getByText("Grades")).toBeInTheDocument();
  expect(screen.getByText("Payments")).toBeInTheDocument();
});

test("Student Payments page hides record form", async () => {
  setAuth("student", { student_id: "2026-0001" });
  mockFetch({
    "/dashboard-stats": { body: { totalStudents: 100, activeSubjects: 3, gradeRecords: 5 } },
    "/students": { body: [{ id: "2026-0001", name: "Test Student", course: "BSCS", year: "1st Year", email: "a@b.c", status: "Active" }] },
    "/grades": { body: [] },
    "/subjects": { body: [] },
    "/payments/2026-0001": { body: [] },
    "/students/2026-0001/tuition-balance": { body: { id: "2026-0001", tuition_balance: 1000 } },
    "*": { body: {} }
  });
  render(<App />);
  fireEvent.click(screen.getByText("Payments"));
  await waitFor(() => expect(screen.getByText("My Balance")).toBeInTheDocument());
  expect(screen.queryByText("Record Payment")).not.toBeInTheDocument();
});

test("Student My Permits shows permits grouped by semester", async () => {
  setAuth("student", { student_id: "2026-0001" });
  mockFetch({
    "/dashboard-stats": { body: { totalStudents: 100, activeSubjects: 3, gradeRecords: 5 } },
    "/students": { body: [{ id: "2026-0001", name: "Test Student", course: "BSCS", year: "1st Year", email: "a@b.c", status: "Active" }] },
    "/grades": { body: [] },
    "/subjects": { body: [] },
    "/my-permits": { body: [
      { id: 1, student_id: "2026-0001", period_name: "Midterm Permit", sort_order: 3, school_year: "2026-2027", term: "1st", status: "active", created_at: new Date().toISOString(), permit_number: "1001" }
    ]},
    "*": { body: {} }
  });
  render(<App />);
  fireEvent.click(screen.getByText("My Permits"));
  await waitFor(() => expect(screen.getByText("🎫 My Permits")).toBeInTheDocument());
  expect(screen.getByText("Midterm Permit")).toBeInTheDocument();
  expect(screen.getByText(/2026-2027/)).toBeInTheDocument();
});
