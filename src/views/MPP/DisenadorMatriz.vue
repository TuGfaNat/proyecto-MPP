<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from "vue";
import { VueFlow, useVueFlow, Handle, Position } from "@vue-flow/core";
import { Background } from "@vue-flow/background";
import { Controls } from "@vue-flow/controls";
import { useMppCoreStore } from "@/stores/mpp_core";

// Estilos base
import "@vue-flow/core/dist/style.css";
import "@vue-flow/core/dist/theme-default.css";
import "@vue-flow/controls/dist/style.css";

const props = defineProps({
  procesoId: Number,
  procedimientoId: Number,
  cargoId: Number,
  unidadesIds: Array,
});

const emit = defineEmits(["back"]);

const mppStore = useMppCoreStore();
const { addEdges, onNodeClick, fitView } = useVueFlow();

// --- ESTADOS DE UI ---
const isSaving = ref(false);
const isDirty = ref(false);
const lastSaved = ref(null);
const sidebarWidth = ref(380);
const isResizing = ref(false);

const editDialog = ref(false);
const activeNode = ref(null);
const nodeTab = ref("general");

// --- ESTADO DEL DISEÑADOR ---
const nodes = ref([]);
const edges = ref([]);
const selectedParentId = ref(null);
const decisionBranch = ref("SÍ");
const nextNodeData = ref({
  label: "",
  tipo: null,
  unidadEjecutoraId: null,
  responsable: "",
  requisitos: "",
  operaciones: "",
});
const nodeEditData = ref({
  label: "",
  tipo: null,
  unidadEjecutoraId: null,
  responsable: "",
  requisitos: "",
  operaciones: "",
});
const snackbar = ref({ show: false, text: "", color: "success" });

// --- TIMERS ---
let autoSaveTimer = null;

const autoSaveSilent = async () => {
  if (!isDirty.value || isSaving.value) return;
  isSaving.value = true;
  try {
    const listaPasos = nodes.value.map((node) => ({
      descripcion: node.data.label,
      orden: node.data.order,
      x: Math.round(node.position.x),
      y: Math.round(node.position.y),
      metadata: {
        ...node.data,
        connections: edges.value.filter((e) => e.source === node.id),
      },
    }));
    const success = await mppStore.saveFlujoCompleto(
        props.procedimientoId,
      listaPasos,
    );
    if (success) {
      lastSaved.value = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      isDirty.value = false;
    }
  } catch (e) {
    console.error(e);
  } finally {
    isSaving.value = false;
  }
};

// --- LÓGICA DISEÑADOR ---

const normalizeType = (tipo) => {
  if (!tipo) return "tarea";
  const nombre = (typeof tipo === "object" ? tipo.nombre_accion : tipo) || "";
  const n = nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (n.includes("inicio")) return "inicio";
  if (n.includes("fin")) return "fin";
  if (n.includes("decision") || n.includes("aprob") || n.includes("valida"))
    return "decision";
  return "tarea";
};

const insertNode = () => {
  if (!nextNodeData.value.label) return;
  const id = Date.now().toString();
  const newNode = {
    id,
    type: "mppNode",
    position: { x: 250, y: nodes.value.length * 150 + 50 },
    data: { ...nextNodeData.value, order: nodes.value.length + 1 },
  };
  nodes.value.push(newNode);
  if (selectedParentId.value) {
    addEdges([
      {
        id: `e-${selectedParentId.value}-${id}`,
        source: selectedParentId.value,
        target: id,
        label: decisionBranch.value,
        animated: true,
      },
    ]);
  }
  selectedParentId.value = id;
  nextNodeData.value = {
    label: "",
    tipo: null,
    unidadEjecutoraId: null,
    responsable: "",
    requisitos: "",
    operaciones: "",
  };
};

const updateNodeInfo = () => {
  const n = nodes.value.find((node) => node.id === activeNode.value.id);
  if (n) {
    Object.assign(n.data, nodeEditData.value);
    n.data.label = nodeEditData.value.label;
  }
  editDialog.value = false;
};

const deleteNode = () => {
  nodes.value = nodes.value.filter((n) => n.id !== activeNode.value.id);
  edges.value = edges.value.filter(
    (e) => e.source !== activeNode.value.id && e.target !== activeNode.value.id,
  );
  nodes.value.forEach((n, i) => (n.data.order = i + 1));
  editDialog.value = false;
};

