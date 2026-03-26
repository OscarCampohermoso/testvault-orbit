import type { Message, MessageResponse, Account } from '../core/types'
import {
  DB_STORAGE_KEY,
  OFFSCREEN_DOCUMENT_PATH,
  isOffscreenDbRequestMessage,
  isOffscreenStorageGetMessage,
  isOffscreenStorageResetMessage,
  isOffscreenStorageSetMessage,
} from '../shared/offscreen'

interface ServiceWorkerLikeScope {
  clients: {
    matchAll: () => Promise<Array<{ url: string }>>
  }
}

let creatingOffscreenDocument: Promise<void> | null = null

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (isOffscreenDbRequestMessage(message)) {
    return false
  }

  handleMessage(message).then((response) => {
    if (response) {
      sendResponse(response)
    }
  }).catch((err: unknown) => {
    sendResponse({
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    } satisfies MessageResponse)
  })

  return true // keep channel open for async
})

async function handleMessage(message: unknown): Promise<MessageResponse | null> {
  if (isOffscreenStorageGetMessage(message)) {
    const stored = await chrome.storage.local.get(DB_STORAGE_KEY)
    return { success: true, data: (stored[DB_STORAGE_KEY] as number[] | undefined) ?? null }
  }

  if (isOffscreenStorageSetMessage(message)) {
    await chrome.storage.local.set({ [DB_STORAGE_KEY]: message.payload })
    return { success: true }
  }

  if (isOffscreenStorageResetMessage(message)) {
    await chrome.storage.local.remove(DB_STORAGE_KEY)
    return { success: true }
  }

  if (!isMessage(message)) {
    return { success: false, error: 'Unknown message type' }
  }

  switch (message.type) {
    case 'AUTOFILL': {
      const { tabId, account } = message.payload as { tabId: number; account: Account }
      const markUsedResult = await forwardToOffscreen({ type: 'MARK_USED', payload: account.id })
      if (!markUsedResult.success) {
        return markUsedResult
      }

      await chrome.tabs.sendMessage(tabId, {
        type: 'DO_AUTOFILL',
        payload: { username: account.username, password: account.password },
      })
      return { success: true }
    }

    case 'GET_CURRENT_TAB_URL': {
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
      return { success: true, data: tab?.url ?? null }
    }

    default:
      return forwardToOffscreen(message)
  }
}

function isMessage(message: unknown): message is Message {
  return typeof message === 'object' && message !== null && 'type' in message && typeof message.type === 'string'
}

async function forwardToOffscreen(message: Message): Promise<MessageResponse> {
  await ensureOffscreenDocument()

  const response = await chrome.runtime.sendMessage({
    target: 'offscreen',
    type: 'OFFSCREEN_DB_REQUEST',
    payload: message,
  }) as MessageResponse | undefined

  if (!response) {
    return { success: false, error: 'Offscreen document did not respond' }
  }

  return response
}

async function ensureOffscreenDocument(): Promise<void> {
  if (await hasOffscreenDocument()) {
    return
  }

  if (!chrome.offscreen) {
    throw new Error('chrome.offscreen is not available in this browser')
  }

  if (creatingOffscreenDocument) {
    await creatingOffscreenDocument
    return
  }

  creatingOffscreenDocument = chrome.offscreen.createDocument({
    url: OFFSCREEN_DOCUMENT_PATH,
    reasons: ['WORKERS'],
    justification: 'Run SQL.js and its WASM loader outside the MV3 service worker.',
  })

  try {
    await creatingOffscreenDocument
  } finally {
    creatingOffscreenDocument = null
  }
}

async function hasOffscreenDocument(): Promise<boolean> {
  const offscreenUrl = chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH)

  if ('getContexts' in chrome.runtime) {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [offscreenUrl],
    })

    return contexts.length > 0
  }

  const matchedClients = await (self as unknown as ServiceWorkerLikeScope).clients.matchAll()
  return matchedClients.some((client) => client.url === offscreenUrl)
}
