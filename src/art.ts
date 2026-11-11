// Export page for the generated images. `scripts/art.mjs` opens it per scene and screenshots #out.
import '@fontsource-variable/sora'
import '@fontsource-variable/dm-sans'
import '@fontsource/jetbrains-mono/400.css'
import { Field } from './engine/field'
import { heroLayout } from './engine/layouts'
import type { JellySpec } from './engine/species'
import { ICONS } from './voxel/models'
import { Group, Mesh, MeshLambertMaterial, PlaneGeometry, Vector3 } from 'three'
import { bola } from './voxel/town/landmarks'
import { buildDiorama, buildTijuana, modelMesh, frameTown, readTownPalette, townLights, isoCamera, lights, makeRenderer, readVoxPalette, renderIcon, Scene } from './voxel/scene'

const q = new URLSearchParams(location.search)
const scene = q.get('scene') ?? 'hero'
const out = document.getElementById('out') as HTMLCanvasElement
const sizes: Record<string, [number, number]> = { hero: [1440, 900], 'hero-mobile': [390, 844], og: [1200, 630], 'og-en': [1200, 630], favicon: [512, 512], 'apple-touch': [180, 180] }
const [W, H] = sizes[scene] ?? (scene === 'diorama' ? [1000, 560] : scene === 'tijuana' ? [2400, 1200] : scene === 'bola' ? [1200, 800] : [320, 320])
out.width = W
out.height = H

const og: JellySpec[] = [
  { species: 'nettle', x: 0.8, y: 0.1, r: 170, phase: 0.4, speed: 0.3, depth: 1, tint: 1 },
  { species: 'moon', x: 0.97, y: 0.62, r: 120, phase: 1.3, speed: 0.34, depth: 0.85 },
  { species: 'comb', x: 0.62, y: 0.5, r: 70, phase: 2.2, speed: 0.4, depth: 0.7 },
  { species: 'crown', x: 0.84, y: 0.85, r: 60, phase: 3.1, speed: 0.42, depth: 0.55 },
  { species: 'moon', x: 0.5, y: 0.12, r: 36, phase: 4.1, speed: 0.46, depth: 0.2 },
]

async function voxelScene() {
  const pal = readVoxPalette(document.documentElement)
  if (scene === 'diorama') {
    const r = makeRenderer(out)
    r.setSize(W, H, false)
    const sc = new Scene()
    lights(sc)
    const { world } = buildDiorama(pal)
    sc.add(world)
    r.render(sc, isoCamera(W / H, 27))
  } else if (scene === 'bola') {
    // a close look at La Bola on its own, from the front, for comparing with the photographs
    const r = makeRenderer(out)
    r.setSize(W, H, false)
    r.shadowMap.enabled = true
    const sc = new Scene()
    townLights(sc)
    const pal = readTownPalette(document.documentElement)
    const g = new Group()
    const m = modelMesh(bola(), pal, 0.25, { origin: [0, 0], jitter: 0, ao: 0 })
    m.castShadow = m.receiveShadow = true
    const floor = new Mesh(new PlaneGeometry(80, 60), new MeshLambertMaterial({ color: pal[41] }))
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    g.add(m, floor)
    g.rotation.y = Math.PI / 4
    sc.add(g)
    const cam = isoCamera(W / H, 17)
    cam.position.set(40, 24, 40)
    cam.position.add(new Vector3(0, 3, 0))
    cam.lookAt(0, 3, 0)
    r.render(sc, cam)
  } else if (scene === 'tijuana') {
    const r = makeRenderer(out)
    r.setSize(W, H, false)
    r.shadowMap.enabled = true
    const sc = new Scene()
    townLights(sc)
    const town = buildTijuana(readTownPalette(document.documentElement))
    sc.add(town.world)
    await town.done
    town.update(0, 0)
    const world = town.world
    const { half, center } = frameTown(world, W / H)
    const cam = isoCamera(W / H, half)
    // ?x=&z=&zoom=&yaw=&y= look at a spot of the map from a chosen side, for checking details
    const qx = q.get('x')
    if (qx !== null) {
      const look = world.localToWorld(new Vector3(+qx, +(q.get('y') ?? 4), +(q.get('z') ?? 0)))
      cam.zoom = +(q.get('zoom') ?? 3)
      cam.position.set(40, +(q.get('elev') ?? 34), 40).applyAxisAngle(new Vector3(0, 1, 0), +(q.get('yaw') ?? 0)).add(look)
      cam.updateProjectionMatrix()
      cam.lookAt(look)
      town.east.visible = q.get('east') !== '0'
    } else {
      cam.position.add(center)
      cam.lookAt(center)
    }
    r.render(sc, cam)
  } else {
    const name = scene.replace('icon-', '') as keyof typeof ICONS
    renderIcon(out, ICONS[name](), pal)
  }
  ;(window as unknown as { ready: boolean }).ready = true
}

