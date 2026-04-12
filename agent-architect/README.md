# Masonería madrileña
- Diego Soria
- David Gutierrez
- Andrés Alonso
- Dan Narita
- Saúl Torres
- Jorge Montoto

## Qué hay que rematar para ganar mañana

### Demo killer (lo que decide el jurado)
- [x] **Storytelling de 90 segundos**: guion fijo (problema → solución → demo en vivo → cierre) y quién habla en cada tramo.
- [x] **Proyecto semilla preparado** que se pueda arrancar en 30s sin depender de OpenAI (cachear respuestas de ejemplo si la API falla en el escenario).
- [x] **Modo "presentación"**: botón que carga un escenario real (ej. "plataforma de reservas con IA") y dispara toda la cadena chat → config → agentes → workspace sin errores.
- [x] **Plan B offline**: capturar un run completo en vídeo de 40s por si cae la red del recinto.

### Producto (UX del flujo)
- [x] Integrar en una pantalla el chat de los agentes (35%) junto con la imagen de los agentes trabajando (65%).
- [x] Pantalla de "agentes trabajando" con avatares animados, burbujas de progreso y logs tipo terminal (aunque el backend sea mock, que se vea vivo).
- [x] Descarga en un click de todos los `.md` de agentes como `.zip` (ya hay endpoint `/api/agents/project/{id}`, falta el bundler).
- [x] Botón "copiar a `.claude/agents/`" que explique al jurado el vínculo directo con Claude Code.
- [x] Manejo de errores visible: si OpenAI falla, mostrar toast y reintentar, no pantalla en blanco.

### Prompts e inteligencia (lo que hace que los agentes no sean genéricos)
- [x] Reescribir `SYSTEM_PROMPT` y `BUILD_PROMPT` del `ChatController` para que entreviste mejor y devuelva JSON más rico.
- [x] Reescribir el megaprompt de `AgentController.generateAgents` para que el `.md` generado sea un agente real utilizable en Claude Code.
- [x] Añadir **few-shot examples** reales dentro del prompt de build (un ejemplo de proyecto completo → JSON esperado).
- [x] Guardar la `project_idea` enriquecida (no el primer mensaje del usuario en crudo).

### Backend / técnico
- [x] Endpoint `/api/agents/{projectId}/download` que devuelva un `.zip` con todos los markdowns.
- [x] Variable de entorno `OPENAI_API_KEY` cargada desde `.env` (no commitear).
- [ ] Healthcheck `/api/health` para validar rápido que todo está arriba en el recinto.

### Integración con Claude Code (diferenciador)
- [x] El `mcp-agents/` server ya expone `list_agents` / `download_agents`: documentar en la demo cómo un usuario conecta el MCP a su Claude Code y los agentes aparecen mágicamente.
- [ ] Screenshot o clip corto enseñando Claude Code invocando uno de nuestros agentes generados.

### Polish final (1h antes de presentar)
- [x] Revisar textos de la landing (sin lorem ipsum, sin placeholders).
- [ ] Favicon, título de pestaña y OG image coherentes con el nombre del proyecto.
- [x] Silenciar logs ruidosos en consola.
- [ ] Probar la demo completa 3 veces seguidas sin tocar nada entre runs.
