<template>
  <v-container fluid>
    <v-row>
      <!-- Panel de Control Izquierdo (Editor) -->
      <v-col cols="12" md="4">
        <v-card class="pa-4" elevation="3">
          <v-card-title class="text-h6 d-flex align-center">
            <v-icon color="primary" class="mr-2">mdi-pencil-ruler</v-icon>
            Editor de Matriz MPP
          </v-card-title>
          <v-divider class="my-3"></v-divider>

          <v-form>
            <!-- 1. Ubicación Jerárquica Completa -->
            <p class="text-caption font-weight-bold text-primary text-uppercase mb-2">1. Ubicación del Flujo</p>
            
            <v-select
              v-model="context.unidadId"
              :items="mppStore.unidades"
              item-title="nombre"
              item-value="id"
              label="Unidad Organizacional"
              variant="outlined"
              density="compact"
              @update:model-value="onUnidadChange"
              :loading="mppStore.loading && !mppStore.unidades.length"
            ></v-select>

            <v-select
              v-model="context.procesoId"
              :items="mppStore.procesos"
              item-title="descripcion"
              item-value="id"
              label="Proceso"
              variant="outlined"
              density="compact"
              :disabled="!context.unidadId"
              @update:model-value="onProcesoChange"
              :loading="mppStore.loading && context.unidadId"
            ></v-select>

            <v-select
              v-model="context.subprocesoId"
              :items="mppStore.subprocesos"
              item-title="descripcion"
              item-value="id"
              label="Subproceso"
              variant="outlined"
              density="compact"
              :disabled="!context.procesoId"
              @update:model-value="onSubprocesoChange"
              :loading="mppStore.loading && context.procesoId"
            ></v-select>

            <v-select
              v-model="context.procedimientoId"
              :items="mppStore.procedimientos"
              item-title="descripcion"
              item-value="id"
              label="Procedimiento Final"
              variant="outlined"
              density="compact"
              :disabled="!context.subprocesoId"
              @update:model-value="onProcedimientoChange"
              :loading="mppStore.loading && context.subprocesoId"
              class="mb-4"
            ></v-select>

            <v-divider class="mb-4"></v-divider>

            <!-- 2. Editor del Paso (Actividad) -->
            <p class="text-caption font-weight-bold text-secondary text-uppercase mb-2">
              {{ editingIndex !== null ? '2. Editando Paso #' + (editingIndex + 1) : '2. Nueva Actividad' }}
            </p>
            
            <v-select
              v-model="stepForm.unidadId"
              :items="mppStore.unidades"
              item-title="nombre"
              item-value="id"
              label="Responsable del Paso (Carril)"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-account-group"
            ></v-select>

            <v-textarea
              v-model="stepForm.descripcion"
              label="Descripción de la Actividad"
              variant="outlined"
              rows="2"
              prepend-inner-icon="mdi-text"
              class="mb-3"
            ></v-textarea>

            <v-item-group v-model="stepForm.shape" mandatory class="d-flex justify-space-around mb-4">
              <v-item v-for="shape in shapes" :key="shape.value" :value="shape.value" v-slot="{ isSelected, toggle }">
                <v-tooltip bottom :text="shape.label">
                  <template v-slot:activator="{ props }">
                    <v-btn
                      v-bind="props"
                      :color="isSelected ? 'secondary' : 'grey-lighten-3'"
                      :icon="shape.icon"
                      @click="toggle"
                      size="small"
                      elevation="1"
                    ></v-btn>
                  </template>
                </v-tooltip>
              </v-item>
            </v-item-group>

            <v-btn
              block
              :color="editingIndex !== null ? 'orange' : 'success'"
              class="mb-2"
              prepend-icon="mdi-plus"
              :disabled="!stepForm.unidadId || !stepForm.descripcion"
              @click="handleStepAction"
            >
              {{ editingIndex !== null ? 'Actualizar Paso' : 'Añadir a la Matriz' }}
            </v-btn>

            <v-btn
              v-if="editingIndex !== null"
              block
              variant="text"
              @click="cancelEdit"
            >
              Cancelar Edición
            </v-btn>
          </v-form>
        </v-card>

        <v-card class="pa-4 mt-4" elevation="2" border="primary" v-if="context.procedimientoId">
          <v-btn
            block
            color="primary"
            prepend-icon="mdi-content-save"
            :loading="mppStore.loading"
            @click="saveFullFlow"
          >
            Guardar Cambios en BD
          </v-btn>
        </v-card>
      </v-col>

      <!-- Panel de Visualización (Matriz) -->
      <v-col cols="12" md="8">
        <v-card class="pa-0 fill-height" elevation="3" min-height="750">
          <v-toolbar color="grey-lighten-4" density="compact">
            <v-toolbar-title class="text-subtitle-1 font-weight-black">Secuencia del Procedimiento</v-toolbar-title>
            <v-spacer></v-spacer>
            <v-btn icon="mdi-refresh" variant="text" @click="generateDiagram"></v-btn>
            <v-btn icon="mdi-download" color="primary" variant="text" @click="downloadDiagram"></v-btn>
          </v-toolbar>

          <div class="main-content-layout">
            <!-- Sidebar de Pasos -->
            <div class="steps-sidebar pa-2">
              <div v-if="flowSteps.length === 0" class="pa-4 text-center text-caption text-grey">Sin pasos</div>
              <div
                v-for="(step, index) in flowSteps"
                :key="step.id"
                class="step-item pa-2 mb-2"
                :class="{ 'editing-active': editingIndex === index }"
                @click="startEdit(index)"
              >
                <div class="d-flex justify-space-between align-center mb-1">
                  <v-chip size="x-small" color="primary" variant="flat">#{{ index + 1 }}</v-chip>
                  <v-btn icon="mdi-close" size="x-small" variant="text" color="error" @click.stop="removeStep(index)"></v-btn>
                </div>
                <div class="text-caption font-weight-bold text-truncate">{{ step.unidadNombre }}</div>
                <div class="text-caption text-truncate opacity-70">{{ step.descripcion }}</div>
              </div>
            </div>

            <!-- Area de Diagrama -->
            <div class="diagram-area">
              <div v-if="!context.procedimientoId" class="empty-state">
                <v-icon size="80" color="grey-lighten-3">mdi-arrow-decision-outline</v-icon>
                <p class="text-grey">Seleccione un procedimiento para ver o crear su flujo</p>
              </div>
              <div v-else-if="flowSteps.length === 0" class="empty-state">
                <v-icon size="80" color="grey-lighten-3">mdi-plus-box-multiple-outline</v-icon>
                <p class="text-grey">El procedimiento no tiene pasos definidos. Comience a añadir actividades.</p>
              </div>
              <div v-else class="mermaid-wrapper">
                <div :key="diagramDefinition" ref="mermaidContainer" class="mermaid">
                  {{ diagramDefinition }}
                </div>
              </div>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted, nextTick, watch, reactive } from 'vue';