/** Light versions of the brand images for the dark water: ink becomes ivory, blue becomes light blue. Alpha is kept. */
async function logoScene(src: string, size: [number, number]) {
  const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!
  const rgb = (css: string) => {
    probe.clearRect(0, 0, 1, 1)
    probe.fillStyle = css
    probe.fillRect(0, 0, 1, 1)
    const d = probe.getImageData(0, 0, 1, 1).data
    return [d[0], d[1], d[2]]
  }
  const cs = getComputedStyle(document.documentElement)
  const ivory = rgb(cs.getPropertyValue('--color-marfil').trim())
  const blue = rgb(cs.getPropertyValue('--deep-accent').trim())
  const img = new Image()
  img.src = src
  await img.decode()
  out.width = size[0]
  out.height = size[1]
  const ctx = out.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0, size[0], size[1])
  const px = ctx.getImageData(0, 0, size[0], size[1])
  const d = px.data
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue
    const t = Math.min(1, Math.max(0, (d[i + 2] - d[i] - 24) / 80)) // 0 ink .. 1 brand blue
    for (let c = 0; c < 3; c++) d[i + c] = Math.round(ivory[c] + (blue[c] - ivory[c]) * t)
  }
  ctx.putImageData(px, 0, 0)
  ;(window as unknown as { ready: boolean }).ready = true
}

/** The jellyfish Q on a white rounded square, so it reads on dark browser tabs. */
async function faviconScene() {
  const ctx = out.getContext('2d')!
  const r = W * 0.22
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.roundRect(0, 0, W, H, r)
  ctx.fill()
  const img = new Image()
  img.src = '/03-simbolo-medusa.png'
  await img.decode()
  const m = W * 0.13
  const k = Math.min((W - 2 * m) / img.width, (H - 2 * m) / img.height)
  ctx.drawImage(img, (W - img.width * k) / 2, (H - img.height * k) / 2, img.width * k, img.height * k)
  ;(window as unknown as { ready: boolean }).ready = true
}

async function run() {
  if (scene === 'logo-light') return logoScene('/04-logo-q-integrada.png', [1086, 362])
  if (scene === 'favicon' || scene === 'apple-touch') return faviconScene()
  if (scene === 'symbol-light') return logoScene('/03-simbolo-medusa.png', [512, 512])
  if (scene === 'diorama' || scene === 'tijuana' || scene === 'bola' || scene.startsWith('icon-')) return void (await voxelScene())
  const hold = document.createElement('canvas')
  hold.style.cssText = 'position:fixed;left:-9999px'
  hold.width = W
  hold.height = H
  document.body.appendChild(hold)
  const f = new Field(hold, [], { scheme: 'deep', rays: !scene.startsWith('og'), snow: 70 })
  f.resize(W, H, 1)
  f.setJellies(scene.startsWith('og') ? og.map((j) => ({ ...j, r: j.r })) : heroLayout(W, H))
  await f.readTokens()
  for (let i = 0; i < 140; i++) f.update(3 + i / 30, 1 / 30)
  f.draw('pixel')

  const ctx = out.getContext('2d')!
  const cs = getComputedStyle(document.documentElement)
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, cs.getPropertyValue('--water-a').trim())
  g.addColorStop(1, cs.getPropertyValue('--water-b').trim())
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  ctx.drawImage(hold, 0, 0)

  if (scene.startsWith('og')) {
    await document.fonts.load('600 64px "Sora Variable"')
    const logo = new Image()
    logo.src = '/brand/logo-light.png'
    await logo.decode()
    ctx.drawImage(logo, 56, 40, 291, 97)
    ctx.fillStyle = cs.getPropertyValue('--deep-ink').trim()
    ctx.font = '600 72px "Sora Variable"'
    const lines = scene === 'og-en' ? ['Technology that', 'connects your business.'] : ['Tecnología que', 'conecta tu negocio.']
    ctx.fillText(lines[0], 64, 330)
    ctx.fillText(lines[1], 64, 416)
  }
  ;(window as unknown as { ready: boolean }).ready = true
}
void run()
