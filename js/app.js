/* ===============================
   CONFIG
=============================== */
const API_URL = "https://script.google.com/macros/s/TU_ID/exec"; // reemplazar con tu Apps Script
const CLAVE_SEGURIDAD = "A123";

let personaActual = null;
let registrosPersonas = [];

/* ===============================
   EVENTOS
=============================== */
// Buscar persona
document.getElementById("btnBuscar").addEventListener("click", buscar);
document.getElementById("dni").addEventListener("keydown", e => {
  if (e.key === "Enter") buscar();
});

// Modal agregar persona
document.getElementById("btnAgregar")?.addEventListener("click", abrirModalAgregar);
document.getElementById("btnGuardarPersona")?.addEventListener("click", guardarPersona);
document.getElementById("btnCancelarPersona")?.addEventListener("click", cerrarModalAgregar);

/* ===============================
   CARGA INICIAL DE REGISTROS
=============================== */
async function cargarRegistros() {
  try {
    let registros = localStorage.getItem("registrosPersonas");
    if (registros) {
      registrosPersonas = JSON.parse(registros);
      return;
    }

    const res = await fetch(`${API_URL}?todos=true`);
    const data = await res.json();

    if (Array.isArray(data)) {
      registrosPersonas = data;
      localStorage.setItem("registrosPersonas", JSON.stringify(registrosPersonas));
    } else {
      console.error("Error al cargar registros:", data.error);
    }
  } catch (error) {
    console.error("Error de conexión al cargar registros", error);
  }
}

/* ===============================
   BUSCAR PERSONA (LOCAL)
=============================== */
async function buscar() {
  const documento = document.getElementById("dni").value.trim();
  const tbody = document.querySelector("#tablaResultado tbody");

  if (!documento) return;

  tbody.innerHTML = `<tr><td colspan="5">Buscando...</td></tr>`;

  if (registrosPersonas.length === 0) {
    await cargarRegistros(); // carga inicial si aún no hay registros
  }

  const persona = registrosPersonas.find(p => p.DOCUMENTO === documento);

  if (!persona) {
    personaActual = null;
    tbody.innerHTML = `<tr><td colspan="5">Persona no encontrada</td></tr>`;
    return;
  }

  personaActual = persona;

  tbody.innerHTML = `
    <tr>
      <td>${persona.NOMBRE}</td>
      <td>${persona.DOCUMENTO}</td>
      <td>${persona.EMPRESA}</td>
      <td>${persona.CODIGO_UNICO}</td>
      <td>
        <span class="semaforo"
              title="Ver detalle"
              style="background:${colorSemaforo("VERDE")}" 
              onclick="abrirModalSeguridad()">
        </span>
      </td>
    </tr>
  `;
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

  document.getElementById("detEstadoTexto").textContent = "VERDE";
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
  document.getElementById("agregarDescripcion").value = "";
  document.getElementById("agregarFecha").value = "";
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
        NOMBRE: nombre,
        DOCUMENTO: documento,
        EMPRESA: empresa,
        CATEGORIA: categoria,
        CATALOGO: catalogo,
        DESCRIPCION: descripcion,
        FECHA: fecha,
        usuarioregistra: "ADMIN"
      })
    });

    const data = await res.json();

    if (data.success) {
      alert("Persona agregada correctamente\nCódigo único: " + data.CODIGO_UNICO);
      cerrarModalAgregar();

      // Actualizar localStorage
      const nuevoRegistro = {
        NOMBRE: nombre,
        DOCUMENTO: documento,
        EMPRESA: empresa,
        CATEGORIA: categoria,
        CATALOGO: catalogo,
        DESCRIPCION: descripcion,
        FECHA: fecha,
        CODIGO_UNICO: data.CODIGO_UNICO
      };
      registrosPersonas.push(nuevoRegistro);
      localStorage.setItem("registrosPersonas", JSON.stringify(registrosPersonas));

      buscar(); // refresca la tabla
    } else {
      document.getElementById("mensajeErrorAgregar").textContent = data.error || "Error al guardar";
    }
  } catch (error) {
    document.getElementById("mensajeErrorAgregar").textContent = "Error de conexión";
  }
}

/* ===============================
   UTILIDADES
=============================== */
function formatearFecha(fecha) {
  if (!fecha) return "";
  const f = new Date(fecha);
  return f.toLocaleDateString("es-PE");
}

/* ===============================
   CARGAR REGISTROS AL INICIAR
=============================== */
window.addEventListener("DOMContentLoaded", cargarRegistros);