import mermaid from 'mermaid';
import { useMppCoreStore } from '@/stores/mpp_core';

const mppStore = useMppCoreStore();

// 1. Estados de Contexto (Jerarquía Completa)
const context = reactive({
  unidadId: null,
  procesoId: null,
  subprocesoId: null,
  procedimientoId: null
});

// 2. Formulario del Paso
const stepForm = reactive({
  unidadId: null,
  descripcion: '',
  shape: 'process'
});

const editingIndex = ref(null);
const flowSteps = ref([]);
let stepCounter = Date.now();

// 3. Configuración de Formas
const shapes = [
  { value: 'start', label: 'Inicio / Fin', icon: 'mdi-play-circle-outline', mermaid: ['((', '))'] },
  { value: 'process', label: 'Actividad', icon: 'mdi-rectangle-outline', mermaid: ['[', ']'] },
  { value: 'decision', label: 'Decisión', icon: 'mdi-rhombus-outline', mermaid: ['{', '}'] },
  { value: 'document', label: 'Documento', icon: 'mdi-file-outline', mermaid: ['>', ']'] },
  { value: 'database', label: 'Base de Datos', icon: 'mdi-database-outline', mermaid: ['[(', ')]'] },
];

onMounted(async () => {
  mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    securityLevel: 'loose',
    themeVariables: {
      primaryColor: '#F0F7FF',
      primaryTextColor: '#1A237E',
      primaryBorderColor: '#3949AB',
      lineColor: '#607D8B',
      secondaryColor: '#C2185B',
      tertiaryColor: '#FFFFFF',
      mainBkg: '#FFFFFF',
      clusterBkg: '#f8fafc',
      clusterBorder: '#cbd5e1'
    },
    flowchart: { useMaxWidth: false, htmlLabels: true, curve: 'basis' }
  });
  await mppStore.fetchUnidades();
});

// --- MANEJADORES DE CASCADA ---

const onUnidadChange = async (val) => {
  context.procesoId = null;
  context.subprocesoId = null;
  context.procedimientoId = null;
  flowSteps.value = [];
  if (val) await mppStore.fetchProcesos(val);
};

const onProcesoChange = async (val) => {
  context.subprocesoId = null;
  context.procedimientoId = null;
  flowSteps.value = [];
  if (val) await mppStore.fetchSubprocesos(val);
};

const onSubprocesoChange = async (val) => {
  context.procedimientoId = null;
  flowSteps.value = [];
  if (val) await mppStore.fetchProcedimientos(val);
};

const onProcedimientoChange = async (val) => {
  flowSteps.value = [];
  if (val) {
    const data = await mppStore.fetchPasos(val);
    if (data && data.length > 0) {
      flowSteps.value = data.map(p => ({
        id: `node_${p.id || stepCounter++}`,
        unidadId: p.unidadId,
        unidadNombre: mppStore.unidades.find(u => u.id === p.unidadId)?.nombre || 'Unidad',
        descripcion: p.descripcion,
        shape: p.forma || 'process'
      }));
      generateDiagram();
    }
  }
};

