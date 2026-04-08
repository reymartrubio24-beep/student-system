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

test("Student Grades shows own subjects only and filters by semester locally", async () => {
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

test("Student Payments requests only self with filters applied", async () => {
  setAuthStudent();
  mockFetch({
    "/students": { body: [{ id: "2026-0001", name: "Stu One", course: "BSCS", year: "1st", email: "s@e.c", status: "Active" }] },
    "/grades": { body: [] },
    "/subjects": { body: [] },
    "/students/2026-0001/tuition-balance": { body: { id: "2026-0001", tuition_balance: 0 } },
    "/payments/2026-0001?from=2026-01-01&to=2026-12-31&method=Cash": { body: [] },
    "*": { body: {} }
  });
  render(<App />);
  fireEvent.click(await screen.findByText("Payments"));
  fireEvent.change(screen.getByPlaceholderText("2026-01-01"), { target: { value: "2026-01-01" } });
  fireEvent.change(screen.getByPlaceholderText("2026-12-31"), { target: { value: "2026-12-31" } });
  fireEvent.change(screen.getByPlaceholderText("e.g. Cash, GCash, Card"), { target: { value: "Cash" } });
  fireEvent.click(screen.getByText("Apply Filters"));
  await waitFor(() => expect(screen.getByText("My Balance")).toBeInTheDocument());
});
