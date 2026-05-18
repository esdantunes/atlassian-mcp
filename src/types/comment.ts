import type { UserDetails } from "./issue.js";

export interface SimplifiedComment {
  id: string;
  body: string;
  bodyAdf?: { type: "doc"; version: number; content: unknown[] };
  author: UserDetails | null;
  created?: string;
  updated?: string;
}
