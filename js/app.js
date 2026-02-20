/* ===============================
   CONFIG
=============================== */
const API_URL = "https://script.google.com/macros/s/AKfycbyT_oMlthq9uMtnrQZYO9QknhJFumKIOcrblki8IuRaqw7zSfy13c_2DjZV2sPbWu8/exec"; // reemplazar con tu nuevo Google Sheet Apps Script
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

/* ===============================
   BUSCAR PERSONA (API)
=============================== */
async function buscar() {
  const documento = document.getElementById("dni").value.trim();
  const tbody = document.querySelector("#tablaResultado tbody");

  if (!documento) return;

  tbody.innerHTML = `<tr><td colspan="5">Buscando...</td></tr>`; // ahora 5 columnas

  try {
    const res = await fetch(`${API_URL}?documento=${encodeURIComponent(documento)}`);
    const data = await res.json();

    if (!data.encontrado) {
      personaActual = null;
      tbody.innerHTML = `<tr><td colspan="5">Persona no encontrada</td></tr>`;
      return;
    }

    personaActual = data.persona;

    tbody.innerHTML = `
      <tr>
        <td>${data.persona.NOMBRE}</td>
        <td>${data.persona.DOCUMENTO}</td>
        <td>${data.persona.EMPRESA}</td>
        <td>${data.persona.CODIGO_UNICO}</td>
        <td>
          <span class="semaforo"
                title="Ver detalle"
                style="background:${colorSemaforo("VERDE")}" 
                onclick="abrirModalSeguridad()">
          </span>
        </td>
      </tr>
    `;

  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="5">Error de conexión</td></tr>`;
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
  const p = personaActual;

  document.getElementById("detNombre").textContent = p.NOMBRE;
  document.getElementById("detDocumento").textContent = p.DOCUMENTO;
  document.getElementById("detEmpresa").textContent = p.EMPRESA;

  document.getElementById("detEstadoTexto").textContent = "VERDE"; // por ahora fijo
  document.getElementById("detEstadoSemaforo").style.background = "green";

  const cont = document.getElementById("detDescripcion");
  cont.innerHTML = `
    <div class="detalle-item-modal">
      <strong>Categoría:</strong> ${p.CATEGORIA}<br>
      <strong>Catálogo:</strong> ${p.CATALOGO}<br>
      <strong>Detalle:</strong> ${p.DESCRIPCION || "-"}<br>
      <strong>Fecha:</strong> ${formatearFecha(p.FECHA)}<br>
      <strong>Archivo:</strong> ${p.ARCHIVO ? `<a href="${p.ARCHIVO}" target="_blank">Ver</a>` : "-"}
    </div>
  `;

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
  document.getElementById("agregarCategoria").value = "";
  document.getElementById("agregarCatalogo").innerHTML = '<option value="">--Seleccione categoría primero--</option>';
  document.getElementById("mensajeErrorAgregar").textContent = "";
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
  const descripcion = document.getElementById("agregarDescripcion").value.trim();
  const fecha = document.getElementById("agregarFecha").value;

  if (!nombre || !documento || !empresa || !categoria || !catalogo || !descripcion || !fecha) {
    document.getElementById("mensajeErrorAgregar").textContent = "Todos los campos son obligatorios";
    return;
  }

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accion: "agregar",
        NOMBRE: nombre,
        DOCUMENTO: documento,
        EMPRESA: empresa,
        CATEGORIA: categoria,
        CATALOGO: catalogo,
        DESCRIPCION: descripcion,
        FECHA: fecha
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
