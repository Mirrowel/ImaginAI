export type Page<T> = { items: T[]; total: number; page?: number; limit?: number; hasMore?: boolean };

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
  useForCharacterCreation: boolean;
  tokenBudget: number | null;
  metadata: Record<string, unknown>;
};

export type ScenarioVersion = {
  id: string;
  scenarioId: string;
  versionNumber: number;
  title: string;
  changeNote: string;
  createdAt: string;
  modules?: ScenarioModule[];
  cards?: StoryCard[];
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
  thinkingBudget?: number | null;
  showThinkingDefault?: boolean;
  streamThinkingDefault?: boolean;
  additionalSystemPrompt?: string;
  extraParameters?: Record<string, unknown>;
  sortOrder?: number;
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
  promptSnapshotId?: string | null;
  tokenUsageId?: string | null;
  isDeleted: boolean;
  createdAt?: string;
};

export type GenerationVariant = {
  id: string;
  responseGroupId: string;
  adventureId: string;
  content: string;
  retryInstruction: string;
  includedVariantIds: string[];
  isActive: boolean;
  createdAt: string;
};

export type GenerationEvent =
  | { type: "generation.status"; phase: string; message: string }
  | { type: "generation.thinking_delta"; text: string }
  | { type: "generation.content_delta"; text: string }
  | { type: "generation.token_update"; [key: string]: unknown }
  | { type: "generation.variant_created"; variantId: string }
  | { type: "generation.final"; turnId?: string | null; variantId?: string | null; content: string; tokenUsageId?: string | null }
  | { type: "generation.error"; message: string };

export type ContextReport = {
  includedModules: string[];
  activatedCards: string[];
  includedSummaryIds: string[];
  includedMemoryIds: string[];
  includedTurnRange: { first: number | null; last: number | null };
  estimatedTokensByLayer: Record<string, number>;
  modelConfigId?: string | null;
};

export type PromptSnapshot = ContextReport & {
  id: string;
  generationIntent: string;
  contextLimit: number;
  messages: Array<{ role: string; content: string }>;
  createdAt: string;
};

export type TokenUsage = {
  id: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  provider: string;
  modelId: string;
  createdAt: string;
};

export type AdventureSummary = {
  id?: string | null;
  adventureId?: string;
  content: string;
  sourceRangeMetadata: Record<string, unknown>;
};

export type AdventureMemory = {
  id: string;
  adventureId: string;
  scope: string;
  title: string;
  content: string;
  isPinned: boolean;
};

export type AdminDiagnostics = Record<string, number>;

export type AdminUsageRow = {
  id: string;
  userId: string;
  adventureId?: string | null;
  modelConfigId?: string | null;
  providerConnectionId?: string | null;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  provider: string;
  modelId: string;
  createdAt: string;
};

export type AdventureStateEvent = {
  id: string;
  adventureId: string;
  stateSequence: number;
  timelineSequence: number;
  effectiveFromTimelineSequence: number;
  eventType: string;
  targetType: string;
  targetId: string;
  payload: Record<string, unknown>;
  createdById: string;
  sourceTurnId: string | null;
  isInvalidated: boolean;
  invalidatedAt: string | null;
  createdAt: string;
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
    generationSettings?: Record<string, unknown>;
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
