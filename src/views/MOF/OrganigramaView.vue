<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import { OrgChart } from 'd3-org-chart';
import * as d3 from 'd3';
import { useAllUnidadesMofStore } from '@/stores/unidades_mof';
import { useAllTiposMofStore } from '@/stores/tipos_mof';
import { useAllNivelesMofStore } from '@/stores/niveles_mof';
import { rules } from '@/utils/rules';
import SelectAllTipos from './tipos/SelectAllTipos.vue';
import SelectAllNiveles from './niveles/SelectAllNiveles.vue';
import SelectAllRelaciones from './relaciones/SelectAllRelaciones.vue';
import SelectAllUnidades from './unidades/SelectAllUnidades.vue';


const unidadesStore = useAllUnidadesMofStore();
const tiposStore = useAllTiposMofStore();
const NivelesStore = useAllNivelesMofStore();
const chartContainer = ref(null);
let chart = null;

// Filtro oficial/no oficial
const mostrarOficial = ref(false);

const dialog_nodo_chance = ref(false);

// Estados para diálogos
const actionDialog = ref(false);
const addDialog = ref(false);
const deleteDialog = ref(false);
const selectedItem = ref(null);
const isEditMode = ref(false);
const formValid = ref(false);

// Snackbar
const snackbar = ref(false);
const snackbarText = ref('');
const snackbarColor = ref('success');


// para el PDF
const reportDialog = ref(false);
const reportUrl = computed(() =>
    `https://correspondencia.fcpn.edu.bo/cu/org/unidad/${selectedItem.value?.id}`
);

// Formulario
const formData = ref({
    nombre: "",
    codigo: "",
    resCreacion: "",
    objetivo: "",
    fecCreacion: "",
    relacion: null,
    relInterno: "",
    relExterno: "",
    funciones: "",
    dependenciasFuncionales: [],
    oficial: true,
    tipo: null,
    nivel: null
});

const mostrarDependencias = ref(false);
const unidadDependenciaSeleccionada = ref(null);

const COLORS = {
    root: { bg: '#C62828', gradient: '#B71C1C', border: '#FFEB3B' },
    line: { bg: '#1976D2', gradient: '#1565C0', border: 'rgba(255,255,255,0.2)' },
    staff: { bg: '#F57C00', gradient: '#EF6C00', border: '#FFB74D' },
    root_inia: { bg: '#14B34C', gradient: '#1CB786', border: '#FFEB3B' },
    disabled: { bg: '#9E9E9E', gradient: '#757575', border: '#BDBDBD' }
};

function isStaffUnit(item) {
    // console.log('RELACION   ' + item);
    return item === 'S';// || item.tipo === 'Asesoría' || item.nivel === 'Asesoría'
}

// Unidades filtradas según el botón activo
const unidadesFiltradas = computed(() => {
    if (!mostrarOficial.value) {
        return unidadesStore.unidades;
    }
    return unidadesStore.unidades.filter(u => u.oficial === true);
});

// 3. OPCIONAL: Si quieres controlar en qué lado aparecen (izquierda/derecha)
// Puedes modificar transformData así:
function transformData(unidades) {
    if (!unidades?.length) return [];
    
    let staffCounter = 0; // Contador para alternar lados
    
    return unidades.map(item => {
        const isStaff = isStaffUnit(item.relacion);
        let relationship = '';
        
        if (isStaff) {
            // Alterna entre izquierda y derecha
            relationship = staffCounter % 2 === 0 ? '001' : '002';
            staffCounter++;
        }
        
        return {
            id: String(item.id),
            parentId: item.parent ? String(item.parent) : '',
            name: item.nombre,
            positionName: item.tipo || '',
            office: item.codigo || '',
            isStaff: isStaff,
            relationship: relationship, // '001' = izquierda, '002' = derecha
            rawData: item
        };
    });
}

