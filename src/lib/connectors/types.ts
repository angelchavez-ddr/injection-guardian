export type SyncCursor = {
  historyId?: string;
  pageToken?: string;
};

export type ConnectorMode = "gmail" | "demo";

export type ConnectorHealth = {
  id: string;
  mode: ConnectorMode;
  configured: boolean;
  scope: string;
};
