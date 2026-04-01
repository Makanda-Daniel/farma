const marcadores = []
let farmaciaAtual = null
const carousels = {}
let marcadorUser = null
let posicaoUser = null
let rotaAtual = null

// ── Mapa ─────────────────────────────────────────────────
const map = L.map('map').setView([-8.8383, 13.2344], 13)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: 'OpenStreetMap'
}).addTo(map)

// ícone personalizado para o utilizador
const iconeUser = L.divIcon({
  html: '<div style="background:#2ecc71;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 0 6px rgba(0,0,0,0.4)"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  className: ''
})

// ── Marcadores ───────────────────────────────────────────
function limparMarcadores() {
  marcadores.forEach(m => map.removeLayer(m))
  marcadores.length = 0
  Object.values(carousels).forEach(c => clearInterval(c))
  Object.keys(carousels).forEach(k => delete carousels[k])
  limparRota()
}

function adicionarMarcador(farmacia) {
  const m = L.marker([farmacia.latitude, farmacia.longitude])
    .addTo(map)
    .bindPopup(`<b>${farmacia.nome}</b><br>${farmacia.endereco || ''}`)
  marcadores.push(m)
  return m
}

function colocarMarcadorUser(lat, lng) {
  if (marcadorUser) map.removeLayer(marcadorUser)
  marcadorUser = L.marker([lat, lng], { icon: iconeUser })
    .addTo(map)
    .bindPopup('<b>A sua localização</b>')
    .openPopup()
}

// ── Rota ─────────────────────────────────────────────────
function limparRota() {
  if (rotaAtual) {
    map.removeControl(rotaAtual)
    rotaAtual = null
  }
}

function tracarRota() {
  if (!farmaciaAtual) return
  if (!posicaoUser) {
    navigator.geolocation.getCurrentPosition(
      pos => {
        posicaoUser = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        colocarMarcadorUser(posicaoUser.lat, posicaoUser.lng)
        desenharRota(posicaoUser.lat, posicaoUser.lng, farmaciaAtual.latitude, farmaciaAtual.longitude)
        fecharModal()
      },
      () => alert('Activa a localização para traçar a rota.')
    )
    return
  }
  desenharRota(posicaoUser.lat, posicaoUser.lng, farmaciaAtual.latitude, farmaciaAtual.longitude)
  fecharModal()
}

