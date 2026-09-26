/**
 * Re-export the shared domain types so existing `@/lib/types` imports keep
 * working. The shared package is the single source of truth.
 */
export type {
  TaskPriority,
  TaskStatus,
  UserRole,
  AiProvider,
  WorkEntry,
  StructuredTask,
  GeneratedReport,
  SlackEodPayload,
  TeamMember,
  RedactedSettings,
  AiProcessResponse,
  SheetPreviewResponse,
  AuthUser,
} from '@tasksync/shared/types'
