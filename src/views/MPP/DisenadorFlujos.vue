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
const showResourceDialog = ref(false)
const entityMode = ref('create') 
const entityType = ref('') 
const entityData = ref({ 
    id: null, codigo: '', nombre: '', descripcion: '', id_unidades: [],
    objetivos: '', alcance: '', periodicidad: '', version: '1.0', estado: 'Activo', id_instalaciones: [],
    id_normativas: [], id_indicadores: [], id_equipos: [], id_sistemas_informacion: []
})

const resourceMode = ref('create')
const resourceType = ref('')
const resourceData = ref({ id: null, nombre: '', descripcion: '', codigo: '', formula: '', meta: '', impacto: '', probabilidad: '', tipo_control: '', url: '', denominacion: '', unidad_medida: '' })

const selectedProceso = ref(null)
const selectedProcedimiento = ref(null)
const selectedCargo = ref(null)
const isUnitsDirty = ref(false)
const isCargoDirty = ref(false)
const isPeriodicidadDirty = ref(false)
const isObjetivosDirty = ref(false)
const isAlcanceDirty = ref(false)
const isNormativaDirty = ref(false)

// Datos de cabecera del procedimiento (Los 8 campos críticos)
const procedureHeader = ref({
    objetivos: '',
    alcance: '',
    periodicidad: ''
})

// Unidades del proceso seleccionado (Para Campo 1: UNIDAD RESPONSABLE)
const processUnits = computed(() => {
    if (!selectedProceso.value) return []
    const proceso = mppStore.procesos.find(p => p.id_proceso === selectedProceso.value)
    return proceso?.unidades || []
})

// Estados de selección para catálogos de Calidad y Recursos
const selectedRiesgo = ref(null)
const selectedControl = ref(null)
const selectedRequisito = ref(null)
const selectedNormativa = ref(null)
const selectedIndicador = ref(null)

// --- FILTRADO CONTEXTUAL (CASCADA) ---

// Operaciones reales del backend para el procedimiento seleccionado
const currentOperaciones = computed(() => {
    if (!selectedProcedimiento.value) return []
    return mppStore.operaciones.filter(op => op.id_procedimiento === selectedProcedimiento.value)
})

watch(selectedProcedimiento, async (id) => {
    if (id) {
        console.log("Cargando datos del procedimiento ID:", id);
        // Cargar datos actuales para el formulario de cabecera
        const proc = mppStore.procedimientos.find(p => p.id_procedimiento === id)
        if (proc) {
            console.log("Procedimiento encontrado:", proc);
            procedureHeader.value = {
                objetivos: proc.objetivos || '',
                alcance: proc.alcance || '',
                periodicidad: proc.periodicidad || ''
            }
            // Recuperar normativa si existe
            if (proc.normativas && proc.normativas.length > 0) {
                selectedNormativa.value = proc.normativas[0].id_normativa;
                console.log("Normativa recuperada ID:", selectedNormativa.value);
            } else {
                selectedNormativa.value = null;
            }

            // Resetear estados sucios al cargar uno nuevo
            setTimeout(() => {
                isPeriodicidadDirty.value = false
                isObjetivosDirty.value = false
                isAlcanceDirty.value = false
                isNormativaDirty.value = false
            }, 150)
        }
        
        // Cargar operaciones para conocer la relación de riesgos/controles
        await mppStore.fetchOperaciones()
        // Resetear selecciones dependientes
        selectedRiesgo.value = null
        selectedControl.value = null
        selectedRequisito.value = null
        selectedIndicador.value = null
    }
})

// Watchers para detectar cambios individuales
watch(() => procedureHeader.value.periodicidad, () => { if (selectedProcedimiento.value && !isSaving.value) isPeriodicidadDirty.value = true })
watch(() => procedureHeader.value.objetivos, () => { if (selectedProcedimiento.value && !isSaving.value) isObjetivosDirty.value = true })
watch(() => procedureHeader.value.alcance, () => { if (selectedProcedimiento.value && !isSaving.value) isAlcanceDirty.value = true })
watch(selectedNormativa, () => { if (selectedProcedimiento.value && !isSaving.value) isNormativaDirty.value = true })

const saveProcedureHeader = async () => {
    if (!selectedProcedimiento.value) return
    try {
        isSaving.value = true
        console.log("Iniciando guardado de cabecera...");
        
        const updates = [
            mppStore.updateProcedimiento(selectedProcedimiento.value, {
                ...procedureHeader.value
            })
        ]

        if (selectedNormativa.value) {
            updates.push(mppStore.updateNormativa(selectedNormativa.value, {
                id_procedimientos: [Number(selectedProcedimiento.value)]
            }))
        }

        await Promise.all(updates)
        
        // Resetear estados sucios
        isPeriodicidadDirty.value = false
        isObjetivosDirty.value = false
        isAlcanceDirty.value = false
        isNormativaDirty.value = false
        
        snackbar.value = { show: true, text: 'Cabecera del procedimiento guardada exitosamente', color: 'success' }
        await mppStore.fetchProcedimientos(selectedProceso.value)
    } catch (e) {
        console.error("Error al guardar:", e);
        snackbar.value = { show: true, text: 'Error al guardar cabecera: ' + e.message, color: 'error' }
    } finally {
        isSaving.value = false
    }
}

