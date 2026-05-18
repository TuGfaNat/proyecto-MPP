# Cliente MPP - Manual de Procesos y Procedimientos (Frontend)

Este proyecto es el cliente web para la gestión y diseño de manuales de procesos y procedimientos. Está construido como un sistema dinámico y reactivo, diseñado para ser resiliente ante los cambios en la estructura de datos del backend.

---

## 🚀 Guía de Instalación (Paso a Paso)

### 0. Requisito Fundamental
Este sistema es un cliente que consume datos. **Debes tener el Backend corriendo** (normalmente en el puerto `3000`) para que la interfaz muestre datos y permita guardar.

### 1. Requisitos Técnicos
- **Node.js:** Versión 18 o superior (puedes verificar con `node -v`).
- **Navegador:** Chrome, Edge o Firefox (versiones actualizadas).

### 2. Pasos para iniciar

1.  **Entrar a la carpeta del proyecto:**
    ```bash
    cd proyecto-MPP
    ```
2.  **Instalar las dependencias (Librerías):**
    ```bash
    npm install
    ```
    *Esto creará la carpeta `node_modules`. Solo se hace la primera vez.*

3.  **Configuración de la API (Backend):**
    Por defecto, el sistema apunta a `http://localhost:3000`. Si tu backend usa otro puerto, debes actualizar las constantes `BASE_URL` en el archivo:
    `src/stores/mpp_core.js`

4.  **Iniciar el sistema:**
    ```bash
    npm run dev
    ```
5.  **Abrir el navegador:**
    Ve a la dirección que te indique la terminal (usualmente `http://localhost:5173`).

---

## 🏗️ Arquitectura y Tecnologías
... (resto de la sección) ...

## 💡 Características Principales
... (resto de la sección) ...

## 🛠️ Comandos de Desarrollo

| Comando           | Descripción                                                            |
| :---------------- | :--------------------------------------------------------------------- |
| `npm run dev`     | Inicia el servidor de desarrollo (Modo edición en vivo).               |
| `npm run build`   | Prepara el sistema para ser subido a un servidor real.                 |
| `npm run preview` | Prueba la versión final antes de subirla.                              |

---

## ⚠️ Notas de Integridad
- **Persistencia Física:** El sistema no usa almacenamiento temporal en el navegador; todo se envía mediante orquestación de APIs a la base de datos SQL del backend.
- **IDs Institucionales:** El sistema valida que cada operación esté vinculada a un proceso y procedimiento legalmente registrado.

---

## ⚖️ Licencia
Este proyecto es de uso interno y confidencial del TIC FCPN.
By TuGfaNat ☝🏻🤓 y Gemini CLI 🤖
