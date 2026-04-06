<script setup>
import { ref, onMounted, watch } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { useMppCoreStore } from '@/stores/mpp_core'

// Estilos
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'

const mppStore = useMppCoreStore()
const { onConnect, addEdges, onNodeClick } = useVueFlow()

// --- SELECCIÓN DE CONTEXTO ---
const selectedUnidad = ref(null)
const selectedProceso = ref(null)
const selectedSubproceso = ref(null)
const selectedProcedimiento = ref(null)

// --- CONFIGURACIÓN DEL PRÓXIMO NODO ---
const nextNodeData = ref({
    label: '',
    tipo: 'Tarea',
    unidadEjecutoraId: null
})

const nodes = ref([])
const edges = ref([])
const snackbar = ref({ show: false, text: '', color: 'success' })

// --- ESTADO PARA EDICIÓN DE NODO ---
const editDialog = ref(false)
const activeNode = ref(null)
const nodeEditData = ref({
    label: '',
    tipo: 'Tarea',
    unidadEjecutoraId: null
})

onMounted(async () => {
    await mppStore.fetchUnidades()
})

const getItemTitle = (item) => item.nombre || item.descripcion || "Sin nombre"

const getClassByType = (tipo) => {
    switch (tipo) {
        case 'Decisión': return 'node-decision';
        case 'Fin': return 'node-fin';
        case 'Inicio': return 'node-inicio';
        default: return 'node-tarea';
    }
}

// --- WATCHERS PARA LA JERARQUÍA ---
watch(selectedUnidad, async (newVal) => {
    selectedProceso.value = null
    selectedSubproceso.value = null
    selectedProcedimiento.value = null
    if (newVal) await mppStore.fetchProcesos(newVal)
})

watch(selectedProceso, async (newVal) => {
    selectedSubproceso.value = null
    selectedProcedimiento.value = null
    if (newVal) await mppStore.fetchSubprocesos(newVal)
})

watch(selectedSubproceso, async (newVal) => {
    selectedProcedimiento.value = null
    if (newVal) await mppStore.fetchProcedimientos(newVal)
})

// Cargar flujo existente al cambiar procedimiento
watch(selectedProcedimiento, async (newVal) => {
    if (newVal) {
        const pasos = await mppStore.fetchPasos(newVal)
        if (pasos?.length > 0) {
            // Cargar Nodos
            nodes.value = pasos.map(p => ({
                id: p.id.toString(),
                label: p.descripcion,
                position: { x: p.x || 100, y: p.y || 100 },
                class: getClassByType(p.metadata?.tipo || 'Tarea'),
                data: p.metadata || {}
            }))

            // Reconstruir Conexiones secuenciales (de nodo i al nodo i+1)
            const nuevasConexiones = []
            for (let i = 0; i < nodes.value.length - 1; i++) {
                nuevasConexiones.push({
                    id: `e${nodes.value[i].id}-${nodes.value[i+1].id}`,
                    source: nodes.value[i].id,
                    target: nodes.value[i+1].id,
                    animated: true
                })
            }
            edges.value = nuevasConexiones
        } else {
            nodes.value = []
            edges.value = []
        }
    }
})

// --- AL HACER CLIC EN UN NODO ---
onNodeClick(({ node }) => {
    activeNode.value = node
    nodeEditData.value = {
        label: node.label,
        tipo: node.data?.tipo || 'Tarea',
        unidadEjecutoraId: node.data?.unidadEjecutoraId || null
    }
    editDialog.value = true
})

const updateNodeInfo = () => {
    if (!activeNode.value) return
    const nodeToUpdate = nodes.value.find(n => n.id === activeNode.value.id)
    if (nodeToUpdate) {
        nodeToUpdate.label = nodeEditData.value.label
        nodeToUpdate.class = getClassByType(nodeEditData.value.tipo)
        nodeToUpdate.data = {
            ...nodeToUpdate.data,
            tipo: nodeEditData.value.tipo,
            unidadEjecutoraId: nodeEditData.value.unidadEjecutoraId
        }
    }
    editDialog.value = false
    snackbar.value = { show: true, text: 'Paso actualizado', color: 'info' }
}

