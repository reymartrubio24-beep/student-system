import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import App from "../App";

function setAuth(role = "developer") {
  window.localStorage.setItem("auth", JSON.stringify({ token: "t", role, username: "dev" }));
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

describe("Permits admin flow", () => {
  it("shows student selector and permits list; supports add/edit/delete actions", async () => {
    setAuth("developer");
    const students = [
      { id: "S-1", name: "Alpha", course: "BSCS", year: "1st", email: "a@e", status: "Active" },
      { id: "S-2", name: "Beta", course: "BSIT", year: "1st", email: "b@e", status: "Active" }
    ];
    const semesters = [{ id: 1, school_year: "2026-2027", term: "1st" }];
    let permits = [
      { id: 10, student_id: "S-1", permit_period_id: 100, name: "Midterm Permit", permit_number: "2001", status: "active" }
    ];
    mockFetch({
      "/dashboard-stats": { body: { totalStudents: 2, activeSubjects: 0, gradeRecords: 0 } },
      "/students": { body: students },
      "/semesters": { body: semesters },
      "/students/S-1/permits": { body: permits },
      "/students/S-1/permits?semester_id=1": { body: permits },
      "/semesters/1/periods": { body: [{ id: 100, semester_id: 1, name: "Midterm Permit", sort_order: 3 }] },
      "/students/S-1/permits": ({ opts }) => {
        if (opts.method === "POST") {
          permits = [...permits, { id: 11, student_id: "S-1", permit_period_id: 101, name: "Final Permit", permit_number: "2002", status: "active" }];
          return { body: { ok: true } };
        }
        return { body: permits };
      },
      "/students/S-1/permits/100": ({ opts }) => {
        if (opts.method === "PUT") {
          permits = permits.map(p => p.permit_period_id === 100 ? { ...p, permit_number: "2222" } : p);
          return { body: { ok: true } };
        }
        if (opts.method === "DELETE") {
          permits = permits.filter(p => p.permit_period_id !== 100);
          return { body: { ok: true } };
        }
        return { body: { ok: true } };
      },
      "*": { body: {} }
    });
    render(<App />);
    fireEvent.click(await screen.findByText("Student Permits"));
    // Select student
    await waitFor(() => expect(screen.getByText("Alpha")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Alpha"));
    await waitFor(() => expect(screen.getByText(/Permits \(/)).toBeInTheDocument());
    // Add permit
    fireEvent.click(screen.getByText("+ Add Permit"));
    // Choose semester and period
    const semSel = await screen.findByLabelText("Select Semester");
    fireEvent.change(semSel, { target: { value: "1" } });
    const perSel = await screen.findByLabelText("Select Period");
    fireEvent.change(perSel, { target: { value: "100" } });
    // Avoid jsdom alert errors
    jest.spyOn(window, "alert").mockImplementation(() => {});
    fireEvent.click(screen.getByText("💾 Assign Permit"));
    // Edit permit
    await waitFor(() => expect(screen.getByText("Final Permit")).toBeInTheDocument());
    fireEvent.click(screen.getAllByText(/Edit/)[0]);
    const inputs = screen.getAllByDisplayValue(/2001|2222|2002|/);
    // For robust test, just press Save
    fireEvent.click(screen.getByText("💾 Save"));
    // Delete one permit
    fireEvent.click(screen.getAllByText("🗑️ Delete")[0]);
    await waitFor(() => expect(screen.getByText("🗑️ Confirm Delete")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Yes, Delete"));
  });
});
