//  Create by: Jesus Reynaldo Perez Benavides 
//  phone: +591 73030203
//  mail: jperezbenavides@gmail.com

import { defineStore } from "pinia";
import { ref } from "vue";

export const useAllUnidadesMofStore = defineStore(
    "unidades_mof",
    () => {
        const unidades = ref([]);
        const loading = ref(false);
        const error = ref(null);

        const API_URL = "https://correspondencia.fcpn.edu.bo/umsa-core/api/v1/mof/unidades";

        const getFetchUnidades = async () => {
            loading.value = true;
            error.value = null;
            try {
                const response = await fetch(API_URL);
                //por si hay problemas de conexion al servidor
                if (!response) {
                    throw new Error('Error en el Servidor. Comuniquese con el administrador del sistema');
                }
                const data = await response.json();
                unidades.value = data.data;
            } catch (err) {
                error.value = err.message === 'Falla en fetch'
                    ? 'No se puede conectar al servidor. Comuniquese con el administrador del sistema.'
                    : err.message;

            } finally {
                loading.value = false;
            }
        };

        const createUnidad = async (dataForm) => {
            loading.value = true;
            error.value = null;
            console.log("--- DEBUG: CREATE UNIDAD ---");
            console.log("URL:", API_URL);
            console.log("Payload:", JSON.stringify(dataForm, null, 2));
            try {
                const response = await fetch(
                    API_URL,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(dataForm)
                    }
                );

                console.log("Status:", response.status);
                const dataResponse = await response.json();
                console.log("Response Data:", dataResponse);

                if (!response.ok) {
                    throw new Error(dataResponse.message || 'Error al crear la unidad');
                }

                await getFetchUnidades();
            } catch (err) {
                error.value = err.message;
                console.error("Error en createUnidad:", err);
            } finally {
                loading.value = false;
            }
        };

        const deleteUnidad = async (id) => {
            loading.value = true;
            error.value = null;
            try {
                const response = await fetch(`${API_URL}/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });

                if (!response.ok) {
                    throw new Error('Error en el Servidor. Comuniquese con el administrador del sistema');
                }

                await getFetchUnidades();
            } catch (err) {
                error.value = err.message === 'Failed to fetch'
                    ? 'No se puede conectar al servidor. Comuníquese con el administrador del sistema.'
                    : err.message;
                console.error("Error en deleteUnidad:", err);
            } finally {
                loading.value = false;
            }
        };


        const getUnidadById = async (id) => {
            loading.value = true;
            error.value = null;
            try {
                const response = await fetch(`${API_URL}/${id}`);
                if (!response.ok) throw new Error('Error al obtener la unidad');
                const data = await response.json();
                
                console.log(`>>> [STORE] Datos CRUDOS de la Unidad ${id}:`, data.data);
                console.log(">>> [STORE] Lista de campos disponibles en esta unidad:", Object.keys(data.data));
                
                return data.data;
            } catch (err) {
                error.value = 'No se puede obtener la unidad';
                return null;
            } finally {
                loading.value = false;
            }
        };

        const updateUnidad = async (id, dataForm) => {
            loading.value = true;
            error.value = null;
            const url = `${API_URL}/${id}`;
            console.log("--- DEBUG: UPDATE UNIDAD ---");
            console.log("URL:", url);
            console.log("Payload:", JSON.stringify(dataForm, null, 2));
            try {
                const response = await fetch(url, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(dataForm)
                });

                console.log("Status:", response.status);
                const dataResponse = await response.json();
                console.log("Response Data:", dataResponse);

                if (!response.ok) throw new Error(dataResponse.message || 'Error al actualizar');
                await getFetchUnidades();
            } catch (err) {
                error.value = err.message;
                console.error("Error en updateUnidad:", err);
            } finally {
                loading.value = false;
            }
        };

        const updateNodo = async (id, dataForm) => {
            loading.value = true;
            error.value = null;
            try {
                const response = await fetch(`${API_URL}/${id}/setparent`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(dataForm)
                });

                if (!response.ok) throw new Error('Error al actualizar');
                await getFetchUnidades();
            } catch (err) {
                error.value = 'Error al actualizar';
            } finally {
                loading.value = false;
            }
        };

        // --- GESTIÓN DE PERSONAL / CARGOS ---
        const API_PERSONAL_URL = "https://correspondencia.fcpn.edu.bo/umsa-core/api/v1/unidades";

        /**
         * Obtiene la lista de personal (cargos) asignados a una unidad.
         */
        const getPersonalUnidad = async (unidadId) => {
            try {
                const response = await fetch(`${API_PERSONAL_URL}/${unidadId}/personal`);
                if (!response.ok) return null;
                const data = await response.json();
                return data.data; 
            } catch (err) {
                return null;
            }
        };

        /**
         * Asigna un cargo a una unidad específica (Personal).
         * @param {number|string} unidadId - ID de la unidad (nodo).
         * @param {number|string} cargoId - ID del cargo del catálogo maestro.
         * @returns {Promise<boolean>} - True si la operación fue exitosa.
         */
        const updatePersonalUnidad = async (unidadId, cargoId) => {
            loading.value = true;
            try {
                const response = await fetch(`${API_PERSONAL_URL}/${unidadId}/personal`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cargoId: cargoId })
                });
                return response.ok;
            } catch (err) {
                return false;
            } finally {
                loading.value = false;
            }
        };

        /**
         * Elimina la vinculación de todo el personal de una unidad de forma secuencial.
         * Dado que el servidor no permite DELETE masivo (405), limpiamos uno por uno.
         * @param {number|string} unidadId - ID de la unidad.
         * @returns {Promise<boolean>}
         */
        const deletePersonalUnidad = async (unidadId) => {
            loading.value = true;
            try {
                // 1. Obtener la lista de personal actual
                const personal = await getPersonalUnidad(unidadId);
                if (!personal || !Array.isArray(personal)) return true;

                // 2. Borrar cada asignación individualmente
                for (const p of personal) {
                    if (p.id) {
                        await fetch(`${API_PERSONAL_URL}/${unidadId}/personal/${p.id}`, {
                            method: 'DELETE',
                            headers: { 'Content-Type': 'application/json' }
                        });
                    }
                }
                return true;
            } catch (err) {
                console.error("Error al limpiar personal de la unidad:", err);
                return false;
            } finally {
                loading.value = false;
            }
        };

        /**
         * Elimina una asignación de cargo específica (quirúrgico).
         * @param {number|string} unidadId - ID de la unidad.
         * @param {number|string} assignmentId - ID único de la relación/asignación (177...).
         * @returns {Promise<boolean>}
         */
        const deleteCargoDeUnidad = async (unidadId, assignmentId) => {
            loading.value = true;
            try {
                const response = await fetch(`${API_PERSONAL_URL}/${unidadId}/personal/${assignmentId}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' }
                });
                return response.ok;
            } catch (err) {
                return false;
            } finally {
                loading.value = false;
            }
        };

        return {
            unidades,
            loading,
            error,
            getFetchUnidades,
            createUnidad,
            deleteUnidad,
            updateUnidad,
            getUnidadById,
            updateNodo,
            getPersonalUnidad,
            updatePersonalUnidad,
            deletePersonalUnidad,
            deleteCargoDeUnidad
        }
    }
)