const deleteNode = () => {
    if (!activeNode.value) return
    nodes.value = nodes.value.filter(n => n.id !== activeNode.value.id)
    // También borrar sus flechas
    edges.value = edges.value.filter(e => e.source !== activeNode.value.id && e.target !== activeNode.value.id)
    editDialog.value = false
    snackbar.value = { show: true, text: 'Paso eliminado del flujo', color: 'error' }
}

const insertNode = () => {
    if (!nextNodeData.value.label) {
        snackbar.value = { show: true, text: 'Escribe una descripción para el paso', color: 'warning' }
        return
    }

    const id = `node_${Date.now()}`
    const lastNode = nodes.value.length > 0 ? nodes.value[nodes.value.length - 1] : null

    const newNode = {
        id,
        label: nextNodeData.value.label,
        position: { x: 250, y: nodes.value.length * 100 + 50 },
        class: getClassByType(nextNodeData.value.tipo),
        data: {
            tipo: nextNodeData.value.tipo,
            unidadEjecutoraId: nextNodeData.value.unidadEjecutoraId
        }
    }

    nodes.value.push(newNode)

    // CONEXIÓN AUTOMÁTICA AL ANTERIOR
    if (lastNode) {
        edges.value.push({
            id: `e_${lastNode.id}-${newNode.id}`,
            source: lastNode.id,
            target: newNode.id,
            animated: true
        })
    }

    nextNodeData.value.label = ''
    snackbar.value = { show: true, text: 'Paso insertado y conectado', color: 'success' }
}

onConnect((params) => addEdges([params]))

const saveFlow = async () => {
    if (!selectedProcedimiento.value) return
    const listaPasos = nodes.value.map((node, index) => ({
        descripcion: node.label,
        orden: index + 1,
        x: Math.round(node.position.x),
        y: Math.round(node.position.y),
        metadata: node.data
    }))
    const success = await mppStore.saveFlujoCompleto(selectedProcedimiento.value, listaPasos)
    snackbar.value = { show: true, text: success ? '¡Todo guardado en la base de datos!' : 'Error al guardar', color: success ? 'success' : 'error' }
}
</script>

