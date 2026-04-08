import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import App from "../App";

jest.setTimeout(15000);

function setAuth(role = "teacher") {
  window.localStorage.setItem(
    "auth",
    JSON.stringify({ token: "t", role, username: role }),
  );
}

function mockFetch(routes = {}) {
  const calls = [];
  global.fetch = jest.fn((url, opts = {}) => {
    const path = String(url).replace("http://localhost:4000", "");
    calls.push({ path, opts });
    const handler = routes[path] || routes["*"];
    if (!handler) {
      return Promise.resolve(
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }
    const { status = 200, body = {} } =
      typeof handler === "function" ? handler({ url: path, opts }) : handler;
    return Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    );
  });
  return calls;
}

beforeEach(() => {
  window.localStorage.clear();
  jest.restoreAllMocks();
});

test("can create subject without semester_id and sees success message", async () => {
  setAuth("teacher");
  const calls = mockFetch({
    "/students": { body: [] },
    "/grades": { body: [] },
    "/subjects": ({ opts }) => {
      const method = (opts.method || "GET").toUpperCase();
      if (method === "GET") {
        return { status: 200, body: [] };
      }
      const body = JSON.parse(opts.body || "{}");
      return { status: 201, body: { ok: true, seen: body } };
    },
    "*": { body: [] },
  });

  render(<App />);
  fireEvent.click(await screen.findByText("Subjects"));

  fireEvent.click(screen.getByText("+ Add Subject"));

  const codeInput = screen.getByPlaceholderText("e.g. CS101");
  const nameInput = screen.getByPlaceholderText(
    "e.g. Introduction to Programming",
  );
  fireEvent.change(codeInput, { target: { value: "SMK101" } });
  fireEvent.change(nameInput, { target: { value: "Smoke Subject" } });

  const addButtons = screen.getAllByRole("button", { name: /Add Subject/ });
  const submitBtn = addButtons[addButtons.length - 1];
  fireEvent.click(submitBtn);

  await waitFor(() =>
    expect(screen.getByText("✅ Subject added.")).toBeInTheDocument(),
  );

  const post = calls.find(
    (c) => c.path === "/subjects" && (c.opts.method || "GET") === "POST",
  );
  expect(post).toBeTruthy();
  const posted = JSON.parse(post.opts.body || "{}");
  expect(posted.id).toBe("SMK101");
  expect(posted.name).toBe("Smoke Subject");
  expect(posted.units).toBe(3);
  expect(posted.semester_id).toBeUndefined();
});

test("invalid subject payload surfaces a friendly error", async () => {
  setAuth("teacher");
  const calls = mockFetch({
    "/students": { body: [] },
    "/grades": { body: [] },
    "/subjects": ({ opts }) => {
      const method = (opts.method || "GET").toUpperCase();
      if (method === "GET") {
        return { status: 200, body: [] };
      }
      return {
        status: 400,
        body: {
          error: "Invalid data",
          details: {
            formErrors: [],
            fieldErrors: { semester_id: ["Expected number, received null"] },
          },
        },
      };
    },
    "*": { body: [] },
  });

  const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});

  render(<App />);
  fireEvent.click(await screen.findByText("Subjects"));

  fireEvent.click(screen.getByText("+ Add Subject"));

  const codeInput = screen.getByPlaceholderText("e.g. CS101");
  const nameInput = screen.getByPlaceholderText(
    "e.g. Introduction to Programming",
  );
  fireEvent.change(codeInput, { target: { value: "BAD01" } });
  fireEvent.change(nameInput, { target: { value: "Bad Subject" } });

  const addButtons = screen.getAllByRole("button", { name: /Add Subject/ });
  const submitBtn = addButtons[addButtons.length - 1];
  fireEvent.click(submitBtn);

  await waitFor(() =>
    expect(alertSpy).toHaveBeenCalledWith(
      expect.stringContaining("Invalid data"),
    ),
  );

  alertSpy.mockRestore();
  expect(
    calls.some(
      (c) => c.path === "/subjects" && (c.opts.method || "GET") === "POST",
    ),
  ).toBe(true);
});
