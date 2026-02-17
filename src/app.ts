import { Hono } from "hono";
import issues from "./routes/issues.js";

const app = new Hono();
app.route("/jira/issues", issues);

export default app;
