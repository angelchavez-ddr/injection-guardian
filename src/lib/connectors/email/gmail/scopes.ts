export const GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

export const GMAIL_ALLOWED_OPERATIONS = [
  "users.getProfile",
  "users.messages.list",
  "users.messages.get",
  "users.history.list",
] as const;
