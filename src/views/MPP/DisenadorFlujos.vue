<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { VueFlow, useVueFlow, Handle, Position } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { useMppCoreStore } from '@/stores/mpp_core'

// Estilos base
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'

const mppStore = useMppCoreStore()
const { onConnect, addEdges, onNodeClick, onEdgeClick, fitView } = useVueFlow()

// --- ESTADOS ---
const isLocked = ref(false)
const showEntityDialog = ref(false)
const entityMode = ref('create') 
const entityType = ref('') 
const entityData = ref({ 
    id: null, codigo: '', nombre: '', descripcion: '', id_unidades: [],
    objetivos: '', alcance: '', periodicidad: '', version: '1.0', estado: 'Activo', id_instalaciones: []
})

const selectedProceso = ref(null)
const selectedProcedimiento = ref(null)
const selectedCargo = ref(null)

// Estados de Calidad y Recursos
const selectedRiesgo = ref(null)
const selectedControl = ref(null)
const selectedRequisito = ref(null)
const normativaText = ref('')

// --- LÓGICA DE DECISIÓN (SÍ/NO) ---
const connectionDialog = ref(false)
const pendingConnection = ref(null)

const confirmConnection = (isYes) => {
    const params = pendingConnection.value
    if (isYes) {
        params.label = 'SÍ'; params.style = { stroke: '#22c55e', strokeWidth: 4 }; params.labelStyle = { fill: '#22c55e', fontWeight: 900 }
    } else {
        params.label = 'NO'; params.style = { stroke: '#ef4444', strokeWidth: 4 }; params.labelStyle = { fill: '#ef4444', fontWeight: 900 }
    }
    params.animated = true; addEdges([params]); connectionDialog.value = false; pendingConnection.value = null
}

// --- AUTOGUARDADO ---
const lastSaved = ref(null)
const isDirty = ref(false)
const isSaving = ref(false)
let autoSaveTimer = null

const autoSaveSilent = async () => {
    if (!isLocked.value || !isDirty.value || isSaving.value) return
    isSaving.value = true
    const listaPasos = nodes.value.map((node) => ({ 
        descripcion: node.data.label, orden: node.data.order, x: Math.round(node.position.x), y: Math.round(node.position.y), 
        metadata: { ...node.data, connections: edges.value.filter(e => e.source === node.id) } 
    }))
    const success = await mppStore.saveFlujoCompleto(selectedProcedimiento.value, listaPasos)
    if (success) { lastSaved.value = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); isDirty.value = false; }
    isSaving.value = false
}

// --- COLORES Y CONTRASTE ---
const getUnitColor = (unidadId) => {
    const unidad = mppStore.unidades.find(u => (u.id_unidad || u.id) === unidadId)
    const colorOficial = unidad?.color || unidad?.colorHex || unidad?.hex
    if (colorOficial) return colorOficial
    const palette = ['#e0f2fe', '#fef3c7', '#dcfce7', '#fee2e2', '#f3e8ff', '#ffedd5', '#f1f5f9']
    return unidadId ? palette[unidadId % palette.length] : '#f8fafc'
}

const getContrastColor = (hexColor) => {
    if (!hexColor || hexColor.startsWith('rgba')) return '#1e293b'
    const hex = hexColor.replace('#', ''); const r = parseInt(hex.substr(0, 2), 16); const g = parseInt(hex.substr(2, 2), 16); const b = parseInt(hex.substr(4, 2), 16)
    return (r * 299 + g * 587 + b * 114) / 1000 >= 128 ? '#1e293b' : '#ffffff'
}

