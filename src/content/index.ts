import { autofill } from './autofill'

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'DO_AUTOFILL') {
    const { username, password } = message.payload as { username: string; password: string }
    const success = autofill(username, password)
    sendResponse({ success })
  }
  return true
})
