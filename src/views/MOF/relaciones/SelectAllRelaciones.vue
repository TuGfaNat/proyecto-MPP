<script setup>
import { onMounted } from 'vue';
import { useAllRelacionesMofStore } from '../../../stores/relaciones_mof';

const model = defineModel();
const relacionesStore = useAllRelacionesMofStore();

onMounted(async () => {
    if (relacionesStore.relaciones.length === 0) {
        await relacionesStore.getFetchRelaciones();
    }
});
</script>

<template>
    <v-select 
        v-model="model"
        label="Relación" 
        :items="relacionesStore.relaciones" 
        item-title="description" 
        item-value="value" 
        v-bind="$attrs"
    ></v-select>
</template>