// --- REDIMENSIONAMIENTO ---
const sidebarWidth = ref(380) 
const isResizing = ref(false)
const startResizing = () => { isResizing.value = true; document.addEventListener('mousemove', handleMouseMove); document.addEventListener('mouseup', stopResizing); }
const handleMouseMove = (e) => { if (isResizing.value && e.clientX > 300 && e.clientX < 800) sidebarWidth.value = e.clientX; }
const stopResizing = () => { isResizing.value = false; document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', stopResizing); }

// --- ESTADO DISEÑADOR ---
const nodes = ref([])
const edges = ref([])
const selectedParentId = ref(null) 
const decisionBranch = ref('SÍ')
const nextNodeData = ref({ label: '', tipo: 'Tarea', unidadEjecutoraId: null, responsable: '', requisitos: '', operaciones: '' })
const snackbar = ref({ show: false, text: '', color: 'success' })
const editDialog = ref(false)
const activeNode = ref(null)
const nodeEditData = ref({ label: '', tipo: 'Tarea', unidadEjecutoraId: null, responsable: '', requisitos: '', operaciones: '' })

onMounted(async () => { 
    await mppStore.fetchProcesos(); await mppStore.fetchUnidades(); await mppStore.fetchCargos();
    autoSaveTimer = setInterval(autoSaveSilent, 60000); 
})
onUnmounted(() => clearInterval(autoSaveTimer))
watch([nodes, edges], () => { if (isLocked.value) isDirty.value = true }, { deep: true })

const getItemTitle = (item) => {
    if (!item) return "Sin nombre"
    return item.denominacion || item.nombre_unidad || item.nombre || item.descripcion || "Sin nombre"
}

const getProcedimientoProps = (item) => {
    return {
        subtitle: item.estado === 'Inactivo' ? 'Procedimiento Inactivo (Lectura)' : null,
        class: item.estado === 'Inactivo' ? 'text-grey-darken-1 bg-grey-lighten-4' : ''
    }
}

const isProcedimientoInactivo = computed(() => {
    if (!selectedProcedimiento.value) return false
    const proc = mppStore.procedimientos.find(p => p.id_procedimiento === selectedProcedimiento.value)
    return proc?.estado === 'Inactivo'
})

const normalizeType = (tipo) => {
    if (!tipo) return 'tarea'
    return tipo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}

// --- CRUD Y NAVEGACIÓN ---
watch(selectedProceso, async (v) => { 
    if (!isLocked.value) { 
        selectedProcedimiento.value = null; selectedCargo.value = null;
        if (v) { await mppStore.fetchProcedimientos(v); await mppStore.fetchCargoProcesos(v); }
    } 
})

watch(() => mppStore.cargoProcesos, (list) => {
    const resp = list.find(cp => cp.es_responsable_principal)
    if (resp) selectedCargo.value = resp.id_cargo
}, { deep: true })

const saveCargoRelation = async () => {
    if (!selectedProceso.value || !selectedCargo.value) return
    try {
        const existing = mppStore.cargoProcesos.find(cp => cp.es_responsable_principal)
        if (existing) {
            await mppStore.updateCargoProceso(existing.id_cargo_proceso, { id_cargo: selectedCargo.value, id_proceso: selectedProceso.value, es_responsable_principal: true })
        } else {
            await mppStore.saveCargoProceso({ id_cargo: selectedCargo.value, id_proceso: selectedProceso.value, es_responsable_principal: true })
        }
        await mppStore.fetchCargoProcesos(selectedProceso.value)
        snackbar.value = { show: true, text: 'Cargo responsable actualizado', color: 'success' }
    } catch (e) { snackbar.value = { show: true, text: 'Error al asignar cargo', color: 'error' } }
}

const handleSync = async () => {
    try {
        const success = await mppStore.syncUnidades();
        if (success) snackbar.value = { show: true, text: 'Sincronización con MOF exitosa', color: 'success' }
        else snackbar.value = { show: true, text: 'Error en la sincronización', color: 'error' }
    } catch (e) { snackbar.value = { show: true, text: 'Fallo crítico: ' + e.message, color: 'error' } }
}

const openDialog = async (type, mode = 'create') => {
    entityType.value = type; entityMode.value = mode
    if (mode === 'edit') {
        const id = type === 'proceso' ? selectedProceso.value : selectedProcedimiento.value
        const item = (type === 'proceso' ? mppStore.procesos : mppStore.procedimientos).find(i => {
            return (type === 'proceso' ? i.id_proceso : i.id_procedimiento) === id
        })
        entityData.value = { 
            id: type === 'proceso' ? item.id_proceso : item.id_procedimiento, 
            codigo: item.codigo || '', nombre: item.nombre || '', descripcion: item.descripcion || '',
            id_unidades: item.unidades ? item.unidades.map(u => u.id_unidad) : [],
            objetivos: item.objetivos || '', alcance: item.alcance || '', periodicidad: item.periodicidad || '', version: item.version || '1.0', estado: item.estado || 'Activo', id_instalaciones: item.id_instalaciones || []
        }
    } else {
        entityData.value = { id: null, codigo: '', nombre: '', descripcion: '', id_unidades: [], objetivos: '', alcance: '', periodicidad: '', version: '1.0', estado: 'Activo', id_instalaciones: [] }
    }
    showEntityDialog.value = true
}

const handleSaveEntity = async () => {
    try {
        if (entityMode.value === 'create') {
            if (entityType.value === 'proceso') { 
                const res = await mppStore.saveProceso({ codigo: entityData.value.codigo, nombre: entityData.value.nombre, descripcion: entityData.value.descripcion, id_unidades: entityData.value.id_unidades.map(id => Number(id)) }); 
                await mppStore.fetchProcesos(); selectedProceso.value = res.id_proceso 
            } else { 
                const payload = { id_proceso: Number(selectedProceso.value), codigo: entityData.value.codigo, nombre: entityData.value.nombre, objetivos: entityData.value.objetivos, alcance: entityData.value.alcance, periodicidad: entityData.value.periodicidad, version: entityData.value.version, estado: entityData.value.estado, id_instalaciones: Array.isArray(entityData.value.id_instalaciones) ? entityData.value.id_instalaciones.map(id => Number(id)) : [] };
                const res = await mppStore.saveProcedimiento(payload); await mppStore.fetchProcedimientos(selectedProceso.value); selectedProcedimiento.value = res.id_procedimiento 
            }
        } else {
            if (entityType.value === 'proceso') {
                await mppStore.updateProceso(entityData.value.id, { codigo: entityData.value.codigo, nombre: entityData.value.nombre, descripcion: entityData.value.descripcion, id_unidades: entityData.value.id_unidades.map(id => Number(id)) })
                await mppStore.fetchProcesos(); selectedProceso.value = entityData.value.id
            } else {
                await mppStore.updateProcedimiento(entityData.value.id, { id_proceso: selectedProceso.value, codigo: entityData.value.codigo, nombre: entityData.value.nombre, objetivos: entityData.value.objetivos, alcance: entityData.value.alcance, periodicidad: entityData.value.periodicidad, version: entityData.value.version, estado: entityData.value.estado, id_instalaciones: entityData.value.id_instalaciones })
                await mppStore.fetchProcedimientos(selectedProceso.value); selectedProcedimiento.value = entityData.value.id
            }
        }
        showEntityDialog.value = false; snackbar.value = { show: true, text: 'Guardado correctamente', color: 'success' }
    } catch (e) { snackbar.value = { show: true, text: 'Error al guardar', color: 'error' } }
}

const confirmEstructura = async () => {
    if (!selectedProcedimiento.value) return
    isLocked.value = true
    const pasos = await mppStore.fetchPasos(selectedProcedimiento.value)
    nodes.value = pasos?.length ? pasos.map((p, idx) => ({ id: p.id.toString(), type: 'mppNode', position: { x: p.x || 100, y: p.y || 100 }, data: { ...p.metadata, order: p.orden || (idx + 1), label: p.descripcion } })) : []
    const restoredEdges = []
    pasos?.forEach(p => { if (p.metadata?.connections) restoredEdges.push(...p.metadata.connections) })
    edges.value = restoredEdges
    setTimeout(() => { fitView(); isDirty.value = false; lastSaved.value = 'Cargado'; }, 200)
}

onConnect((params) => {
    const sourceNode = nodes.value.find(n => n.id === params.source)
    if (sourceNode?.data?.tipo === 'Decisión') { pendingConnection.value = params; connectionDialog.value = true } 
    else { params.animated = true; addEdges([params]) }
})

onEdgeClick(({ edge }) => { if (confirm('¿Eliminar conexión?')) edges.value = edges.value.filter(e => e.id !== edge.id) })

const insertNode = () => {
    if (!nextNodeData.value.label || !nextNodeData.value.unidadEjecutoraId) return
    const id = `node_${Date.now()}`
    const parentNode = nodes.value.find(n => n.id === selectedParentId.value)
    let position = { x: 400, y: nodes.value.length * 200 + 50 }
    if (parentNode) {
        if (parentNode.data.tipo === 'Decisión' && decisionBranch.value === 'NO') position = { x: parentNode.position.x + 350, y: parentNode.position.y }
        else position = { x: parentNode.position.x, y: parentNode.position.y + 250 }
    }
    const newNode = { id, type: 'mppNode', position, data: { ...nextNodeData.value, order: nodes.value.length + 1 } }
    nodes.value.push(newNode)
    const sourceNode = parentNode || nodes.value[nodes.value.length - 2]
    if (sourceNode) {
        const isDecision = sourceNode.data.tipo === 'Decisión'; const isNoBranch = isDecision && decisionBranch.value === 'NO'; const newEdge = { id: `e_${sourceNode.id}-${id}`, source: sourceNode.id, target: id, animated: true, sourceHandle: isNoBranch ? 'source-right' : 'source-bottom' }
        if (isDecision) { const isYes = decisionBranch.value === 'SÍ'; newEdge.label = isYes ? 'SÍ' : 'NO'; newEdge.style = { stroke: isYes ? '#22c55e' : '#ef4444', strokeWidth: 4 }; newEdge.labelStyle = { fill: isYes ? '#22c55e' : '#ef4444', fontWeight: 900 } }
        edges.value.push(newEdge)
    }
    selectedParentId.value = id; nextNodeData.value = { ...nextNodeData.value, label: '', requisitos: '', operaciones: '' }
}

onNodeClick(({ node }) => { activeNode.value = node; nodeEditData.value = { label: node.data.label, ...node.data }; editDialog.value = true; })

const updateNodeInfo = () => {
    const n = nodes.value.find(node => node.id === activeNode.value.id)
    if (n) { Object.assign(n.data, nodeEditData.value); n.data.label = nodeEditData.value.label; }
    editDialog.value = false
}

const deleteNode = () => {
    nodes.value = nodes.value.filter(n => n.id !== activeNode.value.id); edges.value = edges.value.filter(e => e.source !== activeNode.value.id && e.target !== activeNode.value.id)
    nodes.value.forEach((n, i) => n.data.order = i + 1); editDialog.value = false
}
</script>

<template>
    <v-container fluid class="pa-0 fill-height bg-grey-lighten-4 overflow-hidden" :class="{ 'is-resizing': isResizing }">
        
        <!-- PANTALLA 1 -->
        <v-row v-if="!isLocked" justify="center" align="center" class="fill-height ma-0">
            <v-col cols="12" sm="10" md="8" lg="5">
                <v-card elevation="12" class="rounded-xl pa-8 border-top-primary">
                    <div class="text-center mb-8">
                        <v-avatar color="primary-lighten-5" size="80" class="mb-4"><v-icon size="40" color="primary">mdi-sitemap-outline</v-icon></v-avatar>
                        <h1 class="text-h4 font-weight-bold grey-darken-3">Manual de Procesos y Procedimientos</h1>
                        <p class="text-subtitle-1 text-grey-darken-1">Configura la jerarquía del proceso</p>
                    </div>
                    <v-row class="px-2">
                        <!-- FILA 1: PROCESO -->
                        <v-col cols="12" class="d-flex align-center mb-1">
                            <v-select v-model="selectedProceso" :items="mppStore.procesos" :item-title="getItemTitle" item-value="id_proceso" label="1. Proceso" variant="solo-filled" hide-details prepend-inner-icon="mdi-hexagon-multiple-outline" class="flex-grow-1"></v-select>
                            <div class="d-flex ml-2" style="width: 84px; justify-content: space-between;">
                                <v-btn icon="mdi-plus" color="primary" variant="tonal" size="small" @click="openDialog('proceso')"></v-btn>
                                <v-btn icon="mdi-pencil" color="info" variant="tonal" size="small" :disabled="!selectedProceso" @click="openDialog('proceso', 'edit')"></v-btn>
                            </div>
                        </v-col>
                        
                        <!-- FILA 2: CARGO RESPONSABLE -->
                        <v-expand-transition>
                            <v-col cols="12" class="d-flex align-center pt-0 mb-1" v-if="selectedProceso">
                                <div style="width: 32px;"></div> <!-- Sangría sutil -->
                                <v-select v-model="selectedCargo" :items="mppStore.cargos" :item-title="getItemTitle" item-value="id_cargo" label="Responsable del Proceso" variant="solo-filled" density="comfortable" hide-details prepend-inner-icon="mdi-account-tie-outline" class="flex-grow-1"></v-select>
                                <div class="d-flex ml-2" style="width: 84px; justify-content: flex-end;">
                                    <v-btn icon="mdi-content-save" color="success" variant="tonal" :disabled="!selectedCargo" @click="saveCargoRelation" size="small"></v-btn>
                                </div>
                            </v-col>
                        </v-expand-transition>

                        <!-- FILA 3: PROCEDIMIENTO -->
                        <v-col cols="12" class="d-flex align-center">
                            <v-select v-model="selectedProcedimiento" :items="mppStore.procedimientos" :item-title="getItemTitle" item-value="id_procedimiento" :item-props="getProcedimientoProps" label="2. Procedimiento" variant="solo-filled" :disabled="!selectedProceso" hide-details prepend-inner-icon="mdi-file-edit-outline" class="flex-grow-1"></v-select>
                            <div class="d-flex ml-2" style="width: 84px; justify-content: space-between;">
                                <v-btn icon="mdi-plus" color="primary" variant="tonal" size="small" @click="openDialog('procedimiento')"></v-btn>
                                <v-btn icon="mdi-pencil" color="info" variant="tonal" size="small" :disabled="!selectedProcedimiento" @click="openDialog('procedimiento', 'edit')"></v-btn>
                            </div>
                        </v-col>
                    </v-row>

                    <v-expand-transition>
                        <v-alert v-if="isProcedimientoInactivo" type="warning" variant="tonal" class="mt-4 rounded-lg" border="start">
                            <template v-slot:title><span class="text-subtitle-1 font-weight-bold">Procedimiento en Pausa</span></template>
                            Este procedimiento está <strong>Inactivo</strong>. Para diseñar su flujo, primero debes activarlo usando el botón de edición (el lápiz azul).
                        </v-alert>
                    </v-expand-transition>

                    <v-btn color="primary" block size="x-large" class="mt-6 rounded-lg font-weight-bold" :disabled="!selectedProcedimiento || isProcedimientoInactivo || !selectedCargo" @click="confirmEstructura" height="60" prepend-icon="mdi-vector-combine">Comenzar Diseño</v-btn>
                </v-card>
            </v-col>
        </v-row>

        <!-- PANTALLA 2 -->
        <div v-else class="designer-layout">
            <aside class="sidebar" :style="{ width: sidebarWidth + 'px' }">
                <div class="sidebar-content pa-4 d-flex flex-column fill-height">
                    <div class="d-flex align-start mb-4">
                        <v-btn icon="mdi-arrow-left" variant="text" size="small" @click="isLocked = false" class="mt-n1"></v-btn>
                        <div class="ml-2 overflow-hidden w-100">
                            <div class="mb-2">
                                <p class="text-caption text-uppercase font-weight-black text-grey-darken-1 mb-0"><v-icon size="x-small">mdi-hexagon-multiple</v-icon> Proceso</p>
                                <p class="context-text font-weight-medium">{{ getItemTitle(mppStore.procesos.find(p => p.id_proceso === selectedProceso)) }}</p>
                            </div>
                            <div class="pa-2 bg-primary-lighten-5 rounded-lg border-s-lg border-primary">
                                <p class="text-caption text-uppercase font-weight-black text-primary mb-0"><v-icon size="x-small">mdi-file-edit</v-icon> Procedimiento</p>
                                <p class="context-text font-weight-bold text-primary">{{ getItemTitle(mppStore.procedimientos.find(p => p.id_procedimiento === selectedProcedimiento)) }}</p>
                            </div>
                        </div>
                    </div>

                    <v-divider class="mb-4"></v-divider>
                    <div class="flex-grow-1 overflow-y-auto pr-2">
                        <h3 class="text-subtitle-1 font-weight-bold mb-4">Configurar Paso</h3>
                        <v-card variant="flat" border class="pa-4 rounded-xl bg-grey-lighten-5 mb-4">
                            <p class="text-caption font-weight-bold text-uppercase mb-1">1. Unidad Responsable</p>
                            <v-select v-model="nextNodeData.unidadEjecutoraId" :items="mppStore.unidades" :item-title="getItemTitle" item-value="id" variant="outlined" density="compact" class="mb-3" bg-color="white"></v-select>
                            
                            <p class="text-caption font-weight-bold text-uppercase mb-1">2. Responsable (Cargo)</p>
                            <v-text-field v-model="nextNodeData.responsable" variant="outlined" density="compact" bg-color="white" class="mb-3" placeholder="Ej: Jefe de Oficina"></v-text-field>
                            
                            <p class="text-caption font-weight-bold text-uppercase mb-1">3. Tipo de Paso</p>
                            <v-select v-model="nextNodeData.tipo" :items="['Inicio', 'Tarea', 'Decisión', 'Fin']" variant="outlined" density="compact" bg-color="white" class="mb-3"></v-select>

                            <p class="text-caption font-weight-bold text-uppercase mb-1">4. Nombre del Paso</p>
                            <v-text-field v-model="nextNodeData.label" variant="outlined" density="compact" bg-color="white" class="mb-3" placeholder="Ej: Revisar solicitud"></v-text-field>
                            
                            <p class="text-caption font-weight-bold text-uppercase mb-1">5. Requisitos</p>
                            <v-textarea v-model="nextNodeData.requisitos" rows="2" variant="outlined" density="compact" bg-color="white" class="mb-3"></v-textarea>
                            
                            <p class="text-caption font-weight-bold text-uppercase mb-1">6. Operaciones</p>
                            <v-textarea v-model="nextNodeData.operaciones" rows="2" variant="outlined" density="compact" bg-color="white" class="mb-4"></v-textarea>
                            
                            <p class="text-caption font-weight-bold text-uppercase mb-1">7. Paso Anterior (Conectar a)</p>
                            <v-select v-model="selectedParentId" :items="nodes" :item-title="item => item.data.label" item-value="id" placeholder="Último paso creado" variant="outlined" density="compact" bg-color="white" class="mb-3" clearable></v-select>

                            <v-expand-transition>
                                <div v-if="nodes.find(n => n.id === selectedParentId)?.data.tipo === 'Decisión'">
                                    <p class="text-caption font-weight-bold text-uppercase mb-1 text-primary">¿Resultado de la Decisión?</p>
                                    <v-btn-toggle v-model="decisionBranch" mandatory color="primary" class="mb-4 w-100" density="compact">
                                        <v-btn value="SÍ" class="flex-grow-1">SÍ (Verde)</v-btn>
                                        <v-btn value="NO" class="flex-grow-1">NO (Rojo)</v-btn>
                                    </v-btn-toggle>
                                </div>
                            </v-expand-transition>

                            <v-btn color="secondary" block prepend-icon="mdi-plus" @click="insertNode" height="48" class="font-weight-bold rounded-lg elevation-2">Añadir al Diagrama</v-btn>
                        </v-card>
                    </div>
                    <div class="mt-auto pt-4">
                        <v-alert v-if="lastSaved" density="compact" color="success" variant="tonal" class="text-caption py-1 mb-2"><v-icon size="14">mdi-check-circle</v-icon> Guardado: {{ lastSaved }}</v-alert>
                        <v-btn color="primary" block size="large" :loading="isSaving" prepend-icon="mdi-content-save" @click="autoSaveSilent" class="rounded-lg">Guardar Todo</v-btn>
                    </div>
                </div>
                <div class="resize-handle" @mousedown="startResizing"></div>
            </aside>

            <main class="diagram-container flex-grow-1 bg-white">
                <VueFlow v-model:nodes="nodes" v-model:edges="edges" :fit-view-on-init="true">
                    <template #node-mppNode="{ data }">
                        <div 
                            :class="['mpp-node-container', 'node-' + normalizeType(data.tipo)]" 
                            :style="{ backgroundColor: getUnitColor(data.unidadEjecutoraId), color: getContrastColor(getUnitColor(data.unidadEjecutoraId)), borderColor: getContrastColor(getUnitColor(data.unidadEjecutoraId)) + '66' }"
                        >
                            <Handle type="target" :position="Position.Top" style="background: #94a3b8; width: 10px; height: 10px;" />
                            <div class="mpp-node-order" :style="{ backgroundColor: getContrastColor(getUnitColor(data.unidadEjecutoraId)), color: getUnitColor(data.unidadEjecutoraId) }">#{{ data.order }}</div>
                            <div class="mpp-node-content">
                                <div class="mpp-node-label">{{ data.label }}</div>
                                <div class="mpp-node-resp">{{ data.responsable || 'Puesto no asignado' }}</div>
                            </div>
                            <div class="mpp-node-badges" v-if="data.requisitos || data.operaciones"><v-icon size="14">mdi-file-document-check</v-icon></div>
                            <Handle id="source-bottom" type="source" :position="Position.Bottom" style="background: #94a3b8; width: 10px; height: 10px;" />
                            <Handle v-if="data.tipo === 'Decisión'" id="source-right" type="source" :position="Position.Right" style="background: #ef4444; width: 12px; height: 12px;" />
                        </div>
                    </template>
                    <Background pattern-color="#cbd5e1" :gap="25" />
                    <Controls />
                </VueFlow>
            </main>
        </div>

        <v-dialog v-model="connectionDialog" max-width="350px" persistent>
            <v-card class="rounded-xl pa-4 text-center">
                <v-icon color="orange" size="64" class="mb-4">mdi-help-rhombus</v-icon>
                <v-card-title class="text-h5 font-weight-bold">Ruta de Decisión</v-card-title>
                <v-card-text>¿Qué respuesta representa esta conexión?</v-card-text>
                <v-card-actions class="justify-center pt-4">
                    <v-btn color="error" variant="elevated" @click="confirmConnection(false)" size="large" class="px-8 rounded-lg mr-2">NO</v-btn>
                    <v-btn color="success" variant="elevated" @click="confirmConnection(true)" size="large" class="px-8 rounded-lg">SÍ</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <v-dialog v-model="showEntityDialog" max-width="500px">
            <v-card class="rounded-lg pa-4">
                <v-card-title class="text-h5 font-weight-bold text-capitalize">{{ entityMode === 'create' ? 'Nuevo' : 'Editar' }} {{ entityType }}</v-card-title>
                <v-card-text>
                    <v-row v-if="entityType === 'proceso'">
                        <v-col cols="12" class="pb-0"><v-text-field v-model="entityData.codigo" label="Código" variant="outlined" density="compact" placeholder="Ej: PROC-001"></v-text-field></v-col>
                        <v-col cols="12" class="pb-0"><v-text-field v-model="entityData.nombre" label="Nombre del Proceso" variant="outlined" density="compact"></v-text-field></v-col>
                        <v-col cols="12" class="pb-0"><v-textarea v-model="entityData.descripcion" label="Descripción" variant="outlined" rows="2" density="compact"></v-textarea></v-col>
                        <v-col cols="12" class="d-flex align-center">
                            <v-autocomplete
                                v-model="entityData.id_unidades"
                                :items="mppStore.unidades"
                                :item-title="getItemTitle"
                                item-value="id"
                                label="Unidades Responsables"
                                multiple
                                chips
                                variant="outlined"
                                density="compact"
                                closable-chips
                                class="flex-grow-1"
                            ></v-autocomplete>
                            <v-tooltip text="Sincronizar nombres con MOF">
                                <template v-slot:activator="{ props }">
                                    <v-btn v-bind="props" icon="mdi-sync" color="secondary" variant="tonal" class="ml-2 mb-4" size="small" :loading="mppStore.loading" @click="handleSync"></v-btn>
                                </template>
                            </v-tooltip>
                        </v-col>
                    </v-row>
                    <v-row v-else>
                        <v-col cols="12" md="6" class="pb-0"><v-text-field v-model="entityData.codigo" label="Código" variant="outlined" density="compact" placeholder="Ej: PROCD-001"></v-text-field></v-col>
                        <v-col cols="12" md="6" class="pb-0"><v-text-field v-model="entityData.version" label="Versión" variant="outlined" density="compact"></v-text-field></v-col>
                        <v-col cols="12" class="pb-0"><v-text-field v-model="entityData.nombre" label="Nombre del Procedimiento" variant="outlined" density="compact" autofocus></v-text-field></v-col>
                        <v-col cols="12" class="pb-0"><v-textarea v-model="entityData.objetivos" label="Objetivos" variant="outlined" rows="2" density="compact"></v-textarea></v-col>
                        <v-col cols="12" class="pb-0"><v-textarea v-model="entityData.alcance" label="Alcance" variant="outlined" rows="2" density="compact"></v-textarea></v-col>
                        <v-col cols="12" md="6" class="pb-0"><v-text-field v-model="entityData.periodicidad" label="Periodicidad" variant="outlined" density="compact"></v-text-field></v-col>
                        <v-col cols="12" md="6"><v-select v-model="entityData.estado" :items="['Activo', 'Inactivo']" label="Estado" variant="outlined" density="compact"></v-select></v-col>
                    </v-row>
                </v-card-text>
                <v-card-actions><v-spacer></v-spacer><v-btn variant="text" @click="showEntityDialog = false">Cancelar</v-btn><v-btn color="primary" variant="elevated" @click="handleSaveEntity">Guardar</v-btn></v-card-actions>
            </v-card>
        </v-dialog>

        <v-dialog v-model="editDialog" max-width="600px">
            <v-card v-if="activeNode" class="rounded-xl overflow-hidden">
                <v-toolbar color="primary" dark><v-toolbar-title>Editar Paso</v-toolbar-title><v-spacer></v-spacer><v-btn icon="mdi-close" @click="editDialog = false"></v-btn></v-toolbar>
                <v-card-text class="pa-6 bg-grey-lighten-4">
                    <v-row>
                        <v-col cols="12" md="6"><v-select v-model="nodeEditData.unidadEjecutoraId" :items="mppStore.unidades" :item-title="getItemTitle" item-value="id" label="Unidad" variant="outlined" bg-color="white"></v-select></v-col>
                        <v-col cols="12" md="6"><v-text-field v-model="nodeEditData.responsable" label="Responsable (Cargo)" variant="outlined" bg-color="white"></v-text-field></v-col>
                        <v-col cols="12" md="6"><v-select v-model="nodeEditData.tipo" :items="['Inicio', 'Tarea', 'Decisión', 'Fin']" label="Tipo" variant="outlined" bg-color="white"></v-select></v-col>
                        <v-col cols="12" md="6"><v-text-field v-model="nodeEditData.label" label="Nombre" variant="outlined" bg-color="white"></v-text-field></v-col>
                        <v-col cols="12"><v-textarea v-model="nodeEditData.requisitos" label="Requisitos" variant="outlined" rows="2" bg-color="white"></v-textarea></v-col>
                        <v-col cols="12"><v-textarea v-model="nodeEditData.operaciones" label="Operaciones" variant="outlined" rows="3" bg-color="white"></v-textarea></v-col>
                    </v-row>
                </v-card-text>
                <v-card-actions class="pa-4 bg-white"><v-btn color="error" variant="text" @click="deleteNode">Eliminar Paso</v-btn><v-spacer></v-spacer><v-btn color="primary" variant="elevated" @click="updateNodeInfo" class="px-6">Actualizar</v-btn></v-card-actions>
            </v-card>
        </v-dialog>

        <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000">{{ snackbar.text }}</v-snackbar>
    </v-container>
</template>

<style scoped>
.fill-height { height: 100vh; }
.border-top-primary { border-top: 8px solid #6366f1 !important; }
.designer-layout { display: flex; width: 100vw; height: 100vh; }
.sidebar { height: 100%; position: relative; background: white; border-right: 1px solid #e2e8f0; flex-shrink: 0; }
.sidebar-content { height: 100%; overflow: hidden; }
.context-text { font-size: 0.85rem; line-height: 1.2; }
.resize-handle { position: absolute; top: 0; right: -4px; width: 8px; height: 100%; cursor: col-resize; z-index: 100; }
.diagram-container { flex-grow: 1; height: 100%; overflow: hidden; }
.mpp-node-container { padding: 14px; border: 2.5px solid #6366f1; min-width: 200px; max-width: 250px; min-height: 80px; position: relative; display: flex; flex-direction: column; justify-content: center; box-shadow: 0 4px 15px rgba(0,0,0,0.1); border-radius: 8px; }
.mpp-node-order { position: absolute; top: -12px; left: -12px; font-weight: 900; font-size: 0.75rem; width: 26px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
.mpp-node-label { font-weight: 800; font-size: 0.95rem; margin-bottom: 2px; line-height: 1.1; }
.mpp-node-resp { font-size: 0.75rem; font-style: italic; opacity: 0.9; }
.mpp-node-badges { position: absolute; bottom: 6px; right: 6px; }
.node-decision { clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%); width: 240px; height: 240px; padding: 55px 40px !important; text-align: center; }
.node-inicio, .node-fin { border-radius: 50px; min-width: 160px; text-align: center; border-width: 4px; }
:deep(.vue-flow__node.selected) .mpp-node-container { border-color: #4338ca; transform: scale(1.05); }
:deep(.vue-flow__edge-label) { background: white; padding: 4px 10px; border-radius: 6px; font-weight: 900; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
</style>
