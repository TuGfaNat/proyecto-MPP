import { defineStore } from "pinia";
import { ref } from "vue";
import axios from "axios";

export const useMppCoreStore = defineStore("mpp_core", () => {
    const areas = ref([]);
    const procesos = ref([]);
    const subprocesos = ref([]);
    const procedimientos = ref([]);
    const loading = ref(false);
    const error = ref(null);

    const BASE_URL = "https://correspondencia.fcpn.edu.bo/umsa-core/api/v1/mpp";

    // CARGAR DATOS
    const fetchAreas = async () => {
        loading.value = true;
        try {
            const response = await axios.get(`${BASE_URL}/areas`);
            areas.value = response.data;
        } catch (err) {
            error.value = "Error al cargar áreas: " + err.message;
        } finally {
            loading.value = false;
        }
    };

    const fetchProcesos = async (areaId = null) => {
        loading.value = true;
        const url = areaId ? `${BASE_URL}/procesos/${areaId}` : `${BASE_URL}/procesos`;
        try {
            const response = await axios.get(url);
            procesos.value = response.data;
        } catch (err) {
            error.value = "Error al cargar procesos: " + err.message;
        } finally {
            loading.value = false;
        }
    };

    const fetchSubprocesos = async (procesoId = null) => {
        loading.value = true;
        const url = procesoId ? `${BASE_URL}/subprocesos/${procesoId}` : `${BASE_URL}/subprocesos`;
        try {
            const response = await axios.get(url);
            subprocesos.value = response.data;
        } catch (err) {
            error.value = "Error al cargar subprocesos: " + err.message;
        } finally {
            loading.value = false;
        }
    };

    const fetchProcedimientos = async (subprocesoId = null) => {
        loading.value = true;
        const url = subprocesoId ? `${BASE_URL}/procedimientos/${subprocesoId}` : `${BASE_URL}/procedimientos`;
        try {
            const response = await axios.get(url);
            procedimientos.value = response.data;
        } catch (err) {
            error.value = "Error al cargar procedimientos: " + err.message;
        } finally {
            loading.value = false;
        }
    };

    // GUARDAR DATOS (POST)
    const saveProceso = async (parentId, descripcion) => {
        try {
            await axios.post(`${BASE_URL}/procesos`, { parentId, descripcion });
            await fetchProcesos(parentId); // Recargar
            return true;
        } catch (err) {
            error.value = "Error al guardar proceso: " + err.message;
            return false;
        }
    };

    const saveSubproceso = async (parentId, descripcion) => {
        try {
            await axios.post(`${BASE_URL}/subprocesos`, { parentId, descripcion });
            await fetchSubprocesos(parentId);
            return true;
        } catch (err) {
            error.value = "Error al guardar subproceso: " + err.message;
            return false;
        }
    };

    const saveProcedimiento = async (parentId, descripcion) => {
        try {
            await axios.post(`${BASE_URL}/procedimientos`, { parentId, descripcion });
            await fetchProcedimientos(parentId);
            return true;
        } catch (err) {
            error.value = "Error al guardar procedimiento: " + err.message;
            return false;
        }
    };

    return {
        areas, procesos, subprocesos, procedimientos,
        loading, error,
        fetchAreas, fetchProcesos, fetchSubprocesos, fetchProcedimientos,
        saveProceso, saveSubproceso, saveProcedimiento
    };
});
