import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import App from "../App";

function setAuthStudent(student_id = "2026-0001") {
  window.localStorage.setItem("auth", JSON.stringify({ token: "t", role: "student", username: "stud", student_id }));
}
function mockFetch(routes = {}) {
  global.fetch = jest.fn((url, opts = {}) => {
    const path = String(url).replace("http://localhost:4000", "");
    const handler = routes[path] || routes["*"];
    if (!handler) {
      return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } }));
    }
    const { status = 200, body = {} } = typeof handler === "function" ? handler({ url: path, opts }) : handler;
    return Promise.resolve(
      new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })
    );
  });
}

test("Student sees own permits across semesters with status and validity", async () => {
  setAuthStudent();
  const permits = [
    { id: 1, student_id: "2026-0001", period_name: "Prelim Permit", sort_order: 1, school_year: "2026-2027", term: "1st Semester", status: "active", issue_date: "2026-07-01", expiry_date: "2026-07-31", permit_number: null, created_at: "2026-07-01T00:00:00Z" },
    { id: 2, student_id: "2026-0001", period_name: "Midterm Permit", sort_order: 3, school_year: "2025-2026", term: "2nd Semester", status: "expired", issue_date: "2026-01-10", expiry_date: "2026-03-01", permit_number: "998", created_at: "2026-01-10T00:00:00Z" }
  ];
  mockFetch({
    "/students": { body: [{ id: "2026-0001", name: "Stu One", course: "BSCS", year: "1st", email: "s@e.c", status: "Active" }] },
    "/grades": { body: [] },
    "/subjects": { body: [] },
    "/my-permits": { body: permits },
    "*": { body: {} }
  });
  render(<App />);
  fireEvent.click(await screen.findByText("My Permits"));
  await waitFor(() => expect(screen.getByText("🎫 My Permits")).toBeInTheDocument());
  expect(screen.getByText("Prelim Permit")).toBeInTheDocument();
  expect(screen.getByText("Midterm Permit")).toBeInTheDocument();
  // Fallback when permit_number is null
  expect(screen.getByText(/Not assigned/)).toBeInTheDocument();
  // Status badges (text presence)
  expect(screen.getByText(/active/i)).toBeInTheDocument();
  expect(screen.getByText(/expired/i)).toBeInTheDocument();
  // Validity dates text lines exist
  const validUntilLabels = screen.getAllByText(/Valid Until:/i);
  expect(validUntilLabels.length).toBeGreaterThan(0);
});

test("Student sees complete payment history", async () => {
  setAuthStudent();
  const pays = [
    { id: 1, amount: 500, method: "Cash", reference: "R1", created_at: "2026-02-01T10:00:00Z" },
    { id: 2, amount: 750, method: "GCash", reference: "R2", created_at: "2026-03-01T12:00:00Z" }
  ];
  mockFetch({
    "/students": { body: [{ id: "2026-0001", name: "Stu One", course: "BSCS", year: "1st", email: "s@e.c", status: "Active" }] },
    "/grades": { body: [] },
    "/subjects": { body: [] },
    "/students/2026-0001/tuition-balance": { body: { id: "2026-0001", tuition_balance: 0 } },
    "/payments/2026-0001": { body: pays },
    "*": { body: {} }
  });
  render(<App />);
  fireEvent.click(await screen.findByText("Payments"));
  await waitFor(() => expect(screen.getByText("My Balance")).toBeInTheDocument());
  expect(screen.getByText(/^Cash$/)).toBeInTheDocument();
  expect(screen.getByText(/^GCash$/)).toBeInTheDocument();
});

test("Student Grades shows own subjects across semesters", async () => {
  setAuthStudent();
  const subjects = [
    { id: "CS101", name: "Intro", units: 3, semester_id: 1 },
    { id: "MATH1", name: "Math", units: 3, semester_id: 2 }
  ];
  const grades = [
    { student_id: "2026-0001", subject_id: "CS101", prelim: 80, midterm: 80, prefinal: 80, final: 80 },
    { student_id: "2026-0001", subject_id: "MATH1", prelim: 85, midterm: 85, prefinal: 85, final: 85 }
  ];
  mockFetch({
    "/students": { body: [{ id: "2026-0001", name: "Stu One", course: "BSCS", year: "1st", email: "s@e.c", status: "Active" }] },
    "/grades": { body: grades },
    "/subjects": { body: subjects },
    "/semesters": { body: [{ id: 1, school_year: "2026-2027", term: "1st Semester" }, { id: 2, school_year: "2026-2027", term: "2nd Semester" }] },
    "*": { body: {} }
  });
  render(<App />);
  fireEvent.click(await screen.findByText("Grades"));
  await waitFor(() => expect(screen.getByText("Intro")).toBeInTheDocument());
  expect(screen.getByText("Math")).toBeInTheDocument();
});
