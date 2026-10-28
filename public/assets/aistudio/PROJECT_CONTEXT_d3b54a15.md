# Contexto del Proyecto: Simulador de Descenso Segunda División UY

## Idea General del Proyecto y Lógica de Negocio (Domain Knowledge)
El objetivo de la app es proveer una herramienta que ingeste datos en vivo de la Segunda División de Uruguay y calcule matemáticamente los escenarios de descenso y ascenso, permitiendo al usuario simular resultados futuros. Para programar esto, debes entender perfectamente el sistema de la liga:

1. **La Tabla Anual (Clasificación General del Año):**
   - Es la sumatoria de todos los puntos obtenidos por un equipo en los distintos torneos cortos del año en curso. 
   - **Para qué sirve:** Define al campeón, los ascensos directos a Primera División y los clasificados a los Playoffs de ascenso. Sin embargo, **NO** define directamente quién desciende.

2. **La Tabla de Promedios (El Sistema de Descenso - ¡CRUCIAL!):**
   - Los descensos (generalmente los 2 últimos equipos de esta tabla) se definen por un "Promedio".
   - El Promedio se calcula sumando los puntos obtenidos en las **últimas dos temporadas** y dividiéndolos entre los **partidos jugados en esas dos temporadas**.
   - FÓRMULA: `Promedio = (Pts Temporada Anterior + Pts Temporada Actual) / (PJ Temporada Anterior + PJ Temporada Actual)`

3. **El Problema de los Divisores (La volatilidad matemática):**
   - **Equipos "Viejos":** Son equipos que ya estaban en la divisional el año pasado. Tienen puntos y partidos acumulados de ambas temporadas. Al final del año, dividen su puntaje por aproximadamente **60 a 64 partidos**. Sus promedios se mueven muy lento.
   - **Equipos "Nuevos" (Recién ascendidos o descendidos a la liga):** Solo tienen puntos de la temporada actual. Al final del año dividen su puntaje por solo **30 a 32 partidos**. 
   - **Impacto Lógico:** Un punto ganado por un equipo "nuevo" vale literalmente el doble en su promedio final que un punto ganado por un equipo "viejo". La app debe manejar dinámicamente estos divisores variables por equipo.

## Reglas de Oro (Directivas de Desarrollo)
1. **Separación de Capas:** Nunca mezcles la lógica matemática de promedios con los componentes de la UI (React). El motor matemático debe ser puro, testeable y agnóstico al framework visual.
2. **Cálculos Dinámicos:** La lógica siempre debe sumar `(puntos_historicos + puntos_actuales) / (pj_historicos + pj_actuales)`. Nunca asumas un divisor fijo global (como dividir a todos por 30).
3. **Desarrollo Iterativo:** Trabajaremos módulo por módulo (Datos -> Lógica -> Simulación -> UI).
4. **Adopción de Skills:** Dependiendo de la tarea que yo pida, asume uno de los siguientes roles específicos.

## Librería de Skills del Asistente
- **[SKILL-DATA] Ingeniero de Datos:** Uso este rol para ingesta de datos, web scraping o conexión a APIs deportivas. Priorizo el formateo estandarizado de la entidad `Team`: `{ id, nombre, pts_historicos, pj_historicos, pts_actuales, pj_actuales, forma_reciente }`.
- **[SKILL-MATH] Arquitecto Matemático:** Uso este rol para crear la lógica dura en JS/TS puro. Me encargo de los cálculos de divisores y ordenamiento de tablas con criterios de desempate (primero Promedio, luego Diferencia de Goles).
- **[SKILL-SIM] Motor de Simulación:** Uso este rol para crear algoritmos de generación de permutaciones. Calculo todas las combinaciones de resultados futuros (Victoria, Empate, Derrota) para mostrar probabilidades.
- **[SKILL-UI] Desarrollador Frontend:** Uso este rol para maquetar interfaces con React, Vite y Tailwind CSS. Diseño tablas interactivas donde el usuario pueda cambiar un resultado ("What-If") y ver el impacto instantáneo.
- **[SKILL-STATE] Especialista en Estado:** Uso este rol para crear Custom Hooks que conecten la data con la UI, manejando estados reactivos e implementando `useMemo` para evitar bloqueos por recálculos masivos.