// --- AUXILIARES UI ---

const getItemTitle = (item) =>
  item?.denominacion ||
  item?.nombre_unidad ||
  item?.nombre ||
  item?.descripcion ||
  "Sin nombre";

const getUnitColor = (uId) =>
  mppStore.unidades.find((u) => (u.id_unidad || u.id) === uId)?.color ||
  "#f8fafc";

const getContrastColor = (hex) => {
  if (!hex || hex.startsWith("rgba")) return "#1e293b";
  const h = hex.replace("#", "");
  const r = parseInt(h.substr(0, 2), 16);
  const g = parseInt(h.substr(2, 2), 16);
  const b = parseInt(h.substr(4, 2), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 >= 128 ? "#1e293b" : "#ffffff";
};

// --- CICLO DE VIDA ---
onMounted(async () => {
  try {
    const pasos = await mppStore.fetchPasos(props.procedimientoId);
    nodes.value = pasos?.length
      ? pasos.map((p, idx) => ({
          id: p.id.toString(),
          type: "mppNode",
          position: { x: p.x || 100, y: p.y || 100 },
          data: {
            ...p.metadata,
            order: p.orden || idx + 1,
            label: p.descripcion,
          },
        }))
      : [];
    const restored = [];
    pasos?.forEach((p) => {
      if (p.metadata?.connections) restored.push(...p.metadata.connections);
    });
    edges.value = restored;

    setTimeout(() => {
      fitView();
      isDirty.value = false;
      lastSaved.value = "Diseño cargado";
    }, 200);
  } catch (e) {
    console.error("Error al cargar pasos:", e);
  }
  autoSaveTimer = setInterval(autoSaveSilent, 60000);
});

onUnmounted(() => {
  if (autoSaveTimer) clearInterval(autoSaveTimer);
});

onNodeClick((event) => {
  activeNode.value = event.node;
  nodeEditData.value = { ...event.node.data };
  editDialog.value = true;
});

watch([nodes, edges], () => { isDirty.value = true; }, { deep: true });

const startResizing = () => {
  isResizing.value = true;
  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", stopResizing);
};
const handleMouseMove = (e) => {
  if (isResizing.value && e.clientX > 300 && e.clientX < 800)
    sidebarWidth.value = e.clientX;
};
const stopResizing = () => {
  isResizing.value = false;
  document.removeEventListener("mousemove", handleMouseMove);
  document.removeEventListener("mouseup", stopResizing);
};
</script>

<template>
  <div class="designer-layout" style="display: flex; width: 100vw; height: 100vh">
    <aside
      class="sidebar"
      :style="{
        width: sidebarWidth + 'px',
        position: 'relative',
        background: 'white',
        borderRight: '1px solid #e2e8f0',
        flexShrink: 0,
      }"
    >
      <div class="sidebar-content pa-4 d-flex flex-column fill-height">
        <div class="context-summary mb-4">
          <div class="d-flex align-center mb-2">
            <v-btn
              icon="mdi-arrow-left"
              variant="tonal"
              size="x-small"
              color="primary"
              @click="emit('back')"
              class="mr-2"
            ></v-btn>
            <span class="text-overline font-weight-bold text-primary"
              >Contexto</span
            >
          </div>
          <v-card variant="flat" class="bg-primary-lighten-5 rounded-lg pa-3">
            <p class="text-caption font-weight-bold mb-1 text-truncate">
              PROCESO:
              {{ getItemTitle(mppStore.procesos.find(p => p.id_proceso === props.procesoId)) }}
            </p>
            <p class="text-caption font-weight-bold mb-1 text-primary text-truncate">
              PROCEDIMIENTO:
              {{ getItemTitle(mppStore.procedimientos.find(p => p.id_procedimiento === props.procedimientoId)) }}
            </p>
            <p class="text-caption text-truncate">
              UNIDAD:
              {{
                props.unidadesIds?.length > 0
                  ? mppStore.unidades.find(u => u.id_unidad === props.unidadesIds[0])?.nombre_unidad
                  : "Sin asignar"
              }}
            </p>
            <p class="text-caption text-truncate">
              RESP:
              {{
                mppStore.cargos.find(c => c.id_cargo === props.cargoId)?.nombre || "Sin asignar"
              }}
            </p>
          </v-card>
        </div>

        <v-divider class="mb-4"></v-divider>
        <div class="flex-grow-1 overflow-y-auto pr-2">
          <h3 class="text-subtitle-1 font-weight-bold mb-4">
            Configurar Paso
          </h3>
          <v-card
            variant="flat"
            border
            class="pa-4 rounded-xl bg-grey-lighten-5 mb-4"
          >
            <v-select
              v-model="nextNodeData.unidadEjecutoraId"
              :items="mppStore.unidades"
              :item-title="getItemTitle"
              item-value="id_unidad"
              label="Unidad"
              variant="outlined"
              density="compact"
              class="mb-3"
              bg-color="white"
            ></v-select>
            <v-text-field
              v-model="nextNodeData.responsable"
              label="Cargo"
              variant="outlined"
              density="compact"
              bg-color="white"
              class="mb-3"
            ></v-text-field>
            <v-select
              v-model="nextNodeData.tipo"
              :items="mppStore.acciones"
              item-title="nombre_accion"
              return-object
              label="Tipo"
              variant="outlined"
              density="compact"
              bg-color="white"
              class="mb-3"
            ></v-select>
            <v-text-field
              v-model="nextNodeData.label"
              label="Nombre"
              variant="outlined"
              density="compact"
              bg-color="white"
              class="mb-3"
            ></v-text-field>
            <v-textarea
              v-model="nextNodeData.requisitos"
              label="Requisitos"
              rows="2"
              variant="outlined"
              density="compact"
              bg-color="white"
              class="mb-3"
            ></v-textarea>
            <v-textarea
              v-model="nextNodeData.operaciones"
              label="Operaciones"
              rows="2"
              variant="outlined"
              density="compact"
              bg-color="white"
              class="mb-4"
            ></v-textarea>
            <v-select
              v-model="selectedParentId"
              :items="nodes"
              :item-title="(item) => item.data.label"
              item-value="id"
              label="Paso Anterior"
              variant="outlined"
              density="compact"
              bg-color="white"
              class="mb-3"
              clearable
            ></v-select>
            <v-expand-transition>
              <div
                v-if="
                  normalizeType(
                    nodes.find((n) => n.id === selectedParentId)?.data.tipo,
                  ) === 'decision'
                "
              >
                <v-btn-toggle
                  v-model="decisionBranch"
                  mandatory
                  color="primary"
                  class="mb-4 w-100"
                  density="compact"
                >
                  <v-btn value="SÍ" class="flex-grow-1">SÍ</v-btn>
                  <v-btn value="NO" class="flex-grow-1">NO</v-btn>
                </v-btn-toggle>
              </div>
            </v-expand-transition>
            <v-btn
              color="secondary"
              block
              @click="insertNode"
              height="48"
              class="font-weight-bold rounded-lg elevation-2 text-uppercase"
              >Añadir al Diagrama</v-btn
            >
          </v-card>
        </div>
        <div class="mt-auto pt-4">
          <v-alert
            v-if="lastSaved"
            density="compact"
            color="success"
            variant="tonal"
            class="text-caption mb-2"
            >Última sincronización: {{ lastSaved }}</v-alert
          >
          <v-btn
            color="primary"
            block
            size="large"
            :loading="isSaving"
            @click="autoSaveSilent"
            class="rounded-lg text-uppercase"
            >Sincronizar Ahora</v-btn
          >
        </div>
      </div>
      <div
        class="resize-handle"
        @mousedown="startResizing"
        style="
          position: absolute;
          top: 0;
          right: -4px;
          width: 8px;
          height: 100%;
          cursor: col-resize;
          z-index: 100;
        "
      ></div>
    </aside>

    <main
      class="diagram-container flex-grow-1 bg-white"
      style="flex-grow: 1; height: 100%; overflow: hidden"
    >
      <VueFlow
        v-model:nodes="nodes"
        v-model:edges="edges"
        :fit-view-on-init="true"
      >
        <template #node-mppNode="{ data }">
          <div
            :class="[
              'mpp-node-container',
              'node-' + normalizeType(data.tipo),
            ]"
            :style="{
              backgroundColor: getUnitColor(data.unidadEjecutoraId),
              color: getContrastColor(getUnitColor(data.unidadEjecutoraId)),
              borderColor:
                getContrastColor(getUnitColor(data.unidadEjecutoraId)) + '66',
            }"
          >
            <Handle type="target" :position="Position.Top" />
            <div
              class="mpp-node-order"
              style="
                position: absolute;
                top: -12px;
                left: -12px;
                font-weight: 900;
                font-size: 0.75rem;
                width: 26px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 6px;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                background: white;
                color: #6366f1;
              "
            >
              #{{ data.order }}
            </div>
            <div class="mpp-node-content">
              <div
                class="mpp-node-label"
                style="
                  font-weight: 800;
                  font-size: 0.95rem;
                  margin-bottom: 2px;
                  line-height: 1.1;
                "
              >
                {{ data.label }}
              </div>
              <div
                class="mpp-node-resp"
                style="font-size: 0.75rem; font-style: italic; opacity: 0.9"
              >
                {{ data.responsable || "Sin asignación" }}
              </div>
            </div>
            <Handle
              id="source-bottom"
              type="source"
              :position="Position.Bottom"
            />
            <Handle
              v-if="normalizeType(data.tipo) === 'decision'"
              id="source-right"
              type="source"
              :position="Position.Right"
            />
          </div>
        </template>
        <Background pattern-color="#cbd5e1" :gap="25" /><Controls />
      </VueFlow>
    </main>

    <!-- DIÁLOGO EDICIÓN DE NODO -->
    <v-dialog v-model="editDialog" max-width="700px">
      <v-card v-if="activeNode" class="rounded-xl pa-4">
        <v-card-title class="text-h5 font-weight-bold d-flex align-center">
          <v-icon color="secondary" class="mr-2">mdi-vector-point</v-icon>
          Configurar Paso
        </v-card-title>
        <v-card-text>
          <v-tabs v-model="nodeTab" color="primary" grow class="mb-4">
            <v-tab value="general">General</v-tab>
            <v-tab value="detalles">Operaciones</v-tab>
          </v-tabs>

          <v-window v-model="nodeTab">
            <v-window-item value="general">
              <v-row dense>
                <v-col cols="12">
                  <v-text-field v-model="nodeEditData.label" label="Nombre del Paso" variant="outlined" density="compact"></v-text-field>
                </v-col>
                <v-col cols="12" md="6">
                  <v-select v-model="nodeEditData.unidadEjecutoraId" :items="mppStore.unidades" :item-title="getItemTitle" item-value="id_unidad" label="Unidad" variant="outlined" density="compact"></v-select>
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field v-model="nodeEditData.responsable" label="Responsable (Cargo)" variant="outlined" density="compact"></v-text-field>
                </v-col>
              </v-row>
            </v-window-item>
            <v-window-item value="detalles">
              <v-row dense>
                <v-col cols="12">
                  <v-textarea v-model="nodeEditData.requisitos" label="Requisitos" rows="3" variant="outlined" density="compact"></v-textarea>
                </v-col>
                <v-col cols="12">
                  <v-textarea v-model="nodeEditData.operaciones" label="Operaciones / Instrucciones" rows="3" variant="outlined" density="compact"></v-textarea>
                </v-col>
              </v-row>
            </v-window-item>
          </v-window>
        </v-card-text>
        <v-card-actions class="px-6 pb-4">
          <v-btn color="error" variant="text" @click="deleteNode" class="rounded-lg text-uppercase">
            Eliminar Paso
          </v-btn>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="editDialog = false" class="rounded-lg text-uppercase">
            Cerrar
          </v-btn>
          <v-btn color="primary" variant="elevated" @click="updateNodeInfo" class="rounded-lg px-6 text-uppercase">
            Actualizar Paso
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.designer-layout {
  display: flex;
}
.mpp-node-container {
  padding: 14px;
  border: 2.5px solid #6366f1;
  min-width: 200px;
  max-width: 250px;
  min-height: 80px;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
}
.node-decision {
  clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
  width: 240px;
  height: 240px;
  padding: 55px 40px !important;
  text-align: center;
}
.node-inicio,
.node-fin {
  border-radius: 50px;
  min-width: 160px;
  text-align: center;
  border-width: 4px;
}
@media print {
  .sidebar,
  .v-btn,
  .v-divider,
  .resize-handle,
  .vue-flow__controls,
  .vue-flow__background {
    display: none !important;
  }
  .diagram-container {
    width: 100vw !important;
    height: 100vh !important;
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    background: white !important;
  }
  .designer-layout {
    display: block !important;
  }
}
</style>
