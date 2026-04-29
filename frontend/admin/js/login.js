async function entrar() {
  const email = document.getElementById('email').value
  const senha = document.getElementById('senha').value
  const erro = document.getElementById('erro')
  erro.style.display = 'none'

  const { error } = await db.auth.signInWithPassword({ email, password: senha })

  if (error) {
    erro.style.display = 'block'
    return
  }

  window.location.href = 'dashboard.html'
}

document.getElementById('senha').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') entrar()
})