function getNodeStyle(isRoot, isStaff, nodeId) {
    let colors = COLORS.line;

    if (mostrarDependencias.value && unidadDependenciaSeleccionada.value) {
        const nodeIdStr = String(nodeId);
        const selectedIdStr = String(unidadDependenciaSeleccionada.value.id);

        if (nodeIdStr === selectedIdStr) {
            // La unidad seleccionada se pinta de verde
            colors = COLORS.root_inia;
        } else {
            // Verificar si esta unidad está en las dependencias funcionales
            const dependencias = unidadDependenciaSeleccionada.value.dependencias || [];

            const esDependencia = dependencias.some(dep => {
                // Si dep es un objeto con id
                if (typeof dep === 'object' && dep !== null) {
                    return String(dep.id) === nodeIdStr;
                }
                // Si dep es solo un id
                return String(dep) === nodeIdStr;
            });

            if (esDependencia) {
                // Las dependencias funcionales mantienen su color original
                if (isRoot) colors = COLORS.root;
                else if (isStaff) colors = COLORS.staff;
                else colors = COLORS.line;
            } else {
                // Todas las demás en gris
                colors = COLORS.disabled;
            }
        }
    } else {
        // Lógica original
        if (isRoot) colors = COLORS.root;
        else if (isStaff) colors = COLORS.staff;
        else colors = COLORS.line;
    }

    const borderStyle = isStaff
        ? `border: 2px dashed ${colors.border};`
        : `border: 2px solid ${colors.border};`;

    return `
        padding: 12px;
        padding-bottom: 35px;
        background: linear-gradient(135deg, ${colors.bg} 0%, ${colors.gradient} 100%);
        border-radius: 10px;
        color: white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        ${borderStyle}
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        position: relative;
    `;
}

function createNodeContent(d) {
    const isRoot = !d.data.parentId;
    const isStaff = d.data.isStaff;
    const fontSize = isRoot ? '15px' : '13px';

    return `
        <div style="${getNodeStyle(isRoot, isStaff, d.data.id)}">
            ${isStaff ? '<div class="staff-badge">STAFF</div>' : ''}
            <div style="font-size: ${fontSize}; font-weight: bold; margin-bottom: 6px; text-align: center;">
                ${d.data.name}
            </div>
            <div style="font-size: 10px; opacity: 0.9; text-align: center; margin-bottom: 3px;">
                ${d.data.positionName}
            </div>
            <div style="font-size: 9px; opacity: 0.8; text-align: center; background: rgba(0,0,0,0.2); padding: 2px 6px; border-radius: 4px; margin-top: 4px;">
                ${d.data.office}
            </div>
            <button class="action-btn" data-id="${d.data.id}" onclick="window.handleNodeAction('${d.data.id}')">
                Acciones
            </button>
        </div>
    `;
}

function createExpandButton({ node }) {
    return `
        <div class="expand-button">
            <span style="font-size: 9px">
                ${node.children ? `${node.data._directSubordinates || ''}` : ''}
            </span>
        </div>
    `;
}

// 2. MODIFICAR la función initChart, específicamente esta parte:
function initChart() {
    if (!chartContainer.value) return;

    const data = transformData(unidadesFiltradas.value);

    chart = new OrgChart()
        .container(chartContainer.value)
        .data(data)
        .nodeWidth(() => 220)
        .nodeHeight(() => 135)
        .childrenMargin(() => 80)
        .compactMarginBetween(() => 50)
        .compactMarginPair(() => 50)
        .neighbourMargin(() => 30)
        .siblingsMargin(() => 30)
        .compact(false)
        .layout('top')
        // AGREGAR estas líneas para habilitar relaciones laterales:
        .setActiveNodeCentered(false)  // Evita centrado automático
        .linkUpdate(function (d) {
            const isStaffRelation = d.data.relationship === '001';
            const strokeColor = isStaffRelation ? COLORS.staff.bg : COLORS.line.bg;
            const dashArray = isStaffRelation ? '5,5' : '0';

            d3.select(this)
                .attr('stroke', strokeColor)
                .attr('stroke-width', 2)
                .attr('stroke-dasharray', dashArray);
        })
        .nodeContent(createNodeContent)
        .buttonContent(createExpandButton)
        .onNodeClick((d) => console.log('Nodo:', d.data));

    chart.render();

    setTimeout(() => {
        chart.expandAll();
        chart.fit();
    }, 100);
}

