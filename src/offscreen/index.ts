import { getAllAccounts, createAccount, updateAccount, deleteAccount, searchAccounts, markUsed } from '../db/accountsRepo'
import { exportPack, importPack } from '../db/importExport'
import { resetDb } from '../db/sqlite'
import { findMatchingPatterns } from '../core/domainMatch'
import type { Message, MessageResponse, Account } from '../core/types'
import { isOffscreenDbRequestMessage } from '../shared/offscreen'

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (!isOffscreenDbRequestMessage(message)) {
    return false
  }

  handleVaultMessage(message.payload).then(sendResponse).catch((err: unknown) => {
    sendResponse({
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    } satisfies MessageResponse)
  })

  return true
})

async function handleVaultMessage(msg: Message): Promise<MessageResponse> {
  switch (msg.type) {
    case 'GET_ALL_ACCOUNTS': {
      const accounts = await getAllAccounts()
      return { success: true, data: accounts }
    }

    case 'GET_MATCHING_ACCOUNTS': {
      const url = msg.payload as string
      const all = await getAllAccounts()
      const matching = all.filter((account) => findMatchingPatterns(account.domainPatterns, url))
      return { success: true, data: matching }
    }

    case 'CREATE_ACCOUNT': {
      const account = await createAccount(msg.payload as Omit<Account, 'id' | 'createdAt' | 'updatedAt'>)
      return { success: true, data: account }
    }

    case 'UPDATE_ACCOUNT': {
      const { id, ...data } = msg.payload as Account
      const updated = await updateAccount(id, data)
      return { success: true, data: updated }
    }

    case 'DELETE_ACCOUNT': {
      await deleteAccount(msg.payload as string)
      return { success: true }
    }

    case 'DELETE_ALL_ACCOUNTS': {
      await resetDb()
      return { success: true }
    }

    case 'SEARCH_ACCOUNTS': {
      const results = await searchAccounts(msg.payload as string)
      return { success: true, data: results }
    }

    case 'MARK_USED': {
      await markUsed(msg.payload as string)
      return { success: true }
    }

    case 'EXPORT_PACK': {
      const { accountIds, label, passphrase } = msg.payload as {
        accountIds: string[] | null
        label: string
        passphrase?: string
      }
      const result = await exportPack(accountIds, label, passphrase)
      return { success: true, data: result }
    }

    case 'IMPORT_PACK': {
      const { data, passphrase } = msg.payload as { data: string | ArrayBuffer; passphrase?: string }
      const result = await importPack(data, passphrase)
      return { success: true, data: result }
    }

    default:
      return { success: false, error: 'Unknown message type' }
  }
}
