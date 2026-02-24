/* ===============================
   CONFIG
============================== */
const API_URL = "https://script.google.com/macros/s/AKfycbyCF3QslyjMBHJOvVB9Y2JQ59nyQTHIJN6CLL-MeJqnkkBMFz4BY1NSLCsSM0xSgS3s/exec";
const CLAVE_SEGURIDAD = "A123";

let personaActual = null;
let registrosPersonas = [];

/* ===============================
   NORMALIZAR TEXTO (SIN ACENTOS)
============================== */
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
============================== */
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
============================== */
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

  // 1️⃣ Filtrar coincidencias
  const coincidencias = registrosPersonas.filter(p => {
    const doc = normalizar(p.DOCUMENTO);
    const nombre = normalizar(p.NOMBRE);

    if (esNumero) return doc.includes(query);
    return nombre.includes(query);
  });

  if (coincidencias.length === 0) {
    personaActual = null;
    tbody.innerHTML = `<tr><td colspan="5">Sin coincidencias</td></tr>`;
    return;
  }

  // 2️⃣ Agrupar por DNI
  const agrupados = {};

  coincidencias.forEach(p => {
    if (!agrupados[p.DOCUMENTO]) {
      agrupados[p.DOCUMENTO] = [];
    }
    agrupados[p.DOCUMENTO].push(p);
  });

  const resultadosAgrupados = Object.values(agrupados);

  // 3️⃣ Render tabla agrupada
  // 3️⃣ Render tabla agrupada
tbody.innerHTML = resultadosAgrupados.map((grupo, index) => {

  const persona = grupo[0];
  const { color, codigo } = colorSemaforoPorRegistros(grupo);

  return `
    <tr>
      <td>${persona.NOMBRE}</td>
      <td>${persona.DOCUMENTO}</td>
      <td>${persona.EMPRESA}</td>
      <td>
        <span class="semaforo"
              style="background:${color}"
              onclick="seleccionarGrupo(${index})">
        </span>
      </td>
      <td>${codigo}</td>
    </tr>
  `;
}).join("");

   

  window.gruposBusqueda = resultadosAgrupados;
}

/* ===============================
   SELECCIONAR PERSONA RESULTADO
============================== */
function seleccionarGrupo(index) {
  personaActual = window.gruposBusqueda[index];
  abrirModalSeguridad();
}

/* ===============================
   SEMAFORO POR CATEGORIA
============================== */
function colorSemaforoPorRegistros(registros) {
  if (!registros || registros.length === 0) return { color: "green", nivel: 3, codigo: "-" };

  let tienePenal = false;
  let tieneLaboral = false;
  let codigoPenal = null;
  let codigoLaboral = null;

  registros.forEach(r => {
    const cat = normalizar(r.CATEGORIA);
    const codigo = r.CODIGO_UNICO || "-";

    if (cat.includes("PENAL") || cat.includes("JUDICIAL")) {
      tienePenal = true;
      if (!codigoPenal) codigoPenal = codigo;
    }

    if (cat.includes("LABORAL")) {
      tieneLaboral = true;
      if (!codigoLaboral) codigoLaboral = codigo;
    }
  });

  if (tienePenal) return { color: "red", nivel: 1, codigo: codigoPenal };
  if (tieneLaboral) return { color: "orange", nivel: 2, codigo: codigoLaboral };

  return { color: "green", nivel: 3, codigo: registros[0].CODIGO_UNICO || "-" };
}

/* ===============================
   MODAL SEGURIDAD
============================== */
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
   CERRAR MODAL DETALLE
============================== */
function cerrarModalDetalle() {
  const modal = document.getElementById("modalDetalle");
  if (!modal) return;
  modal.style.display = "none";
}

/* ===============================
   MODAL DETALLE
============================== */
function mostrarDetalle() {
  const registros = personaActual;
  if (!registros || registros.length === 0) return;

  const base = registros[0];

  document.getElementById("detNombre").textContent = base.NOMBRE;
  document.getElementById("detDocumento").textContent = base.DOCUMENTO;
  document.getElementById("detEmpresa").textContent = base.EMPRESA;

const { color, nivel, codigo } = colorSemaforoPorRegistros(registros);

document.getElementById("detEstadoSemaforo").style.background = color;
document.getElementById("detEstadoTexto").textContent =
  registros.length + " antecedente(s) encontrado(s)";

//document.getElementById("detCodigoUnico").textContent = codigo; // opcional, si quieres mostrar aparte

  const cont = document.getElementById("detDescripcion");

  cont.innerHTML = registros
    .sort((a, b) => new Date(b.FECHA) - new Date(a.FECHA))
    .map(p => `
      <div class="detalle-item-modal"
           style="margin-bottom:15px;padding:10px;border-bottom:1px solid #ddd;">
        <strong>Categoría:</strong> ${p.CATEGORIA || "-"}<br>
        <strong>Catálogo:</strong> ${p.CATALOGO || "-"}<br>
        <strong>Detalle:</strong> ${p.DESCRIPCION || "-"}<br>
        <strong>Fecha:</strong> ${formatearFecha(p.FECHA)}<br>
        <strong>Código:</strong> ${p.CODIGO_UNICO || "-"}<br>
        <strong>Archivo:</strong> ${p.ARCHIVO ? `<a href="${p.ARCHIVO}" target="_blank">Ver archivo</a>` : "-"}
      </div>
    `).join("");

  document.getElementById("modalDetalle").style.display = "flex";
}

