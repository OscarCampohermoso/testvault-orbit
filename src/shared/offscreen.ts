import type { Message } from '../core/types'

export const DB_STORAGE_KEY = 'testvault_db'
export const OFFSCREEN_DOCUMENT_PATH = 'offscreen.html'

export interface OffscreenDbRequestMessage {
  target: 'offscreen'
  type: 'OFFSCREEN_DB_REQUEST'
  payload: Message
}

export interface OffscreenStorageGetMessage {
  target: 'background'
  type: 'OFFSCREEN_STORAGE_GET'
}

export interface OffscreenStorageSetMessage {
  target: 'background'
  type: 'OFFSCREEN_STORAGE_SET'
  payload: number[]
}

export interface OffscreenStorageResetMessage {
  target: 'background'
  type: 'OFFSCREEN_STORAGE_RESET'
}

export type OffscreenStorageMessage =
  | OffscreenStorageGetMessage
  | OffscreenStorageSetMessage
  | OffscreenStorageResetMessage

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isOffscreenDbRequestMessage(message: unknown): message is OffscreenDbRequestMessage {
  return isRecord(message) && message.target === 'offscreen' && message.type === 'OFFSCREEN_DB_REQUEST'
}

export function isOffscreenStorageGetMessage(message: unknown): message is OffscreenStorageGetMessage {
  return isRecord(message) && message.target === 'background' && message.type === 'OFFSCREEN_STORAGE_GET'
}

export function isOffscreenStorageSetMessage(message: unknown): message is OffscreenStorageSetMessage {
  return (
    isRecord(message) &&
    message.target === 'background' &&
    message.type === 'OFFSCREEN_STORAGE_SET' &&
    Array.isArray(message.payload)
  )
}

export function isOffscreenStorageResetMessage(message: unknown): message is OffscreenStorageResetMessage {
  return isRecord(message) && message.target === 'background' && message.type === 'OFFSCREEN_STORAGE_RESET'
}
