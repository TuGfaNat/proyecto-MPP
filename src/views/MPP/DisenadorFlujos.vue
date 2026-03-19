<template>
  <v-container fluid>
    <v-row>
      <!-- Panel de Control Izquierdo -->
      <v-col cols="12" md="4">
        <v-card class="pa-4" elevation="2">
          <v-card-title class="text-h5 d-flex align-center">
            <v-icon color="primary" class="mr-2">mdi-vector-combine</v-icon>
            Configuración del Flujo
          </v-card-title>
          <v-divider class="my-4"></v-divider>

          <v-form>
            <!-- Selector de Área -->
            <v-select
              v-model="selectedArea"
              :items="mppStore.areas"
              item-title="descripcion"
              item-value="id"
              label="1. Seleccione el Área"
              prepend-inner-icon="mdi-domain"
              variant="outlined"
              density="comfortable"
              @update:model-value="onAreaChange"
              :loading="mppStore.loading && !mppStore.areas.length"
            ></v-select>

            <!-- Selector de Proceso -->
            <div class="d-flex align-center mb-4">
              <v-select
                v-model="selectedProceso"
                :items="mppStore.procesos"
                item-title="descripcion"
                item-value="id"
                label="2. Seleccione el Proceso"
                prepend-inner-icon="mdi-cog"
                variant="outlined"
                density="comfortable"
                :disabled="!selectedArea"
                @update:model-value="onProcesoChange"
                :loading="mppStore.loading && selectedArea"
                hide-details
                class="flex-grow-1 mr-2"
              ></v-select>
              <v-btn
                icon="mdi-plus"
                color="primary"
                size="small"
                variant="elevated"
                :disabled="!selectedArea"
                @click="openAddDialog('proceso')"
              ></v-btn>
            </div>

            <!-- Selector de Subproceso -->
            <div class="d-flex align-center mb-4">
              <v-select
                v-model="selectedSubproceso"
                :items="mppStore.subprocesos"
                item-title="descripcion"
                item-value="id"
                label="3. Seleccione el Subproceso"
                prepend-inner-icon="mdi-file-tree"
                variant="outlined"
                density="comfortable"
                :disabled="!selectedProceso"
                @update:model-value="onSubprocesoChange"
                :loading="mppStore.loading && selectedProceso"
                hide-details
                class="flex-grow-1 mr-2"
              ></v-select>
              <v-btn
                icon="mdi-plus"
                color="primary"
                size="small"
                variant="elevated"
                :disabled="!selectedProceso"
                @click="openAddDialog('subproceso')"
              ></v-btn>
            </div>

            <!-- Selector de Procedimiento -->
            <div class="d-flex align-center mb-4">
              <v-select
                v-model="selectedProcedimiento"
                :items="mppStore.procedimientos"
                item-title="descripcion"
                item-value="id"
                label="4. Seleccione el Procedimiento"
                prepend-inner-icon="mdi-format-list-checks"
                variant="outlined"
                density="comfortable"
                :disabled="!selectedSubproceso"
                @update:model-value="generateDiagram"
                :loading="mppStore.loading && selectedSubproceso"
                hide-details
                class="flex-grow-1 mr-2"
              ></v-select>
              <v-btn
                icon="mdi-plus"
                color="primary"
                size="small"
                variant="elevated"
                :disabled="!selectedSubproceso"
                @click="openAddDialog('procedimiento')"
              ></v-btn>
            </div>
          </v-form>

          <v-alert
            v-if="mppStore.error"
            type="error"
            variant="tonal"
            class="mt-4"
            closable
          >
            {{ mppStore.error }}
          </v-alert>
        </v-card>

        <!-- Diálogo para Agregar Nuevo -->
        <v-dialog v-model="addDialog.show" max-width="500px">
          <v-card>
            <v-card-title class="text-h5 pa-4">
              Agregar Nuevo {{ addDialog.typeLabel }}
            </v-card-title>
            <v-card-text>
              <v-text-field
                v-model="addDialog.descripcion"
                label="Descripción / Nombre"
                variant="outlined"
                autofocus
                @keyup.enter="handleSave"
              ></v-text-field>
            </v-card-text>
            <v-card-actions class="pa-4 pt-0">
              <v-spacer></v-spacer>
              <v-btn color="grey-darken-1" variant="text" @click="addDialog.show = false">Cancelar</v-btn>
              <v-btn
                color="primary"
                variant="elevated"
                :loading="addDialog.saving"
                :disabled="!addDialog.descripcion"
                @click="handleSave"
              >Guardar</v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

        <!-- Información Adicional -->
        <v-card class="pa-4 mt-4" elevation="1" variant="outlined">
          <v-card-subtitle class="text-uppercase font-weight-bold">Resumen de Selección</v-card-subtitle>
          <v-list density="compact">
            <v-list-item v-if="selectedArea" prepend-icon="mdi-check-circle" color="success">
              Área ID: {{ selectedArea }}
            </v-list-item>
            <v-list-item v-if="selectedProceso" prepend-icon="mdi-check-circle" color="success">
              Proceso ID: {{ selectedProceso }}
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>

      <!-- Panel de Visualización Derecho -->
      <v-col cols="12" md="8">
        <v-card class="pa-4 fill-height" elevation="2">
          <v-card-title class="text-h5 d-flex align-center">
            <v-icon color="secondary" class="mr-2">mdi-chart-bubble</v-icon>
            Diagrama de Flujo (Mermaid)
            <v-spacer></v-spacer>
            <v-btn
              v-if="selectedProcedimiento"
              icon="mdi-refresh"
              variant="text"
              @click="generateDiagram"
            ></v-btn>
          </v-card-title>
          <v-divider class="my-4"></v-divider>

          <div v-if="!selectedProcedimiento" class="d-flex flex-column align-center justify-center fill-height py-12 text-grey">
            <v-icon size="64" class="mb-4">mdi-selection-ellipse-arrow-inside</v-icon>
            <p>Seleccione un procedimiento para visualizar su diagrama de flujo.</p>
          </div>

          <div v-else class="mermaid-wrapper">
            <div ref="mermaidContainer" class="mermaid">
              {{ diagramDefinition }}
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted, nextTick, watch } from 'vue';
import mermaid from 'mermaid';
import { useMppCoreStore } from '@/stores/mpp_core';