// Handler para el botón de acciones
window.handleNodeAction = (nodeId) => {
    const item = unidadesStore.unidades.find(u => String(u.id) === nodeId);
    if (item) {
        selectedItem.value = item;
        actionDialog.value = true;
    }
};

async function verDependencias() {
    try {
        // Cargar los datos completos de la unidad desde la API
        const unidadCompleta = await unidadesStore.getUnidadById(selectedItem.value.id);

        if (unidadCompleta && unidadCompleta.dependenciasFuncionales) {
            unidadDependenciaSeleccionada.value = {
                id: selectedItem.value.id,
                dependencias: unidadCompleta.dependenciasFuncionales
            };

            mostrarDependencias.value = true;
            actionDialog.value = false;

            // DEBUG - puedes eliminar después
            console.log('=== DEBUG DEPENDENCIAS ===');
            console.log('Unidad seleccionada ID:', selectedItem.value.id);
            console.log('Dependencias funcionales:', unidadCompleta.dependenciasFuncionales);
            console.log('========================');

            // Re-renderizar el gráfico
            if (chart) {
                chart.data(transformData(unidadesFiltradas.value));
                chart.render();
                setTimeout(() => {
                    chart.expandAll();
                    chart.fit();
                }, 100);
            }
        } else {
            snackbarText.value = 'Esta unidad no tiene dependencias funcionales';
            snackbarColor.value = 'info';
            snackbar.value = true;
            actionDialog.value = false;
        }
    } catch (error) {
        snackbarText.value = 'Error al cargar dependencias';
        snackbarColor.value = 'error';
        snackbar.value = true;
    }
}

function resetDependencias() {
    mostrarDependencias.value = false;
    unidadDependenciaSeleccionada.value = null;

    // Re-renderizar el gráfico manteniendo el filtro actual (oficial/no oficial)
    if (chart) {
        chart.data(transformData(unidadesFiltradas.value));
        chart.render();
        setTimeout(() => {
            chart.expandAll();
            chart.fit();
        }, 100);
    }
}


// Funciones del formulario
function openAddDialog() {
    isEditMode.value = false;

    // Si el padre no es oficial, deshabilitar el switch y poner en false
    const padreNoOficial = selectedItem.value?.oficial === false;

    formData.value = {
        nombre: "",
        codigo: "",
        resCreacion: "",
        objetivo: "",
        fecCreacion: "",
        relacion: null,
        relInterno: "",
        relExterno: "",
        funciones: "",
        dependenciasFuncionales: [],
        oficial: padreNoOficial ? false : true,
        tipo: null,
        nivel: null
    };
    actionDialog.value = false;
    addDialog.value = true;
}

async function editItem() {
    try {
        isEditMode.value = true;
        const unidadData = await unidadesStore.getUnidadById(selectedItem.value.id);

        if (unidadData) {
            // Extraer solo IDs de dependenciasFuncionales
            const dependenciasIds = Array.isArray(unidadData.dependenciasFuncionales)
                ? unidadData.dependenciasFuncionales.map(d =>
                    typeof d === 'object' ? d.id : d
                )
                : [];

            formData.value = {
                nombre: unidadData.nombre,
                codigo: unidadData.codigo,
                resCreacion: unidadData.resCreacion,
                objetivo: unidadData.objetivo,
                tipo: unidadData.tipo,
                nivel: unidadData.nivel,
                relExterno: unidadData.relExterno,
                relInterno: unidadData.relInterno,
                funciones: unidadData.funciones,
                fecCreacion: unidadData.fecCreacion,
                dependenciasFuncionales: dependenciasIds,
                oficial: unidadData.oficial,
                relacion: unidadData.relacion
            };
            formValid.value = true;
            actionDialog.value = false;
            addDialog.value = true;
        }
    } catch (error) {
        snackbarText.value = 'Error al cargar';
        snackbarColor.value = 'error';
        snackbar.value = true;
    }
}