const filteredRiesgos = computed(() => {
    if (!selectedProcedimiento.value) return []
    const idsOps = currentOperaciones.value.map(op => op.id_operaciones)
    return mppStore.riesgos.filter(r => idsOps.includes(r.id_operacion))
})

const filteredControles = computed(() => {
    if (!selectedProcedimiento.value) return []
    const idsOps = currentOperaciones.value.map(op => op.id_operaciones)
    return mppStore.controles.filter(c => idsOps.includes(c.id_operacion))
})

const filteredRequisitos = computed(() => {
    if (!selectedProcedimiento.value) return []
    const idsOps = currentOperaciones.value.map(op => op.id_operaciones)
    return mppStore.requisitos.filter(req => idsOps.includes(req.id_operacion))
})

const filteredNormativas = computed(() => {
    if (!selectedProcedimiento.value) return []
    return mppStore.normativas.filter(n => 
        n.procedimientos?.some(p => p.id_procedimiento === selectedProcedimiento.value)
    )
})

const filteredIndicadores = computed(() => {
    if (!selectedProcedimiento.value) return []
    return mppStore.indicadores.filter(i => 
        i.procedimientos?.some(p => p.id_procedimiento === selectedProcedimiento.value)
    )
})

const getNoDataText = (list, type) => {
    if (!selectedProcedimiento.value) return 'Seleccione un procedimiento primero'
    return list.length === 0 ? `Sin ${type} registrados para este procedimiento` : 'No hay coincidencias'
}

const filteredCargos = computed(() => {
    if (!selectedProceso.value) return []
    const proceso = mppStore.procesos.find(p => p.id_proceso === selectedProceso.value)
    if (!proceso || !proceso.unidades) return []
    const idsUnidadesProceso = proceso.unidades.map(u => u.id_unidad)
    const unidadesConCargos = mppStore.unidades.filter(u => idsUnidadesProceso.includes(u.id_unidad))
    const todosLosCargos = unidadesConCargos.flatMap(u => u.cargos || [])
    return Array.from(new Map(todosLosCargos.map(c => [c.id_cargo, c])).values())
})

// --- CRUD RECURSOS ---
const handleSaveResource = async () => {
    try {
        const type = resourceType.value
        const isEdit = resourceMode.value === 'edit'
        const payload = { ...resourceData.value }
        delete payload.id

        if (type === 'riesgo') {
            isEdit ? await mppStore.updateRiesgo(resourceData.value.id, payload) : await mppStore.saveRiesgo(payload)
            await mppStore.fetchRiesgos()
        } else if (type === 'control') {
            isEdit ? await mppStore.updateControl(resourceData.value.id, payload) : await mppStore.saveControl(payload)
            await mppStore.fetchControles()
        } else if (type === 'requisito') {
            isEdit ? await mppStore.updateRequisito(resourceData.value.id, payload) : await mppStore.saveRequisito(payload)
            await mppStore.fetchRequisitos()
        } else if (type === 'normativa') {
            isEdit ? await mppStore.updateNormativa(resourceData.value.id, payload) : await mppStore.saveNormativa(payload)
            await mppStore.fetchNormativas()
        } else if (type === 'indicador') {
            isEdit ? await mppStore.updateIndicador(resourceData.value.id, payload) : await mppStore.saveIndicador(payload)
            await mppStore.fetchIndicadores()
        }

        showResourceDialog.value = false
        snackbar.value = { show: true, text: 'Registro procesado exitosamente', color: 'success' }
    } catch (e) {
        snackbar.value = { show: true, text: 'Error: ' + (e.response?.data?.message || e.message), color: 'error' }
    }
}

const openResourceDialog = (type, mode = 'create', item = null) => {
    resourceType.value = type
    resourceMode.value = mode
    if (mode === 'edit' && item) {
        const id = item.id_riesgo || item.id_control || item.id_requisitos || item.id_normativa || item.id_indicador
        resourceData.value = { ...item, id, nombre: item.nombre || item.denominacion || '', descripcion: item.descripcion || '' }
    } else {
        resourceData.value = { id: null, nombre: '', descripcion: '', codigo: '', formula: '', meta: '', impacto: '', probabilidad: '', tipo_control: '', url: '', denominacion: '', unidad_medida: '' }
    }
    showResourceDialog.value = true
}

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
const nodeTab = ref('general')