function desenharRota(latO, lngO, latD, lngD) {
  limparRota()
  rotaAtual = L.Routing.control({
    waypoints: [
      L.latLng(latO, lngO),
      L.latLng(latD, lngD)
    ],
    routeWhileDragging: false,
    addWaypoints: false,
    draggableWaypoints: false,
    fitSelectedRoutes: true,
    show: window.innerWidth >= 768,
    collapsible: true,
    lineOptions: {
      styles: [{ color: '#27ae60', weight: 5, opacity: 0.8 }]
    },
    createMarker: (i, wp) => {
      const label = i === 0 ? '<b>A sua localização</b>' : `<b>${farmaciaAtual.nome}</b>`
      return L.marker(wp.latLng).bindPopup(label)
    }
  }).addTo(map)

  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// ── Carousel ─────────────────────────────────────────────
function criarCarousel(fotos, index) {
  if (!fotos || !fotos.length) {
    return `<p class="ft" style="background-image:url('img/${(index % 3) + 1}.jpeg');background-position:center;background-size:cover;height:200px"></p>`
  }
  const id = `carousel-${Date.now()}-${index}`
  const imgs = fotos.map((url, i) =>
    `<img src="${url}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:${i === 0 ? 1 : 0};transition:opacity 0.8s ease">`
  ).join('')
  setTimeout(() => iniciarCarousel(id, fotos.length), 100)
  return `<div id="${id}" style="position:relative;height:200px;overflow:hidden">${imgs}</div>`
}

function iniciarCarousel(id, total) {
  if (total <= 1) return
  let atual = 0
  carousels[id] = setInterval(() => {
    const el = document.getElementById(id)
    if (!el) { clearInterval(carousels[id]); return }
    const imgs = el.querySelectorAll('img')
    imgs[atual].style.opacity = 0
    atual = (atual + 1) % total
    imgs[atual].style.opacity = 1
  }, 3000)
}

// ── Carregar farmácias ────────────────────────────────────
async function carregarFarmacias() {
  try {
    const res = await fetch(`${API}/farmacias`)
    if (!res.ok) throw new Error()
    const farmacias = await res.json()
    limparMarcadores()
    renderizarCards(farmacias)
    farmacias.forEach(adicionarMarcador)
  } catch (e) {
    document.getElementById('lista-farmacias').innerHTML =
      '<p style="color:#e74c3c;text-align:center;padding:20px">Erro ao carregar farmácias. Verifica a ligação.</p>'
  }
}

// ── Buscar próximas ───────────────────────────────────────
async function buscarProximas(lat, lng) {
  try {
    posicaoUser = { lat, lng }
    colocarMarcadorUser(lat, lng)

    const res = await fetch(`${API}/farmacias/proximas?lat=${lat}&lng=${lng}`)
    if (!res.ok) throw new Error()
    const farmacias = await res.json()

    limparMarcadores()
    // recoloca o marcador do user depois de limpar
    colocarMarcadorUser(lat, lng)

    renderizarCards(farmacias)
    farmacias.forEach(adicionarMarcador)
    map.setView([lat, lng], 14)

    if (!farmacias.length) {
      document.getElementById('lista-farmacias').innerHTML =
        '<p style="color:#2c3e50;text-align:center;padding:20px">Nenhuma farmácia encontrada na sua área.</p>'
    }
  } catch (e) {
    alert('Erro ao buscar farmácias próximas.')
  }
}

// ── Buscar por medicamento ────────────────────────────────
async function buscarPorMedicamento(nome) {
  document.getElementById('lista-farmacias').innerHTML =
    '<p style="color:#2c3e50;text-align:center;padding:20px">A pesquisar...</p>'
  try {
    const res = await fetch(`${API}/medicamentos/buscar/${encodeURIComponent(nome)}`)
    if (!res.ok) throw new Error()
    const resultados = await res.json()

    const mapaFarmacias = {}
    resultados.forEach(r => {
      if (r.farmacias && r.quantidade > 0) {
        mapaFarmacias[r.farmacias.id] = r.farmacias
      }
    })
    const farmacias = Object.values(mapaFarmacias)

    limparMarcadores()
    if (posicaoUser) colocarMarcadorUser(posicaoUser.lat, posicaoUser.lng)
    renderizarCards(farmacias)
    farmacias.forEach(adicionarMarcador)
    if (farmacias.length && farmacias[0].latitude) {
      map.setView([farmacias[0].latitude, farmacias[0].longitude], 13)
    }
  } catch (e) {
    document.getElementById('lista-farmacias').innerHTML =
      '<p style="color:#e74c3c;text-align:center;padding:20px">Erro ao pesquisar medicamento.</p>'
  }
}

// ── Renderizar cards ──────────────────────────────────────
function renderizarCards(farmacias) {
  const article = document.getElementById('lista-farmacias')
  article.innerHTML = ''

  if (!farmacias.length) {
    article.innerHTML = '<p style="color:#2c3e50;text-align:center;padding:20px">Nenhuma farmácia encontrada.</p>'
    return
  }

  farmacias.forEach((f, i) => {
    const div = document.createElement('div')
    div.className = 'farma'
    div.setAttribute('data-aos', 'fade-up')
    div.innerHTML = `
      ${criarCarousel(f.fotos, i)}
      <p class="txt" style="padding:10px">
        <span>${f.nome}</span><br>
        <small>${f.endereco || ''}</small><br>
        <input type="button" value="Ver Mais" onclick="verMais(${f.id})">
      </p>`
    article.appendChild(div)
  })

  AOS.refresh()
}

// ── Ver detalhes ──────────────────────────────────────────
function verMais(id) {
  fetch(`${API}/farmacias/${id}`)
    .then(r => r.json())
    .then(f => {
      farmaciaAtual = f
      document.getElementById('modal-nome').textContent = f.nome
      document.getElementById('modal-endereco').textContent = f.endereco ? 'Endereço: ' + f.endereco : ''
      document.getElementById('modal-telefone').textContent = f.telefone ? 'Telefone: ' + f.telefone : ''
      document.getElementById('modal-coords').textContent = `Lat: ${f.latitude} | Lng: ${f.longitude}`
      document.getElementById('modal-farmacia').classList.add('aberto')

      fetch(`${API}/medicamentos/farmacia/${id}`)
        .then(r => r.json())
        .then(meds => {
          const lista = document.getElementById('modal-medicamentos')
          lista.innerHTML = meds.length
            ? meds.map(m => `<li><b>${m.nome}</b> — ${m.quantidade} un.${m.descricao ? ' · ' + m.descricao : ''}</li>`).join('')
            : '<li>Nenhum medicamento cadastrado</li>'
        })
    })
}

function fecharModal() {
  document.getElementById('modal-farmacia').classList.remove('aberto')
}

function irParaMapa() {
  if (!farmaciaAtual) return
  fecharModal()
  map.setView([farmaciaAtual.latitude, farmaciaAtual.longitude], 16)
  const marcador = marcadores.find(m => {
    const ll = m.getLatLng()
    return ll.lat === farmaciaAtual.latitude && ll.lng === farmaciaAtual.longitude
  })
  if (marcador) marcador.openPopup()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// ── Geolocalização ────────────────────────────────────────
document.getElementById('ver').addEventListener('click', () => {
  if (posicaoUser) return buscarProximas(posicaoUser.lat, posicaoUser.lng)
  if (!navigator.geolocation) return alert('O teu browser não suporta geolocalização.')
  navigator.geolocation.getCurrentPosition(
    pos => buscarProximas(pos.coords.latitude, pos.coords.longitude),
    err => {
      if (err.code === 1) alert('Permissão de localização negada. Activa nas definições do browser.')
      else alert('Não foi possível obter a tua localização.')
    },
    { timeout: 10000, enableHighAccuracy: true }
  )
})

// ── Init ──────────────────────────────────────────────────
const params = new URLSearchParams(window.location.search)
const medicamento = params.get('medicamento')

if (medicamento) {
  buscarPorMedicamento(medicamento)
} else {
  carregarFarmacias()
  // rastreia localização em tempo real
  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords
        const primeiraVez = !posicaoUser
        posicaoUser = { lat, lng }
        colocarMarcadorUser(lat, lng)
        if (primeiraVez) map.setView([lat, lng], 14)
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    )
  }
}