<template>
    <v-row no-gutters class="fill-height overflow-hidden">
        <!-- PANEL IZQUIERDO -->
        <v-col cols="12" md="3" class="pa-4 border-e bg-grey-lighten-4 overflow-y-auto" style="height: calc(100vh - 70px);">
            <div class="mb-4">
                <h2 class="text-subtitle-1 font-weight-bold mb-2">1. UBICACIÓN</h2>
                <v-select v-model="selectedUnidad" :items="mppStore.unidades" :item-title="getItemTitle" item-value="id" label="Unidad" variant="solo" density="compact" hide-details class="mb-2"></v-select>
                <v-select v-model="selectedProceso" :items="mppStore.procesos" :item-title="getItemTitle" item-value="id" label="Proceso" variant="solo" density="compact" :disabled="!selectedUnidad" hide-details class="mb-2"></v-select>
                <v-select v-model="selectedSubproceso" :items="mppStore.subprocesos" :item-title="getItemTitle" item-value="id" label="Subproceso" variant="solo" density="compact" :disabled="!selectedProceso" hide-details class="mb-2"></v-select>
                <v-select v-model="selectedProcedimiento" :items="mppStore.procedimientos" :item-title="getItemTitle" item-value="id" label="Procedimiento" variant="solo" density="compact" :disabled="!selectedSubproceso" color="primary"></v-select>
            </div>

            <v-divider class="mb-4"></v-divider>

            <div v-if="selectedProcedimiento">
                <h2 class="text-subtitle-1 font-weight-bold mb-2 color-primary">2. GENERADOR DE PASOS</h2>
                <v-card elevation="2" class="pa-4 bg-white mb-4 border-primary">
                    <p class="text-caption font-weight-bold mb-1 text-uppercase">Descripción del Paso:</p>
                    <v-textarea v-model="nextNodeData.label" label="Ej: Revisar documentos..." variant="outlined" rows="3" auto-grow placeholder="Escribe aquí qué se hace en este paso..." class="mb-4" bg-color="blue-lighten-5"></v-textarea>
                    
                    <p class="text-caption font-weight-bold mb-1 text-uppercase">Tipo de Figura:</p>
                    <v-select v-model="nextNodeData.tipo" :items="['Inicio', 'Tarea', 'Decisión', 'Fin']" variant="outlined" density="compact" class="mb-4"></v-select>
                    
                    <p class="text-caption font-weight-bold mb-1 text-uppercase">¿Quién lo ejecuta?:</p>
                    <v-select v-model="nextNodeData.unidadEjecutoraId" :items="mppStore.unidades" :item-title="getItemTitle" item-value="id" variant="outlined" density="compact" class="mb-4"></v-select>

                    <v-btn color="secondary" block prepend-icon="mdi-plus-thick" @click="insertNode" height="48">
                        Insertar y Conectar
                    </v-btn>
                </v-card>
                <v-btn color="primary" block size="large" prepend-icon="mdi-content-save" @click="saveFlow">Guardar Diseño</v-btn>
            </div>
        </v-col>

        <!-- ÁREA DERECHA -->
        <v-col cols="12" md="9" class="bg-white" style="height: calc(100vh - 70px); position: relative;">
            <VueFlow v-model:nodes="nodes" v-model:edges="edges" :fit-view-on-init="true">
                <Background pattern-color="#e2e8f0" :gap="20" />
                <Controls />
            </VueFlow>
            <div v-if="selectedProcedimiento" class="edit-hint">
                <v-chip size="small" color="primary" prepend-icon="mdi-cursor-default-click">Haz clic en un nodo para editarlo o borrarlo</v-chip>
            </div>
        </v-col>
    </v-row>

    <!-- DIÁLOGO DE EDICIÓN -->
    <v-dialog v-model="editDialog" max-width="500px">
        <v-card v-if="activeNode">
            <v-card-title class="bg-primary text-white d-flex align-center">
                <span>Editar Paso</span>
                <v-spacer></v-spacer>
                <v-btn icon="mdi-close" variant="text" @click="editDialog = false"></v-btn>
            </v-card-title>
            <v-card-text class="pa-4">
                <v-textarea v-model="nodeEditData.label" label="Descripción" variant="outlined" rows="3" class="mb-4"></v-textarea>
                <v-select v-model="nodeEditData.tipo" :items="['Inicio', 'Tarea', 'Decisión', 'Fin']" label="Tipo de Figura" variant="outlined" class="mb-4"></v-select>
                <v-select v-model="nodeEditData.unidadEjecutoraId" :items="mppStore.unidades" :item-title="getItemTitle" item-value="id" label="Unidad Ejecutora" variant="outlined"></v-select>
            </v-card-text>
            <v-card-actions class="pa-4">
                <v-btn color="error" variant="text" prepend-icon="mdi-delete" @click="deleteNode">Eliminar Nodo</v-btn>
                <v-spacer></v-spacer>
                <v-btn color="primary" variant="elevated" @click="updateNodeInfo">Aplicar Cambios</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="2000">{{ snackbar.text }}</v-snackbar>
</template>

<style scoped>
.color-primary { color: #6366f1; }
.edit-hint { position: absolute; top: 10px; right: 10px; z-index: 5; }

:deep(.node-tarea) { background: #fff; border-left: 6px solid #6366f1; width: 180px; }
:deep(.node-decision) { background: #fffbeb; border: 2px solid #fbbf24; clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%); width: 160px; height: 160px; display: flex; align-items: center; justify-content: center; text-align: center; padding: 25px; font-size: 11px; }
:deep(.node-inicio) { background: #f0fdf4; border: 2px solid #22c55e; border-radius: 50px; width: 130px; text-align: center; }
:deep(.node-fin) { background: #fef2f2; border: 2px solid #ef4444; border-radius: 50px; width: 130px; text-align: center; }
:deep(.vue-flow__node) { padding: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); font-weight: 500; }
:deep(.vue-flow__node.selected) { border: 2px solid #6366f1; transform: scale(1.05); transition: all 0.2s; }
</style>
