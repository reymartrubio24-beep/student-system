import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import App from "../App";

function setAuth(role) {
  window.localStorage.setItem("auth", JSON.stringify({ token: "t", role, username: role }));
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

test("Admin navigates to Student Management and assigns a subject", async () => {
  setAuth("developer");
  const students = [{ id: "2026-0001", name: "Test Student", course: "BSCS", year: "1st Year", email: "a@b.c", status: "Active" }];
  const subjects = [{ id: "CS101", name: "Intro", units: 3 }];
  mockFetch({
    "/students": { body: students },
    "/grades": { body: [] },
    "/subjects": { body: subjects },
    "/semesters": { body: [{ id: 1, school_year: "2026-2027", term: "1st Semester" }, { id: 2, school_year: "2026-2027", term: "2nd Semester" }] },
    "/students/2026-0001/subjects": { body: [] },
    "/grades": ({ opts }) => {
      if (opts.method === "POST") return { status: 201, body: { ok: true } };
      return { body: [] };
    },
    "*": { body: {} }
  });
  render(<App />);
  fireEvent.click(await screen.findByText("Student Management"));
  fireEvent.change(screen.getByPlaceholderText("🔍 Search..."), { target: { value: "Test" } });
  fireEvent.click(await screen.findByText("Test Student"));
  await waitFor(() => expect(screen.getByText("Assign Subject")).toBeInTheDocument());
  fireEvent.change(screen.getByDisplayValue("— Select —"), { target: { value: "CS101" } });
  fireEvent.click(screen.getByText("+ Assign"));
  await waitFor(() => expect(screen.getByText("✅ Subject assigned to student.")).toBeInTheDocument());
});

