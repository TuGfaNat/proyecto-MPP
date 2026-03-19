<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <div class="d-flex align-center mb-2">
          <v-icon color="teal-darken-2" size="32" class="mr-3">mdi-cog-sync</v-icon>
          <h1 class="text-h4 font-weight-bold">Reporte Operativo de Gestión</h1>
        </div>
        <p class="text-subtitle-1 text-medium-emphasis mb-6">
          Estructura interna y operatividad de unidades administrativas.
        </p>
      </v-col>
    </v-row>

    <!-- ENTRADA: Selección en Cascada Jerárquica -->
    <v-card class="mb-6 rounded-lg" elevation="2" border>
      <v-card-title class="bg-teal-lighten-5 text-teal-darken-4 text-subtitle-2 font-weight-bold">
        ENTRADA: ESCOGE UNIDAD MADRE OPERATIVA
      </v-card-title>
      <v-card-text class="pt-4">
        <v-row align="center">
          <!-- Filtro 1: Clase (Ordenada por Peso) -->
          <v-col cols="12" md="4">
            <v-select
              v-model="claseSeleccionada"
              :items="listaClasesOrdenadas"
              item-title="descripcion"
              item-value="descripcion"
              label="1. SELECCIONE NIVEL ORGANIZACIONAL"
              prepend-inner-icon="mdi-stairs-up"
              variant="outlined"
              hide-details
              clearable
              placeholder="Ej. DEPARTAMENTO..."
              @update:model-value="unidadMadre = null"
            ></v-select>
          </v-col>

          <!-- Filtro 2: Unidad Madre -->
          <v-col cols="12" md="8">
            <v-autocomplete
              v-model="unidadMadre"
              :items="unidadesFiltradasPorClase"
              item-title="nombre"
              item-value="id"
              :disabled="!claseSeleccionada"
              :label="claseSeleccionada ? `2. SELECCIONE ${claseSeleccionada}` : '2. (ESPERANDO NIVEL)'"
              prepend-inner-icon="mdi-office-building-cog"
              variant="outlined"
              hide-details
              clearable
              return-object
              placeholder="Busque la unidad operativa..."
            ></v-autocomplete>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-row v-if="loading">
      <v-col cols="12" class="text-center pa-12">
        <v-progress-circular indeterminate color="teal" size="64"></v-progress-circular>
      </v-col>
    </v-row>

    <template v-else-if="unidadMadre">
      <!-- SALIDA: Conteo Operativo (Slide 3 PDF) -->
      <v-row>
        <v-col cols="12">
          <div class="text-overline mb-2 text-grey-darken-1">SALIDA: UNIDADES DEPENDIENTES EN CANTIDADES</div>
        </v-col>
        <v-col v-for="(count, type) in conteoOperativo" :key="type" cols="12" sm="4">
          <v-card variant="flat" border class="text-center pa-5 rounded-lg bg-teal-lighten-5">
            <div class="text-overline mb-1 text-teal-darken-4 font-weight-black">{{ type }}</div>
            <div class="text-h2 font-weight-black text-teal-darken-2">{{ count }}</div>
          </v-card>
        </v-col>
      </v-row>

      <!-- SALIDA REPORTE GENERAL: Árbol Jerárquico -->
      <v-row class="mt-6">
        <v-col cols="12">
          <v-card elevation="2" class="rounded-lg">
            <v-card-title class="pa-4 bg-teal-darken-1 text-white d-flex align-center">
              <v-icon start color="white">mdi-format-list-checks</v-icon>
              SALIDA REPORTE GENERAL: {{ unidadMadre.nombre }}
              <v-spacer></v-spacer>
              <v-chip size="small" color="white" variant="outlined">{{ arbolDependencias.length }} items</v-chip>
            </v-card-title>
            <v-divider></v-divider>
            <v-list class="pa-0">
              <template v-if="arbolDependencias.length > 0">
                <v-list-item
                  v-for="item in arbolDependencias"
                  :key="item.id"
                  :style="{ paddingLeft: (item.level * 32 + 16) + 'px' }"
                  class="border-bottom py-3"
                >
                  <template v-slot:prepend>
                    <v-icon :color="item.level === 0 ? 'teal' : 'grey-lighten-1'" size="small">
                      {{ item.level === 0 ? 'mdi-folder-network' : 'mdi-subdirectory-arrow-right' }}
                    </v-icon>
                  </template>
                  <v-list-item-title class="font-weight-bold text-teal-darken-4">
                    {{ item.nombre }}
                  </v-list-item-title>
                  <v-list-item-subtitle class="mt-1">
                    <v-chip size="x-small" label color="grey-lighten-3" class="mr-2 text-grey-darken-2 font-weight-black">CÓDIGO: {{ item.codigo }}</v-chip>
                    <v-chip size="x-small" :color="getColorClase(item.tipo_unidad)" variant="flat" label>{{ item.tipo_unidad }}</v-chip>
                  </v-list-item-subtitle>
                  <template v-slot:append>
                    <v-chip size="x-small" :color="item.relacion === 'L' ? 'grey' : 'orange'" variant="tonal" class="font-weight-bold">
                      {{ item.str_relacion }}
                    </v-chip>
                  </template>
                </v-list-item>
              </template>
              <v-list-item v-else class="pa-12 text-center text-grey">
                <v-icon size="64" color="grey-lighten-2" class="mb-4">mdi-folder-open-outline</v-icon>
                <div class="text-h6">Sin dependencias operativas</div>
                <div class="text-caption">No se encontraron divisiones o secciones para esta unidad madre.</div>
              </v-list-item>
            </v-list>
          </v-card>
        </v-col>
      </v-row>
    </template>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAllUnidadesMofStore } from '../../stores/unidades_mof';
