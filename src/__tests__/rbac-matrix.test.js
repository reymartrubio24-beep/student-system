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
    const h = typeof handler === "function" ? handler({ url: path, opts }) : handler;
    const { status = 200, body = {} } = h;
    return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
  });
}

beforeEach(() => {
  window.localStorage.clear();
  jest.resetAllMocks();
});

const baseMocks = {
  "/dashboard-stats": { body: { totalStudents: 3, activeSubjects: 2, gradeRecords: 2, atRiskCount: 0 } },
  "/students": { body: [{ id: "S-1", name: "Alpha", course: "BSCS", year: "1st", email: "a@e", status: "Active" }] },
  "/subjects": { body: [{ id: "CS101", name: "Intro", units: 3 }] },
  "/grades": { body: [] },
  "*": { body: {} },
};

describe("RBAC matrix visible navigation and basic CRUD affordances", () => {
  test("SAPS role sees all academic and administrative modules", async () => {
    setAuth("saps");
    mockFetch(baseMocks);
    render(<App />);
    expect(await screen.findByText("Student Search")).toBeInTheDocument();
    expect(screen.getByText("Students")).toBeInTheDocument();
    expect(screen.getByText("Subjects")).toBeInTheDocument();
    expect(screen.getByText("Grades")).toBeInTheDocument();
    expect(screen.getByText("Student Permits")).toBeInTheDocument();
    expect(screen.getByText("Payments")).toBeInTheDocument();
  });

  test("Developer role sees all modules and can add grade", async () => {
    setAuth("developer");
    mockFetch(baseMocks);
    render(<App />);
    expect(await screen.findByText("Student Search")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Grades"));
    await waitFor(() => expect(screen.getByText("Select Student")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Alpha"));
    await waitFor(() => expect(screen.getByText("+ Add Grade")).toBeInTheDocument());
  });

  test("Owner role sees all modules", async () => {
    setAuth("owner");
    mockFetch(baseMocks);
    render(<App />);
    expect(await screen.findByText("Student Search")).toBeInTheDocument();
    expect(screen.getByText("Students")).toBeInTheDocument();
    expect(screen.getByText("Subjects")).toBeInTheDocument();
    expect(screen.getByText("Grades")).toBeInTheDocument();
    expect(screen.getByText("Student Permits")).toBeInTheDocument();
    expect(screen.getByText("Payments")).toBeInTheDocument();
  });
});
