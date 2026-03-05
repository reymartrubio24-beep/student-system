import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import App from "../App";

global.fetch = jest.fn((url, opts) => {
  const path = String(url).replace("http://localhost:4000", "");
  if (path === "/students") {
    return Promise.resolve(
      new Response(
        JSON.stringify([
          {
            id: "2026-0001",
            name: "Test Student",
            course: "BSCS",
            year: "1st Year",
            email: "s@e",
            status: "Active",
          },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
  }
  if (path === "/grades") {
    return Promise.resolve(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  }
  if (path === "/subjects") {
    return Promise.resolve(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  }
  if (path === "/dashboard-stats") {
    return Promise.resolve(
      new Response(
        JSON.stringify({
          totalStudents: 1,
          activeSubjects: 0,
          gradeRecords: 0,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
  }
  if (path === "/my-permits") {
    return Promise.resolve(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  }
  return Promise.resolve(
    new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
});

describe("My Permits flow", () => {
  it("student can open My Permits and see empty state", async () => {
    window.localStorage.setItem(
      "auth",
      JSON.stringify({
        token: "t",
        role: "student",
        username: "stud",
        student_id: "2026-0001",
      }),
    );
    render(<App />);
    fireEvent.click(await screen.findByText("My Permits"));
    await waitFor(() =>
      expect(screen.getByText("🎫 My Permits")).toBeInTheDocument(),
    );
    expect(screen.getByText("No permits found.")).toBeInTheDocument();
  });
});
