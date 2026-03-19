<script setup>
import { computed, onMounted } from 'vue';
import { useAllUnidadesMofStore } from '../../../stores/unidades_mof';

const props = defineProps({
    modelValue: [Number, String, Array, null],
    type: {
        type: String,
        default: 'select'//valor por defecto para select normal
    },
    excludeId: {
        type: [Number, String, null],
        default: null
    },
    items: {
        type: Array,
        default: null
    }
});

const emit = defineEmits(['update:modelValue']);

const undadesAllUnidadesStore = useAllUnidadesMofStore();

/**
 * Gestiona la selección bidireccional permitiendo que el componente
 * funcione tanto en formularios de creación como de edición.
 */
const value = computed({
  get() {
    return props.modelValue;
  },
  set(val) {
    emit('update:modelValue', val);
  }
});

onMounted(async () => {
    // Solo carga si el store está vacío para optimizar peticiones
    if (undadesAllUnidadesStore.unidades.length === 0) {
        await undadesAllUnidadesStore.getFetchUnidades();
    }
});

/**
 * Filtra la lista para evitar que una unidad se seleccione a sí misma
 * (útil en dependencias funcionales o cambio de padre).
 */
const filteredUnidades = computed(() => {
    const list = props.items || undadesAllUnidadesStore.unidades;
    if (props.excludeId) {
        return list.filter(u => String(u.id) !== String(props.excludeId));
    }
    return list;
});

//Adicionando las nuevas propiedades 
const autocompleteProps = computed(() => {
    if (props.type !== 'autocomplete') return {};
    return {
        clearable: true,
        chips: true,
        multiple: true,
        'closable-chips': true
    }
});
</script>

<template>
    <component 
        :is="props.type === 'autocomplete' ? 'v-autocomplete' : 'v-select'"
        v-model="value"
        label="Unidades" 
        :items="filteredUnidades" 
        item-title="nombre" 
        item-value="id" 
        variant="underlined" 
        v-bind="autocompleteProps"
        :loading="undadesAllUnidadesStore.loading"
    />
</template>