function deleteItem() {
    actionDialog.value = false;
    deleteDialog.value = true;
}

async function confirmDelete() {
    if (unidadesStore.loading) return;

    snackbarText.value = 'Eliminando...';
    snackbarColor.value = 'info';
    snackbar.value = true;

    await unidadesStore.deleteUnidad(selectedItem.value.id);

    if (!unidadesStore.error) {
        snackbarText.value = 'Eliminado con éxito!';
        snackbarColor.value = 'success';
        deleteDialog.value = false;
    } else {
        snackbarText.value = 'Error al eliminar';
        snackbarColor.value = 'error';
    }
}

async function confirmAddItem() {
    if (!formValid.value) return;

    snackbarText.value = isEditMode.value ? 'Actualizando...' : 'Guardando...';
    snackbarColor.value = 'info';
    snackbar.value = true;

    const dependenciasIds = Array.isArray(formData.value.dependenciasFuncionales)
        ? formData.value.dependenciasFuncionales.map(d =>
            typeof d === 'object' ? d.id : d
        )
        : [];
    // const dataForm = { ...formData.value };
    const dataForm = {
        nombre: formData.value.nombre,
        codigo: formData.value.codigo,
        resCreacion: formData.value.resCreacion,
        objetivo: formData.value.objetivo,
        fecCreacion: formData.value.fecCreacion,
        relacion: formData.value.relacion,
        relInterno: formData.value.relInterno,
        relExterno: formData.value.relExterno,
        funciones: formData.value.funciones,
        dependenciasFuncionales: dependenciasIds,
        oficial: formData.value.oficial,
        tipo: formData.value.tipo,
        nivel: formData.value.nivel,
        parentId: isEditMode.value ? selectedItem.value.parent : selectedItem.value.id
    };

    if (isEditMode.value) {
        const cambioANoOficial = selectedItem.value.oficial === true && formData.value.oficial === false;
        await unidadesStore.updateUnidad(selectedItem.value.id, dataForm);

        if (cambioANoOficial && !unidadesStore.error) {
            await actualizarHijosNoOficial(selectedItem.value.id);
        }
    } else {
        if (selectedItem.value.oficial === false) {
            dataForm.oficial = false;
        }
        await unidadesStore.createUnidad(dataForm);
    }

    if (!unidadesStore.error) {
        snackbarText.value = isEditMode.value ? '¡Actualizado con éxito!' : '¡Guardado exitoso!';
        snackbarColor.value = 'success';
        addDialog.value = false;
    } else {
        snackbarText.value = 'Error al guardar';
        snackbarColor.value = 'error';
    }
}

onMounted(async () => {
    await Promise.all([
        unidadesStore.getFetchUnidades(),
        tiposStore.getFetchTipos(),
        NivelesStore.getFetchNiveles()
    ]);

    // Pequeño delay para asegurar que el DOM esté listo
    setTimeout(() => {
        initChart();
    }, 200);
});

watch(() => unidadesStore.unidades, () => {
    if (chart) {
        chart.data(transformData(unidadesFiltradas.value));
        chart.render();

        setTimeout(() => {
            chart.expandAll();
            chart.fit();
        }, 100);
    }
}, { deep: true });

// Watch para cambio de filtro
watch(mostrarOficial, () => {
    if (chart) {
        chart.data(transformData(unidadesFiltradas.value));
        chart.render();

        setTimeout(() => {
            chart.expandAll();
            chart.fit();
        }, 100);
    }
});


//filtrado ---------
const unidadACambiar = ref(null);
const unidadDestino = ref(null);
const unidadRazon = ref("");

const unidadesNoRaiz = computed(() => {
    return unidadesStore.unidades.filter(u => u.parent !== null)
});

const unidadesDestino = computed(() => {
    return unidadesNoRaiz.value.filter(u => u.id !== unidadACambiar.value);
});

//reseteando valores de v-model de los selects cuando cierre v-dialog
watch(dialog_nodo_chance, (val) => {
    if (!val) {
        unidadACambiar.value = null;
        unidadDestino.value = null;
        unidadRazon.value = "";
    }
});


