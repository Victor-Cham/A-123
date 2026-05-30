// URL de tu Apps Script de login
const URL_LOGIN = "https://script.google.com/macros/s/AKfycbx3NAog0npp-x-qU5Igk7FSBFPKDgqm4-jSNEn5yhBpsqrOUNTmN0mTQh_6p0T3iyfBrw/exec";

// Capturar formulario de login
const form = document.getElementById("loginForm");
if (form) {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    handleLogin();
  });
}

// Función principal de login
async function handleLogin() {
  const usuario = getInputValue("usuario");
  const contrasena = getInputValue("contrasena");

  if (!usuario || !contrasena) {
    return showAlert("Ingrese usuario y contraseña");
  }

  try {
    const data = await sendLoginRequest(usuario, contrasena);

    if (data.success) {
      saveSession(data);
      // Redirige siempre a principal.html
      window.location.href = "principal.html";
    } else {
      showAlert(data.message || "Usuario o contraseña incorrectos");
    }
  } catch (err) {
    console.error("Login error:", err);
    showAlert("Error de conexión. Intente nuevamente.");
  }
}

// Obtener valor de input
function getInputValue(id) {
  const input = document.getElementById(id);
  return input ? input.value.trim() : "";
}

// Mostrar alerta
function showAlert(msg) {
  const alertDiv = document.getElementById("alert");
  if (!alertDiv) return;
  alertDiv.textContent = msg;
  alertDiv.style.display = "block";
}

// Enviar request al Apps Script
async function sendLoginRequest(usuario, contrasena) {
  const query = new URLSearchParams({ action: "login", usuario, contrasena });

  const res = await fetch(`${URL_LOGIN}?${query.toString()}`, {
    method: "GET",
    headers: { "Accept": "application/json" },
  });

  if (!res.ok) throw new Error(`HTTP error ${res.status}`);

  try {
    return await res.json();
  } catch {
    throw new Error("Respuesta no es JSON válido");
  }
}

// Guardar sesión en localStorage
function saveSession(data) {
  localStorage.setItem("sessionId", data.sessionId);
  localStorage.setItem("usuario", data.Usuario);
  localStorage.setItem("tipoUsuario", data.TipoUsuario);
}

// Validar sesión en cualquier página protegida
function validarSesion() {
  if (!localStorage.getItem("sessionId")) {
    window.location.href = "index.html";
  }
}

// Cerrar sesión
function logout() {
  localStorage.removeItem("sessionId");
  localStorage.removeItem("usuario");
  localStorage.removeItem("tipoUsuario");
  window.location.href = "index.html";
}
