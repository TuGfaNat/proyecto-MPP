import { createRouter, createWebHistory } from 'vue-router'
import ListarUnidades from '../views/MOF/ListarUnidades.vue'
import RegistrarUnidad from '../views/MOF/RegistrarUnidad.vue'
import TreeUnidades from '../views/MOF/TreeUnidades.vue'
import OrganigramaView from '../views/MOF/OrganigramaView.vue'
import OrganigramaView2 from '../views/MOF/OrganigramaView2.vue'

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
      path: '/productos',
      name: 'productos',
      component: () => import('../views/Productos.vue')
    },
    {
      path: '/reportes/ejecutivo',
      name: 'dashboard_ejecutivo',
      component: () => import('../views/MOF/DashboardEjecutivo.vue')
    },
    {
      path: '/reportes/facultativo',
      name: 'dashboard_facultativo',
      component: () => import('../views/MOF/DashboardFacultativo.vue')
    },
    {
      path: '/reportes/operativo',
      name: 'dashboard_operativo',
      component: () => import('../views/MOF/DashboardOperativo.vue')
    },
    {
      path: '/configuracion',
      name: 'configuracion',
      component: () => import('../views/Configuracion.vue')
    },
    {
      path:"/mof/listar-unidades",
      name:'listar_unidades',
      component: ListarUnidades
    },
    {
        path:"/mof/registrar-unidad",
        name:"registro_unidad",
        component: RegistrarUnidad
    },
    {
        path:"/mof/arbol-unidades",
        name:"tree_unidades",
        component:TreeUnidades
    },
    {
      path:"/mof/organigrama-unidades",
      name:"organigrama_unidades",
      component: OrganigramaView
    },
    {
      path:"/mof/organigrama-unidades-2",
      name:"organigrama_unidades_2",
      component: OrganigramaView2
    }
  ]
})

export default router