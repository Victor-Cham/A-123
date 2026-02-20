/* ===============================
   CONFIG
=============================== */
const API_URL = "https://script.google.com/macros/s/AKfycbz6ZaAYkyXMQg7-SRcSQ9rkCvSB1VgmdCkcUoZsbrBcLELgKp_EN5a9bC7W-pu6RY6B/exec";
const CLAVE_SEGURIDAD = "A123";

let personaActual = null;

/* ===============================
   EVENTOS
=============================== */
// Buscar persona
document.getElementById("btnBuscar").addEventListener("click", buscar);
document.getElementById("dni").addEventListener("keydown", e => {
  if (e.key === "Enter") buscar();
});

// Botón agregar persona
document.getElementById("btnAgregar")?.addEventListener("click", abrirModalAgregar);

// Modal de registro
document.getElementById("btnGuardarPersona")?.addEventListener("click", guardarPersona);
document.getElementById("btnCancelarPersona")?.addEventListener("click", cerrarModalAgregar);

// Al cambiar categoría, cargar catálogo (usando categorias.js)
document.getElementById("agregarCategoria")?.addEventListener("change", function() {
  cargarCatalogoLocal(this.value);
});

/* ===============================
   FUNCIONES CATEGORÍAS/CATÁLOGOS
=============================== */
function cargarCatalogoLocal(categoriaId) {
  const catalogoSelect = document.getElementById("agregarCatalogo");
  catalogoSelect.disabled = true;

  if (!categoriaId) {
    catalogoSelect.innerHTML = '<option value="">--Seleccione categoría primero--</option>';
    return;
  }

  const categoria = categorias.find(c => c.id == categoriaId); // categorias viene de categorias.js
  if (!categoria) return;

  const valorAnterior = catalogoSelect.value; // mantener selección

  catalogoSelect.innerHTML = '<option value="">--Seleccione--</option>';
  categoria.catalogos.forEach(item => {
    const opt = document.createElement("option");
    opt.value = item;
    opt.textContent = item;
    if (item === valorAnterior) opt.selected = true; // restaurar selección
    catalogoSelect.appendChild(opt);
  });

  catalogoSelect.disabled = false;
}