/* ===============================
   MODAL AGREGAR PERSONA
============================== */
function abrirModalAgregar() {
  const modal = document.getElementById("modalAgregar");
  if (!modal) return;

  modal.style.display = "flex";

  // Reset campos
  document.getElementById("nuevoNombre").value = "";
  document.getElementById("nuevoDocumento").value = "";
  document.getElementById("nuevaEmpresa").value = "";
  document.getElementById("agregarDescripcion").value = "";
  document.getElementById("agregarFecha").value = "";
  document.getElementById("mensajeErrorAgregar").textContent = "";

  // Inicializar categorías y catálogos
  if (typeof cargarCategorias === "function") {
    cargarCategorias();
  }

  const selectCatalogo = document.getElementById("agregarCatalogo");
  selectCatalogo.innerHTML = '<option value="">--Seleccione categoría primero--</option>';
  selectCatalogo.disabled = true;
}

function cerrarModalAgregar() {
  const modal = document.getElementById("modalAgregar");
  if (!modal) return;
  modal.style.display = "none";
}

/* ===============================
   CATEGORÍAS Y CATÁLOGOS
============================== */
function cargarCategorias() {
  const selectCategoria = document.getElementById("agregarCategoria");
  selectCategoria.innerHTML = '<option value="">--Seleccione--</option>';

  window.categorias?.forEach(cat => {
    const option = document.createElement("option");
    option.value = cat.nombre;
    option.textContent = cat.nombre;
    selectCategoria.appendChild(option);
  });
}

function cargarCatalogos() {
  const categoriaSeleccionada = document.getElementById("agregarCategoria").value;
  const selectCatalogo = document.getElementById("agregarCatalogo");

  selectCatalogo.innerHTML = '<option value="">--Seleccione--</option>';
  selectCatalogo.disabled = true;

  const categoria = window.categorias?.find(c => c.nombre === categoriaSeleccionada);
  if (!categoria) return;

  categoria.catalogos.forEach(item => {
    const option = document.createElement("option");
    option.value = item;
    option.textContent = item;
    selectCatalogo.appendChild(option);
  });

  selectCatalogo.disabled = false;
}

/* ===============================
   GUARDAR PERSONA (CON ARCHIVO OPCIONAL)
============================== */

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
    const params = new URLSearchParams();

    params.append("NOMBRE", nombre);
    params.append("DOCUMENTO", documento);
    params.append("EMPRESA", empresa);
    params.append("CATEGORIA", categoria);
    params.append("CATALOGO", catalogo);
    params.append("DESCRIPCION", descripcion);
    params.append("FECHA", fecha);
    params.append("usuarioregistra", "ADMIN");

    if (archivoInput.files.length > 0) {
      const file = archivoInput.files[0];
      const base64 = await convertirABase64(file);

      params.append("ARCHIVO_BASE64", base64);
      params.append("ARCHIVO_NOMBRE", file.name);
      params.append("ARCHIVO_TIPO", file.type);
    }

    const response = await fetch(API_URL, {
      method: "POST",
      body: params
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || "Error al registrar");
    }

    alert("Registro exitoso.\nCódigo generado: " + result.CODIGO_UNICO);

    cerrarModalAgregar();

    // Actualizar memoria local con el código real
    registrosPersonas.unshift({
      NOMBRE: nombre,
      DOCUMENTO: documento,
      EMPRESA: empresa,
      CATEGORIA: categoria,
      CATALOGO: catalogo,
      DESCRIPCION: descripcion,
      FECHA: fecha,
      ARCHIVO: result.ARCHIVO || null,
      CODIGO_UNICO: result.CODIGO_UNICO
    });

    localStorage.setItem("registrosPersonas", JSON.stringify(registrosPersonas));

    document.getElementById("dni").value = documento;
    buscar();

  } catch (error) {
    console.error(error);
    document.getElementById("mensajeErrorAgregar").textContent =
      "Error de conexión o servidor";
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
   UTILIDADES
============================== */
function formatearFecha(fecha) {
  if (!fecha) return "";
  const f = new Date(fecha);
  return f.toLocaleDateString("es-PE");
}

/* ===============================
   INICIO
============================== */
window.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("btnBuscar").addEventListener("click", buscar);
  document.getElementById("dni").addEventListener("keydown", e => {
    if (e.key === "Enter") buscar();
  });

  document.getElementById("btnAgregar")?.addEventListener("click", abrirModalAgregar);
  document.getElementById("btnGuardarPersona")?.addEventListener("click", guardarPersona);
  document.getElementById("agregarCategoria")?.addEventListener("change", cargarCatalogos);

  await cargarRegistros();
});
