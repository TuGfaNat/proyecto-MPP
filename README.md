# Cliente MPP - Manual de Procesos y Procedimientos (Frontend)

Este proyecto es el cliente web para la gestión y diseño de manuales de procesos y procedimientos. Está construido como un sistema dinámico y reactivo, diseñado para ser resiliente ante los cambios en la estructura de datos del backend.

---

## 🚀 Guía de Instalación

### Requisitos Previos

- **Node.js** (v18 o superior)
- **npm** o **pnpm**

### Pasos para iniciar

1.  **Entrar a la carpeta del proyecto:**
    ```bash
    cd proyecto-MPP
    ```
2.  **Instalar dependencias:**
    ```bash
    npm install
    ```
3.  **Iniciar en modo desarrollo:**
    ```bash
    npm run dev
    ```
    > El sistema abrirá un servidor local (normalmente en `http://localhost:5173`).

---

## 🏗️ Arquitectura y Tecnologías

El frontend utiliza un stack moderno y reactivo:

- **Vue 3 (Composition API):** Framework principal para la lógica de componentes.
- **Vuetify 3:** Librería de componentes UI para una interfaz limpia y profesional.
- **Pinia:** Gestión de estado global (Store) para la persistencia y sincronización de datos.
- **VueFlow:** Motor gráfico utilizado en el **Diseñador de Matriz** para la creación de diagramas de flujo.
- **Axios:** Cliente HTTP para la comunicación con el API.

---

## 💡 Características Principales

1.  **Motor CRUD Dinámico:** La interfaz no está estática; se adapta automáticamente a los metadatos y entidades recibidas del servidor.
2.  **Persistencia Transparente:** Implementa un sistema de **Auto-Guardado (Debounce)**. Los cambios en formularios se sincronizan automáticamente tras breves pausas del usuario.
3.  **Diseñador de Matriz Modular:** El componente `DisenadorMatriz.vue` permite la creación visual de flujos con detección inteligente de formas basadas en el contexto de la acción.
4.  **Gestión Centralizada:** Los catálogos (Normativas, Cargos, Unidades) se gestionan mediante IDs y filtrado inteligente en tiempo real.

---

## 🛠️ Comandos de Desarrollo

| Comando           | Descripción                                                            |
| :---------------- | :--------------------------------------------------------------------- |
| `npm run dev`     | Inicia el servidor de desarrollo con Hot Reload.                       |
| `npm run build`   | Genera los archivos optimizados para producción en la carpeta `dist/`. |
| `npm run preview` | Previsualiza localmente la versión de producción generada.             |

---

## ⚖️ Licencia

Este proyecto es de uso interno y confidencial del TIC FCPN.
By TuGfaNat ☝🏻🤓
