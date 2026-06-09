import {
  pgTable, uuid, varchar, text, boolean, integer,
  timestamp, jsonb, pgEnum, index, uniqueIndex, vector,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─── Enums ───────────────────────────────────────────────

export const roleEnum = pgEnum('role_type', ['ADMIN', 'STAFF']);
export const messageRoleEnum = pgEnum('message_role', ['user', 'assistant', 'system', 'tool']);
export const transportEnum = pgEnum('transport_type', ['sse', 'stdio']);
export const integrationStatusEnum = pgEnum('integration_status', ['active', 'inactive', 'error']);
export const toolExecStatusEnum = pgEnum('tool_exec_status', ['success', 'error', 'denied', 'timeout']);
export const approvalStatusEnum = pgEnum('approval_status', ['pending', 'approved', 'rejected', 'expired']);
export const docStatusEnum = pgEnum('doc_status', ['processing', 'indexed', 'error']);

// ─── Users & Roles ──────────────────────────────────────

export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  roleId: uuid('role_id').notNull().references(() => roles.id),
  isActive: boolean('is_active').default(true).notNull(),
  deleted: boolean('deleted').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_users_email').on(table.email),
  index('idx_users_role').on(table.roleId),
]);

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 255 }).notNull(),
  userAgent: text('user_agent'),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_refresh_tokens_user').on(table.userId),
]);

// ─── Agents ──────────────────────────────────────────────

export const agents = pgTable('agents', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  systemInstructions: text('system_instructions').notNull(),
  llmProvider: varchar('llm_provider', { length: 50 }),
  llmModel: varchar('llm_model', { length: 100 }),
  tier: varchar('tier', { length: 20 }).default('smart').notNull(),
  isRouter: boolean('is_router').default(false).notNull(),
  maxSteps: integer('max_steps').default(10).notNull(),
  config: jsonb('config').default('{}').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const agentSkills = pgTable('agent_skills', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_agent_skills_agent').on(table.agentId),
]);

// ─── Integrations & Tools ────────────────────────────────

export const integrations = pgTable('integrations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  transport: transportEnum('transport').notNull(),
  endpoint: varchar('endpoint', { length: 1000 }),       // SSE URL
  headers: jsonb('headers').default('{}'),                // Custom headers
  command: varchar('command', { length: 500 }),           // stdio command
  args: jsonb('args').default('[]'),                      // stdio args
  env: jsonb('env').default('{}'),                        // stdio env vars
  authConfig: jsonb('auth_config').default('{}'),
  status: integrationStatusEnum('status').default('active').notNull(),
  lastHealthCheck: timestamp('last_health_check'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const toolDefinitions = pgTable('tool_definitions', {
  id: uuid('id').primaryKey().defaultRandom(),
  integrationId: uuid('integration_id').notNull().references(() => integrations.id, { onDelete: 'cascade' }),
  toolName: varchar('tool_name', { length: 255 }).notNull(),
  description: text('description'),
  inputSchema: jsonb('input_schema').default('{}').notNull(),
  requiresApproval: boolean('requires_approval').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_tool_defs_integration').on(table.integrationId),
  uniqueIndex('idx_tool_defs_name_unique').on(table.toolName),
]);

export const agentToolBindings = pgTable('agent_tool_bindings', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
  toolDefinitionId: uuid('tool_definition_id').notNull().references(() => toolDefinitions.id, { onDelete: 'cascade' }),
}, (table) => [
  index('idx_agent_tool_bindings_agent').on(table.agentId),
  uniqueIndex('idx_agent_tool_unique').on(table.agentId, table.toolDefinitionId),
]);

export const toolPermissions = pgTable('tool_permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  toolPattern: varchar('tool_pattern', { length: 255 }).notNull(),
  allowed: boolean('allowed').default(true).notNull(),
}, (table) => [
  index('idx_tool_permissions_role').on(table.roleId),
]);

