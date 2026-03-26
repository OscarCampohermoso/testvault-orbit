const USERNAME_SELECTORS = [
  'input[type="email"]',
  'input[name="email"]',
  'input[name="username"]',
  'input[name="user"]',
  'input[name="login"]',
  'input[autocomplete="username"]',
  'input[autocomplete="email"]',
  'input[type="text"][name*="user"]',
  'input[type="text"][name*="email"]',
  'input[type="text"][name*="login"]',
  'input[type="text"]',
]

const PASSWORD_SELECTORS = [
  'input[type="password"]',
  'input[name="password"]',
  'input[autocomplete="current-password"]',
]

function findField(selectors: string[]): HTMLInputElement | null {
  for (const selector of selectors) {
    const els = document.querySelectorAll<HTMLInputElement>(selector)
    for (const el of els) {
      if (el.offsetParent !== null && !el.disabled && !el.readOnly) {
        return el
      }
    }
  }
  return null
}

function setNativeValue(el: HTMLInputElement, value: string) {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value'
  )?.set
  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(el, value)
  } else {
    el.value = value
  }
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
}

export function autofill(username: string, password: string): boolean {
  const userField = findField(USERNAME_SELECTORS)
  const passField = findField(PASSWORD_SELECTORS)

  if (!passField) return false

  if (userField && userField !== passField) {
    setNativeValue(userField, username)
  }
  setNativeValue(passField, password)

  return true
}
