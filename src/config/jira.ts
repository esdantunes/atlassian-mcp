function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

export const JIRA_PROJECT_KEY = getEnv("JIRA_PROJECT_KEY");