// ─── Conversations & Messages ────────────────────────────

export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 500 }),
  summary: text('summary'),
  isArchived: boolean('is_archived').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_conversations_user').on(table.userId),
  index('idx_conversations_updated').on(table.updatedAt),
]);

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  role: messageRoleEnum('role').notNull(),
  content: text('content').notNull(),
  routedAgentId: uuid('routed_agent_id').references(() => agents.id),
  tokenCount: integer('token_count'),
  metadata: jsonb('metadata').default('{}'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_messages_conversation').on(table.conversationId),
  index('idx_messages_created').on(table.createdAt),
]);

export const toolExecutions = pgTable('tool_executions', {
  id: uuid('id').primaryKey().defaultRandom(),
  messageId: uuid('message_id').notNull().references(() => messages.id, { onDelete: 'cascade' }),
  toolDefinitionId: uuid('tool_definition_id').references(() => toolDefinitions.id),
  toolName: varchar('tool_name', { length: 255 }).notNull(),
  input: jsonb('input').default('{}'),
  output: jsonb('output').default('{}'),
  status: toolExecStatusEnum('status').notNull(),
  errorMessage: text('error_message'),
  durationMs: integer('duration_ms'),
  executedAt: timestamp('executed_at').defaultNow().notNull(),
}, (table) => [
  index('idx_tool_exec_message').on(table.messageId),
  index('idx_tool_exec_status').on(table.status),
  index('idx_tool_exec_date').on(table.executedAt),
]);

// ─── Approval Requests ───────────────────────────────────

export const approvalRequests = pgTable('approval_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  toolName: varchar('tool_name', { length: 255 }).notNull(),
  args: jsonb('args').default('{}'),
  description: text('description'),
  status: approvalStatusEnum('status').default('pending').notNull(),
  decidedAt: timestamp('decided_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_approval_conversation').on(table.conversationId),
  index('idx_approval_status').on(table.status),
]);

// ─── User Credentials ────────────────────────────────────

export const userCredentials = pgTable('user_credentials', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  integrationId: uuid('integration_id').notNull().references(() => integrations.id, { onDelete: 'cascade' }),
  encryptedToken: text('encrypted_token').notNull(),
  refreshToken: text('refresh_token'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('idx_user_cred_unique').on(table.userId, table.integrationId),
]);

// ─── LLM Usage Logs ──────────────────────────────────────

export const llmUsageLogs = pgTable('llm_usage_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  messageId: uuid('message_id').references(() => messages.id),
  agentId: uuid('agent_id').references(() => agents.id),
  provider: varchar('provider', { length: 50 }).notNull(),
  model: varchar('model', { length: 100 }).notNull(),
  tier: varchar('tier', { length: 20 }),
  promptTokens: integer('prompt_tokens').notNull(),
  completionTokens: integer('completion_tokens').notNull(),
  totalTokens: integer('total_tokens').notNull(),
  costUsd: varchar('cost_usd', { length: 20 }),
  latencyMs: integer('latency_ms'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_llm_usage_agent').on(table.agentId),
  index('idx_llm_usage_date').on(table.createdAt),
  index('idx_llm_usage_provider').on(table.provider),
]);

// ─── Knowledge Base ──────────────────────────────────────

export const knowledgeDocuments = pgTable('knowledge_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 500 }).notNull(),
  sourceType: varchar('source_type', { length: 50 }).notNull(),
  originalFilename: varchar('original_filename', { length: 500 }),
  totalChunks: integer('total_chunks').default(0),
  status: docStatusEnum('status').default('processing').notNull(),
  uploadedBy: uuid('uploaded_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const knowledgeChunks = pgTable('knowledge_chunks', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id').notNull().references(() => knowledgeDocuments.id, { onDelete: 'cascade' }),
  chunkIndex: integer('chunk_index').notNull(),
  content: text('content').notNull(),
  embedding: vector('embedding', { dimensions: 1536 }).notNull(),
  tokenCount: integer('token_count'),
  metadata: jsonb('metadata').default('{}'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_chunks_document').on(table.documentId),
]);

