<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <div class="d-flex align-center mb-2">
          <v-icon color="primary" size="32" class="mr-3">mdi-office-building-cog</v-icon>
          <h1 class="text-h4 font-weight-bold text-uppercase">Reporte Ejecutivo Institucional</h1>
        </div>
        <p class="text-subtitle-1 text-medium-emphasis mb-6">
          Consolidado estratégico: Análisis por Clase, Nivel, Tipo y Relación.
        </p>
      </v-col>
    </v-row>

    <!-- Filtros de Entrada (Interactivos) -->
    <v-card class="mb-6 rounded-lg" elevation="2" border>
      <v-card-text>
        <v-row align="center" dense>
          <v-col cols="12" md="2">
            <v-select v-model="filtroClase" :items="listaClases" label="CLASE" variant="outlined" hide-details clearable density="compact"></v-select>
          </v-col>
          <v-col cols="12" md="2">
            <v-select v-model="filtroNivel" :items="listaNiveles" label="NIVEL" variant="outlined" hide-details clearable density="compact"></v-select>
          </v-col>
          <v-col cols="12" md="3">
            <v-select v-model="filtroTipo" :items="listaTipos" label="TIPO" variant="outlined" hide-details clearable density="compact"></v-select>
          </v-col>
          <v-col cols="12" md="3">
            <v-select v-model="filtroRelacion" :items="listaRelaciones" label="RELACIÓN" variant="outlined" hide-details clearable density="compact"></v-select>
          </v-col>
          <v-col cols="12" md="2">
            <v-btn color="primary" variant="flat" block @click="resetFiltros" prepend-icon="mdi-refresh">RESET</v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-row v-if="loading">
      <v-col cols="12" class="text-center pa-12">
        <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
      </v-col>
    </v-row>

    <template v-else>
      <!-- Resumen Global -->
      <v-row class="mb-4">
        <v-col cols="12" md="3">
          <v-card theme="dark" color="primary" elevation="4" class="rounded-lg h-100 text-center py-6">
            <div class="text-overline opacity-70">TOTAL UNIDADES</div>
            <div class="text-h2 font-weight-black">{{ unidadesFiltradas.length }}</div>
          </v-card>
        </v-col>
        
        <!-- Acordeones de Desglose -->
        <v-col cols="12" md="9">
          <v-row dense>
            <v-col cols="12" md="3" v-for="(group, key) in agrupaciones" :key="key">
              <v-card elevation="2" class="rounded-lg h-100" style="max-height: 250px; display: flex; flex-direction: column;">
                <v-card-title class="pa-2 d-flex align-center bg-grey-lighten-4 text-caption font-weight-bold">
                  <v-icon start :color="group.color" size="small">{{ group.icon }}</v-icon>
                  {{ group.title }}
                </v-card-title>
                <v-card-text class="pa-0 overflow-y-auto">
                  <v-expansion-panels variant="accordion">
                    <v-expansion-panel v-for="(items, label) in group.data" :key="label" elevation="0">
                      <v-expansion-panel-title class="py-1 px-3 min-height-unset">
                        <div class="d-flex justify-space-between align-center w-100 pr-2">
                          <span class="text-xxs font-weight-bold">{{ label }}</span>
                          <v-chip size="x-small" :color="group.color" variant="flat">{{ items.length }}</v-chip>
                        </div>
                      </v-expansion-panel-title>
                      <v-expansion-panel-text class="pa-0">
                        <v-list density="compact" class="pa-0">
                          <v-list-item v-for="u in items" :key="u.id" class="border-bottom py-0">
                            <v-list-item-title class="text-xxs">{{ u.nombre }}</v-list-item-title>
                          </v-list-item>
                        </v-list>
                      </v-expansion-panel-text>
                    </v-expansion-panel>
                  </v-expansion-panels>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-col>
      </v-row>

      <!-- Gráficos -->
      <v-row>
        <v-col cols="12" md="6" lg="3" v-for="(chart, key) in graficos" :key="key">
          <v-card elevation="2" class="rounded-lg">
            <v-card-title class="pa-3 text-caption font-weight-bold bg-grey-lighten-4">
              DISTRIBUCIÓN POR {{ chart.title }}
            </v-card-title>
            <v-card-text class="pa-2">
              <highcharts :options="chart.options"></highcharts>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Tabla de Detalle -->
      <v-row class="mt-6">
        <v-col cols="12">
          <v-card elevation="2" class="rounded-lg">
            <v-card-title class="pa-4 bg-grey-lighten-4 d-flex align-center">
              <v-icon start color="primary">mdi-format-list-bulleted</v-icon>
              DETALLE DE UNIDADES
              <v-spacer></v-spacer>
              <v-chip color="primary" variant="flat" size="small">{{ unidadesFiltradas.length }} items</v-chip>
            </v-card-title>
            <v-divider></v-divider>
            <v-table density="compact" fixed-header height="450px" class="custom-table">
              <thead>
                <tr>
                  <th class="text-left font-weight-bold">Código</th>
                  <th class="text-left font-weight-bold">Nombre de la Unidad</th>
                  <th class="text-left font-weight-bold">Dependencia (Padre)</th>
                  <th class="text-left font-weight-bold">Clase</th>
                  <th class="text-left font-weight-bold">Nivel</th>
                  <th class="text-left font-weight-bold">Tipo</th>
                  <th class="text-center font-weight-bold">Relación</th>
                  <th class="text-center font-weight-bold">Ofic.</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="u in unidadesFiltradas" :key="u.id" class="unit-row">
                  <td class="text-xxs font-weight-bold text-grey-darken-1">{{ u.codigo }}</td>
                  <td class="text-caption font-weight-bold">{{ u.nombre }}</td>
                  <td class="text-xxs text-grey-darken-1">{{ u.dependencia || '---' }}</td>
                  <td>
                    <v-chip size="x-small" :color="getColorClase(u.tipo_unidad)" variant="flat" label>
                      {{ u.tipo_unidad || 'S/C' }}
                    </v-chip>
                  </td>
                  <td>
                    <v-chip size="x-small" :color="getColorNivel(u.nivel)" variant="flat" label>
                      {{ u.nivel }}
                    </v-chip>
                  </td>
                  <td>
                    <v-chip size="x-small" :color="getColorTipo(u.tipo)" variant="flat" label>
                      {{ u.tipo }}
                    </v-chip>
                  </td>
                  <td class="text-center">
                    <v-chip size="x-small" :color="u.relacion === 'L' ? 'grey-darken-3' : 'orange-darken-2'" theme="dark" label class="font-weight-black">
                      {{ u.str_relacion }}
                    </v-chip>
                  </td>
                  <td class="text-center">
                    <v-icon size="small" :color="u.oficial ? 'success' : 'grey-lighten-1'">
                      {{ u.oficial ? 'mdi-check-decagram' : 'mdi-minus-circle-outline' }}
                    </v-icon>
                  </td>
                </tr>
              </tbody>
            </v-table>
          </v-card>
        </v-col>
      </v-row>
    </template>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAllUnidadesMofStore } from '../../stores/unidades_mof';

