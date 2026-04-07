<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <v-card elevation="2">
          <v-card-title class="text-h5 bg-primary text-white pa-4">
            <v-icon start icon="mdi-sitemap"></v-icon>
            Gestión de Estructura MPP
          </v-card-title>

          <v-stepper v-model="step" :items="['Unidad', 'Procesos', 'Subprocesos', 'Procedimientos']" show-actions>
            <template v-slot:item.1>
              <v-card title="Seleccione la Unidad Organizacional" flat>
                <v-card-text>
                  <v-autocomplete
                    v-model="selectedUnidad"
                    :items="mppStore.unidades"
                    item-title="nombre"
                    item-value="id"
                    label="Buscar Unidad..."
                    variant="outlined"
                    prepend-inner-icon="mdi-domain"
                    @update:model-value="onUnidadSelected"
                    :loading="mppStore.loading"
                  ></v-autocomplete>
                  <v-alert v-if="!selectedUnidad" type="info" variant="tonal" class="mt-4">
                    Debe seleccionar una unidad para continuar con la gestión de procesos.
                  </v-alert>
                </v-card-text>
              </v-card>
            </template>

            <template v-slot:item.2>
              <v-card :title="`Procesos - ${unidadNombre}`" flat>
                <v-card-text>
                  <div class="d-flex justify-end mb-4">
                    <v-btn color="success" prepend-icon="mdi-plus" @click="openDialog('proceso')">Nuevo Proceso</v-btn>
                  </div>
                  <v-data-table :headers="headers" :items="mppStore.procesos" density="comfortable">
                    <template v-slot:item.actions="{ item }">
                      <v-icon small class="mr-2" color="primary" @click="selectProceso(item)">mdi-arrow-right-bold-circle</v-icon>
                      <v-icon small class="mr-2" color="orange" @click="editItem(item, 'proceso')">mdi-pencil</v-icon>
                      <v-icon small color="error" @click="deleteItem(item, 'proceso')">mdi-delete</v-icon>
                    </template>
                  </v-data-table>
                  <v-alert v-if="selectedProceso" type="success" variant="tonal" class="mt-4">
                    Proceso seleccionado: <strong>{{ selectedProceso.descripcion }}</strong>. Avance al siguiente paso.
                  </v-alert>
                </v-card-text>
              </v-card>
            </template>

            <template v-slot:item.3>
              <v-card :title="`Subprocesos de: ${selectedProceso?.descripcion}`" flat>
                <v-card-text>
                  <div class="d-flex justify-end mb-4">
                    <v-btn color="success" prepend-icon="mdi-plus" @click="openDialog('subproceso')">Nuevo Subproceso</v-btn>
                  </div>
                  <v-data-table :headers="headers" :items="mppStore.subprocesos" density="comfortable">
                    <template v-slot:item.actions="{ item }">
                      <v-icon small class="mr-2" color="primary" @click="selectSubproceso(item)">mdi-arrow-right-bold-circle</v-icon>
                      <v-icon small class="mr-2" color="orange" @click="editItem(item, 'subproceso')">mdi-pencil</v-icon>
                      <v-icon small color="error" @click="deleteItem(item, 'subproceso')">mdi-delete</v-icon>
                    </template>
                  </v-data-table>
                  <v-alert v-if="selectedSubproceso" type="success" variant="tonal" class="mt-4">
                    Subproceso seleccionado: <strong>{{ selectedSubproceso.descripcion }}</strong>. Avance al siguiente paso.
                  </v-alert>
                </v-card-text>
              </v-card>
            </template>

            <template v-slot:item.4>
              <v-card :title="`Procedimientos de: ${selectedSubproceso?.descripcion}`" flat>
                <v-card-text>
                  <div class="d-flex justify-end mb-4">
                    <v-btn color="success" prepend-icon="mdi-plus" @click="openDialog('procedimiento')">Nuevo Procedimiento</v-btn>
                  </div>
                  <v-data-table :headers="headers" :items="mppStore.procedimientos" density="comfortable">
                    <template v-slot:item.actions="{ item }">
                      <v-btn color="primary" size="small" prepend-icon="mdi-draw" @click="goToFlow(item)">Diseñar Flujo</v-btn>
                      <v-icon small class="ml-4 mr-2" color="orange" @click="editItem(item, 'procedimiento')">mdi-pencil</v-icon>
                      <v-icon small color="error" @click="deleteItem(item, 'procedimiento')">mdi-delete</v-icon>
                    </template>
                  </v-data-table>
                </v-card-text>
              </v-card>
            </template>
          </v-stepper>
        </v-card>
      </v-col>
    </v-row>

    <!-- Dialog for CRUD -->
    <v-dialog v-model="dialog.show" max-width="500px">
      <v-card>
        <v-card-title class="bg-grey-lighten-3">
          {{ dialog.editMode ? 'Editar' : 'Nuevo' }} {{ dialog.type.toUpperCase() }}
        </v-card-title>
        <v-card-text class="pt-4">
          <v-text-field
            v-model="dialog.formData.descripcion"
            label="Descripción"
            variant="outlined"
            required
          ></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey" variant="text" @click="dialog.show = false">Cancelar</v-btn>
          <v-btn color="primary" @click="saveDialog">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted, reactive, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useMppCoreStore } from '@/stores/mpp_core';

