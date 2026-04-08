import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import App from "../App";

jest.setTimeout(15000);

function setAuth(role = "developer") {
  window.localStorage.setItem("auth", JSON.stringify({ token: "t", role, username: "dev" }));
}

function mockFetch(routes = {}) {
  const calls = [];
  global.fetch = jest.fn((url, opts = {}) => {
    const path = String(url).replace("http://localhost:4000", "");
    calls.push({ path, opts });
    const handler = routes[path] || routes["*"];
    if (!handler) {
      return Promise.resolve(new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } }));
    }
    const { status = 200, body = {} } = typeof handler === "function" ? handler({ url: path, opts }) : handler;
    return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
  });
  return calls;
}

describe("Grade initialization on subject assignment", () => {
  it("posts enrollment without zero-initializing grades", async () => {
    setAuth("developer");
    const students = [{ id: "S-1", name: "Alpha", course: "BSCS", year: "1st", email: "a@e", status: "Active" }];
    const subjects = [{ id: "CS101", name: "Intro", units: 3 }];
    const calls = mockFetch({
      "/dashboard-stats": { body: { totalStudents: 1, activeSubjects: 1, gradeRecords: 0 } },
      "/students": { body: students },
      "/subjects": { body: subjects },
      "/grades": ({ opts }) => {
        if ((opts.method || "GET").toUpperCase() === "POST") return { status: 201, body: { ok: true } };
        return { body: [] };
      },
      "/students/S-1/subjects": { body: [] },
      "*": { body: {} }
    });
    render(<App />);
    fireEvent.click(await screen.findByText("Student Management"));
    fireEvent.change(screen.getByPlaceholderText("🔍 Search..."), { target: { value: "Alpha" } });
    fireEvent.click(await screen.findByText("Alpha"));
    await waitFor(() => expect(screen.getByText("Assign Subjects")).toBeInTheDocument());
    fireEvent.change(screen.getByDisplayValue("— Select —"), { target: { value: "CS101" } });
    fireEvent.click(screen.getByText("+ Assign"));
    const post = calls.find(c => c.path === "/grades" && (c.opts.method || "GET") === "POST");
    expect(post).toBeTruthy();
    const body = JSON.parse(post.opts.body || "{}");
    expect(body.student_id).toBe("S-1");
    expect(body.subject_id).toBe("CS101");
    expect(body.prelim).toBeUndefined();
    expect(body.midterm).toBeUndefined();
    expect(body.prefinal).toBeUndefined();
    expect(body.final).toBeUndefined();
  });
});