const unidadesStore = useAllUnidadesMofStore();
const loading = ref(true);

const filtroClase = ref(null);
const filtroNivel = ref(null);
const filtroTipo = ref(null);
const filtroRelacion = ref(null);

onMounted(async () => {
  loading.value = true;
  await unidadesStore.getFetchUnidades();
  loading.value = false;
});

// Helper para extraer listas únicas
const getUnicos = (campo) => {
  const set = new Set((unidadesStore.unidades || []).map(u => u[campo]).filter(x => x));
  return Array.from(set).sort();
};

const listaClases = computed(() => getUnicos('tipo_unidad'));
const listaNiveles = computed(() => getUnicos('nivel'));
const listaTipos = computed(() => getUnicos('tipo'));
const listaRelaciones = computed(() => getUnicos('str_relacion'));

const unidadesFiltradas = computed(() => {
  let data = unidadesStore.unidades || [];
  if (filtroClase.value) data = data.filter(u => u.tipo_unidad === filtroClase.value);
  if (filtroNivel.value) data = data.filter(u => u.nivel === filtroNivel.value);
  if (filtroTipo.value) data = data.filter(u => u.tipo === filtroTipo.value);
  if (filtroRelacion.value) data = data.filter(u => u.str_relacion === filtroRelacion.value);
  return data;
});