const mppStore = useMppCoreStore();
const router = useRouter();

const step = ref(1);
const selectedUnidad = ref(null);
const selectedProceso = ref(null);
const selectedSubproceso = ref(null);

const headers = [
  { title: 'Descripción', key: 'descripcion', align: 'start' },
  { title: 'Acciones', key: 'actions', align: 'end', sortable: false },
];

const dialog = reactive({
  show: false,
  type: '', // 'proceso', 'subproceso', 'procedimiento'
  editMode: false,
  formData: {
    id: null,
    descripcion: ''
  }
});

onMounted(async () => {
  await mppStore.fetchUnidades();
});

const unidadNombre = computed(() => {
  return mppStore.unidades.find(u => u.id === selectedUnidad.ref)?.nombre || 'Seleccionada';
});

const onUnidadSelected = async (val) => {
  if (val) {
    await mppStore.fetchProcesos(val);
    selectedProceso.value = null;
    selectedSubproceso.value = null;
    step.value = 2;
  }
};

const selectProceso = async (proceso) => {
  selectedProceso.value = proceso;
  await mppStore.fetchSubprocesos(proceso.id);
  selectedSubproceso.value = null;
  step.value = 3;
};

const selectSubproceso = async (subproceso) => {
  selectedSubproceso.value = subproceso;
  await mppStore.fetchProcedimientos(subproceso.id);
  step.value = 4;
};

const goToFlow = (procedimiento) => {
  // Navegar al diseñador pasando los IDs para que sean bloqueados
  router.push({
    name: 'diagrama_flujos',
    query: {
      u: selectedUnidad.value,
      p: selectedProceso.value.id,
      s: selectedSubproceso.value.id,
      pr: procedimiento.id
    }
  });
};

// --- CRUD LOGIC ---

const openDialog = (type, item = null) => {
  dialog.type = type;
  dialog.editMode = !!item;
  if (item) {
    dialog.formData = { ...item };
  } else {
    dialog.formData = { id: null, descripcion: '' };
  }
  dialog.show = true;
};

const editItem = (item, type) => {
  openDialog(type, item);
};

const deleteItem = async (item, type) => {
  if (confirm(`¿Está seguro de eliminar este ${type}?`)) {
    try {
      if (type === 'proceso') await mppStore.deleteProceso(item.id);
      if (type === 'subproceso') await mppStore.deleteSubproceso(item.id);
      if (type === 'procedimiento') await mppStore.deleteProcedimiento(item.id);
      
      // Refrescar lista
      refreshList(type);
    } catch (e) {
      alert("Error al eliminar");
    }
  }
};

const saveDialog = async () => {
  try {
    const data = { ...dialog.formData };
    if (dialog.type === 'proceso') {
      data.unidadId = selectedUnidad.value;
      if (dialog.editMode) await mppStore.updateProceso(data.id, data);
      else await mppStore.saveProceso(data);
    } else if (dialog.type === 'subproceso') {
      data.procesoId = selectedProceso.value.id;
      if (dialog.editMode) await mppStore.updateSubproceso(data.id, data);
      else await mppStore.saveSubproceso(data);
    } else if (dialog.type === 'procedimiento') {
      data.subprocesoId = selectedSubproceso.value.id;
      if (dialog.editMode) await mppStore.updateProcedimiento(data.id, data);
      else await mppStore.saveProcedimiento(data);
    }
    
    dialog.show = false;
    refreshList(dialog.type);
  } catch (e) {
    alert("Error al guardar");
  }
};

const refreshList = async (type) => {
  if (type === 'proceso') await mppStore.fetchProcesos(selectedUnidad.value);
  if (type === 'subproceso') await mppStore.fetchSubprocesos(selectedProceso.value.id);
  if (type === 'procedimiento') await mppStore.fetchProcedimientos(selectedSubproceso.value.id);
};
</script>

<style scoped>
.v-stepper {
  box-shadow: none !important;
}
</style>
