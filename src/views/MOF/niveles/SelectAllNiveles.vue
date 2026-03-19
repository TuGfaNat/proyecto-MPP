<script setup>
import { onMounted } from 'vue';
import { useAllNivelesMofStore } from '../../../stores/niveles_mof';

const model = defineModel();
const nivelesStore = useAllNivelesMofStore();

onMounted(async () => {
    if (nivelesStore.niveles.length === 0) {
        await nivelesStore.getFetchNiveles();
    }
});
</script>

<template> 
    <v-select 
        v-model="model"
        label="Nivel" 
        :items="nivelesStore.niveles" 
        item-title="description" 
        item-value="value" 
        v-bind="$attrs"
    ></v-select>
</template>