import { useAllClasesMofStore } from '../../stores/clases_mof';

const unidadesStore = useAllUnidadesMofStore();
const clasesStore = useAllClasesMofStore();

const loading = ref(true);
const claseSeleccionada = ref(null);
const unidadMadre = ref(null);

onMounted(async () => {
  loading.value = true;
  await Promise.all([
    unidadesStore.getFetchUnidades(),
    clasesStore.getFetchClases()
  ]);
  loading.value = false;
});

// Ordenar las clases por su peso (Rectorado=1, Facultad=3...)
const listaClasesOrdenadas = computed(() => {
  return [...clasesStore.clases].sort((a, b) => a.peso - b.peso);
});

const unidadesFiltradasPorClase = computed(() => {
  if (!claseSeleccionada.value) return [];
  return (unidadesStore.unidades || []).filter(u => u.tipo_unidad === claseSeleccionada.value);
});

// Lógica recursiva para encontrar TODA la estructura operativa descendiente
function getDescendientes(parentId, level = 0) {
  const todas = unidadesStore.unidades || [];
  let result = [];
  const hijos = todas.filter(u => String(u.parent) === String(parentId));
  
  hijos.forEach(hijo => {
    result.push({ ...hijo, level });
    result = [...result, ...getDescendientes(hijo.id, level + 1)];
  });
  return result;
}

const arbolDependencias = computed(() => {
  if (!unidadMadre.value) return [];
  return getDescendientes(unidadMadre.value.id);
});

const conteoOperativo = computed(() => {
  const counts = { 'DIVISIONES': 0, 'SECCIONES': 0, 'OTRAS UNIDADES': 0 };
  arbolDependencias.value.forEach(u => {
    if (u.tipo_unidad === 'DIVISIÓN' || u.tipo_unidad === 'DIVISION') counts['DIVISIONES']++;
    else if (u.tipo_unidad === 'SECCIÓN' || u.tipo_unidad === 'SECCION') counts['SECCIONES']++;
    else counts['OTRAS UNIDADES']++;
  });
  return counts;
});

const getColorClase = (clase) => {
  const map = {
    'FACULTAD': 'blue-darken-2',
    'DEPARTAMENTO': 'light-blue-darken-1',
    'DIVISIÓN': 'teal-darken-1',
    'DIVISION': 'teal-darken-1',
    'SECCIÓN': 'cyan-darken-1',
    'SECCION': 'cyan-darken-1'
  };
  return map[clase] || 'grey-darken-1';
};
</script>

<style scoped>
.border-bottom {
  border-bottom: 1px solid #f0f0f0;
}
</style>
