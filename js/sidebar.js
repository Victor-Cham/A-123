// ===============================
// SIDEBAR DINÁMICO
// ===============================

const sidebar = document.getElementById('sidebar');
const toggleBtn = document.getElementById('toggleBtn');

// Alternar clase "expanded" al hacer clic en el botón
toggleBtn.addEventListener('click', () => {
  sidebar.classList.toggle('expanded');
});

// Ajustar header y content al toggle
const header = document.querySelector('header');
const content = document.querySelector('.content');

function ajustarLayout() {
  if (sidebar.classList.contains('expanded')) {
    header.style.left = '240px';
    header.style.width = 'calc(100% - 240px)';
    content.style.marginLeft = '240px';
  } else {
    header.style.left = '60px';
    header.style.width = 'calc(100% - 60px)';
    content.style.marginLeft = '60px';
  }
}

// Ejecutar ajuste cada vez que cambia la clase
toggleBtn.addEventListener('click', ajustarLayout);

// Inicializar layout correcto al cargar la página
window.addEventListener('load', ajustarLayout);

// ===============================
// FUNCION SALIR (puedes reemplazar)
// ===============================
function salir() {
  alert("Cerrar sesión");
  // Por ejemplo, redirigir al login:
  window.location.href = "index.html";
}
