// Batida tátil curta, como o encaixe de um dial.
// Android: navigator.vibrate. iPhone (iOS 18+): o Safari não tem vibrate, mas acionar um interruptor
// nativo (<input type="checkbox" switch>) gera a batida do sistema. Em aparelhos sem suporte, não faz nada.

let label: HTMLLabelElement | null = null

function iosSwitch(): HTMLLabelElement {
  if (label) return label
  label = document.createElement('label')
  label.setAttribute('aria-hidden', 'true')
  label.style.cssText = 'position:fixed;left:-100px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden'
  const input = document.createElement('input')
  input.type = 'checkbox'
  input.setAttribute('switch', '')
  input.tabIndex = -1
  label.appendChild(input)
  document.body.appendChild(label)
  return label
}

export function tick() {
  try {
    const nav = navigator as Navigator & { vibrate?: (p: number) => boolean }
    if (typeof nav.vibrate === 'function') {
      nav.vibrate(8)
      return
    }
    iosSwitch().click()
  } catch {
    // sem suporte: segue sem vibrar
  }
}
