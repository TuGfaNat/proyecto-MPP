import { defineStore } from "pinia";
import { ref } from "vue";
import axios from "axios";

export const useAllUnidadesMppStore = defineStore(
    "unidades_mpp",
    () => {
        const unidades = ref([]);
        const loading = ref(false);
        const error = ref(null);

        const API_URL = "https://correspondencia.fcpn.edu.bo/umsa-core/api/v1/mpp/unidades";

        const fetchUnidades = async () => {
            loading.value = true;
            try {
                const response = await axios.get(API_URL);
                unidades.value = response.data;
            } catch (err) {
                error.value = err.message;
            } finally {
                loading.value = false;
            }
        };

        return {
            unidades,
            loading,
            error,
            fetchUnidades
        };
    }
);
