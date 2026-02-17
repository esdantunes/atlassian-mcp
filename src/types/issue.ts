export interface UserDetails {
  id: string;
  displayName: string;
  emailAddress?: string;
}

export interface SimplifiedIssue {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  reporter: UserDetails | null;
  assignee: UserDetails | null;
}

export interface IssueCreateInput {
  title: string;
  description?: string;
  priority?: string;
  reporter?: string;
  assignee?: string;
}
