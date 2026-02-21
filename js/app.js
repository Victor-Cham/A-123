/* ===============================
   CONFIG
=============================== */
const API_URL = "https://script.google.com/macros/s/AKfycbzyRca6zO-r9ruSoEFKrLK3fopszewST8lan6qZhJlQZH7DPj_80FhbCQRQbBQ-mj3G/exec";
const CLAVE_SEGURIDAD = "A123";

let personaActual = null;
let registrosPersonas = [];

/* ===============================
   NORMALIZAR TEXTO (SIN ACENTOS)
=============================== */
function normalizar(texto) {
  return (texto || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

/* ===============================
   CARGA DE REGISTROS DESDE API
=============================== */
async function cargarRegistros() {
  try {
    const res = await fetch(`${API_URL}?todos=true`);
    const data = await res.json();

    if (Array.isArray(data)) {
      registrosPersonas = data.map(p => ({
        ...p,
        DOCUMENTO: (p.DOCUMENTO || "").toString()
      }));
      localStorage.setItem("registrosPersonas", JSON.stringify(registrosPersonas));
    } else {
      registrosPersonas = [];
    }
  } catch (error) {
    registrosPersonas = [];
    console.error("Error al cargar registros:", error);
  }
}

/* ===============================
   BUSQUEDA INTELIGENTE
=============================== */
async function buscar() {

  const queryRaw = document.getElementById("dni").value.trim();
  const tbody = document.querySelector("#tablaResultado tbody");

  if (!queryRaw) return;

  tbody.innerHTML = `<tr><td colspan="5">Buscando...</td></tr>`;

  if (registrosPersonas.length === 0) {
    await cargarRegistros();
  }

  const query = normalizar(queryRaw);
  const esNumero = /^[0-9]+$/.test(query);

  let resultados = registrosPersonas.map(p => {

    let score = 0;

    const doc = normalizar(p.DOCUMENTO);
    const nombre = normalizar(p.NOMBRE);

    if (esNumero) {
      if (doc === query) score = 100;
      else if (doc.startsWith(query)) score = 80;
      else if (doc.includes(query)) score = 60;
    } else {
      if (nombre === query) score = 95;
      else if (nombre.startsWith(query)) score = 80;
      else if (nombre.includes(query)) score = 60;
    }

    return { ...p, score };
  })
  .filter(p => p.score > 0)
  .sort((a, b) => b.score - a.score);

  if (resultados.length === 0) {
    personaActual = null;
    tbody.innerHTML = `
      <tr>
        <td colspan="5">Sin coincidencias</td>
      </tr>
    `;
    return;
  }

  personaActual = resultados[0];

  tbody.innerHTML = resultados.slice(0, 5).map((persona, index) => `
    <tr>
      <td>${persona.NOMBRE}</td>
      <td>${persona.DOCUMENTO}</td>
      <td>${persona.EMPRESA}</td>
      <td>
        <span class="semaforo"
              style="background:${colorSemaforo(persona.CATEGORIA)}"
              onclick="seleccionarPersona(${index})">
        </span>
      </td>
      <td>${persona.CODIGO_UNICO}</td>
    </tr>
  `).join("");

  window.resultadosBusqueda = resultados;
}

/* ===============================
   SELECCIONAR PERSONA RESULTADO
=============================== */
function seleccionarPersona(index) {
  personaActual = window.resultadosBusqueda[index];
  abrirModalSeguridad();
}

/* ===============================
   SEMAFORO POR CATEGORIA
=============================== */
function colorSemaforo(categoria) {

  if (!categoria || categoria.trim() === "") {
    return "green";
  }

  const cat = normalizar(categoria);

  if (cat === "PENALES Y JUDICIALES") return "red";
  if (cat === "LABORALES") return "orange";

  return "green";
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
  if (!p) return;

  document.getElementById("detNombre").textContent = p.NOMBRE;
  document.getElementById("detDocumento").textContent = p.DOCUMENTO;
  document.getElementById("detEmpresa").textContent = p.EMPRESA;

  document.getElementById("detEstadoTexto").textContent =
    !p.CATEGORIA ? "SIN REGISTRO" : p.CATEGORIA;

  document.getElementById("detEstadoSemaforo").style.background =
    colorSemaforo(p.CATEGORIA);

  const cont = document.getElementById("detDescripcion");
  cont.innerHTML = `
    <div class="detalle-item-modal">
      <strong>Categoría:</strong> ${p.CATEGORIA || "-"}<br>
      <strong>Catálogo:</strong> ${p.CATALOGO || "-"}<br>
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
   GUARDAR PERSONA (SIN CORS)
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
    document.getElementById("mensajeErrorAgregar").textContent =
      "Todos los campos son obligatorios";
    return;
  }

  try {

    const params = new URLSearchParams();
    params.append("NOMBRE", nombre);
    params.append("DOCUMENTO", documento);
    params.append("EMPRESA", empresa);
    params.append("CATEGORIA", categoria);
    params.append("CATALOGO", catalogo);
    params.append("DESCRIPCION", descripcion);
    params.append("FECHA", fecha);
    params.append("usuarioregistra", "ADMIN");

    const res = await fetch(API_URL, {
      method: "POST",
      body: params
    });

    const data = await res.json();

    if (data.success) {
      alert("Persona agregada correctamente\nCódigo único: " + data.CODIGO_UNICO);
      cerrarModalAgregar();
      await cargarRegistros();
      document.getElementById("dni").value = documento;
      buscar();
    } else {
      document.getElementById("mensajeErrorAgregar").textContent =
        data.error || "Error al guardar";
    }

  } catch (error) {
    console.error(error);
    document.getElementById("mensajeErrorAgregar").textContent =
      "Error de conexión";
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
   INICIO
=============================== */
window.addEventListener("DOMContentLoaded", async () => {

  document.getElementById("btnBuscar").addEventListener("click", buscar);

  document.getElementById("dni").addEventListener("keydown", e => {
    if (e.key === "Enter") buscar();
  });

  document.getElementById("btnAgregar")?.addEventListener("click", abrirModalAgregar);
  document.getElementById("btnGuardarPersona")?.addEventListener("click", guardarPersona);

  await cargarRegistros();
});