onMounted(async () => { 
    try {
        // 1. Sincronización Automática con el Core al Abrir (Asegura Verdad Absoluta)
        // No bloqueamos toda la UI, pero cargamos lo básico primero
        await mppStore.fetchProcesos()
        
        // Disparamos la sincronización pesada en segundo plano o secuencialmente
        handleFullSync() 

        // 2. Carga de Catálogos para selectores
        await Promise.all([
            mppStore.fetchUnidades(), 
            mppStore.fetchCargos(),
            mppStore.fetchNormativas(),
            mppStore.fetchIndicadores(),
            mppStore.fetchEquipos(),
            mppStore.fetchSistemasInformacion(),
            mppStore.fetchRiesgos(),
            mppStore.fetchControles(),
            mppStore.fetchRequisitos(),
            mppStore.fetchOperaciones()
        ]);
    } catch (e) {
        console.error("Error en carga inicial:", e)
    }
    
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
        if (v) { 
            await mppStore.fetchProcedimientos(v); 
            await mppStore.fetchCargoProcesos(v);
            
            // Sincronizar unidades del proceso con el Campo 2
            const proceso = mppStore.procesos.find(p => p.id_proceso === v);
            if (proceso && proceso.unidades) {
                entityData.value.id_unidades = proceso.unidades.map(u => u.id_unidad);
            } else {
                entityData.value.id_unidades = [];
            }
            // Resetear estado de cambios después de cargar
            setTimeout(() => { 
                isUnitsDirty.value = false 
                isCargoDirty.value = false
            }, 100);
        }
    } 
})

watch(selectedCargo, (newVal) => {
    if (selectedProceso.value && !isSaving.value) {
        // Verificar si el cargo ya es el principal actual para no activar el pulso innecesariamente
        const principalActual = mppStore.cargoProcesos.find(cp => cp.es_responsable_principal)?.id_cargo
        if (newVal !== principalActual) {
            isCargoDirty.value = true
        }
    }
})

watch(() => entityData.value.id_unidades, (newVal) => {
    if (selectedProceso.value && !isSaving.value) {
        isUnitsDirty.value = true
    }
}, { deep: true })

const saveCargoRelation = async () => {
    if (!selectedProceso.value || !selectedCargo.value) return
    try {
        isSaving.value = true
        const existing = mppStore.cargoProcesos.find(cp => cp.es_responsable_principal)
        if (existing) {
            await mppStore.updateCargoProceso(existing.id, { id_cargo: Number(selectedCargo.value), id_proceso: Number(selectedProceso.value), es_responsable_principal: true })
        } else {
            await mppStore.saveCargoProceso({ id_cargo: Number(selectedCargo.value), id_proceso: Number(selectedProceso.value), es_responsable_principal: true })
        }
        const cargoTemporal = selectedCargo.value
        await mppStore.fetchCargoProcesos(selectedProceso.value)
        selectedCargo.value = cargoTemporal
        isCargoDirty.value = false
        snackbar.value = { show: true, text: 'Cargo responsable guardado', color: 'success' }
    } catch (e) { snackbar.value = { show: true, text: 'Error al asignar cargo: ' + e.message, color: 'error' } }
    finally { isSaving.value = false }
}

const saveProcessUnits = async () => {
    if (!selectedProceso.value) return
    try {
        isSaving.value = true
        await mppStore.updateProceso(selectedProceso.value, {
            id_unidades: entityData.value.id_unidades.map(id => Number(id))
        })
        snackbar.value = { show: true, text: 'Unidades del proceso actualizadas', color: 'success' }
        await mppStore.fetchProcesos()
        isUnitsDirty.value = false
    } catch (e) {
        snackbar.value = { show: true, text: 'Error al actualizar unidades: ' + e.message, color: 'error' }
    } finally {
        isSaving.value = false
    }
}

const handleFullSync = async () => {
    try {
        snackbar.value = { show: true, text: 'Iniciando sincronización...', color: 'info' }
        const resUnidades = await mppStore.syncUnidades()
        if (!resUnidades) throw new Error('Error al sincronizar unidades')
        const resCargos = await mppStore.syncCargos()
        if (resCargos) snackbar.value = { show: true, text: 'Sincronización completada', color: 'success' }
        else snackbar.value = { show: true, text: 'Problema parcial con cargos', color: 'warning' }
    } catch (e) { snackbar.value = { show: true, text: 'Fallo: ' + e.message, color: 'error' } }
}

