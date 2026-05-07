import { defineStore } from "pinia";
import { ref } from "vue";
import axios from "axios";

export const useMppCoreStore = defineStore("mpp_core", () => {
    const unidades = ref([]);
    const cargos = ref([]);
    const procesos = ref([]);
    const subprocesos = ref([]);
    const procedimientos = ref([]);
    const cargoProcesos = ref([]);
    const pasos = ref([]); // Pasos específicos de un procedimiento
    
    // Calidad y Recursos
    const riesgos = ref([]);
    const controles = ref([]);
    const requisitos = ref([]);

    const currentContext = ref({
        unidad: null,
        proceso: null,
        subproceso: null,
        procedimiento: null
    });

    const loading = ref(false);
    const error = ref(null);
const BASE_URL_MPP = "http://localhost:3000";
const BASE_URL_MOF = "http://localhost:3000/mof";
const BASE_URL_ORG = "http://localhost:3000/estructura-organizacional";
const BASE_URL_REC = "http://localhost:3000/recursos";

// --- LECTURA (GET) ---
const fetchUnidades = async () => {
    loading.value = true;
    try {
        const response = await axios.get(`${BASE_URL_MOF}/unidades`);
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


    const syncUnidades = async () => {
        loading.value = true;
        try {
            await axios.post(`${BASE_URL_MOF}/sync`);
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

    const fetchProcesos = async (unidadId) => {
        loading.value = true;
        const url = `${BASE_URL_MPP}/procesos/procesos`;
        try {
            const response = await axios.get(url, { params: { unidadId } });
            procesos.value = response.data.data || response.data;
        } catch (err) { error.value = err.message; }
        finally { loading.value = false; }
    };

    const fetchSubprocesos = async (procesoId) => {
        loading.value = true;
        try {
            const response = await axios.get(`${BASE_URL_MPP}/subprocesos`, { params: { procesoId } });
            subprocesos.value = response.data.data || response.data;
        } catch (err) { error.value = err.message; }
        finally { loading.value = false; }
    };

    const fetchProcedimientos = async (procesoId) => {
        loading.value = true;
        const url = `${BASE_URL_MPP}/procesos/procedimientos`;
        try {
            const response = await axios.get(url, { params: { procesoId } });
            procedimientos.value = response.data.data || response.data;
        } catch (err) { error.value = err.message; }
        finally { loading.value = false; }
    };

    const fetchCargoProcesos = async (procesoId) => {
        loading.value = true;
        try {
            const response = await axios.get(`${BASE_URL_MPP}/procesos/cargo-procesos`, { params: { procesoId } });
            cargoProcesos.value = response.data.data || response.data;
        } catch (err) { error.value = err.message; }
        finally { loading.value = false; }
    };

    // Obtener los pasos ya guardados de un procedimiento
    const fetchPasos = async (procedimientoId) => {
        loading.value = true;
        try {
            const response = await axios.get(`${BASE_URL_MPP}/pasos`, { params: { procedimientoId } });
            pasos.value = response.data.data || response.data;
            return pasos.value;
        } catch (err) { error.value = err.message; return []; }
        finally { loading.value = false; }
    };

    // --- ESCRITURA (POST/PATCH/DELETE) ---
    const saveProceso = async (data) => {
        try {
            const res = await axios.post(`${BASE_URL_MPP}/procesos/procesos`, data);
            return res.data.data || res.data;
        } catch (err) { error.value = err.message; throw err; }
    };

    const saveProcedimiento = async (data) => {
        try {
            const res = await axios.post(`${BASE_URL_MPP}/procesos/procedimientos`, data);
            return res.data.data || res.data;
        } catch (err) { error.value = err.message; throw err; }
    };

    const saveCargoProceso = async (data) => {
        try {
            const res = await axios.post(`${BASE_URL_MPP}/procesos/cargo-procesos`, data);
            return res.data.data || res.data;
        } catch (err) { error.value = err.message; throw err; }
    };

    const updateProceso = (id, data) => axios.patch(`${BASE_URL_MPP}/procesos/procesos/${id}`, data);
    const deleteProceso = (id) => axios.delete(`${BASE_URL_MPP}/procesos/procesos/${id}`);

    const updateProcedimiento = (id, data) => axios.patch(`${BASE_URL_MPP}/procesos/procedimientos/${id}`, data);
    const deleteProcedimiento = (id) => axios.delete(`${BASE_URL_MPP}/procesos/procedimientos/${id}`);

    const updateCargoProceso = (id, data) => axios.patch(`${BASE_URL_MPP}/procesos/cargo-procesos/${id}`, data);
    const deleteCargoProceso = (id) => axios.delete(`${BASE_URL_MPP}/procesos/cargo-procesos/${id}`);
    
    const saveFlujoCompleto = async (procedimientoId, listaPasos) => {
        loading.value = true;
        try {
            await axios.post(`${BASE_URL_MPP}/pasos/bulk`, { procedimientoId, pasos: listaPasos });
            return true;
        } catch (err) { error.value = err.message; return false; } 
        finally { loading.value = false; }
    };

    const deletePaso = (pasoId) => axios.delete(`${BASE_URL_MPP}/pasos/${pasoId}`);

    return {
        unidades, cargos, procesos, subprocesos, procedimientos, cargoProcesos, pasos,
        riesgos, controles, requisitos,
        currentContext, loading, error,
        fetchUnidades, syncUnidades, fetchCargos, fetchProcesos, fetchSubprocesos, fetchProcedimientos, fetchCargoProcesos, fetchPasos,
        fetchRiesgos, fetchControles, fetchRequisitos,
        saveProceso, updateProceso, deleteProceso,
        saveProcedimiento, updateProcedimiento, deleteProcedimiento,
        saveCargoProceso, updateCargoProceso, deleteCargoProceso,
        saveFlujoCompleto, deletePaso
    };
});
