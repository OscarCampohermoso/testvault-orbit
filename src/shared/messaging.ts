import type { Message, MessageResponse } from '../core/types'

export function sendMessage<T = unknown>(message: Message): Promise<MessageResponse<T>> {
  return chrome.runtime.sendMessage(message)
}