const resetFiltros = () => {
  filtroClase.value = filtroNivel.value = filtroTipo.value = filtroRelacion.value = null;
};

// Helpers de Color para la tabla
const getColorClase = (clase) => {
  const map = {
    'RECTORADO': 'grey-darken-4',
    'VICERECTORADO': 'grey-darken-2',
    'FACULTAD': 'blue-darken-2',
    'DEPARTAMENTO': 'light-blue-darken-1',
    'SECCIÓN': 'cyan-darken-1',
    'CARRERA': 'teal-darken-1',
    'INSTITUTO': 'purple-darken-1',
    'LABORATORIO': 'deep-orange-darken-1'
  };
  return map[clase] || 'grey-lighten-1';
};

const getColorNivel = (nivel) => {
  const map = {
    'Directorio': 'red-darken-4',
    'Ejecutivo': 'blue-darken-1',
    'Operativo': 'teal-darken-1'
  };
  return map[nivel] || 'grey-darken-1';
};

const getColorTipo = (tipo) => {
  const map = {
    'Administrativo': 'indigo-darken-1',
    'Sustantivo (Académico)': 'purple-darken-1',
    'Sustantivo (Adadémico)': 'purple-darken-1', // Manejo de posible typo en API
    'Asesoramiento': 'amber-darken-3'
  };
  return map[tipo] || 'grey-darken-1';
};

// Lógica de Agrupación
const agrupar = (campo) => {
  const groups = {};
  (unidadesStore.unidades || []).forEach(u => {
    const val = u[campo] || 'S/D';
    if (!groups[val]) groups[val] = [];
    groups[val].push(u);
  });
  return groups;
};

const agrupaciones = computed(() => ({
  clase: { title: 'POR CLASE', icon: 'mdi-office-building', color: 'blue', data: agrupar('tipo_unidad') },
  nivel: { title: 'POR NIVEL', icon: 'mdi-layers-triple', color: 'teal', data: agrupar('nivel') },
  tipo: { title: 'POR TIPO', icon: 'mdi-tag-multiple', color: 'orange', data: agrupar('tipo') },
  relacion: { title: 'POR RELACIÓN', icon: 'mdi-vector-line', color: 'grey-darken-2', data: agrupar('str_relacion') }
}));

// Lógica de Gráficos
const createChart = (title, dataObj, color) => ({
  chart: { type: 'column', backgroundColor: 'transparent', height: 200 },
  title: { text: null },
  xAxis: { categories: Object.keys(dataObj), labels: { style: { fontSize: '8px' } } },
  yAxis: { min: 0, title: { text: null } },
  plotOptions: {
    column: { color: color, borderRadius: 2, dataLabels: { enabled: true, style: { fontSize: '8px' } } }
  },
  series: [{ name: title, data: Object.values(dataObj).map(g => g.length) }],
  credits: { enabled: false }
});

const graficos = computed(() => ({
  clase: { title: 'CLASE', options: createChart('Clases', agrupaciones.value.clase.data, '#2196F3') },
  nivel: { title: 'NIVEL', options: createChart('Niveles', agrupaciones.value.nivel.data, '#00796B') },
  tipo: { title: 'TIPO', options: createChart('Tipos', agrupaciones.value.tipo.data, '#F57C00') },
  relacion: { title: 'RELACIÓN', options: createChart('Relaciones', agrupaciones.value.relacion.data, '#616161') }
}));
</script>

<style scoped>
.min-height-unset { min-height: unset !important; }
.text-xxs { font-size: 0.65rem !important; }
</style>
