import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { Dashboard } from "./App";

function mockStats(stats) {
  global.fetch = jest.fn(() =>
    Promise.resolve(
      new Response(JSON.stringify(stats), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  );
}

test("staff dashboard shows at-risk card and grade records", async () => {
  mockStats({
    totalStudents: 10,
    activeSubjects: 5,
    gradeRecords: 20,
    atRiskCount: 2,
  });
  render(<Dashboard token="t" role="teacher" />);
  await waitFor(() =>
    expect(screen.getByText("At-Risk Students")).toBeInTheDocument(),
  );
  expect(screen.getByText("Grade Records")).toBeInTheDocument();
});

test("student dashboard hides at-risk card and uses personal labels", async () => {
  mockStats({
    totalStudents: 10,
    activeSubjects: 3,
    gradeRecords: 4,
  });
  render(<Dashboard token="t" role="student" />);
  await waitFor(() =>
    expect(screen.getByText("📊 Dashboard Overview")).toBeInTheDocument(),
  );
  expect(screen.queryByText("At-Risk Students")).not.toBeInTheDocument();
  expect(screen.getByText("My Grade Records")).toBeInTheDocument();
});