// ─── Relations Definitions ───────────────────────────────

export const usersRelations = relations(users, ({ one, many }) => ({
  role: one(roles, { fields: [users.roleId], references: [roles.id] }),
  conversations: many(conversations),
  refreshTokens: many(refreshTokens),
  credentials: many(userCredentials),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  users: many(users),
  toolPermissions: many(toolPermissions),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, { fields: [refreshTokens.userId], references: [users.id] }),
}));

export const agentsRelations = relations(agents, ({ many }) => ({
  skills: many(agentSkills),
  toolBindings: many(agentToolBindings),
  messages: many(messages),
}));

export const agentSkillsRelations = relations(agentSkills, ({ one }) => ({
  agent: one(agents, { fields: [agentSkills.agentId], references: [agents.id] }),
}));

export const integrationsRelations = relations(integrations, ({ many }) => ({
  toolDefinitions: many(toolDefinitions),
  userCredentials: many(userCredentials),
}));

export const toolDefinitionsRelations = relations(toolDefinitions, ({ one, many }) => ({
  integration: one(integrations, { fields: [toolDefinitions.integrationId], references: [integrations.id] }),
  agentToolBindings: many(agentToolBindings),
  toolPermissions: many(toolPermissions),
}));

export const agentToolBindingsRelations = relations(agentToolBindings, ({ one }) => ({
  agent: one(agents, { fields: [agentToolBindings.agentId], references: [agents.id] }),
  toolDefinition: one(toolDefinitions, { fields: [agentToolBindings.toolDefinitionId], references: [toolDefinitions.id] }),
}));

export const toolPermissionsRelations = relations(toolPermissions, ({ one }) => ({
  role: one(roles, { fields: [toolPermissions.roleId], references: [roles.id] }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, { fields: [conversations.userId], references: [users.id] }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  conversation: one(conversations, { fields: [messages.conversationId], references: [conversations.id] }),
  routedAgent: one(agents, { fields: [messages.routedAgentId], references: [agents.id] }),
  toolExecutions: many(toolExecutions),
}));

export const toolExecutionsRelations = relations(toolExecutions, ({ one }) => ({
  message: one(messages, { fields: [toolExecutions.messageId], references: [messages.id] }),
  toolDefinition: one(toolDefinitions, { fields: [toolExecutions.toolDefinitionId], references: [toolDefinitions.id] }),
}));

export const approvalRequestsRelations = relations(approvalRequests, ({ one }) => ({
  conversation: one(conversations, { fields: [approvalRequests.conversationId], references: [conversations.id] }),
  user: one(users, { fields: [approvalRequests.userId], references: [users.id] }),
}));

export const userCredentialsRelations = relations(userCredentials, ({ one }) => ({
  user: one(users, { fields: [userCredentials.userId], references: [users.id] }),
  integration: one(integrations, { fields: [userCredentials.integrationId], references: [integrations.id] }),
}));

export const llmUsageLogsRelations = relations(llmUsageLogs, ({ one }) => ({
  message: one(messages, { fields: [llmUsageLogs.messageId], references: [messages.id] }),
  agent: one(agents, { fields: [llmUsageLogs.agentId], references: [agents.id] }),
}));

export const knowledgeDocumentsRelations = relations(knowledgeDocuments, ({ one, many }) => ({
  uploadedByUser: one(users, { fields: [knowledgeDocuments.uploadedBy], references: [users.id] }),
  chunks: many(knowledgeChunks),
}));

export const knowledgeChunksRelations = relations(knowledgeChunks, ({ one }) => ({
  document: one(knowledgeDocuments, { fields: [knowledgeChunks.documentId], references: [knowledgeDocuments.id] }),
}));
