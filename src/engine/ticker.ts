// One requestAnimationFrame loop for every canvas on the page. Each subscriber decides whether it
// is visible; the loop sleeps when nobody is subscribed or the tab is hidden.
type Tick = (t: number, dt: number) => void

const subs = new Set<Tick>()
let raf = 0
let last = 0

function loop(ms: number) {
  raf = 0
  const dt = Math.min(0.05, (ms - last) / 1000)
  last = ms
  subs.forEach((fn) => fn(ms / 1000, dt))
  schedule()
}
function schedule() {
  if (!raf && subs.size && !document.hidden) {
    last = performance.now()
    raf = requestAnimationFrame(loop)
  }
}

export function subscribe(fn: Tick) {
  subs.add(fn)
  schedule()
  return () => {
    subs.delete(fn)
  }
}

if (typeof document !== 'undefined') document.addEventListener('visibilitychange', schedule)
