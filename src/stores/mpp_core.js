import { defineStore } from "pinia";
import { ref } from "vue";
import axios from "axios";

export const useMppCoreStore = defineStore("mpp_core", () => {
    const unidades = ref([]);
    const procesos = ref([]);
    const subprocesos = ref([]);
    const procedimientos = ref([]);
    const pasos = ref([]); // Pasos específicos de un procedimiento
    const loading = ref(false);
    const error = ref(null);

    const BASE_URL_MPP = "https://correspondencia.fcpn.edu.bo/umsa-core/api/v1/mpp";
    const BASE_URL_MOF = "https://correspondencia.fcpn.edu.bo/umsa-core/api/v1/mof";

    // --- LECTURA (GET) ---
    const fetchUnidades = async () => {
        loading.value = true;
        try {
            const response = await axios.get(`${BASE_URL_MOF}/unidades`);
            unidades.value = response.data.data || response.data;
        } catch (err) { error.value = err.message; }
        finally { loading.value = false; }
    };

    const fetchProcesos = async (unidadId) => {
        loading.value = true;
        try {
            const response = await axios.get(`${BASE_URL_MPP}/procesos`, { params: { unidadId } });
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

    const fetchProcedimientos = async (subprocesoId) => {
        loading.value = true;
        try {
            const response = await axios.get(`${BASE_URL_MPP}/procedimientos`, { params: { subprocesoId } });
            procedimientos.value = response.data.data || response.data;
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

    // --- ESCRITURA (POST/PUT/DELETE) ---
    const saveProceso = (data) => axios.post(`${BASE_URL_MPP}/procesos`, data);
    const updateProceso = (id, data) => axios.put(`${BASE_URL_MPP}/procesos/${id}`, data);
    const deleteProceso = (id) => axios.delete(`${BASE_URL_MPP}/procesos/${id}`);

    const saveSubproceso = (data) => axios.post(`${BASE_URL_MPP}/subprocesos`, data);
    const updateSubproceso = (id, data) => axios.put(`${BASE_URL_MPP}/subprocesos/${id}`, data);
    const deleteSubproceso = (id) => axios.delete(`${BASE_URL_MPP}/subprocesos/${id}`);

    const saveProcedimiento = (data) => axios.post(`${BASE_URL_MPP}/procedimientos`, data);
    const updateProcedimiento = (id, data) => axios.put(`${BASE_URL_MPP}/procedimientos/${id}`, data);
    const deleteProcedimiento = (id) => axios.delete(`${BASE_URL_MPP}/procedimientos/${id}`);
    
    // Guardar o actualizar la secuencia de pasos
    const saveFlujoCompleto = async (procedimientoId, listaPasos) => {
        loading.value = true;
        try {
            // Enviamos toda la secuencia al endpoint de pasos
            await axios.post(`${BASE_URL_MPP}/pasos/bulk`, {
                procedimientoId,
                pasos: listaPasos
            });
            return true;
        } catch (err) {
            error.value = "Error al guardar el flujo: " + err.message;
            return false;
        } finally {
            loading.value = false;
        }
    };

    const deletePaso = (pasoId) => axios.delete(`${BASE_URL_MPP}/pasos/${pasoId}`);

    return {
        unidades, procesos, subprocesos, procedimientos, pasos,
        loading, error,
        fetchUnidades, fetchProcesos, fetchSubprocesos, fetchProcedimientos, fetchPasos,
        saveProceso, updateProceso, deleteProceso,
        saveSubproceso, updateSubproceso, deleteSubproceso,
        saveProcedimiento, updateProcedimiento, deleteProcedimiento,
        saveFlujoCompleto, deletePaso
    };
});
