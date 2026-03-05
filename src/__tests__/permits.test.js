import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import App from "../App";

global.fetch = jest.fn((url, opts) => {
  const path = String(url);
  if (path.endsWith("/auth/login")) {
    return Promise.resolve(new Response(JSON.stringify({ token: "t", role: "developer", username: "dev" }), { status: 200 }));
  }
  if (path.endsWith("/students")) {
    return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
  }
  if (path.endsWith("/subjects")) {
    return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
  }
  if (path.endsWith("/grades")) {
    return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
  }
  if (path.endsWith("/semesters")) {
    return Promise.resolve(new Response(JSON.stringify([{ id: 1, school_year: "2026-2027", term: "1st" }]), { status: 200 }));
  }
  if (path.endsWith("/semesters/1/periods")) {
    return Promise.resolve(new Response(JSON.stringify([
      { id: 10, semester_id: 1, name: "Final Permit", sort_order: 5 }
    ]), { status: 200 }));
  }
  if (path.endsWith("/semesters/1/permits")) {
    return Promise.resolve(new Response(JSON.stringify([
      { id: 100, student_id: "TST-1", name: "Final Permit", permit_number: "PRM-FINAL-1", issue_date: "2026-03-04T00:00:00Z", expiry_date: "2026-06-01T00:00:00Z", status: "active" }
    ]), { status: 200 }));
  }
  return Promise.resolve(new Response("{}", { status: 200 }));
});

describe("Student Permits Navigation", () => {
  it("renders permits sidebar and semester selection", async () => {
    window.localStorage.setItem("auth", JSON.stringify({ token: "t", role: "developer", username: "dev" }));
    render(<App />);
    fireEvent.click(await screen.findByText("Student Permits"));
    await waitFor(() => {
      expect(screen.getAllByText(/Semesters/i)[0]).toBeInTheDocument();
    });
    fireEvent.click(screen.getAllByText(/Semesters/i)[0]);
  });
});
