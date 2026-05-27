export type Page<T> = { items: T[]; total: number };

export type User = {
  id: string;
  nickname: string;
  displayName: string;
  role: "admin" | "user";
  isAdmin: boolean;
};

export type ScenarioModule = {
  id: string;
  moduleType: string;
  title: string;
  content: string;
  settings: Record<string, unknown>;
  sortOrder: number;
  isEnabled: boolean;
};

export type StoryCard = {
  id: string;
  title: string;
  cardType: string;
  summary: string;
  content: string;
  triggerWords: string[];
  activationMode: "always" | "triggered" | "manual" | "disabled";
  priority: number;
  sortOrder: number;
  isEnabled: boolean;
};

export type Scenario = {
  id: string;
  title: string;
  description: string;
  visibility: "private" | "unlisted" | "public";
  tags: string[];
  defaultModelConfigId?: string | null;
  modules?: ScenarioModule[];
  cards?: StoryCard[];
};

export type ProviderConnection = {
  id: string;
  ownerType: "platform" | "user";
  name: string;
  providerType: string;
  protocol: string;
  baseUrl: string;
  isEnabled: boolean;
  hasCredential: boolean;
};

export type ModelConfig = {
  id: string;
  ownerType: "platform" | "user";
  providerConnectionId: string;
  providerName: string;
  providerType: string;
  displayName: string;
  modelId: string;
  contextWindow: number;
  userContextLimitDefault: number;
  visibleResponseTargetTokens: number;
  temperature: number;
  topP: number;
  thinkingEnabled: boolean;
  isDefault: boolean;
  isEnabled: boolean;
};

export type AdventureTurn = {
  id: string;
  sequence: number;
  timelineSequence: number;
  role: "user" | "assistant" | "system_note";
  actionType?: "do" | "say" | "story" | "continue" | "retry" | null;
  content: string;
  responseGroupId?: string | null;
  isDeleted: boolean;
};

export type Adventure = {
  id: string;
  scenarioId: string;
  scenarioVersionId: string;
  parentAdventureId?: string | null;
  forkedFromTurnId?: string | null;
  title: string;
  status: "active" | "archived" | "deleted";
  currentModelConfigId?: string | null;
  state?: {
    modules: ScenarioModule[];
    cards: StoryCard[];
    currentModelConfigId?: string | null;
    stateSequence: number;
    timelineSequence: number;
  };
  turns?: AdventureTurn[];
};

export type ImportPreview = {
  scenario: Partial<Scenario> & { modules: ScenarioModule[]; cards: StoryCard[] };
  warnings: string[];
  metadata: Record<string, unknown>;
};