const mppStore = useMppCoreStore();

// Estados de selección
const selectedArea = ref(null);
const selectedProceso = ref(null);
const selectedSubproceso = ref(null);
const selectedProcedimiento = ref(null);

// Estado para el diálogo de agregar
const addDialog = ref({
  show: false,
  type: '', // 'proceso', 'subproceso', 'procedimiento'
  typeLabel: '',
  descripcion: '',
  saving: false
});

// Definición del diagrama
const diagramDefinition = ref('');
const mermaidContainer = ref(null);

onMounted(async () => {
  mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    themeVariables: {
      primaryColor: '#1976D2',
      primaryTextColor: '#fff',
      lineColor: '#546E7A',
      secondaryColor: '#FF4081',
      tertiaryColor: '#F5F5F5'
    }
  });

  // Cargar áreas iniciales
  await mppStore.fetchAreas();
});

// Lógica del diálogo
const openAddDialog = (type) => {
  addDialog.value.type = type;
  addDialog.value.typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
  addDialog.value.descripcion = '';
  addDialog.value.show = true;
};

const handleSave = async () => {
  if (!addDialog.value.descripcion) return;
  
  addDialog.value.saving = true;
  let success = false;
  
  if (addDialog.value.type === 'proceso') {
    success = await mppStore.saveProceso(selectedArea.value, addDialog.value.descripcion);
  } else if (addDialog.value.type === 'subproceso') {
    success = await mppStore.saveSubproceso(selectedProceso.value, addDialog.value.descripcion);
  } else if (addDialog.value.type === 'procedimiento') {
    success = await mppStore.saveProcedimiento(selectedSubproceso.value, addDialog.value.descripcion);
  }

  if (success) {
    addDialog.value.show = false;
  }
  addDialog.value.saving = false;
};

// Manejadores de cambio
const onAreaChange = async (areaId) => {
  selectedProceso.value = null;
  selectedSubproceso.value = null;
  selectedProcedimiento.value = null;
  diagramDefinition.value = '';
  if (areaId) await mppStore.fetchProcesos(areaId);
};

const onProcesoChange = async (procesoId) => {
  selectedSubproceso.value = null;
  selectedProcedimiento.value = null;
  diagramDefinition.value = '';
  if (procesoId) await mppStore.fetchSubprocesos(procesoId);
};

const onSubprocesoChange = async (subprocesoId) => {
  selectedProcedimiento.value = null;
  diagramDefinition.value = '';
  if (subprocesoId) await mppStore.fetchProcedimientos(subprocesoId);
};

// Generar el diagrama basado en la selección
const generateDiagram = async () => {
  if (!selectedProcedimiento.value) return;

  const proc = mppStore.procedimientos.find(p => p.id === selectedProcedimiento.value);
  const sub = mppStore.subprocesos.find(s => s.id === selectedSubproceso.value);
  
  // Construimos un diagrama de ejemplo dinámico
  // En el futuro, esto podría venir de un endpoint de 'pasos'
  diagramDefinition.value = `
    graph TD
      Start((Inicio)) --> A[${sub.descripcion}]
      A --> B{¿Es válido?}
      B -- Sí --> C[Ejecutar: ${proc.descripcion}]
      B -- No --> D[Revisión]
      C --> End((Fin))
      D --> A
  `;

  await nextTick();
  try {
    // Limpiamos el contenedor antes de renderizar
    if (mermaidContainer.value) {
      mermaidContainer.value.removeAttribute('data-processed');
      await mermaid.run({
        nodes: [mermaidContainer.value]
      });
    }
  } catch (error) {
    console.error("Error al renderizar Mermaid:", error);
  }
};
</script>

<style scoped>
.mermaid-wrapper {
  background-color: #fafafa;
  border-radius: 8px;
  padding: 24px;
  min-height: 400px;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: auto;
}

.mermaid {
  width: 100%;
  display: flex;
  justify-content: center;
}

/* Estilo para los selectores de Vuetify */
:deep(.v-select .v-field) {
  border-radius: 8px;
}
</style>