const openDialog = async (type, mode = 'create') => {
    entityType.value = type; entityMode.value = mode
    if (mode === 'edit') {
        const id = type === 'proceso' ? selectedProceso.value : selectedProcedimiento.value
        const item = (type === 'proceso' ? mppStore.procesos : mppStore.procedimientos).find(i => (type === 'proceso' ? i.id_proceso : i.id_procedimiento) === id)
        entityData.value = { 
            id: type === 'proceso' ? item.id_proceso : item.id_procedimiento, 
            codigo: item.codigo || '', nombre: item.nombre || '', descripcion: item.descripcion || '',
            id_unidades: item.unidades ? item.unidades.map(u => u.id_unidad) : [],
            objetivos: item.objetivos || '', alcance: item.alcance || '', periodicidad: item.periodicidad || '', version: item.version || '1.0', estado: item.estado || 'Activo', 
            id_instalaciones: item.instalaciones ? item.instalaciones.map(i => i.id_unidad) : [],
            id_normativas: item.normativas ? item.normativas.map(n => n.id_normativa) : [],
            id_indicadores: item.indicadores ? item.indicadores.map(i => i.id_indicador) : [],
            id_equipos: item.equipos ? item.equipos.map(e => e.id_equipos) : [],
            id_sistemas_informacion: item.sistemasInformacion ? item.sistemasInformacion.map(s => s.id_sistema_informacion) : []
        }
    } else {
        entityData.value = { id: null, codigo: '', nombre: '', descripcion: '', id_unidades: [], objetivos: '', alcance: '', periodicidad: '', version: '1.0', estado: 'Activo', id_instalaciones: [], id_normativas: [], id_indicadores: [], id_equipos: [], id_sistemas_informacion: [] }
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
                const payload = { id_proceso: Number(selectedProceso.value), codigo: entityData.value.codigo, nombre: entityData.value.nombre, objetivos: entityData.value.objetivos, alcance: entityData.value.alcance, periodicidad: entityData.value.periodicidad, version: entityData.value.version, estado: entityData.value.estado, id_instalaciones: entityData.value.id_instalaciones.map(id => Number(id)) };
                const res = await mppStore.saveProcedimiento(payload); await mppStore.fetchProcedimientos(selectedProceso.value); selectedProcedimiento.value = res.id_procedimiento 
            }
        } else {
            if (entityType.value === 'proceso') {
                await mppStore.updateProceso(entityData.value.id, { codigo: entityData.value.codigo, nombre: entityData.value.nombre, descripcion: entityData.value.descripcion, id_unidades: entityData.value.id_unidades.map(id => Number(id)) })
                await mppStore.fetchProcesos(); selectedProceso.value = entityData.value.id
            } else {
                await mppStore.updateProcedimiento(entityData.value.id, { id_proceso: Number(selectedProceso.value), codigo: entityData.value.codigo, nombre: entityData.value.nombre, objetivos: entityData.value.objetivos, alcance: entityData.value.alcance, periodicidad: entityData.value.periodicidad, version: entityData.value.version, estado: entityData.value.estado, id_instalaciones: entityData.value.id_instalaciones.map(id => Number(id)) })
                await mppStore.fetchProcedimientos(selectedProceso.value); selectedProcedimiento.value = entityData.value.id
            }
        }
        showEntityDialog.value = false; snackbar.value = { show: true, text: 'Guardado correctamente', color: 'success' }
    } catch (e) { snackbar.value = { show: true, text: 'Error: ' + (e.response?.data?.message || e.message), color: 'error' } }
}

const confirmEstructura = async () => {
    if (!selectedProcedimiento.value) return
    
    try {
        isSaving.value = true
        // 1. GUARDADO PROFUNDO (Deep Save) antes de entrar al diseño
        const deepUpdates = [
            mppStore.updateProcedimiento(selectedProcedimiento.value, {
                objetivos: procedureHeader.value.objetivos,
                alcance: procedureHeader.value.alcance,
                periodicidad: procedureHeader.value.periodicidad
            }),
            saveCargoRelation(),
            saveProcessUnits()
        ]

        if (selectedNormativa.value) {
            deepUpdates.push(mppStore.updateNormativa(selectedNormativa.value, {
                id_procedimientos: [Number(selectedProcedimiento.value)]
            }))
        }

        await Promise.all(deepUpdates)

        // Resetear todos los estados sucios tras el guardado total
        isUnitsDirty.value = false
        isCargoDirty.value = false
        isPeriodicidadDirty.value = false
        isObjetivosDirty.value = false
        isAlcanceDirty.value = false
        isNormativaDirty.value = false

        // 2. Transición al Diseñador
        isLocked.value = true
        const pasos = await mppStore.fetchPasos(selectedProcedimiento.value)
        nodes.value = pasos?.length ? pasos.map((p, idx) => ({ id: p.id.toString(), type: 'mppNode', position: { x: p.x || 100, y: p.y || 100 }, data: { ...p.metadata, order: p.orden || (idx + 1), label: p.descripcion } })) : []
        const restoredEdges = []
        pasos?.forEach(p => { if (p.metadata?.connections) restoredEdges.push(...p.metadata.connections) })
        edges.value = restoredEdges
        
        setTimeout(() => { fitView(); isDirty.value = false; lastSaved.value = 'Todo guardado y cargado'; }, 200)
    } catch (e) {
        snackbar.value = { show: true, text: 'Error al realizar guardado profundo: ' + e.message, color: 'error' }
    } finally {
        isSaving.value = false
    }
}

