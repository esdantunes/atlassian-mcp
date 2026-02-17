import type { Context } from "hono";

export function jsonResponse<T>(
  c: Context,
  data: T,
  status: 200 | 201 | 400 | 404 | 502 = 200
) {
  return c.text(JSON.stringify(data) + "\n", status, {
    "Content-Type": "application/json",
  });
}
