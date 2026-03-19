<script setup>
import { onMounted } from 'vue';
import { useAllTiposMofStore } from '../../../stores/tipos_mof';

const model = defineModel();
const tiposStore = useAllTiposMofStore();

onMounted(async () => {
    if (tiposStore.tipos.length === 0) {
        await tiposStore.getFetchTipos();
    }
});
</script>

<template>
    <v-select 
        v-model="model"
        label="Tipos" 
        :items="tiposStore.tipos" 
        item-title="description" 
        item-value="value" 
        v-bind="$attrs"
    ></v-select>
</template>
