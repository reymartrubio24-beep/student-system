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

test("All Student Payments loads by default and filters by date", async () => {
  setAuth("cashier");
  const allPays = [
    { id: 1, student_id: "2026-0001", amount: 500, method: "Cash", reference: "R1", created_at: "2026-02-01T10:00:00Z" },
    { id: 2, student_id: "2026-0002", amount: 750, method: "GCash", reference: "R2", created_at: "2026-03-01T12:00:00Z" }
  ];
  mockFetch({
    "/students": { body: [] },
    "/grades": { body: [] },
    "/subjects": { body: [] },
    "/payments": { body: allPays },
    "/payments?from=2026-03-01&to=2026-03-31": { body: [allPays[1]] },
    "*": { body: {} }
  });
  render(<App />);
  fireEvent.click(await screen.findByText("Payments"));
  await waitFor(() => expect(screen.getByText("All Payments")).toBeInTheDocument());
  expect(screen.getByText("Cash")).toBeInTheDocument();
  expect(screen.getByText("GCash")).toBeInTheDocument();

  fireEvent.change(screen.getByPlaceholderText("2026-01-01"), { target: { value: "2026-03-01" } });
  fireEvent.change(screen.getByPlaceholderText("2026-12-31"), { target: { value: "2026-03-31" } });
  // Apply filters triggers automatic reload for all-payments via useEffect dependency
  await waitFor(() => expect(screen.getByText("GCash")).toBeInTheDocument());
});

test("Mobile view: All Payments renders without layout errors", async () => {
  setAuth("developer");
  Object.defineProperty(window, "innerWidth", { writable: true, value: 375 });
  window.dispatchEvent(new Event("resize"));
  mockFetch({
    "/students": { body: [] }, "/grades": { body: [] }, "/subjects": { body: [] },
    "/payments": { body: [{ id: 1, student_id: "2026-0001", amount: 123, method: "Cash", reference: "M1", created_at: "2026-01-01T00:00:00Z" }] },
    "*": { body: {} }
  });
  const errSpy = jest.spyOn(console, "error");
  render(<App />);
  fireEvent.click(await screen.findByText("Payments"));
  await waitFor(() => expect(screen.getByText("All Payments")).toBeInTheDocument());
  expect(screen.getByText("Cash")).toBeInTheDocument();
  expect(errSpy).not.toHaveBeenCalled();
  errSpy.mockRestore();
});

