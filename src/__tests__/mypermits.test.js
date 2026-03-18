import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import App from "../App";

global.fetch = jest.fn((url, opts) => {
  const path = String(url);
  if (path.endsWith("/auth/login")) {
    return Promise.resolve(new Response(JSON.stringify({ token: "t", role: "student", username: "stud" }), { status: 200 }));
  }
  if (path.endsWith("/students")) {
    return Promise.resolve(new Response(JSON.stringify([{ id: "S-1", name: "Test Student", course: "BSCS", year: "1st Year", email: "s@e", status: "Active" }]), { status: 200 }));
  }
  if (path.endsWith("/semesters")) {
    return Promise.resolve(new Response(JSON.stringify([{ id: 1, school_year: "2026-2027", term: "1st" }]), { status: 200 }));
  }
  if (path.endsWith("/semesters/1/periods")) {
    return Promise.resolve(new Response(JSON.stringify([
      { id: 11, semester_id: 1, name: "First Prelim Permit", sort_order: 1 },
      { id: 15, semester_id: 1, name: "Final Permit", sort_order: 5 }
    ]), { status: 200 }));
  }
  if (path.endsWith("/students/S-1/permits?semester_id=1")) {
    return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
  }
  if (path.endsWith("/students/S-1/permits") && opts?.method === "POST") {
    return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 201 }));
  }
  return Promise.resolve(new Response("{}", { status: 200 }));
});

describe("My Permits flow", () => {
  it("student can open My Permits and generate", async () => {
    window.localStorage.setItem("auth", JSON.stringify({ token: "t", role: "student", username: "stud" }));
    render(<App />);
    fireEvent.click(await screen.findByText("My Permits"));
    await waitFor(() => expect(screen.getByText("Permit Details")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("Semester"), { target: { value: "1" } });
    await waitFor(() => expect(screen.getByLabelText("Permit Period")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("Permit Period"), { target: { value: "11" } });
    fireEvent.change(screen.getByLabelText("Permit Number"), { target: { value: "PRM-001" } });
    fireEvent.click(screen.getByText("Generate Permit"));
    await waitFor(() => {
      expect(screen.getByText("Permit Preview")).toBeInTheDocument();
      expect(screen.getByText("PRM-001")).toBeInTheDocument();
    });
  });
});