//updateUnidad  Cambiar de dependencia boton


async function cambiarDependencia() {
    console.log('=======================================================================');
    console.log('Unidad a Cambiar ' + unidadACambiar.value);
    console.log('Unidad a destino que sera mi parent nuevo ' + unidadDestino.value);
    console.log('=======================================================================');


    const unidadOriginal = unidadesStore.unidades.find(u => u.id === unidadACambiar.value);

    console.log('UNIDAD ORIGINAL');
    console.table(unidadOriginal);
    console.log('=======================================================================');

    console.log('RAZON  ' + unidadRazon.value);
    await unidadesStore.updateNodo(unidadACambiar.value, {
        ...unidadOriginal,
        razon: unidadRazon.value,
        parentId: unidadDestino.value
    });

    if (unidadesStore.error) {
        snackbarText.value = unidadesStore.error;
        snackbarColor.value = 'error';
    } else {
        dialog_nodo_chance.value = false;
        snackbarText.value = '¡Dependencia cambiada con éxito!';
        snackbarColor.value = 'success';
    }
    snackbar.value = true;
}



// Función auxiliar para actualizar hijos recursivamente
async function actualizarHijosNoOficial(unidadId) {
    const hijos = unidadesStore.unidades.filter(u => u.parent === unidadId);

    for (const hijo of hijos) {
        if (hijo.oficial === true) {
            await unidadesStore.updateUnidad(hijo.id, { ...hijo, oficial: false });
            // Recursivamente actualizar los hijos de este hijo
            await actualizarHijosNoOficial(hijo.id);
        }
    }
}


/*
async function actualizarHijosNoOficial(unidadId) {
    const hijos = unidadesStore.unidades.filter(u => u.parent === unidadId);
    
    for (const hijo of hijos) {
        if (hijo.oficial === true) {
            // Crear objeto con todos los campos necesarios
            const dataHijo = {
                nombre: hijo.nombre,
                codigo: hijo.codigo,
                resCreacion: hijo.resCreacion,
                objetivo: hijo.objetivo,
                fecCreacion: hijo.fecCreacion,
                relacion: hijo.relacion,
                relInterno: hijo.relInterno,
                relExterno: hijo.relExterno,
                funciones: hijo.funciones,
                oficial: false,
                tipo: hijo.tipo,
                nivel: hijo.nivel,
                parentId: hijo.parent
            };
            
            await unidadesStore.updateUnidad(hijo.id, dataHijo);
            // Recursivamente actualizar los hijos de este hijo
            await actualizarHijosNoOficial(hijo.id);
        }
    }
}


async function confirmAddItem() {
    if (!formValid.value) return;

    snackbarText.value = isEditMode.value ? 'Actualizando...' : 'Guardando...';
    snackbarColor.value = 'info';
    snackbar.value = true;

    // const dataForm = { ...formData.value };
    const dataForm = { ...formData.value, parentId: selectedItem.value.parent };

    if (isEditMode.value) {
        // Verificar si cambió de oficial a no oficial
        const cambioANoOficial = selectedItem.value.oficial === true && formData.value.oficial === false;
        
        await unidadesStore.updateUnidad(selectedItem.value.id, dataForm);
        
        // Si cambió a no oficial, actualizar todos los hijos
        if (cambioANoOficial && !unidadesStore.error) {
            await actualizarHijosNoOficial(selectedItem.value.id);
        }
    } else {
        dataForm.parentId = selectedItem.value.id;
        
        // Si el padre no es oficial, el hijo tampoco puede ser oficial
        if (selectedItem.value.oficial === false) {
            dataForm.oficial = false;
        }
        
        await unidadesStore.createUnidad(dataForm);
    }

    if (!unidadesStore.error) {
        snackbarText.value = isEditMode.value ? '¡Actualizado con éxito!' : '¡Guardado exitoso!';
        snackbarColor.value = 'success';
        addDialog.value = false;
    } else {
        snackbarText.value = 'Error al guardar';
        snackbarColor.value = 'error';
    }
}

*/


