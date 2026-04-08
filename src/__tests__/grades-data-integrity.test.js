import React from "react";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import App from "../App";

function setAuth(role = "teacher") {
  window.localStorage.setItem(
    "auth",
    JSON.stringify({ token: "t", role, username: role }),
  );
}

function mockFetch(routes = {}) {
  global.fetch = jest.fn((url, opts = {}) => {
    const path = String(url).replace("http://localhost:4000", "");
    const handler = routes[path] || routes["*"];
    if (!handler) {
      return Promise.resolve(
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }
    if (typeof handler === "function") {
      const { status = 200, body = {} } = handler({ url: path, opts });
      return Promise.resolve(
        new Response(JSON.stringify(body), {
          status,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }
    const { status = 200, body = {} } = handler;
    return Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    );
  });
}

beforeEach(() => {
  window.localStorage.clear();
});

test("Grades page shows error banner and no records on fetch failure", async () => {
  setAuth("teacher");
  mockFetch({
    "/students": { body: [] },
    "/grades": { status: 500, body: { error: "Internal error" } },
    "/subjects": { body: [] },
    "*": { body: {} },
  });
  render(<App />);
  fireEvent.click(await screen.findByText("Grades"));
  await waitFor(() =>
    expect(
      screen.getByText(/Failed to load grade records/i),
    ).toBeInTheDocument(),
  );
  expect(screen.queryByText("Grade Records (")).not.toBeInTheDocument();
});

test("Grade records remain consistent across app remounts without phantom students", async () => {
  setAuth("teacher");
  const routes = {
    "/students": {
      body: [
        {
          id: "S-100",
          name: "Grade Test Student",
          course: "BSCS",
          year: "1st Year",
          email: "s@e.c",
          status: "Active",
        },
      ],
    },
    "/subjects": {
      body: [{ id: "CS101", name: "Intro", units: 3, semester_id: null }],
    },
    "/grades": {
      body: [
        {
          student_id: "S-100",
          subject_id: "CS101",
          prelim: 80,
          midterm: 80,
          prefinal: 80,
          final: 80,
        },
      ],
    },
    "*": { body: {} },
  };
  mockFetch(routes);

  const mountAndAssert = async () => {
    render(<App />);
    fireEvent.click(await screen.findByText("Grades"));
    await waitFor(() =>
      expect(
        screen.getByText("Grade Test Student"),
      ).toBeInTheDocument(),
    );
    cleanup();
  };

  await mountAndAssert();
  mockFetch(routes);
  await mountAndAssert();
}
);