// --- GESTIÓN DE PASOS ---

const handleStepAction = () => {
  const unidad = mppStore.unidades.find(u => u.id === stepForm.unidadId);
  const stepData = {
    id: editingIndex.value !== null ? flowSteps.value[editingIndex.value].id : `n${stepCounter++}`,
    unidadId: stepForm.unidadId,
    unidadNombre: unidad?.nombre || 'Unidad',
    descripcion: stepForm.descripcion,
    shape: stepForm.shape
  };

  if (editingIndex.value !== null) {
    flowSteps.value[editingIndex.value] = stepData;
    editingIndex.value = null;
  } else {
    flowSteps.value.push(stepData);
  }

  stepForm.descripcion = '';
  generateDiagram();
};

const startEdit = (index) => {
  editingIndex.value = index;
  const step = flowSteps.value[index];
  stepForm.unidadId = step.unidadId;
  stepForm.descripcion = step.descripcion;
  stepForm.shape = step.shape;
};

const cancelEdit = () => {
  editingIndex.value = null;
  stepForm.descripcion = '';
};

const removeStep = (index) => {
  flowSteps.value.splice(index, 1);
  if (editingIndex.value === index) cancelEdit();
  generateDiagram();
};

const clearFlow = () => {
  flowSteps.value = [];
  diagramDefinition.value = '';
};

// --- MOTOR DE DIAGRAMA ---
const diagramDefinition = ref('');
const mermaidContainer = ref(null);

const generateDiagram = async () => {
  if (flowSteps.value.length === 0) {
    diagramDefinition.value = '';
    return;
  }

  let def = 'flowchart TD\n\n';
  const unitsMap = {};
  flowSteps.value.forEach(s => {
    if (!unitsMap[s.unidadId]) unitsMap[s.unidadId] = { nombre: s.unidadNombre, pasos: [] };
    unitsMap[s.unidadId].pasos.push(s);
  });

  // Carriles
  Object.keys(unitsMap).forEach(uId => {
    const u = unitsMap[uId];
    const subId = `U${uId.toString().replace(/[^a-zA-Z0-9]/g, '')}`;
    def += `  subgraph ${subId} ["<span style='font-size:13px; font-weight:900;'>${u.nombre}</span>"]\n    direction TB\n`;
    u.pasos.forEach(p => {
      const sType = shapes.find(s => s.value === p.shape);
      def += `    ${p.id}${sType.mermaid[0]}"${p.descripcion.replace(/"/g, "'")}"${sType.mermaid[1]}\n`;
    });
    def += '  end\n\n';
  });

  // Conexiones
  for (let i = 0; i < flowSteps.value.length - 1; i++) {
    def += `  ${flowSteps.value[i].id} ==> ${flowSteps.value[i+1].id}\n`;
  }

  diagramDefinition.value = def;
  await nextTick();
  renderMermaid();
};

const renderMermaid = async () => {
  try {
    if (mermaidContainer.value) {
      mermaidContainer.value.innerHTML = diagramDefinition.value;
      mermaidContainer.value.removeAttribute('data-processed');
      await mermaid.run({ nodes: [mermaidContainer.value] });
    }
  } catch (err) {}
};

const saveFullFlow = async () => {
  const payload = flowSteps.value.map((s, idx) => ({
    orden: idx + 1,
    unidadId: s.unidadId,
    descripcion: s.descripcion,
    forma: s.shape
  }));
  
  const success = await mppStore.saveFlujoCompleto(context.procedimientoId, payload);
  if (success) {
    alert("Secuencia de pasos guardada exitosamente.");
  }
};

const downloadDiagram = () => {
  const svg = mermaidContainer.value?.querySelector('svg');
  if (!svg) return;
  const canvas = document.createElement("canvas");
  const img = new Image();
  img.onload = () => {
    canvas.width = img.width; canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    const link = document.createElement("a");
    link.download = `flujo_mpp_${context.procedimientoId}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };
  img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(new XMLSerializer().serializeToString(svg))));
};
</script>

<style scoped>
.main-content-layout {
  display: flex;
  height: calc(100vh - 200px);
  background: #f1f5f9;
}

.steps-sidebar {
  width: 220px;
  background: #fff;
  border-right: 1px solid #e2e8f0;
  overflow-y: auto;
  box-shadow: 2px 0 5px rgba(0,0,0,0.02);
}

.step-item {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.step-item:hover {
  border-color: #3b82f6;
  background: #f0f9ff;
  transform: translateX(2px);
}

.editing-active {
  border-color: #f59e0b !important;
  background: #fffbeb !important;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.15);
}

.diagram-area {
  flex-grow: 1;
  overflow: auto;
  padding: 30px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.mermaid-wrapper {
  background: #fff;
  padding: 50px;
  border-radius: 16px;
  box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
  min-width: 600px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.opacity-70 { opacity: 0.7; }
</style>
