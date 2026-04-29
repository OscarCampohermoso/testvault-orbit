import type { Message, MessageResponse } from '../core/types'

export async function sendMessage<T = unknown>(message: Message): Promise<MessageResponse<T>> {
  try {
    const response = await chrome.runtime.sendMessage(message) as MessageResponse<T> | undefined
    if (!response || typeof response.success !== 'boolean') {
      return { success: false, error: 'Extension did not return a valid response.' }
    }

    return response
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Extension message failed.',
    }
  }
}
