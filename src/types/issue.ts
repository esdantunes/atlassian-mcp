export interface UserDetails {
  id: string;
  displayName: string;
  emailAddress?: string;
}

export type IssueFixVersionGroup = "RELEASED" | "UNRELEASED";

export interface IssueFixVersion {
  id: string;
  name: string;
  selectableGroupKey: IssueFixVersionGroup;
  releaseDate?: string;
  archived?: boolean;
}

export interface SimplifiedIssue {
  id: string;
  title: string;
  description: string;
  descriptionAdf?: { type: "doc"; version: number; content: unknown[] };
  status: string;
  priority: string;
  reporter: UserDetails | null;
  assignee: UserDetails | null;
  fixVersions?: IssueFixVersion[];
}

export interface IssueCreateInput {
  title: string;
  description?: string;
  priority?: string;
  reporter?: string;
  assignee?: string;
}
