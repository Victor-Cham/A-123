/* ===============================
   CONFIG
=============================== */
const API_URL = "https://script.google.com/macros/s/AKfycbzZS0L0MIQRYTcmOw1BjUvqSfFNAJakrICTOgifAO37eQa9VZ-wOM1Ow-PR-xFut9eD/exec";
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
    tbody.innerHTML = `<tr><td colspan="5">Sin coincidencias</td></tr>`;
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
      <td>${persona.CODIGO_UNICO || "-"}</td>
    </tr>
  `).join("");

  window.resultadosBusqueda = resultados;
}

/* ===============================
   SELECCIONAR PERSONA
=============================== */
function seleccionarPersona(index) {
  personaActual = window.resultadosBusqueda[index];
  abrirModalSeguridad();
}

/* ===============================
   SEMAFORO
=============================== */
function colorSemaforo(categoria) {

  if (!categoria || categoria.trim() === "") return "green";

  const cat = normalizar(categoria);

  if (cat === "PENALES Y JUDICIALES") return "red";
  if (cat === "LABORALES") return "orange";

  return "green";
}

/* ===============================
   GUARDAR PERSONA (FIX CORS)
=============================== */
async function guardarPersona() {
  const nombre = document.getElementById("nuevoNombre").value.trim();
  const documento = document.getElementById("nuevoDocumento").value.trim();
  const empresa = document.getElementById("nuevaEmpresa").value.trim();
  const categoria = document.getElementById("agregarCategoria").value;
  const catalogo = document.getElementById("agregarCatalogo").value;
  const descripcion = document.getElementById("agregarDescripcion").value.trim();
  const fecha = document.getElementById("agregarFecha").value;
  const archivoInput = document.getElementById("agregarArchivo");

  if (!nombre || !documento || !empresa || !categoria || !catalogo || !descripcion || !fecha) {
    document.getElementById("mensajeErrorAgregar").textContent =
      "Todos los campos son obligatorios";
    return;
  }

  try {
    const formData = new FormData();
    formData.append("NOMBRE", nombre);
    formData.append("DOCUMENTO", documento);
    formData.append("EMPRESA", empresa);
    formData.append("CATEGORIA", categoria);
    formData.append("CATALOGO", catalogo);
    formData.append("DESCRIPCION", descripcion);
    formData.append("FECHA", fecha);
    formData.append("usuarioregistra", "ADMIN");

    if (archivoInput.files.length > 0) {
      const file = archivoInput.files[0];
      const base64 = await convertirABase64(file);
      formData.append("ARCHIVO_BASE64", base64);
      formData.append("ARCHIVO_NOMBRE", file.name);
      formData.append("ARCHIVO_TIPO", file.type);
    }

    // 1️⃣ Insert (no-cors)
    await fetch(API_URL, {
      method: "POST",
      mode: "no-cors",
      body: formData
    });

    // 2️⃣ Esperar guardado
    await new Promise(resolve => setTimeout(resolve, 800));

    // 3️⃣ Recuperar CODIGO_UNICO
    const res = await fetch(`${API_URL}?documento=${encodeURIComponent(documento)}`);
    const data = await res.json();

    if (data.encontrado && data.persona) {
      alert("Persona agregada correctamente\n\nCódigo único: " + (data.persona.CODIGO_UNICO || "-"));
      cerrarModalAgregar();
      await cargarRegistros();
      document.getElementById("dni").value = documento;
      buscar();
    } else {
      alert("Registro guardado, pero no se pudo recuperar el código único.");
    }

  } catch (error) {
    console.error(error);
    document.getElementById("mensajeErrorAgregar").textContent =
      "Error de conexión";
  }
}

function convertirABase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = error => reject(error);
  });
}

/* ===============================
   INICIO
=============================== */
window.addEventListener("DOMContentLoaded", async () => {

  document.getElementById("btnBuscar").addEventListener("click", buscar);
  document.getElementById("dni").addEventListener("keydown", e => {
    if (e.key === "Enter") buscar();
  });

  document.getElementById("btnGuardarPersona")?.addEventListener("click", guardarPersona);

  await cargarRegistros();
});
