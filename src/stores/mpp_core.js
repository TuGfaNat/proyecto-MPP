import { defineStore } from "pinia";
import { ref } from "vue";
import axios from "axios";

export const useMppCoreStore = defineStore("mpp_core", () => {
    const unidades = ref([]);
    const cargos = ref([]);
    const procesos = ref([]);
    const procedimientos = ref([]);
    const cargoProcesos = ref([]);
    const acciones = ref([]);
    const pasos = ref([]); 
    const operaciones = ref([]); 
    
    const riesgos = ref([]);
    const controles = ref([]);
    const requisitos = ref([]);
    const normativas = ref([]);
    const indicadores = ref([]);
    const equipos = ref([]);
    const sistemasInformacion = ref([]);
    const documentosReferencia = ref([]);

    // --- REGISTRO DE ESQUEMAS (Truth Discovery) ---
    const schemas = ref({
        proceso: {
            title: "Proceso",
            icon: "mdi-hexagon-multiple",
            fields: [
                { key: "nombre", label: "Nombre del Proceso", type: "text", required: true },
                { key: "codigo", label: "Código Único", type: "text" },
                { key: "descripcion", label: "Descripción Detallada", type: "textarea" }
            ],
            endpoints: { save: "procesos", update: "procesos", fetch: "procesos" }
        },
        procedimiento: {
            title: "Procedimiento",
            icon: "mdi-file-edit",
            fields: [
                { key: "nombre", label: "Nombre del Procedimiento", type: "text", required: true },
                { key: "codigo", label: "Código Único", type: "text" },
                { key: "id_proceso", label: "Proceso Padre", type: "hidden" },
                { key: "objetivos", label: "Objetivos", type: "textarea" },
                { key: "alcance", label: "Alcance", type: "textarea" },
                { key: "periodicidad", label: "Periodicidad", type: "text" },
                { key: "version", label: "Versión", type: "text", default: "1.0" },
                { key: "estado", label: "Estado", type: "select", options: ["Activo", "Inactivo", "En Revisión"], default: "Activo" },
                { key: "id_instalaciones", label: "Instalaciones", type: "select-multiple", optionsSource: "unidades", itemTitle: "nombre", itemValue: "id_unidad" }
            ],
            endpoints: { save: "procedimientos", update: "procedimientos", fetch: "procedimientos" }
        },
        normativa: {
            title: "Marco Normativo",
            icon: "mdi-gavel",
            fields: [
                { key: "nombre", label: "Nombre de la Norma", type: "text", required: true },
                { key: "codigo", label: "Código / Referencia", type: "text" },
                { key: "url", label: "Enlace al Documento", type: "text" },
                { key: "fecha_emision", label: "Fecha de Emisión", type: "date" },
                { key: "descripcion", label: "Resumen / Detalle", type: "textarea" }
            ],
            endpoints: { save: "normativas", update: "normativas", fetch: "normativas" },
            parentLink: { key: "id_procedimientos", type: "array" }
        }
    });

    const currentContext = ref({
        unidad: null,
        proceso: null,
        subproceso: null,
        procedimiento: null
    });

    const loading = ref(false);
    const error = ref(null);

    const BASE_URL_MPP = "http://localhost:3000/procesos";
    const BASE_URL_FLUX = "http://localhost:3000/flujo";
    const BASE_URL_ORG = "http://localhost:3000/estructura-organizacional";
    const BASE_URL_REC = "http://localhost:3000/recursos";
    const BASE_URL_CAL = "http://localhost:3000/calidad";
    const BASE_URL_MOF = "http://localhost:3000/mof";

    // --- LECTURA (GET) ---
    const fetchAcciones = async () => {
        loading.value = true;
        try {
            const response = await axios.get(`${BASE_URL_FLUX}/acciones`);
            acciones.value = response.data.data || response.data;
        } catch (err) { error.value = err.message; }
        finally { loading.value = false; }
    };

    const fetchUnidades = async () => {
        loading.value = true;
        try {
            const response = await axios.get(`${BASE_URL_ORG}/unidades`);
            unidades.value = response.data.data || response.data;
        } catch (err) { error.value = err.message; }
        finally { loading.value = false; }
    };

    const fetchCargos = async () => {
        loading.value = true;
        try {
            const response = await axios.get(`${BASE_URL_ORG}/cargos`);
            cargos.value = response.data.data || response.data;
        } catch (err) { error.value = err.message; }
        finally { loading.value = false; }
    };

    const fetchProcesos = async () => {
        loading.value = true;
        try {
            await fetchUnidades();
            const response = await axios.get(`${BASE_URL_MPP}/procesos`);
            procesos.value = response.data.data || response.data;
        } catch (err) { error.value = err.message; }
        finally { loading.value = false; }
    };

    const fetchProcedimientos = async (procesoId) => {
        loading.value = true;
        const targetId = Number(procesoId);
        try {
            const response = await axios.get(`${BASE_URL_MPP}/procedimientos`);
            const all = response.data.data || response.data;
            // Filtro más permisivo
            procedimientos.value = all.filter(p => {
                const pId = p.proceso?.id_proceso || p.id_proceso || p.proceso;
                return Number(pId) === targetId;
            });
        } catch (err) { error.value = err.message; }
        finally { loading.value = false; }
    };

    const fetchCargoProcesos = async (procesoId) => {
        loading.value = true;
        const targetId = Number(procesoId);
        try {
            const response = await axios.get(`${BASE_URL_MPP}/cargo-procesos`);
            const all = response.data.data || response.data;
            cargoProcesos.value = all.filter(cp => {
                const cpId = cp.proceso?.id_proceso || cp.id_proceso || cp.proceso;
                return Number(cpId) === targetId;
            });
        } catch (err) { error.value = err.message; }
        finally { loading.value = false; }
    };

    const fetchOperaciones = async () => {
        loading.value = true;
        try {
            const response = await axios.get(`${BASE_URL_FLUX}/operaciones`);
            operaciones.value = response.data.data || response.data;
        } catch (err) { error.value = err.message; }
        finally { loading.value = false; }
    };

    const fetchPasos = async (procedimientoId) => {
        loading.value = true;
        try {
            const response = await axios.get(`${BASE_URL_FLUX}/pasos/procedimiento/${procedimientoId}`);
            pasos.value = response.data.data || response.data;
            return pasos.value;
        } catch (err) { error.value = err.message; return []; }
        finally { loading.value = false; }
    };

    // --- RECURSOS Y CALIDAD ---
    const fetchRiesgos = async () => {
        loading.value = true;
        try {
            const response = await axios.get(`${BASE_URL_REC}/riesgos`);
            riesgos.value = response.data.data || response.data;
        } catch (err) { error.value = err.message; }
        finally { loading.value = false; }
    };

    const fetchControles = async () => {
        loading.value = true;
        try {
            const response = await axios.get(`${BASE_URL_REC}/controles`);
            controles.value = response.data.data || response.data;
        } catch (err) { error.value = err.message; }
        finally { loading.value = false; }
    };

    const fetchRequisitos = async () => {
        loading.value = true;
        try {
            const response = await axios.get(`${BASE_URL_REC}/requisitos`);
            requisitos.value = response.data.data || response.data;
        } catch (err) { error.value = err.message; }
        finally { loading.value = false; }
    };

    const fetchNormativas = async () => {
        loading.value = true;
        try {
            const response = await axios.get(`${BASE_URL_CAL}/normativas`);
            normativas.value = response.data.data || response.data;
        } catch (err) { error.value = err.message; }
        finally { loading.value = false; }
    };

    const fetchIndicadores = async () => {
        loading.value = true;
        try {
            const response = await axios.get(`${BASE_URL_CAL}/indicadores`);
            indicadores.value = response.data.data || response.data;
        } catch (err) { error.value = err.message; }
        finally { loading.value = false; }
    };

    const fetchEquipos = async () => {
        loading.value = true;
        try {
            const response = await axios.get(`${BASE_URL_REC}/equipos`);
            equipos.value = response.data.data || response.data;
        } catch (err) { error.value = err.message; }
        finally { loading.value = false; }
    };

    const fetchSistemasInformacion = async () => {
        loading.value = true;
        try {
            const response = await axios.get(`${BASE_URL_REC}/sistemas-informacion`);
            sistemasInformacion.value = response.data.data || response.data;
        } catch (err) { error.value = err.message; }
        finally { loading.value = false; }
    };

    const fetchDocumentosReferencia = async () => {
        loading.value = true;
        try {
            const response = await axios.get(`${BASE_URL_REC}/documentos-referencia`);
            documentosReferencia.value = response.data.data || response.data;
        } catch (err) { error.value = err.message; }
        finally { loading.value = false; }
    };

    // --- SINCRONIZACIÓN MOF ---
    const syncUnidades = async () => {
        try {
            const response = await axios.post(`${BASE_URL_MOF}/sync`);
            return response.status === 201;
        } catch (e) { console.error(e); return false; }
    };

    const syncCargos = async () => {
        try {
            const response = await axios.post(`${BASE_URL_MOF}/cargos/sync`);
            return response.status === 201;
        } catch (e) { console.error(e); return false; }
    };

    // --- ESCRITURA (POST/PATCH/DELETE) ---
    const saveProceso = (data) => axios.post(`${BASE_URL_MPP}/procesos`, data).then(r => r.data);
    const updateProceso = (id, data) => axios.patch(`${BASE_URL_MPP}/procesos/${id}`, data);
    const deleteProceso = (id) => axios.delete(`${BASE_URL_MPP}/procesos/${id}`);

    const saveProcedimiento = (data) => axios.post(`${BASE_URL_MPP}/procedimientos`, data).then(r => r.data);
    const updateProcedimiento = (id, data) => axios.patch(`${BASE_URL_MPP}/procedimientos/${id}`, data);
    const deleteProcedimiento = (id) => axios.delete(`${BASE_URL_MPP}/procedimientos/${id}`);

    const saveCargoProceso = (data) => axios.post(`${BASE_URL_MPP}/cargo-procesos`, data);
    const updateCargoProceso = (id, data) => axios.patch(`${BASE_URL_MPP}/cargo-procesos/${id}`, data);
    const deleteCargoProceso = (id) => axios.delete(`${BASE_URL_MPP}/cargo-procesos/${id}`);

    const saveRiesgo = (data) => axios.post(`${BASE_URL_REC}/riesgos`, data);
    const updateRiesgo = (id, data) => axios.patch(`${BASE_URL_REC}/riesgos/${id}`, data);
    const deleteRiesgo = (id) => axios.delete(`${BASE_URL_REC}/riesgos/${id}`);

    const saveControl = (data) => axios.post(`${BASE_URL_REC}/controles`, data);
    const updateControl = (id, data) => axios.patch(`${BASE_URL_REC}/controles/${id}`, data);
    const deleteControl = (id) => axios.delete(`${BASE_URL_REC}/controles/${id}`);

    const saveRequisito = (data) => axios.post(`${BASE_URL_REC}/requisitos`, data);
    const updateRequisito = (id, data) => axios.patch(`${BASE_URL_REC}/requisitos/${id}`, data);
    const deleteRequisito = (id) => axios.delete(`${BASE_URL_REC}/requisitos/${id}`);

    const saveNormativa = (data) => axios.post(`${BASE_URL_CAL}/normativas`, data);
    const updateNormativa = (id, data) => axios.patch(`${BASE_URL_CAL}/normativas/${id}`, data);
    const deleteNormativa = (id) => axios.delete(`${BASE_URL_CAL}/normativas/${id}`);

    const saveIndicador = (data) => axios.post(`${BASE_URL_CAL}/indicadores`, data);
    const updateIndicador = (id, data) => axios.patch(`${BASE_URL_CAL}/indicadores/${id}`, data);
    const deleteIndicador = (id) => axios.delete(`${BASE_URL_CAL}/indicadores/${id}`);

    const saveEquipo = (data) => axios.post(`${BASE_URL_REC}/equipos`, data);
    const updateEquipo = (id, data) => axios.patch(`${BASE_URL_REC}/equipos/${id}`, data);
    const deleteEquipo = (id) => axios.delete(`${BASE_URL_REC}/equipos/${id}`);

    const saveSistemaInformacion = (data) => axios.post(`${BASE_URL_REC}/sistemas-informacion`, data);
    const updateSistemaInformacion = (id, data) => axios.patch(`${BASE_URL_REC}/sistemas-informacion/${id}`, data);
    const deleteSistemaInformacion = (id) => axios.delete(`${BASE_URL_REC}/sistemas-informacion/${id}`);

    const saveAccion = (data) => axios.post(`${BASE_URL_FLUX}/acciones`, data);
    const updateAccion = (id, data) => axios.patch(`${BASE_URL_FLUX}/acciones/${id}`, data);
    const deleteAccion = (id) => axios.delete(`${BASE_URL_FLUX}/acciones/${id}`);

    const saveFlujoCompleto = async (procedimientoId, listaPasos) => {
        localStorage.setItem(`mpp_flow_${procedimientoId}`, JSON.stringify(listaPasos));
        return true;
    };

    // --- CRUD GENÉRICO (Chameleon Engine) ---
    const saveEntity = async (type, data) => {
        const schema = schemas.value[type];
        if (!schema) throw new Error(`Esquema no encontrado: ${type}`);
        
        // Determinar URL base
        let baseUrl = BASE_URL_MPP;
        if (schema.endpoints.save === "normativas") baseUrl = BASE_URL_CAL;
        
        const response = await axios.post(`${baseUrl}/${schema.endpoints.save}`, data);
        return response.data.data || response.data;
    };

    const updateEntity = async (type, id, data) => {
        const schema = schemas.value[type];
        if (!schema) throw new Error(`Esquema no encontrado: ${type}`);
        
        let baseUrl = BASE_URL_MPP;
        if (schema.endpoints.update === "normativas") baseUrl = BASE_URL_CAL;
        
        const response = await axios.patch(`${baseUrl}/${schema.endpoints.update}/${id}`, data);
        return response.data.data || response.data;
    };

    const deleteEntity = async (type, id) => {
        const schema = schemas.value[type];
        if (!schema) throw new Error(`Esquema no encontrado: ${type}`);
        
        let baseUrl = BASE_URL_MPP;
        if (schema.endpoints.save === "normativas") baseUrl = BASE_URL_CAL;
        
        return await axios.delete(`${baseUrl}/${schema.endpoints.save}/${id}`);
    };

    return {
        unidades, cargos, procesos, procedimientos, cargoProcesos, pasos, operaciones, acciones,
        riesgos, controles, requisitos, normativas, indicadores, equipos, sistemasInformacion, documentosReferencia,
        currentContext, loading, error, schemas,
        fetchUnidades, fetchRiesgos, fetchControles, fetchRequisitos, fetchNormativas, fetchIndicadores, fetchEquipos, fetchSistemasInformacion, fetchDocumentosReferencia,
        syncUnidades, syncCargos, fetchCargos, fetchProcesos, fetchProcedimientos, fetchCargoProcesos, fetchOperaciones, fetchPasos, fetchAcciones,
        saveProceso, updateProceso, deleteProceso,
        saveProcedimiento, updateProcedimiento, deleteProcedimiento,
        saveCargoProceso, updateCargoProceso, deleteCargoProceso,
        saveRiesgo, updateRiesgo, deleteRiesgo,
        saveControl, updateControl, deleteControl,
        saveRequisito, updateRequisito, deleteRequisito,
        saveNormativa, updateNormativa, deleteNormativa,
        saveIndicador, updateIndicador, deleteIndicador,
        saveEquipo, updateEquipo, deleteEquipo,
        saveSistemaInformacion, updateSistemaInformacion, deleteSistemaInformacion,
        saveAccion, updateAccion, deleteAccion,
        saveFlujoCompleto,
        saveEntity, updateEntity, deleteEntity
    };
});
