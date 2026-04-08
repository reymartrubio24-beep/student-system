import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import App from "../App";

function setAuthStudent() {
  window.localStorage.setItem(
    "auth",
    JSON.stringify({ token: "t", role: "student", username: "stud", student_id: "2026-0001" }),
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
    if (typeof handler === "function") {
      const { status = 200, body = {} } = handler({ url: path, opts });
      return Promise.resolve(
        new Response(JSON.stringify(body), {
          status,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }
    const { status = 200, body = {} } = handler;
    return Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    );
  });
}

describe("Student Grades navigation fetch", () => {
  it("fetches and displays own grades on Grades click", async () => {
    setAuthStudent();
    mockFetch({
      "/dashboard-stats": { body: { totalStudents: 1, activeSubjects: 1, gradeRecords: 1 } },
      "/students": { body: [{ id: "2026-0001", name: "Test Student", course: "BSCS", year: "1st Year", email: "a@b.c", status: "Active" }] },
      "/subjects": { body: [{ id: "CS101", name: "Intro to CS", units: 3, semester_id: null }] },
      "/grades": { body: [{ student_id: "2026-0001", subject_id: "CS101", prelim: 85, midterm: 86, prefinal: 87, final: 88 }] },
      "/semesters": { body: [] },
      "*": { body: {} }
    });
    render(<App />);
    fireEvent.click(await screen.findByText("Grades"));
    await waitFor(() => expect(screen.getByText("Test Student")).toBeInTheDocument());
    expect(screen.getByText("Intro to CS")).toBeInTheDocument();
    expect(screen.getByText(/Grade Records/)).toBeInTheDocument();
  });
});