</script>

<template>
    <v-container fluid>
        <v-card>
            <v-card-title class="d-flex align-center">
                <v-icon class="mr-2">mdi-sitemap</v-icon>
                Organigrama UMSA
            </v-card-title>
            <v-card-title class="d-flex align-center">
                <v-btn-toggle v-model="mostrarOficial" mandatory color="primary" class="ma-3">
                    <v-btn :value="false">
                        No Oficial
                    </v-btn>
                    <v-btn :value="true">
                        Organigrama Oficial
                    </v-btn>
                    <v-btn v-if="mostrarDependencias" @click="resetDependencias" class="ma-3" color="warning"
                        variant="tonal">
                        <v-icon left>mdi-refresh</v-icon>
                        Reset Dependencias
                    </v-btn>
                </v-btn-toggle>
                <v-spacer></v-spacer>
                <v-btn @click="dialog_nodo_chance = true" class="ma-3 pa-3" variant="tonal">
                    Cambios de nodo a nodo
                </v-btn>
            </v-card-title>
            <v-dialog v-model="dialog_nodo_chance" max-width="900px">
                <v-card>
                    <v-card-title>
                        <strong>CAMBIO DE DEPENDENCIA DE UNIDAD</strong>
                    </v-card-title>
                    <v-divider />
                    <v-alert text="Tenga en cuenta que al modificar la dependencia de una unidad,
                        todos los elementos que dependan de dicha unidad también se verán
                        afectados y cambiarán su dependencia de manera automática." title="CUIDADO"
                        type="warning"></v-alert>
                    <v-divider />
                    <v-card-text>
                        <v-row class="text-center">
                            <v-col cols="12" md="6" class="">
                                <strong>Selecciona unidad a cambiar</strong>
                                <SelectAllUnidades v-model="unidadACambiar" clearable :items="unidadesNoRaiz"
                                    label="Unidad a cambiar" />
                            </v-col>
                            <v-col cols="12" md="6">
                                <strong>Selecciona unidad Destino</strong>
                                <SelectAllUnidades v-model="unidadDestino" :disabled="!unidadACambiar" clearable
                                    :items="unidadesDestino" label="Unidad destino" />
                            </v-col>
                        </v-row>
                        <v-row>
                            <v-textarea v-model="unidadRazon" label="Razón"
                                :rules="[rules.required, rules.minLength(6)]" variant="underlined" rows="2" auto-grow
                                clearable></v-textarea>
                        </v-row>
                    </v-card-text>
                    <v-card-actions>
                        <v-btn @click="dialog_nodo_chance = false">Cerrar</v-btn>
                        <v-btn color="primary" :disabled="!unidadACambiar || !unidadDestino || !unidadRazon"
                            :loading="unidadesStore.loading" @click="cambiarDependencia">
                            Cambiar Dependencia
                        </v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>




            <v-divider />

            <v-progress-linear v-if="unidadesStore.loading" indeterminate color="primary" />

            <v-alert v-if="unidadesStore.error" type="error" class="ma-4">
                {{ unidadesStore.error }}
            </v-alert>

            <v-card-text class="pa-0">
                <div ref="chartContainer" class="chart-container" />
            </v-card-text>
        </v-card>
    </v-container>

    <!-- Diálogo de acciones -->
    <v-dialog v-model="actionDialog" max-width="400px">
        <v-card>
            <v-card-title>
                <strong>{{ selectedItem?.nombre }}</strong>
            </v-card-title>
            <v-card-text>
                <v-list>
                    <v-list-item @click="reportDialog = true; actionDialog = false">
                        <template v-slot:prepend>
                            <v-icon color="info">mdi-file-pdf-box</v-icon>
                        </template>
                        <v-list-item-title>Ver Reporte</v-list-item-title>
                    </v-list-item>

                    <v-list-item @click="verDependencias">
                        <template v-slot:prepend>
                            <v-icon color="success">mdi-file-tree</v-icon>
                        </template>
                        <v-list-item-title>Ver Dependencias</v-list-item-title>
                    </v-list-item>
                    <v-list-item @click="openAddDialog">
                        <template v-slot:prepend>
                            <v-icon color="primary">mdi-plus-box</v-icon>
                        </template>
                        <v-list-item-title>Agregar hijo</v-list-item-title>
                    </v-list-item>

                    <v-list-item @click="editItem">
                        <template v-slot:prepend>
                            <v-icon color="warning">mdi-pencil</v-icon>
                        </template>
                        <v-list-item-title>Editar</v-list-item-title>
                    </v-list-item>

                    <v-list-item @click="deleteItem">
                        <template v-slot:prepend>
                            <v-icon color="error">mdi-delete</v-icon>
                        </template>
                        <v-list-item-title>Eliminar</v-list-item-title>
                    </v-list-item>
                </v-list>
            </v-card-text>
            <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn text @click="actionDialog = false">Cancelar</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>

    <!-- Diálogo de formulario -->
    <v-dialog v-model="addDialog" max-width="900px">
        <v-card>
            <v-card-title>
                {{ isEditMode ? 'Editar' : 'Agregar item a' }}:
                <strong class="text-primary">{{ selectedItem?.nombre }}</strong>
            </v-card-title>
            <v-card-subtitle>Manual de Organización de funciones</v-card-subtitle>
            <v-divider></v-divider>
            <v-card-text>
                <v-form v-model="formValid">
                    <v-row>
                        <v-col cols="12" md="6">
                            <v-text-field v-model="formData.nombre" label="Nombre"
                                :rules="[rules.required, rules.minLength(4)]" variant="underlined" />
                        </v-col>
                        <v-col cols="12" md="6">
                            <v-text-field v-model="formData.codigo" label="Código"
                                :rules="[rules.codigo, rules.minLength(4)]" variant="underlined" />
                        </v-col>
                        <v-col cols="12" md="6">
                            <v-text-field v-model="formData.resCreacion" label="Nro de Resolución"
                                :rules="[rules.required, rules.minLength(6)]" variant="underlined" />
                        </v-col>

                        <v-col cols="12" md="6" sm="6">
                            <!-- <v-date-picker v-model="formData.fecCreacion" label="Fecha de creación"
                                    :rules="[rules.required]" variant="underlined">
                                </v-date-picker> -->
                            <v-date-input v-model="formData.fecCreacion" label="Fecha de Creación" variant="underlined"
                                :rules="[rules.required]" clearable></v-date-input>
                        </v-col>


                        <!-- <v-col cols="12" md="6">
                            <v-text-field v-model="formData.objetivo" label="Objetivo"
                                :rules="[rules.required, rules.minLength(6)]" variant="underlined" />
                        </v-col> -->

                        <v-col cols="12" md="12" sm="12">
                            <v-textarea v-model="formData.objetivo" label="Objetivo"
                                :rules="[rules.required, rules.minLength(6)]" variant="underlined" rows="2" auto-grow
                                clearable></v-textarea>
                        </v-col>

                        <v-col cols="12" md="12" sm="12">
                            <v-textarea v-model="formData.funciones" label="Funciones"
                                :rules="[rules.required, rules.minLength(6)]" variant="underlined" rows="2" auto-grow
                                clearable>
                            </v-textarea>
                        </v-col>

                        <v-col cols="12" md="12" sm="12">
                            <v-textarea v-model="formData.relExterno" label="Relaciones externas"
                                :rules="[rules.required, rules.minLength(6)]" variant="underlined" rows="2" auto-grow
                                clearable>
                            </v-textarea>
                        </v-col>


                        <v-col cols="12" md="12" sm="12">
                            <v-textarea v-model="formData.relInterno" label="Relaciones internas"
                                :rules="[rules.required, rules.minLength(6)]" variant="underlined" rows="2" auto-grow
                                clearable>
                            </v-textarea>
                        </v-col>

                        <v-col cols="12" md="12" sm="12">
                            <SelectAllUnidades type="autocomplete" label="Dependencias Funcionales"
                                v-model="formData.dependenciasFuncionales" :exclude-id="selectedItem?.id"
                                :rules="[rules.required]" />
                        </v-col>


                        <v-col cols="12" md="5" sm="5">
                            <SelectAllTipos v-model="formData.tipo" :rules="[rules.required]" />
                        </v-col>
                        <v-col cols="12" md="4" sm="4">
                            <SelectAllNiveles v-model="formData.nivel" :rules="[rules.required]" />
                        </v-col>
                        <v-col cols="12" md="3" sm="3">
                            <SelectAllRelaciones v-model="formData.relacion" :rules="[rules.required]" />
                        </v-col>
                    </v-row>
                    <v-row justify="end">
                        <v-col cols="auto" class="d-flex align-center">
                            <span :class="formData.oficial ? '' : 'text-red-lighten-2'" class="me-2">
                                {{ formData.oficial ? 'UNIDAD OFICIAL' : 'UNIDAD NO OFICIAL' }}
                            </span>
                            <v-switch v-model="formData.oficial" :color="formData.oficial ? 'primary' : ''"
                                :base-color="formData.oficial ? '' : 'red-lighten-2'"
                                :disabled="!isEditMode && selectedItem?.oficial === false" hide-details inset />
                        </v-col>
                    </v-row>
                    <v-row v-if="!isEditMode && selectedItem?.oficial === false">
                        <v-col cols="12">
                            <v-alert type="info" density="compact">
                                El padre es una unidad NO OFICIAL, por lo tanto este hijo también será NO OFICIAL
                            </v-alert>
                        </v-col>
                    </v-row>
                </v-form>
            </v-card-text>
            <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn text @click="addDialog = false">Cancelar</v-btn>
                <v-btn color="primary" :disabled="!formValid || unidadesStore.loading" :loading="unidadesStore.loading"
                    @click="confirmAddItem">
                    Guardar
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>

    <!-- Diálogo de confirmación de eliminación -->
    <v-dialog v-model="deleteDialog" max-width="400px">
        <v-card>
            <v-card-title>¿Confirma Eliminar?</v-card-title>
            <v-card-text>
                ¿Está seguro de eliminar <strong>{{ selectedItem?.nombre }}</strong>?
            </v-card-text>
            <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn text @click="deleteDialog = false">Cancelar</v-btn>
                <v-btn color="error" :disabled="unidadesStore.loading" :loading="unidadesStore.loading"
                    @click="confirmDelete">
                    Eliminar
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>

    <v-dialog v-model="reportDialog" max-width="1200px">
        <v-card>
            <v-card-title class="d-flex align-center">
                <v-icon class="mr-2">mdi-file-pdf-box</v-icon>
                Reporte - {{ selectedItem?.nombre }}
                <v-spacer></v-spacer>
                <v-btn icon @click="reportDialog = false">
                    <v-icon>mdi-close</v-icon>
                </v-btn>
            </v-card-title>
            <v-divider></v-divider>
            <v-card-text class="pa-0">
                <iframe :src="reportUrl" width="100%" height="700px" style="border: none;"></iframe>
            </v-card-text>
        </v-card>
    </v-dialog>


    <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="3000">
        {{ snackbarText }}
    </v-snackbar>
</template>

<style scoped>
.chart-container {
    min-height: 700px;
    width: 100%;
    overflow: auto;
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

:deep(.staff-badge) {
    position: absolute;
    top: 4px;
    right: 8px;
    font-size: 10px;
    background: rgba(255, 255, 255, 0.3);
    padding: 2px 6px;
    border-radius: 4px;
}

:deep(.expand-button) {
    color: #fff;
    background: #1976D2;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid white;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
    font-size: 11px;
    font-weight: bold;
    cursor: pointer;
}

:deep(.action-btn) {
    position: absolute;
    bottom: 6px;
    right: 8px;
    background: rgba(255, 255, 255, 0.9);
    color: #1976D2;
    border: none;
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}

:deep(.action-btn:hover) {
    background: white;
    transform: scale(1.05);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

:deep(.svg-chart-container) {
    width: 100%;
    height: 100%;
}
</style>