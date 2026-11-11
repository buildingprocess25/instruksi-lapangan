export class ServiceError extends Error {}

export type ActionState = { error?: string; success?: string } | undefined

export function toActionError(error: unknown, fallback: string): { error: string } {
  return { error: error instanceof ServiceError ? error.message : fallback }
}
