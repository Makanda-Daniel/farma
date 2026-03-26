
async function entrar() {
  const senha = document.getElementById('senha').value
  const erro = document.getElementById('erro')
  erro.style.display = 'none'

  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ senha })
  })

  if (!res.ok) {
    erro.style.display = 'block'
    return
  }

  const { token } = await res.json()
  localStorage.setItem('admin_token', token)
  window.location.href = 'dashboard.html'
}

document.getElementById('senha').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') entrar()
})