/* ===============================
   BUSCAR PERSONA (API)
=============================== */
async function buscar() {
  const documento = document.getElementById("dni").value.trim();
  const tbody = document.querySelector("#tablaResultado tbody");

  if (!documento) return;

  tbody.innerHTML = `<tr><td colspan="4">Buscando...</td></tr>`;

  try {
    const res = await fetch(`${API_URL}?documento=${encodeURIComponent(documento)}`);
    const data = await res.json();

    if (!data.encontrado) {
      personaActual = null;
      tbody.innerHTML = `<tr><td colspan="4">Persona no encontrada</td></tr>`;
      return;
    }

    personaActual = data;

    tbody.innerHTML = `
      <tr>
        <td>${data.persona.nombre}</td>
        <td>${data.persona.documento}</td>
        <td>${data.persona.empresa}</td>
        <td>
          <span class="semaforo"
                title="Ver detalle"
                style="background:${colorSemaforo(data.estado)}"
                onclick="abrirModalSeguridad()">
          </span>
        </td>
      </tr>
    `;

  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="4">Error de conexión</td></tr>`;
  }
}

/* ===============================
   SEMÁFORO
=============================== */
function colorSemaforo(estado) {
  return estado === "ROJO" ? "red" :
         estado === "AMARILLO" ? "orange" :
         "green";
}

/* ===============================
   MODAL SEGURIDAD
=============================== */
function abrirModalSeguridad() {
  if (!personaActual) return;
  document.getElementById("codigoAcceso").value = "";
  document.getElementById("mensajeError").textContent = "";
  document.getElementById("modal").style.display = "flex";
}

function validarCodigo() {
  const codigo = document.getElementById("codigoAcceso").value;

  if (codigo === CLAVE_SEGURIDAD) {
    cerrarModalSeguridad();
    mostrarDetalle();
  } else {
    document.getElementById("mensajeError").textContent = "Código incorrecto";
  }
}

function cerrarModalSeguridad() {
  document.getElementById("modal").style.display = "none";
}

/* ===============================
   MODAL DETALLE
=============================== */
function mostrarDetalle() {
  const p = personaActual.persona;

  document.getElementById("detNombre").textContent = p.nombre;
  document.getElementById("detDocumento").textContent = p.documento;
  document.getElementById("detEmpresa").textContent = p.empresa;

  let nivelMax = 0;
  let descripcionMax = "VERDE";

  if (personaActual.detalles && personaActual.detalles.length > 0) {
    personaActual.detalles.forEach(det => {
      if (det.nivel > nivelMax) {
        nivelMax = det.nivel;
        descripcionMax = det.tipo_descripcion;
      }
    });
  }

  document.getElementById("detEstadoTexto").textContent = descripcionMax;
  document.getElementById("detEstadoSemaforo").style.background =
    nivelMax === 2 ? "red" :
    nivelMax === 1 ? "orange" :
    "green";

  const cont = document.getElementById("detDescripcion");

  if (!personaActual.detalles || personaActual.detalles.length === 0) {
    cont.textContent = "Sin registros.";
  } else {
    cont.innerHTML = personaActual.detalles
      .map(d => `
        <div class="detalle-item-modal">
          <strong>${d.tipo_descripcion} (${d.tipo_codigo})</strong><br>
          Categoria: <em>${d.categoria || "N/A"}</em><br>
          Catálogo: <em>${d.catalogo || "N/A"}</em><br>
          Detalle: ${d.descripcion || "-"}<br>
          Fecha: ${formatearFecha(d.fecha)}
        </div>
        <hr>
      `)
      .join("");
  }

  document.getElementById("modalDetalle").style.display = "flex";
}

function cerrarModalDetalle() {
  document.getElementById("modalDetalle").style.display = "none";
}

/* ===============================
   MODAL AGREGAR PERSONA
=============================== */
function abrirModalAgregar() {
  document.getElementById("modalAgregar").style.display = "flex";
  document.getElementById("nuevoNombre").value = "";
  document.getElementById("nuevoDocumento").value = "";
  document.getElementById("nuevaEmpresa").value = "";
  document.getElementById("mensajeErrorAgregar").textContent = "";

  // Cargar categorías locales
  const catSelect = document.getElementById("agregarCategoria");
  catSelect.innerHTML = '<option value="">--Seleccione--</option>';
  categorias.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.nombre;
    catSelect.appendChild(opt);
  });

  // Reset catálogo
  const catalogoSelect = document.getElementById("agregarCatalogo");
  catalogoSelect.innerHTML = '<option value="">--Seleccione categoría primero--</option>';
  catalogoSelect.disabled = true;
}

function cerrarModalAgregar() {
  document.getElementById("modalAgregar").style.display = "none";
}

/* ===============================
   GUARDAR PERSONA (POST JSON)
=============================== */
async function guardarPersona() {
  const nombre = document.getElementById("nuevoNombre").value.trim();
  const documento = document.getElementById("nuevoDocumento").value.trim();
  const empresa = document.getElementById("nuevaEmpresa").value.trim();
  const categoria = document.getElementById("agregarCategoria").value;
  const catalogo = document.getElementById("agregarCatalogo").value;

  if (!nombre || !documento || !empresa || !categoria || !catalogo) {
    document.getElementById("mensajeErrorAgregar").textContent = "Todos los campos son obligatorios";
    return;
  }

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accion: "agregar",
        nombre,
        documento,
        empresa,
        categoria,
        catalogo
      })
    });

    const data = await res.json();

    if (data.exito) {
      alert("Persona agregada correctamente");
      cerrarModalAgregar();
      buscar();
    } else {
      document.getElementById("mensajeErrorAgregar").textContent = data.mensaje || "Error al guardar";
    }
  } catch (error) {
    document.getElementById("mensajeErrorAgregar").textContent = "Error de conexión";
  }
}

/* ===============================
   UTIL
=============================== */
function formatearFecha(fecha) {
  if (!fecha) return "";
  const f = new Date(fecha);
  return f.toLocaleDateString("es-PE");
}
