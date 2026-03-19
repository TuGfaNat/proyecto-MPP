<script setup>
import { onMounted, onBeforeUnmount, ref, watch, computed } from "vue";
import { useAllUnidadesMofStore } from "../../stores/unidades_mof";
import { useAllTiposMofStore } from "@/stores/tipos_mof";
import { useAllNivelesMofStore } from "@/stores/niveles_mof";
import { useAllRelacionesMofStore } from "@/stores/relaciones_mof";
import { useAllCargosMofStore } from "@/stores/cargos_mof";
import { useAllClasesMofStore } from "@/stores/clases_mof";
import OrgChart from "@balkangraph/orgchart.js";
import {
  initOrgChartCustom,
  colorMenuButtonsForChart,
} from "@/plugins/orgchart-template";
import { rules } from "@/utils/rules";

// Helper para formatear fechas a YYYY-MM-DD sin desfase de zona horaria
const formatDateToString = (date) => {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Helper para parsear fechas de la API (YYYY-MM-DD) a objeto Date local
const parseDateFromApi = (dateStr) => {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split("T")[0].split("-").map(Number);
  return new Date(year, month - 1, day);
};

// Helper para mostrar fechas en formato legible (DD/MM/YYYY)
const formatDateForDisplay = (dateStr) => {
  if (!dateStr) return "Sin fecha";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
};

// ------------------------------------------------------------------
// MOTOR DE PESOS Y ALINEACIÓN VISUAL
// ------------------------------------------------------------------
const getPesoReal = (unidad) => {
  if (!unidad) return 99;
  if (unidad.peso !== null && unidad.peso !== undefined) return unidad.peso;

  const clasesStore = useAllClasesMofStore();
  const tId = unidad.tipoUnidad || unidad.tipo_unidad;
  if (tId) {
    const clase = clasesStore.clases.find(c => String(c.id).trim() === String(tId).trim());
    if (clase && clase.peso) return clase.peso;
  }

  const nom = String(unidad.nombre || "").toLowerCase();
  if (nom.includes("rectorado") || nom.includes("hcu")) return 1;
  if (nom.includes("vicerrectorado") || nom.includes("secretaría general")) return 2;
  if (nom.includes("facultad") || nom.includes("dirección universitaria")) return 3;
  if (nom.includes("departamento") || nom.includes("carrera") || nom.includes("división")) return 4;
  if (nom.includes("sección") || nom.includes("unidad operativa")) return 5;
  
  return 6;
};

function procesarEstructuraVisual(unidadesMapeadas) {
  let nodos = JSON.parse(JSON.stringify(unidadesMapeadas));
  let nodosFinales = [];
  
  nodos.forEach(nodo => {
    nodosFinales.push(nodo); 
    if (nodo.pid) {
      const padre = nodos.find(n => String(n.id) === String(nodo.pid));
      if (padre) {
        const pesoPadre = getPesoReal(padre.raw); 
        const pesoHijo = getPesoReal(nodo.raw);
        const diferencia = pesoHijo - pesoPadre;

        if (diferencia > 1) {
          let ultimoPid = padre.id;
          for (let i = 1; i < diferencia; i++) {
            const puenteId = `inv_${padre.id}_${nodo.id}_${i}`;
            nodosFinales.push({
              id: puenteId,
              pid: ultimoPid,
              tags: ["invisible"],
              nombre: "",
              isMatch: false,
              color: "#E0E0E0"
            });
            ultimoPid = puenteId;
          }
          nodo.pid = ultimoPid; 
        }
      }
    }
  });
  return nodosFinales;
}

// ------------------------------------------------------------------
// COMPONENTES Y STORES
// ------------------------------------------------------------------
import SelectAllTipos from "./tipos/SelectAllTipos.vue";
import SelectAllNiveles from "./niveles/SelectAllNiveles.vue";
import SelectAllRelaciones from "./relaciones/SelectAllRelaciones.vue";
import SelectAllUnidades from "./unidades/SelectAllUnidades.vue";
import SelectAllCargos from "./cargos/SelectAllCargos.vue";
import SelectAllClases from "./clases/SelectAllClases.vue";

const unidadesStore = useAllUnidadesMofStore();
const tiposStore = useAllTiposMofStore();
const nivelesStore = useAllNivelesMofStore();
const relacionesStore = useAllRelacionesMofStore();
const cargosStore = useAllCargosMofStore();
const clasesStore = useAllClasesMofStore();

const chartContainer = ref(null);
let chart = null;

// Estados para diálogos
const addDialog = ref(false);
const deleteDialog = ref(false);
const selectedNode = ref(null);
const isEditMode = ref(false);
const formValid = ref(false);
const snackbar = ref(false);
const snackbarText = ref("");
const snackbarColor = ref("success");
const mostrarOficial = ref(false);

const cargosOriginales = ref([]);
const dialog_nodo_chance = ref(false);
const unidadACambiar = ref(null);
const unidadDestino = ref(null);
const unidadRazon = ref("");

const colorMenu = ref(false);
const swatches = [
  ["#F44336", "#EF5350", "#E53935", "#C62828", "#B71C1C"],
  ["#E91E63", "#EC407A", "#D81B60", "#C2185B", "#AD1457"],
  ["#9C27B0", "#AB47BC", "#8E24AA", "#7B1FA2", "#6A1B9A"],
  ["#673AB7", "#7E57C2", "#5E35B1", "#512DA8", "#4527A0"],
  ["#3F51B5", "#5C6BC0", "#3949AB", "#303F9F", "#1A237E"],
  ["#2196F3", "#42A5F5", "#1E88E5", "#1976D2", "#0D47A1"],
  ["#03A9F4", "#29B6F6", "#039BE5", "#0288D1", "#01579B"],
  ["#00BCD4", "#26C6DA", "#00ACC1", "#0097A7", "#006064"],
  ["#009688", "#26A69A", "#00897B", "#00796B", "#004D40"],
  ["#4CAF50", "#66BB6A", "#43A047", "#388E3C", "#1B5E20"],
  ["#8BC34A", "#9CCC65", "#7CB342", "#689F38", "#33691E"],
  ["#CDDC39", "#D4E157", "#C0CA33", "#AFB42B", "#827717"],
  ["#FFEB3B", "#FFEE58", "#FDD835", "#FBC02D", "#F57F17"],
  ["#FFC107", "#FFCA28", "#FFB300", "#FFA000", "#FF6F00"],
  ["#FF9800", "#FFA726", "#FB8C00", "#F57C00", "#E65100"],
  ["#FF5722", "#FF7043", "#F4511E", "#E64A19", "#BF360C"],
  ["#795548", "#8D6E63", "#6D4C41", "#5D4037", "#3E2723"],
  ["#9E9E9E", "#BDBDBD", "#757575", "#616161", "#212121"],
  ["#607D8B", "#78909C", "#546E7A", "#455A64", "#263238"],
  ["#000000", "#424242", "#616161", "#9E9E9E", "#FFFFFF"],
];

const mostrarDependencias = ref(false);
const unidadDependenciaSeleccionada = ref(null);
const detailsDrawer = ref(false);
const detailData = ref(null);
const loadingDetail = ref(false);

async function showNodeDetails(nodeId) {
  console.log(">>> [LOG] showNodeDetails para ID:", nodeId);
  loadingDetail.value = true;
  detailsDrawer.value = true;
  detailData.value = null;
  try {
    if (cargosStore.cargos.length === 0) {
      await cargosStore.getFetchCargos();
    }
    const [data, personal] = await Promise.all([
      unidadesStore.getUnidadById(nodeId),
      unidadesStore.getPersonalUnidad(nodeId),
    ]);
    if (data) {
      console.log(">>> [LOG] Datos recibidos de la API para el PANEL:", data);
      const dependenciasDetalle = Array.isArray(data.dependenciasFuncionales)
        ? data.dependenciasFuncionales.map((dep) => {
            const id = typeof dep === "object" ? dep.id : dep;
            const unidadFound = unidadesStore.unidades.find(
              (u) => String(u.id) === String(id),
            );
            return unidadFound ? unidadFound.nombre : "ID: " + id;
          })
        : [];
      detailData.value = {
        ...data,
        dependencias_nombres: dependenciasDetalle,
        cargos_ids: Array.isArray(personal) ? personal.map((p) => p.id) : [],
        cargos_detalle: Array.isArray(personal) ? personal : [],
      };
      console.log(">>> [LOG] Objeto detailData final (UI):", detailData.value);
    }
  } catch (e) {
    console.error(">>> [LOG] Error en showNodeDetails:", e);
    snackbarText.value = "Error al cargar detalles";
    snackbarColor.value = "error";
    snackbar.value = true;
  } finally {
    loadingDetail.value = false;
  }
}

const getNivelNombre = (val) => {
  if (!val) return "---";
  const item = nivelesStore.niveles.find(n => String(n.value).trim() === String(val).trim());
  return item ? item.description : val;
};

const getTipoNombre = (val) => {
  if (!val) return "---";
  const item = tiposStore.tipos.find(t => String(t.value).trim() === String(val).trim());
  return item ? item.description : val;
};

const getRelacionNombre = (val) => {
  if (!val) return "---";
  const item = relacionesStore.relaciones.find(r => String(r.value).trim() === String(val).trim());
  return item ? item.description : val;
};

const getClaseNombre = (val) => {
  if (!val) return "---";
  const searchId = String(val).trim();
  const item = clasesStore.clases.find(c => String(c.id).trim() === searchId);
  return item ? item.descripcion : val;
};

const getCargoNombre = (val) => {
  if (!val) return "---";
  const findName = (id) => {
    const searchId = String(id).trim();
    const item = cargosStore.cargos.find(c => String(c.id).trim() === searchId);
    return item ? item.descripcion : id;
  };
  if (Array.isArray(val)) return val.map(id => findName(id)).join(", ");
  return findName(val);
};

const formData = ref({
  nombre: "",
  codigo: "",
  resCreacion: "",
  objetivo: "",
  baseLegal: "",
  fecCreacion: null,
  relacion: null,
  cargos: [],
  relInterno: "",
  relExterno: "",
  funciones: "",
  dependenciasFuncionales: [],
  oficial: true,
  tipo: null,
  nivel: null,
  tipoUnidad: null,
  color: "#1976D2",
});

const filterNivel = ref(null);
const filterTipo = ref(null);
const filterInstancia = ref(null);
const filterRelacion = ref(null);

const hasAnyFilter = computed(() => {
  return !!(filterNivel.value || filterTipo.value || filterInstancia.value || filterRelacion.value);
});

const stats = computed(() => {
  const all = unidadesStore.unidades;
  const total = all.length;
  const oficiales = all.filter((u) => u.oficial).length;
  const staff = all.filter((u) => u.relacion === "S").length;
  return [
    { title: "Total Unidades", value: total, icon: "mdi-sitemap", color: "primary" },
    { title: "Oficiales", value: oficiales, icon: "mdi-check-decagram", color: "success" },
    { title: "No Oficiales", value: total - oficiales, icon: "mdi-alert-circle-outline", color: "warning" },
    { title: "Asesoría/Staff", value: staff, icon: "mdi-account-tie", color: "orange-darken-2" },
  ];
});

const chartNodes = computed(() => {
  const isDepMode = mostrarDependencias.value && unidadDependenciaSeleccionada.value;

  const getFilterVal = (val) => {
    if (!val) return null;
    if (typeof val === 'object') return String(val.value || val.id || "").trim();
    return String(val).trim();
  };

  const activeNivel = getFilterVal(filterNivel.value);
  const activeTipo = getFilterVal(filterTipo.value);
  const activeInstancia = getFilterVal(filterInstancia.value);
  const activeRelacion = getFilterVal(filterRelacion.value);
  
  const filtering = !!(activeNivel || activeTipo || activeInstancia || activeRelacion);

  const baseNodes = unidadesStore.unidades
    .filter((u) => !mostrarOficial.value || u.oficial)
    .map((u) => {
      let matchesNivel = true;
      let matchesTipo = true;
      let matchesInstancia = true;
      let matchesRelacion = true;

      const uNivelText = String(u.nivel || "").trim();
      const uTipoText = String(u.tipo || "").trim();
      const uClaseId = String(u.tipo_unidad || u.tipoUnidad || "").trim();
      const uRelacion = String(u.relacion || "").trim();

      if (activeNivel) {
        const nivelItem = nivelesStore.niveles.find(n => String(n.value) === activeNivel);
        const label = nivelItem ? nivelItem.description : activeNivel;
        if (uNivelText.toLowerCase() !== label.toLowerCase()) matchesNivel = false;
      }

      if (activeTipo) {
        const tipoItem = tiposStore.tipos.find(t => String(t.value) === activeTipo);
        const label = tipoItem ? tipoItem.description : activeTipo;
        if (!uTipoText.toLowerCase().includes(label.toLowerCase())) matchesTipo = false;
      }

      if (activeInstancia) {
        if (uClaseId !== activeInstancia) matchesInstancia = false;
      }

      if (activeRelacion) {
        if (uRelacion !== activeRelacion) matchesRelacion = false;
      }

      const matchesAll = matchesNivel && matchesTipo && matchesInstancia && matchesRelacion;
      const isStaff = u.relacion === "S";
      let finalColor = isStaff ? "#F57C00" : (u.color || "#1976D2");

      if (isDepMode) {
        const selectedId = String(unidadDependenciaSeleccionada.value.id);
        const deps = unidadDependenciaSeleccionada.value.dependencias || [];
        const depsIds = deps.map(d => String(typeof d === 'object' ? d.id : d));
        if (String(u.id) === selectedId) finalColor = "#14B34C";
        else if (depsIds.includes(String(u.id))) finalColor = "#C62828";
        else finalColor = "#E0E0E0";
      } else if (filtering) {
        if (matchesAll) {
          const activeCount = [activeNivel, activeTipo, activeInstancia, activeRelacion].filter(f => f).length;
          if (activeCount > 1) finalColor = "#4CAF50";
          else {
            if (activeNivel) finalColor = "#AA00FF";
            else if (activeTipo) finalColor = "#00B8D4";
            else if (activeInstancia) finalColor = "#FF5722";
            else if (activeRelacion) finalColor = "#E91E63";
          }
        } else {
          finalColor = "#E0E0E0";
        }
      }

      return {
        id: String(u.id),
        pid: u.parent ? String(u.parent) : null,
        nombre: u.nombre,
        codigo: u.codigo,
        color: finalColor,
        isMatch: matchesAll,
        relacion: u.relacion,
        nivel: uNivelText,
        tipo: uTipoText,
        tags: isStaff ? ["assistant"] : ["lineal"],
        raw: u
      };
    });

  return procesarEstructuraVisual(baseNodes);
});

function resetFilters() {
  filterNivel.value = null;
  filterTipo.value = null;
  filterInstancia.value = null;
  filterRelacion.value = null;
  mostrarOficial.value = false;
  resetDependencias();
}

const unidadesNoRaiz = computed(() => unidadesStore.unidades.filter(u => u.parent !== null));
const unidadesDestino = computed(() => unidadesNoRaiz.value.filter(u => String(u.id) !== String(unidadACambiar.value)));

watch(dialog_nodo_chance, (val) => {
  if (!val) {
    unidadACambiar.value = null;
    unidadDestino.value = null;
    unidadRazon.value = "";
  }
});

async function verReporte(id) {
  snackbarText.value = "Generando reporte PDF...";
  snackbarColor.value = "info";
  snackbar.value = true;
  window.open(`https://correspondencia.fcpn.edu.bo/umsa-core/api/v1/mof/unidades/pdf/${id}`, "_blank");
}

async function verDependencias(id) {
  try {
    const node = unidadesStore.unidades.find(u => String(u.id) === String(id));
    if (!node) return;
    const full = await unidadesStore.getUnidadById(node.id);
    if (full && full.dependenciasFuncionales?.length) {
      unidadDependenciaSeleccionada.value = { id: node.id, dependencias: full.dependenciasFuncionales };
      mostrarDependencias.value = true;
    } else {
      snackbarText.value = "Esta unidad no tiene dependencias funcionales";
      snackbarColor.value = "info";
      snackbar.value = true;
    }
  } catch (e) {
    snackbarText.value = "Error al cargar dependencias";
    snackbarColor.value = "error";
    snackbar.value = true;
  }
}

function resetDependencias() {
  mostrarDependencias.value = false;
  unidadDependenciaSeleccionada.value = null;
}

async function openForm(nodeId, edit = false) {
  isEditMode.value = edit;
  const node = unidadesStore.unidades.find(u => String(u.id) === String(nodeId));
  if (!node) return;
  selectedNode.value = node;

  console.log(">>> [LOG] Abriendo FORMULARIO - Modo Edición:", edit);

  if (edit) {
    const fullData = await unidadesStore.getUnidadById(node.id);
    const personalData = await unidadesStore.getPersonalUnidad(node.id);
    
    console.log(">>> [LOG] Datos cargados para EDITAR:", fullData);

    const personalArray = Array.isArray(personalData) ? personalData : (personalData ? [personalData] : []);
    const mappedCargos = personalArray.map(p => {
      const cat = cargosStore.cargos.find(c => c.descripcion === p.descripcion);
      return cat ? { catalogId: String(cat.id), assignmentId: String(p.id) } : null;
    }).filter(Boolean);

    if (fullData) {
      formData.value = {
        ...fullData,
        nombre: fullData.nombre || "",
        codigo: fullData.codigo || "",
        resCreacion: fullData.resCreacion || "",
        objetivo: fullData.objetivo || "",
        baseLegal: fullData.baseLegal || "",
        funciones: fullData.funciones || "",
        relInterno: fullData.relInterno || "",
        relExterno: fullData.relExterno || "",
        fecCreacion: parseDateFromApi(fullData.fecCreacion),
        dependenciasFuncionales: (fullData.dependenciasFuncionales || []).map(d => 
          typeof d === 'object' ? d.id : d
        ),
        tipoUnidad: fullData.tipoUnidad || fullData.tipo_unidad || null,
        nivel: fullData.nivel ? String(fullData.nivel).trim() : null,
        tipo: fullData.tipo ? String(fullData.tipo).trim() : null,
        relacion: fullData.relacion ? String(fullData.relacion).trim() : null,
        cargos: mappedCargos.map(m => m.catalogId),
        color: fullData.color || node.color || (fullData.relacion === 'S' ? "#f57c00" : "#1976D2")
      };
      console.log(">>> [LOG] formData inicializado para el FORM:", formData.value);
      cargosOriginales.value = [...mappedCargos];
      formValid.value = true;
    }
  } else {
    formData.value = {
      nombre: "", codigo: "", resCreacion: "", objetivo: "", baseLegal: "", fecCreacion: null,
      relacion: null, cargos: [], relInterno: "", relExterno: "", funciones: "",
      dependenciasFuncionales: [], oficial: node.oficial !== false,
      tipo: null, nivel: null, tipoUnidad: null, color: "#1976D2"
    };
    cargosOriginales.value = [];
  }
  addDialog.value = true;
}

async function confirmAddItem() {
  if (!formValid.value) return;

  // Extraer el ID del padre de forma segura (puede ser un ID o un objeto con ID)
  const getSafeId = (val) => {
    if (!val) return null;
    if (typeof val === 'object') return val.id;
    const parsed = parseInt(val);
    return isNaN(parsed) ? null : parsed;
  };

  const pIdVal = isEditMode.value ? getSafeId(selectedNode.value.parent) : getSafeId(selectedNode.value.id);
  const claseId = parseInt(formData.value.tipoUnidad);

  const pesoHijo = getPesoReal({ 
    nombre: formData.value.nombre, 
    tipoUnidad: claseId 
  });
  
  if (pIdVal) {
    const padre = unidadesStore.unidades.find(u => String(u.id) === String(pIdVal));
    if (padre && pesoHijo <= getPesoReal(padre)) {
      snackbarText.value = `Integridad: El rango '${pesoHijo}' no puede depender de '${getPesoReal(padre)}'`;
      snackbarColor.value = "error";
      snackbar.value = true;
      return;
    }
  }

  snackbarText.value = "Procesando...";
  snackbarColor.value = "info";
  snackbar.value = true;

  const deps = (formData.value.dependenciasFuncionales || [])
    .map(d => getSafeId(d))
    .filter(id => id !== null);

  // PAYLOAD ROBUSTO: Enviamos campos en el formato que la API prefiere
  const dataToSend = {
    nombre: formData.value.nombre?.trim(),
    codigo: formData.value.codigo?.trim(),
    resCreacion: formData.value.resCreacion?.trim(),
    fecCreacion: formatDateToString(formData.value.fecCreacion),
    objetivo: formData.value.objetivo?.trim(),
    baseLegal: formData.value.baseLegal?.trim(),
    funciones: formData.value.funciones?.trim(),
    relInterno: formData.value.relInterno?.trim(),
    relExterno: formData.value.relExterno?.trim(),
    oficial: !!formData.value.oficial,
    tipo: formData.value.tipo,
    nivel: formData.value.nivel,
    relacion: formData.value.relacion,
    color: formData.value.color,
    // La API parece preferir tipoUnidad en CamelCase para guardar
    tipoUnidad: claseId,
    tipo_unidad: claseId,
    dependenciasFuncionales: deps,
    parentId: pIdVal
  };

  if (isEditMode.value) dataToSend.id = getSafeId(selectedNode.value.id);

  console.log(">>> [LOG] ENVIANDO a API mejorado:", dataToSend);

  let success = false;
  let unidadId = isEditMode.value ? selectedNode.value.id : null;

  try {
    if (isEditMode.value) {
      await unidadesStore.updateUnidad(unidadId, dataToSend);
    } else {
      await unidadesStore.createUnidad(dataToSend);
    }

    if (!unidadesStore.error) {
      success = true;
      // Refrescar el catálogo global
      await unidadesStore.getFetchUnidades();

      if (!isEditMode.value) {
        const nu = unidadesStore.unidades.find(u => 
          u.nombre === formData.value.nombre && u.codigo === formData.value.codigo
        );
        if (nu) unidadId = nu.id;
      }
    }
  } catch (err) { 
    success = false; 
  }

  // Sincronización de Cargos
  if (success && unidadId) {
    const oldIds = cargosOriginales.value.map(m => String(m.catalogId));
    const newIds = (formData.value.cargos || []).map(c => String(c));
    const toAdd = newIds.filter(id => !oldIds.includes(id));
    const toRem = oldIds.filter(id => !newIds.includes(id));

    for (const id of toRem) {
      const m = cargosOriginales.value.find(x => x.catalogId === id);
      if (m?.assignmentId) await unidadesStore.deleteCargoDeUnidad(unidadId, m.assignmentId);
    }
    for (const id of toAdd) await unidadesStore.updatePersonalUnidad(unidadId, id);
  }

  if (success) {
    console.log(">>> [LOG] Éxito al guardar. Refrescando datos...");
    addDialog.value = false;
    snackbarText.value = "¡Operación realizada con éxito!";
    snackbarColor.value = "success";
    
    // Refresco del panel con pausa para asegurar persistencia en el server
    if (unidadId) {
      setTimeout(async () => {
        await showNodeDetails(unidadId);
      }, 800);
    }
  } else {
    console.error(">>> [LOG] Fallo al guardar:", unidadesStore.error);
    snackbarText.value = "Error: " + (unidadesStore.error || "No se pudo guardar");
    snackbarColor.value = "error";
  }
  snackbar.value = true;
}

async function confirmDelete() {
  if (!selectedNode.value) return;
  const hasChildren = unidadesStore.unidades.some(u => String(u.parent) === String(selectedNode.value.id));
  if (hasChildren) {
    snackbarText.value = "No se puede eliminar: tiene unidades dependientes.";
    snackbarColor.value = "error";
    snackbar.value = true;
    deleteDialog.value = false;
    return;
  }
  await unidadesStore.deletePersonalUnidad(selectedNode.value.id);
  await unidadesStore.deleteUnidad(selectedNode.value.id);
  if (!unidadesStore.error) {
    snackbarText.value = "¡Unidad eliminada!";
    snackbarColor.value = "success";
  } else {
    snackbarText.value = "Error: " + unidadesStore.error;
    snackbarColor.value = "error";
  }
  deleteDialog.value = false;
  snackbar.value = true;
}

async function cambiarDependencia() {
  const u = unidadesStore.unidades.find(u => String(u.id) === String(unidadACambiar.value));
  if (!u) return;
  await unidadesStore.updateNodo(u.id, { ...u, razon: unidadRazon.value, parentId: unidadDestino.value });
  if (!unidadesStore.error) {
    dialog_nodo_chance.value = false;
    snackbarText.value = "¡Dependencia cambiada!";
    snackbarColor.value = "success";
  } else {
    snackbarText.value = "Error al cambiar";
    snackbarColor.value = "error";
  }
  snackbar.value = true;
}

function initChart(nodes) {
  if (!chartContainer.value || !nodes?.length) return;
  if (chart) chart.destroy();
  chartContainer.value.innerHTML = "";

  OrgChart.templates.invisible = Object.assign({}, OrgChart.templates.sma);
  OrgChart.templates.invisible.node = '<line x1="140" y1="0" x2="140" y2="140" stroke="#aeaeae" stroke-width="1" />';
  ["field_0", "field_1", "field_5", "field_6", "field_7", "plus", "minus"].forEach(f => OrgChart.templates.invisible[f] = '');

  chart = new OrgChart(chartContainer.value, {
    template: "sma",
    nodes: nodes,
    enableDragDrop: false,
    movable: OrgChart.movable.tree,
    nodeBinding: { field_0: "nombre", field_1: "codigo", field_5: "color", field_6: "nivel", field_7: "tipo" },
    tags: { lineal: { template: "lineal" }, assistant: { template: "assistant" }, invisible: { template: "invisible" } },
    mouseScrool: OrgChart.action.zoom,
    enableSearch: false,
    controls: { pdf_export: { title: "Exportar PDF" }, zoom_in: { title: "Acercar" }, zoom_out: { title: "Alejar" }, fit: { title: "Ajustar" } },
    editForm: { elements: [] },
    nodeMenu: {
      pdfReport: { text: "Reporte", icon: OrgChart.icon.pdf(24, 24, "#2196F3"), onClick: verReporte },
      dependencies: { text: "Dependencias", icon: OrgChart.icon.details(24, 24, "#4CAF50"), onClick: verDependencias },
      add: { text: "Añadir Hijo", icon: OrgChart.icon.add(24, 24, "#43A047"), onClick: (id) => openForm(id, false) },
      edit: { text: "Editar", icon: OrgChart.icon.edit(24, 24, "#FB8C00"), onClick: (id) => openForm(id, true) },
      remove: { text: "Eliminar", icon: OrgChart.icon.remove(24, 24, "#F44336"), onClick: (id) => {
        const n = unidadesStore.unidades.find(u => String(u.id) === String(id));
        if (n) { selectedNode.value = n; deleteDialog.value = true; }
      }},
    },
  });

  chart.on("render-link", (sender, args) => {
    try {
      if (!args?.item) return;
      const fromNode = chart.getNode(args.from);
      if (fromNode?.tags?.includes("invisible")) {
        args.html = args.html.replace("<path", '<path stroke="#aeaeae" stroke-width="1" stroke-dasharray="4,4"');
        return;
      }
      const isStaff = args.item.relacion === "S";
      let stroke = isStaff ? "#F57C00" : "#1976D2";
      if (args.item.color === "#E0E0E0") stroke = "#E6E6E6";
      args.html = args.html.replace("<path", `<path stroke="${stroke}" stroke-width="2"`);
    } catch (e) {}
  });

  chart.on("show-edit-form", () => false);
  chart.on("click", (sender, args) => { showNodeDetails(args.node.id); return false; });
  chart.on("init", () => colorMenuButtonsForChart(chart));
  chart.on("redraw", () => colorMenuButtonsForChart(chart));

  window.chart = chart;
  setTimeout(() => colorMenuButtonsForChart(chart), 150);
}

onMounted(async () => {
  initOrgChartCustom();
  await Promise.all([
    unidadesStore.getFetchUnidades(), tiposStore.getFetchTipos(), nivelesStore.getFetchNiveles(),
    relacionesStore.getFetchRelaciones(), cargosStore.getFetchCargos(), clasesStore.getFetchClases(),
  ]);
});

watch(chartNodes, (n) => { if (n.length) initChart(n); }, { deep: true });
watch(() => formData.value.relacion, (val) => {
  if (val === "S") formData.value.color = "#f57c00";
  else if (val === "L" && formData.value.color === "#f57c00") formData.value.color = "#1976D2";
});
onBeforeUnmount(() => { if (chart) chart.destroy(); });
</script>

<template>
  <v-container fluid class="pa-4 bg-grey-lighten-4 min-vh-100">
    <v-row dense class="mb-4">
      <v-col v-for="stat in stats" :key="stat.title" cols="12" sm="6" md="3">
        <v-card elevation="2" class="rounded-lg border-start border-4" :style="{ borderLeftColor: `var(--v-${stat.color}-base)` }">
          <v-card-item class="pb-2">
            <template v-slot:prepend>
              <v-avatar :color="stat.color" variant="tonal" size="48"><v-icon :icon="stat.icon" size="28"></v-icon></v-avatar>
            </template>
            <v-card-title class="text-h5 font-weight-bold">{{ stat.value }}</v-card-title>
            <v-card-subtitle class="text-caption text-uppercase font-weight-medium">{{ stat.title }}</v-card-subtitle>
          </v-card-item>
        </v-card>
      </v-col>
    </v-row>

    <v-card elevation="2" class="mb-4 rounded-lg overflow-hidden">
      <v-card-text class="pa-4">
        <v-row dense align="center">
          <v-col cols="12" md="3"><SelectAllNiveles v-model="filterNivel" label="Niveles" density="compact" hide-details variant="outlined" clearable /></v-col>
          <v-col cols="12" md="3"><SelectAllTipos v-model="filterTipo" label="Tipo" density="compact" hide-details variant="outlined" clearable /></v-col>
          <v-col cols="12" md="3"><SelectAllClases v-model="filterInstancia" label="Clase" density="compact" hide-details variant="outlined" clearable /></v-col>
          <v-col cols="12" md="3"><SelectAllRelaciones v-model="filterRelacion" label="Relación" density="compact" hide-details variant="outlined" clearable /></v-col>
        </v-row>
        <v-divider class="my-4"></v-divider>
        <v-row dense align="center">
          <v-col cols="12" lg="7" md="8" class="d-flex align-center flex-wrap">
            <span class="text-subtitle-2 mr-3 font-weight-bold text-grey-darken-2">VISUALIZAR:</span>
            <v-btn-toggle v-model="mostrarOficial" mandatory color="primary" variant="outlined" density="comfortable" rounded="lg">
              <v-btn :value="false" class="px-4 text-caption">TODOS LOS NODOS</v-btn>
              <v-btn :value="true" class="px-4 text-caption">ORGANIGRAMA OFICIAL</v-btn>
            </v-btn-toggle>
          </v-col>
          <v-col cols="12" lg="5" md="4" class="d-flex gap-2 justify-end">
            <v-btn prepend-icon="mdi-filter-off" variant="tonal" color="grey-darken-1" @click="resetFilters" size="small">Limpiar</v-btn>
            <v-btn prepend-icon="mdi-swap-horizontal" color="secondary" variant="elevated" @click="dialog_nodo_chance = true" size="small">Dependencia Nodo</v-btn>
            <v-btn v-if="mostrarDependencias" prepend-icon="mdi-refresh" color="error" variant="tonal" @click="resetDependencias" size="small">Reset</v-btn>
          </v-col>
        </v-row>
        <v-expand-transition>
          <div v-if="hasAnyFilter" class="mt-4 pt-3 border-top">
            <div class="d-flex align-center flex-wrap gap-x-6 gap-y-2">
              <span class="text-caption font-weight-bold text-grey-darken-2">LEYENDA:</span>
              <div class="d-flex align-center"><v-avatar color="#AA00FF" size="12" class="mr-2"></v-avatar><span class="text-caption">Niveles</span></div>
              <div class="d-flex align-center"><v-avatar color="#00B8D4" size="12" class="mr-2"></v-avatar><span class="text-caption">Tipo</span></div>
              <div class="d-flex align-center"><v-avatar color="#FF5722" size="12" class="mr-2"></v-avatar><span class="text-caption">Clase</span></div>
              <div class="d-flex align-center"><v-avatar color="#E91E63" size="12" class="mr-2"></v-avatar><span class="text-caption">Relación</span></div>
              <div class="d-flex align-center"><v-avatar color="#4CAF50" size="12" class="mr-2"></v-avatar><span class="text-caption font-weight-bold">Match Perfecto</span></div>
              <v-spacer></v-spacer>
              <span class="text-caption text-grey-darken-1 italic">* Nodos no coincidentes en gris.</span>
            </div>
          </div>
        </v-expand-transition>
      </v-card-text>
    </v-card>

    <v-card elevation="3" class="rounded-lg overflow-hidden border">
      <v-progress-linear v-if="unidadesStore.loading" indeterminate color="primary" height="4" />
      <v-card-text class="pa-0 position-relative">
        <div v-if="hasAnyFilter" class="position-absolute pa-2 z-index-1" style="top: 10px; left: 10px">
          <v-chip color="primary" size="small" closable @click:close="resetFilters">Filtrando {{ chartNodes.filter(n => !n.tags?.includes('invisible')).length }} unidades</v-chip>
        </div>
        <div ref="chartContainer" class="chart-container"></div>
      </v-card-text>
    </v-card>

    <v-dialog v-model="dialog_nodo_chance" max-width="900px">
      <v-card>
        <v-card-title><strong>CAMBIO DE DEPENDENCIA DE UNIDAD</strong></v-card-title>
        <v-divider /><v-alert type="warning" title="CUIDADO" text="Afecta automáticamente a los dependientes." />
        <v-card-text>
          <v-row class="text-center">
            <v-col cols="12" md="6"><SelectAllUnidades v-model="unidadACambiar" clearable :items="unidadesNoRaiz" label="Unidad a cambiar" /></v-col>
            <v-col cols="12" md="6"><SelectAllUnidades v-model="unidadDestino" :disabled="!unidadACambiar" clearable :items="unidadesDestino" label="Unidad destino" /></v-col>
          </v-row>
          <v-textarea v-model="unidadRazon" label="Razón" :rules="[rules.required, rules.minLength(6)]" variant="underlined" rows="2" class="px-4" />
        </v-card-text>
        <v-card-actions><v-spacer /><v-btn @click="dialog_nodo_chance = false">Cerrar</v-btn><v-btn color="primary" :disabled="!unidadACambiar || !unidadDestino || !unidadRazon" @click="cambiarDependencia">Cambiar</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="addDialog" max-width="900px" persistent>
      <v-card>
        <v-card-title>{{ isEditMode ? "Editar" : "Agregar item a" }}: <strong class="text-primary">{{ selectedNode?.nombre }}</strong></v-card-title>
        <v-divider />
        <v-card-text>
          <v-form v-model="formValid">
            <v-row>
              <v-col cols="12" md="6"><v-text-field v-model="formData.nombre" label="Nombre" :rules="[rules.required]" variant="underlined" /></v-col>
              <v-col cols="12" md="6"><v-text-field v-model="formData.codigo" label="Código" variant="underlined" /></v-col>
              <v-col cols="12" md="6"><v-text-field v-model="formData.resCreacion" label="Nro de Resolución" variant="underlined" /></v-col>
              <v-col cols="12" md="6"><v-date-input v-model="formData.fecCreacion" label="Fecha de Creación" variant="underlined" /></v-col>
              <v-col cols="12"><v-textarea v-model="formData.objetivo" label="Objetivo" variant="underlined" rows="2" auto-grow /></v-col>
              <v-col cols="12"><v-textarea v-model="formData.baseLegal" label="Base Legal" variant="underlined" rows="2" auto-grow /></v-col>
              <v-col cols="12"><v-textarea v-model="formData.funciones" label="Funciones" variant="underlined" rows="2" auto-grow /></v-col>
              <v-col cols="12"><v-textarea v-model="formData.relInterno" label="Relaciones Internas" variant="underlined" rows="2" auto-grow /></v-col>
              <v-col cols="12"><v-textarea v-model="formData.relExterno" label="Relaciones Externas" variant="underlined" rows="2" auto-grow /></v-col>
              <v-col cols="12"><SelectAllUnidades type="autocomplete" label="Dependencias Funcionales" v-model="formData.dependenciasFuncionales" :exclude-id="selectedNode?.id" /></v-col>
              <v-col cols="12" md="4"><SelectAllTipos v-model="formData.tipo" /></v-col>
              <v-col cols="12" md="4"><SelectAllNiveles v-model="formData.nivel" label="Nivel" /></v-col>
              <v-col cols="12" md="4"><SelectAllRelaciones v-model="formData.relacion" /></v-col>
              <v-col cols="12" md="6"><SelectAllCargos v-model="formData.cargos" /></v-col>
              <v-col cols="12" md="6"><SelectAllClases v-model="formData.tipoUnidad" /></v-col>
            </v-row>
            <v-row justify="end" class="align-center px-4">
              <v-menu v-model="colorMenu" :close-on-content-click="false" :disabled="formData.relacion === 'S'">
                <template v-slot:activator="{ props }">
                  <div v-bind="formData.relacion === 'S' ? {} : props" class="d-flex align-center mr-4" :style="{ cursor: formData.relacion === 'S' ? 'not-allowed' : 'pointer' }">
                    <v-icon :color="formData.color" size="large" class="mr-2">mdi-palette</v-icon><span class="text-caption">Color Nodo</span>
                  </div>
                </template>
                <v-color-picker v-model="formData.color" mode="hex" :swatches="swatches" show-swatches hide-inputs />
              </v-menu>
              <span :class="formData.oficial ? '' : 'text-red'">{{ formData.oficial ? "OFICIAL" : "NO OFICIAL" }}</span>
              <v-switch v-model="formData.oficial" color="primary" :disabled="!isEditMode && selectedNode?.oficial === false" hide-details inset class="ml-2" />
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions><v-spacer /><v-btn text @click="addDialog = false">Cancelar</v-btn><v-btn color="primary" :disabled="!formValid" @click="confirmAddItem">Guardar</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="500px">
      <v-card>
        <v-card-title class="text-error">¿Confirmar Eliminación?</v-card-title>
        <v-card-text>Desea eliminar <strong>{{ selectedNode?.nombre }}</strong>?</v-card-text>
        <v-card-actions><v-spacer /><v-btn text @click="deleteDialog = false">Cancelar</v-btn><v-btn color="error" variant="flat" @click="confirmDelete">Eliminar</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="4000">{{ snackbarText }}</v-snackbar>

    <v-navigation-drawer
      v-model="detailsDrawer"
      location="right"
      temporary
      width="500"
      elevation="10"
    >
      <v-toolbar :color="detailData?.color || 'primary'" dark density="compact">
        <v-toolbar-title class="text-subtitle-1 font-weight-bold">
          Detalles de la Unidad
        </v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn icon @click="detailsDrawer = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-toolbar>

      <v-progress-linear
        v-if="loadingDetail"
        indeterminate
        color="primary"
      ></v-progress-linear>

      <v-list v-if="detailData" class="pa-4">
        <div class="mb-4">
          <div class="text-h6 font-weight-bold mb-1" style="line-height: 1.2">
            {{ detailData.nombre }}
          </div>
          <v-chip
            size="x-small"
            label
            color="grey-darken-3"
            class="font-weight-bold px-2"
          >
            CÓDIGO: {{ detailData.codigo }}
          </v-chip>
        </div>

        <v-divider class="mb-4"></v-divider>

        <div class="mb-6">
          <div
            class="text-caption text-uppercase text-grey-darken-1 font-weight-bold mb-1"
          >
            Información General
          </div>
          <v-row dense>
            <v-col cols="6">
              <div class="text-caption text-grey">Niveles</div>   
              <div class="text-body-2 font-weight-medium">
                {{ getNivelNombre(detailData.nivel) }}
              </div>
            </v-col>
            <v-col cols="6">
              <div class="text-caption text-grey">Tipo de Unidad</div>     
              <div class="text-body-2 font-weight-medium">
                {{ getTipoNombre(detailData.tipo) }}
              </div>
            </v-col>
            <v-col cols="6" class="mt-2">
              <div class="text-caption text-grey">Relación</div>
              <div class="text-body-2 font-weight-medium">
                {{ getRelacionNombre(detailData.relacion) }}
              </div>
            </v-col>
            <v-col cols="6" class="mt-2">
              <div class="text-caption text-grey">Clase</div>
              <div class="text-body-2 font-weight-medium">
                {{ getClaseNombre(detailData.tipoUnidad || detailData.tipo_unidad) }}
              </div>
            </v-col>
            <v-col cols="6" class="mt-2">
              <div class="text-caption text-grey">Cargos Asignados</div>   
              <div class="text-body-2 font-weight-medium">
                <div
                  v-for="c in detailData.cargos_detalle || []"
                  :key="c.id"
                  class="mb-1"
                >
                  • {{ c.descripcion }}
                </div>
                <span v-if="!detailData.cargos_detalle?.length">---</span> 
              </div>
            </v-col>
            <v-col cols="6" class="mt-2">
              <div class="text-caption text-grey">Estado</div>
              <v-chip
                :color="detailData.oficial ? 'success' : 'red-darken-1'"   
                size="x-small"
                label
                class="font-weight-bold"
                theme="dark"
              >
                {{ detailData.oficial ? "OFICIAL" : "NO OFICIAL" }}        
              </v-chip>
            </v-col>
            <v-col cols="12" class="mt-2">
              <div class="text-caption text-grey">Nro. de Resolución</div> 
              <div class="text-body-2 font-weight-medium">
                {{ detailData.resCreacion || "Sin resolución" }}
              </div>
            </v-col>
            <v-col cols="12" class="mt-2">
              <div class="text-caption text-grey">Fecha de Creación</div>  
              <div class="text-body-2 font-weight-medium">
                {{ formatDateForDisplay(detailData.fecCreacion) }}
              </div>
            </v-col>
          </v-row>
        </div>

        <v-divider class="mb-4"></v-divider>

        <div class="mb-6" v-if="detailData.dependencias_nombres?.length">  
          <div
            class="text-caption text-uppercase text-grey-darken-1 font-weight-bold mb-1"
          >
            Dependencias Funcionales
          </div>
          <div
            v-for="(name, idx) in detailData.dependencias_nombres"
            :key="idx"
            class="text-body-2 font-weight-medium mb-1"
          >
            • {{ name }}
          </div>
        </div>

        <v-divider
          class="mb-4"
          v-if="detailData.dependencias_nombres?.length"
        ></v-divider>

        <div class="mb-4">
          <div
            class="text-caption text-uppercase text-grey-darken-1 font-weight-bold mb-1"
          >
            Objetivo Institucional
          </div>
          <div class="text-body-2 text-justify">
            {{ detailData.objetivo || "Sin objetivo registrado." }}        
          </div>
        </div>

        <div class="mb-4">
          <div
            class="text-caption text-uppercase text-grey-darken-1 font-weight-bold mb-1"
          >
            Base Legal
          </div>
          <div class="text-body-2 text-justify">
            {{ detailData.baseLegal || "Sin base legal registrada." }}     
          </div>
        </div>

        <div class="mb-4">
          <div
            class="text-caption text-uppercase text-grey-darken-1 font-weight-bold mb-1"
          >
            Funciones Principales
          </div>
          <div class="text-body-2 text-justify">
            {{ detailData.funciones || "Sin funciones registradas." }}     
          </div>
        </div>

        <v-divider class="mb-4"></v-divider>

        <div class="mb-4">
          <div
            class="text-caption text-uppercase text-grey-darken-1 font-weight-bold mb-1"
          >
            Relación Interna
          </div>
          <div class="text-body-2 text-justify">
            {{ detailData.relInterno || "Sin datos registrados." }}        
          </div>
        </div>

        <div class="mb-4">
          <div
            class="text-caption text-uppercase text-grey-darken-1 font-weight-bold mb-1"
          >
            Relación Externa
          </div>
          <div class="text-body-2 text-justify">
            {{ detailData.relExterno || "Sin datos registrados." }}        
          </div>
        </div>

        <div class="d-flex mt-6">
          <v-btn
            color="primary"
            variant="flat"
            block
            prepend-icon="mdi-pencil"
            @click="
              openForm(detailData.id, true);
              detailsDrawer = false;
            "
          >
            Editar Unidad
          </v-btn>
        </div>
        <v-btn
          class="mt-2"
          variant="tonal"
          block
          prepend-icon="mdi-file-pdf-box"
          @click="verReporte(detailData.id)"
        >
          Ver Reporte PDF
        </v-btn>
      </v-list>
    </v-navigation-drawer>
  </v-container>
</template>

<style scoped>
.chart-container { width: 100%; height: 750px; overflow: hidden; background: #f5f7fa; }
</style>