const updateNodeInfo = () => {
    const n = nodes.value.find(node => node.id === activeNode.value.id)
    if (n) { Object.assign(n.data, nodeEditData.value); n.data.label = nodeEditData.value.label; }
    editDialog.value = false
}

const deleteNode = () => {
    nodes.value = nodes.value.filter(n => n.id !== activeNode.value.id); edges.value = edges.value.filter(e => e.source !== activeNode.value.id && e.target !== activeNode.value.id)
    nodes.value.forEach((n, i) => n.data.order = i + 1); editDialog.value = false
}

const exportToPDF = () => {
    window.print()
}
</script>

<template>
    <v-container fluid class="pa-0 fill-height bg-grey-lighten-4 overflow-hidden" :class="{ 'is-resizing': isResizing }">
        
        <!-- PANTALLA 1 -->
        <v-row v-if="!isLocked" justify="center" align="center" class="fill-height ma-0" style="flex-direction: column; align-content: center;">
            
            <v-col cols="12" sm="10" md="8" lg="5">
                <v-card elevation="12" class="rounded-xl pa-8 border-top-primary">
                    <div class="d-flex justify-end mb-n8">
                        <v-btn
                            icon="mdi-sync"
                            color="info"
                            variant="text"
                            :loading="mppStore.loading"
                            @click="handleFullSync"
                            title="Sincronizar con UMSA-Core"
                        ></v-btn>
                    </div>
                    <div class="text-center mb-8">
                        <v-avatar color="primary-lighten-5" size="80" class="mb-4"><v-icon size="40" color="primary">mdi-sitemap-outline</v-icon></v-avatar>
                        <h1 class="text-h4 font-weight-bold grey-darken-3">Manual de Procesos y Procedimientos</h1>
                        <p class="text-subtitle-1 text-grey-darken-1">Configura la jerarquía del proceso</p>
                    </div>

                    <v-row class="px-2">
                        <!-- CAMPO 1: PROCESO -->
                        <v-col cols="12" class="d-flex align-center mb-1">
                            <v-select v-model="selectedProceso" :items="mppStore.procesos" :item-title="getItemTitle" item-value="id_proceso" label="1. Proceso" variant="solo-filled" hide-details prepend-inner-icon="mdi-hexagon-multiple-outline" class="flex-grow-1"></v-select>
                            <div class="d-flex ml-2" style="width: 84px; justify-content: space-between;">
                                <v-btn icon color="primary" variant="tonal" size="small" @click="openDialog('proceso')">
                                    <v-icon>mdi-plus</v-icon>
                                    <v-tooltip activator="parent" location="top">Nuevo Proceso</v-tooltip>
                                </v-btn>
                                <v-btn icon color="info" variant="tonal" size="small" :disabled="!selectedProceso" @click="openDialog('proceso', 'edit')">
                                    <v-icon>mdi-pencil</v-icon>
                                    <v-tooltip activator="parent" location="top">Editar Proceso</v-tooltip>
                                </v-btn>
                            </div>
                        </v-col>

                        <!-- CAMPO 2: UNIDAD RESPONSABLE -->
                        <v-col cols="12" class="d-flex align-center mb-1">
                            <v-autocomplete v-model="entityData.id_unidades" :items="mppStore.unidades" :item-title="getItemTitle" item-value="id_unidad" label="2. Unidades Responsables" variant="solo-filled" hide-details prepend-inner-icon="mdi-domain" multiple chips closable-chips class="flex-grow-1" :disabled="!selectedProceso"></v-autocomplete>
                            <div class="d-flex ml-2" style="width: 42px; justify-content: flex-end;">
                                <v-btn icon color="success" variant="tonal" size="small" :disabled="!selectedProceso" @click="saveProcessUnits" :class="{ 'pulse-save': isUnitsDirty }">
                                    <v-icon>mdi-check</v-icon>
                                    <v-tooltip activator="parent" location="top">Guardar Unidades</v-tooltip>
                                </v-btn>
                            </div>
                        </v-col>
                        
                        <!-- CAMPO 3: RESPONSABLE PRINCIPAL (CARGOS) -->
                        <v-col cols="12" class="d-flex align-center mb-1" v-if="selectedProceso">
                            <v-select v-model="selectedCargo" :items="filteredCargos" :item-title="getItemTitle" item-value="id_cargo" label="3. Responsable Principal" variant="solo-filled" hide-details prepend-inner-icon="mdi-account-tie-outline" class="flex-grow-1"></v-select>
                            <div class="d-flex ml-2" style="width: 42px; justify-content: flex-end;">
                                <v-btn icon color="success" variant="tonal" size="small" :disabled="!selectedCargo" @click="saveCargoRelation" :class="{ 'pulse-save': isCargoDirty }">
                                    <v-icon>mdi-check</v-icon>
                                    <v-tooltip activator="parent" location="top">Guardar Responsable</v-tooltip>
                                </v-btn>
                            </div>
                        </v-col>

                        <!-- CAMPO 4: PROCEDIMIENTO -->
                        <v-col cols="12" class="d-flex align-center mb-1">
                            <v-select v-model="selectedProcedimiento" :items="mppStore.procedimientos" :item-title="getItemTitle" item-value="id_procedimiento" :item-props="getProcedimientoProps" label="4. Procedimiento" variant="solo-filled" :disabled="!selectedProceso" hide-details prepend-inner-icon="mdi-file-edit-outline" class="flex-grow-1"></v-select>
                            <div class="d-flex ml-2" style="width: 84px; justify-content: space-between;">
                                <v-btn icon color="primary" variant="tonal" size="small" @click="openDialog('procedimiento')">
                                    <v-icon>mdi-plus</v-icon>
                                    <v-tooltip activator="parent" location="top">Nuevo Procedimiento</v-tooltip>
                                </v-btn>
                                <v-btn icon color="info" variant="tonal" size="small" :disabled="!selectedProcedimiento" @click="openDialog('procedimiento', 'edit')">
                                    <v-icon>mdi-pencil</v-icon>
                                    <v-tooltip activator="parent" location="top">Editar Procedimiento</v-tooltip>
                                </v-btn>
                            </div>
                        </v-col>

                        <!-- BLOQUE DE DETALLES UNIFICADOS -->
                        <v-expand-transition>
                            <v-col cols="12" v-if="selectedProcedimiento" class="pt-0">
                                <v-row dense>
                                    <!-- CAMPO 5: PERIODICIDAD -->
                                    <v-col cols="12" class="d-flex align-center mb-1">
                                        <v-text-field v-model="procedureHeader.periodicidad" label="5. Periodicidad" variant="solo-filled" hide-details prepend-inner-icon="mdi-calendar-sync" class="flex-grow-1" placeholder="Ej: Anual, Mensual, Según demanda..."></v-text-field>
                                        <div class="d-flex ml-2" style="width: 84px; justify-content: flex-end;">
                                            <v-btn icon color="success" variant="tonal" size="small" @click="saveProcedureHeader" :class="{ 'pulse-save': isPeriodicidadDirty }">
                                                <v-icon>mdi-check</v-icon>
                                                <v-tooltip activator="parent" location="top">Guardar Periodicidad</v-tooltip>
                                            </v-btn>
                                        </div>
                                    </v-col>

                                    <!-- CAMPO 6: OBJETIVO (SELECTOR DE MODELOS) -->
                                    <v-col cols="12" class="d-flex align-start mb-1">
                                        <v-textarea v-model="procedureHeader.objetivos" label="6. Objetivo del Procedimiento" variant="solo-filled" rows="2" hide-details prepend-inner-icon="mdi-target-variant" class="flex-grow-1"></v-textarea>
                                        <div class="d-flex ml-2" style="width: 84px; justify-content: flex-end;">
                                            <v-btn icon color="success" variant="tonal" size="small" @click="saveProcedureHeader" :class="{ 'pulse-save': isObjetivosDirty }">
                                                <v-icon>mdi-check</v-icon>
                                                <v-tooltip activator="parent" location="top">Guardar Objetivo</v-tooltip>
                                            </v-btn>
                                        </div>
                                    </v-col>

                                    <!-- CAMPO 7: NORMATIVA -->
                                    <v-col cols="12" class="d-flex align-center mb-1">
                                        <v-autocomplete v-model="selectedNormativa" :items="mppStore.normativas" :no-data-text="getNoDataText(mppStore.normativas, 'normativas')" item-title="nombre" item-value="id_normativa" label="7. Marco Normativo" variant="solo-filled" hide-details prepend-inner-icon="mdi-gavel" class="flex-grow-1"></v-autocomplete>
                                        <div class="d-flex ml-2" style="width: 84px; justify-content: space-between;">
                                            <v-btn icon color="success" variant="tonal" size="small" @click="saveProcedureHeader" :class="{ 'pulse-save': isNormativaDirty }">
                                                <v-icon>mdi-check</v-icon>
                                                <v-tooltip activator="parent" location="top">Vincular Normativa</v-tooltip>
                                            </v-btn>
                                            <v-btn icon color="primary" variant="tonal" size="small" @click="openResourceDialog('normativa')">
                                                <v-icon>mdi-plus</v-icon>
                                                <v-tooltip activator="parent" location="top">Nueva Normativa</v-tooltip>
                                            </v-btn>
                                        </div>
                                    </v-col>

                                    <!-- CAMPO 8: ALCANCE -->
                                    <v-col cols="12" class="d-flex align-start">
                                        <v-textarea v-model="procedureHeader.alcance" label="8. Alcance" variant="solo-filled" rows="2" hide-details prepend-inner-icon="mdi-arrow-expand-all" class="flex-grow-1"></v-textarea>
                                        <div class="d-flex ml-2" style="width: 84px; justify-content: flex-end;">
                                            <v-btn icon color="success" variant="tonal" size="small" @click="saveProcedureHeader" :class="{ 'pulse-save': isAlcanceDirty }">
                                                <v-icon>mdi-check</v-icon>
                                                <v-tooltip activator="parent" location="top">Guardar Alcance</v-tooltip>
                                            </v-btn>
                                        </div>
                                    </v-col>
                                </v-row>
                            </v-col>
                        </v-expand-transition>
                    </v-row>

                    <v-expand-transition>
                        <v-alert v-if="isProcedimientoInactivo" type="warning" variant="tonal" class="mt-4 rounded-lg" border="start">
                            <template v-slot:title><span class="text-subtitle-1 font-weight-bold">Procedimiento en Pausa</span></template>
                            Este procedimiento está <strong>Inactivo</strong>. Para diseñar su flujo, primero debes activarlo.
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
                            <v-select v-model="nextNodeData.unidadEjecutoraId" :items="mppStore.unidades" :item-title="getItemTitle" item-value="id_unidad" variant="outlined" density="compact" class="mb-3" bg-color="white"></v-select>
                            
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
                            
                            <p class="text-caption font-weight-bold text-uppercase mb-1">7. Paso Anterior</p>
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
                            <Handle id="source-bottom" type="source" :position="Position.Bottom" style="background: #94a3b8; width: 10px; height: 10px;" />
                            <Handle v-if="data.tipo === 'Decisión'" id="source-right" type="source" :position="Position.Right" style="background: #ef4444; width: 12px; height: 12px;" />
                        </div>
                    </template>
                    <Background pattern-color="#cbd5e1" :gap="25" />
                    <Controls />
                </VueFlow>
            </main>
        </div>

        <!-- DIÁLOGOS CRUD -->
        <v-dialog v-model="showEntityDialog" max-width="600px">
            <v-card class="rounded-lg pa-4">
                <v-card-title class="text-h5 font-weight-bold text-capitalize">{{ entityMode === 'create' ? 'Nuevo' : 'Editar' }} {{ entityType }}</v-card-title>
                <v-card-text>
                    <v-row v-if="entityType === 'proceso'">
                        <v-col cols="12" class="pb-0"><v-text-field v-model="entityData.codigo" label="Código" variant="outlined" density="compact"></v-text-field></v-col>
                        <v-col cols="12" class="pb-0"><v-text-field v-model="entityData.nombre" label="Nombre del Proceso" variant="outlined" density="compact"></v-text-field></v-col>
                        <v-col cols="12" class="pb-0"><v-textarea v-model="entityData.descripcion" label="Descripción" variant="outlined" rows="2" density="compact"></v-textarea></v-col>
                    </v-row>
                    <v-row v-else>
                        <v-col cols="12" md="6" class="pb-0"><v-text-field v-model="entityData.codigo" label="Código" variant="outlined" density="compact"></v-text-field></v-col>
                        <v-col cols="12" md="6" class="pb-0"><v-text-field v-model="entityData.version" label="Versión" variant="outlined" density="compact"></v-text-field></v-col>
                        <v-col cols="12" class="pb-0"><v-text-field v-model="entityData.nombre" label="Nombre del Procedimiento" variant="outlined" density="compact" autofocus></v-text-field></v-col>
                        <v-col cols="12" class="pb-0"><v-textarea v-model="entityData.objetivos" label="Objetivos" variant="outlined" rows="2" density="compact"></v-textarea></v-col>
                        <v-col cols="12" class="pb-0"><v-textarea v-model="entityData.alcance" label="Alcance" variant="outlined" rows="2" density="compact"></v-textarea></v-col>
                        <v-col cols="12" md="6"><v-select v-model="entityData.estado" :items="['Activo', 'Inactivo']" label="Estado" variant="outlined" density="compact"></v-select></v-col>
                    </v-row>
                </v-card-text>
                <v-card-actions><v-spacer></v-spacer><v-btn variant="text" @click="showEntityDialog = false">Cancelar</v-btn><v-btn color="primary" variant="elevated" @click="handleSaveEntity">Guardar</v-btn></v-card-actions>
            </v-card>
        </v-dialog>

        <v-dialog v-model="showResourceDialog" max-width="500px">
            <v-card class="rounded-lg pa-4">
                <v-card-title class="text-h5 font-weight-bold text-capitalize">{{ resourceMode === 'create' ? 'Nuevo' : 'Editar' }} {{ resourceType }}</v-card-title>
                <v-card-text>
                    <v-row>
                        <v-col cols="12">
                            <v-text-field v-model="resourceData.nombre" v-if="['normativa', 'equipo', 'sistema'].includes(resourceType)" label="Nombre" variant="outlined" density="compact"></v-text-field>
                            <v-text-field v-model="resourceData.denominacion" v-if="resourceType === 'indicador'" label="Denominación" variant="outlined" density="compact"></v-text-field>
                            <v-textarea v-model="resourceData.descripcion" label="Descripción / Detalle" variant="outlined" rows="2" density="compact"></v-textarea>
                        </v-col>
                        <template v-if="resourceType === 'riesgo'">
                            <v-col cols="6"><v-select v-model="resourceData.impacto" :items="['Bajo', 'Medio', 'Alto']" label="Impacto" variant="outlined" density="compact"></v-select></v-col>
                            <v-col cols="6"><v-select v-model="resourceData.probabilidad" :items="['Baja', 'Media', 'Alta']" label="Probabilidad" variant="outlined" density="compact"></v-select></v-col>
                        </template>
                        <v-col cols="12" v-if="resourceType === 'control'">
                            <v-select v-model="resourceData.tipo_control" :items="['Preventivo', 'Detectivo', 'Correctivo']" label="Tipo de Control" variant="outlined" density="compact"></v-select>
                        </v-col>
                        <template v-if="resourceType === 'normativa'">
                            <v-col cols="12"><v-text-field v-model="resourceData.codigo" label="Código" variant="outlined" density="compact"></v-text-field></v-col>
                            <v-col cols="12"><v-text-field v-model="resourceData.url" label="URL" variant="outlined" density="compact"></v-text-field></v-col>
                        </template>
                    </v-row>
                </v-card-text>
                <v-card-actions><v-spacer></v-spacer><v-btn variant="text" @click="showResourceDialog = false">Cancelar</v-btn><v-btn color="primary" variant="elevated" @click="handleSaveResource">Guardar</v-btn></v-card-actions>
            </v-card>
        </v-dialog>

        <v-dialog v-model="editDialog" max-width="800px">
            <v-card v-if="activeNode" class="rounded-xl overflow-hidden">
                <v-toolbar color="primary" dark><v-toolbar-title>Editar Paso</v-toolbar-title><v-spacer></v-spacer><v-btn icon="mdi-close" @click="editDialog = false"></v-btn></v-toolbar>
                <v-card-text class="pa-0">
                    <v-tabs v-model="nodeTab" bg-color="primary-lighten-5" grow><v-tab value="general">General</v-tab><v-tab value="calidad">Calidad</v-tab></v-tabs>
                    <v-window v-model="nodeTab" class="pa-6">
                        <v-window-item value="general">
                            <v-row>
                                <v-col cols="12" md="6"><v-select v-model="nodeEditData.unidadEjecutoraId" :items="mppStore.unidades" :item-title="getItemTitle" item-value="id_unidad" label="Unidad" variant="outlined"></v-select></v-col>
                                <v-col cols="12" md="6"><v-text-field v-model="nodeEditData.responsable" label="Responsable" variant="outlined"></v-text-field></v-col>
                                <v-col cols="12"><v-textarea v-model="nodeEditData.operaciones" label="Operaciones" variant="outlined" rows="3"></v-textarea></v-col>
                            </v-row>
                        </v-window-item>
                    </v-window>
                </v-card-text>
                <v-card-actions class="pa-4"><v-btn color="error" variant="text" @click="deleteNode">Eliminar</v-btn><v-spacer></v-spacer><v-btn color="primary" variant="elevated" @click="updateNodeInfo">Actualizar</v-btn></v-card-actions>
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
.node-decision { clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%); width: 240px; height: 240px; padding: 55px 40px !important; text-align: center; }
.node-inicio, .node-fin { border-radius: 50px; min-width: 160px; text-align: center; border-width: 4px; }
:deep(.vue-flow__node.selected) .mpp-node-container { border-color: #4338ca; transform: scale(1.05); }
:deep(.vue-flow__edge-label) { background: white; padding: 4px 10px; border-radius: 6px; font-weight: 900; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }

/* ANIMACIONES */
@keyframes pulse-green {
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7); }
  70% { transform: scale(1.1); box-shadow: 0 0 0 10px rgba(76, 175, 80, 0); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
}
.pulse-save {
  animation: pulse-green 2s infinite !important;
  border: 2px solid #4CAF50 !important;
}

/* ESTILOS DE IMPRESIÓN (PDF LIMPIO) */
@media print {
    .sidebar, .v-btn, .v-divider, .resize-handle, .vue-flow__controls, .vue-flow__background {
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
