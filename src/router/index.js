import { createRouter, createWebHistory } from 'vue-router'
import ListarUnidades from '../views/MPP/ListarUnidades.vue'
import RegistrarUnidad from '../views/MPP/RegistrarUnidad.vue'
import TreeUnidades from '../views/MPP/TreeUnidades.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/Home.vue')
    },
    {
      path: '/usuarios',
      name: 'usuarios',
      component: () => import('../views/Usuarios.vue')
    },
    {
      path: '/configuracion',
      name: 'configuracion',
      component: () => import('../views/Configuracion.vue')
    },
    {
      path:"/mpp/listar-unidades",
      name:'listar_unidades',
      component: ListarUnidades
    },
    {
        path:"/mpp/registrar-unidad",
        name:"registro_unidad",
        component: RegistrarUnidad
    },
    {
        path:"/mpp/arbol-unidades",
        name:"tree_unidades",
        component:TreeUnidades
    },
    {
      path: "/mpp/diagrama-flujos",
      name: "diagrama_flujos",
      component: () => import('../views/MPP/DisenadorFlujos.vue')
    }
  ]
})

export default router