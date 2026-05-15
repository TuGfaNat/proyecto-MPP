import { defineStore } from "pinia";
import { ref } from "vue";
import axios from "axios";

export const useMppCoreStore = defineStore("mpp_core", () => {
    const unidades = ref([]);
    const cargos = ref([]);
    const procesos = ref([]);
    const procedimientos = ref([]);
    const cargoProcesos = ref([]);
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
    const fetchUnidades = async () => {
        loading.value = true;
        try {
            const response = await axios.get(`${BASE_URL_ORG}/unidades`);
            unidades.value = response.data.data || response.data;
        } catch (err) { error.value = err.message; }
        finally { loading.value = false; }
    };

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
    const syncUnidades = async () => {
        loading.value = true;
        try {
            await axios.post(`${BASE_URL_MOF}/sync`);
            await fetchUnidades();
            return true;
        } catch (err) { error.value = err.message; return false; }
        finally { loading.value = false; }
    };

    const syncCargos = async () => {
        loading.value = true;
        try {
            await axios.post(`${BASE_URL_MOF}/cargos/sync`);
            await fetchCargos();
            await fetchUnidades(); 
            return true;
        } catch (err) { error.value = err.message; return false; }
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
            const response = await axios.get(`${BASE_URL_MPP}/procesos`);
            procesos.value = response.data.data || response.data;
        } catch (err) { error.value = err.message; }
        finally { loading.value = false; }
    };

    const fetchProcedimientos = async (procesoId) => {
        loading.value = true;
        try {
            const response = await axios.get(`${BASE_URL_MPP}/procedimientos`, { params: { procesoId } });
            const allProc = response.data.data || response.data;
            procedimientos.value = allProc.filter(p => p.id_proceso === procesoId);
        } catch (err) { error.value = err.message; }
        finally { loading.value = false; }
    };

    const fetchCargoProcesos = async (procesoId) => {
        loading.value = true;
        try {
            const response = await axios.get(`${BASE_URL_MPP}/cargo-procesos`);
            const allCargoProcesos = response.data.data || response.data;
            cargoProcesos.value = allCargoProcesos.filter(cp => cp.id_proceso === procesoId);
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
        const savedLayout = localStorage.getItem(`mpp_flow_${procedimientoId}`);
        if (savedLayout) {
            const data = JSON.parse(savedLayout);
            pasos.value = data;
            return data;
        }
        return [];
    };

    // --- ESCRITURA (POST/PATCH/DELETE) ---
    const saveProceso = async (data) => {
        try {
            const res = await axios.post(`${BASE_URL_MPP}/procesos`, data);
            return res.data.data || res.data;
        } catch (err) { error.value = err.message; throw err; }
    };

    const saveProcedimiento = async (data) => {
        try {
            const res = await axios.post(`${BASE_URL_MPP}/procedimientos`, data);
            return res.data.data || res.data;
        } catch (err) { error.value = err.message; throw err; }
    };

    const saveCargoProceso = async (data) => {
        try {
            const res = await axios.post(`${BASE_URL_MPP}/cargo-procesos`, data);
            return res.data.data || res.data;
        } catch (err) { error.value = err.message; throw err; }
    };

    const updateProceso = (id, data) => axios.patch(`${BASE_URL_MPP}/procesos/${id}`, data);
    const deleteProceso = (id) => axios.delete(`${BASE_URL_MPP}/procesos/${id}`);

    const updateProcedimiento = (id, data) => axios.patch(`${BASE_URL_MPP}/procedimientos/${id}`, data);
    const deleteProcedimiento = (id) => axios.delete(`${BASE_URL_MPP}/procedimientos/${id}`);

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
    
    // CRUD CALIDAD
    const saveNormativa = (data) => axios.post(`${BASE_URL_CAL}/normativas`, data);
    const updateNormativa = (id, data) => axios.patch(`${BASE_URL_CAL}/normativas/${id}`, data);
    const deleteNormativa = (id) => axios.delete(`${BASE_URL_CAL}/normativas/${id}`);

    const saveIndicador = (data) => axios.post(`${BASE_URL_CAL}/indicadores`, data);
    const updateIndicador = (id, data) => axios.patch(`${BASE_URL_CAL}/indicadores/${id}`, data);
    const deleteIndicador = (id) => axios.delete(`${BASE_URL_CAL}/indicadores/${id}`);

    // CRUD RECURSOS ADICIONALES
    const saveEquipo = (data) => axios.post(`${BASE_URL_REC}/equipos`, data);
    const updateEquipo = (id, data) => axios.patch(`${BASE_URL_REC}/equipos/${id}`, data);
    const deleteEquipo = (id) => axios.delete(`${BASE_URL_REC}/equipos/${id}`);

    const saveSistemaInformacion = (data) => axios.post(`${BASE_URL_REC}/sistemas-informacion`, data);
    const updateSistemaInformacion = (id, data) => axios.patch(`${BASE_URL_REC}/sistemas-informacion/${id}`, data);
    const deleteSistemaInformacion = (id) => axios.delete(`${BASE_URL_REC}/sistemas-informacion/${id}`);

    const saveFlujoCompleto = async (procedimientoId, listaPasos) => {
        localStorage.setItem(`mpp_flow_${procedimientoId}`, JSON.stringify(listaPasos));
        return true;
    };

    return {
        unidades, cargos, procesos, procedimientos, cargoProcesos, pasos, operaciones,
        riesgos, controles, requisitos, normativas, indicadores, equipos, sistemasInformacion, documentosReferencia,
        currentContext, loading, error,
        fetchUnidades, fetchRiesgos, fetchControles, fetchRequisitos, fetchNormativas, fetchIndicadores, fetchEquipos, fetchSistemasInformacion, fetchDocumentosReferencia,
        syncUnidades, syncCargos, fetchCargos, fetchProcesos, fetchProcedimientos, fetchCargoProcesos, fetchOperaciones, fetchPasos,
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
        saveFlujoCompleto
    };
});
