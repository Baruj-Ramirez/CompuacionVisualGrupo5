# Cinemática Directa: Animando Brazos Robóticos o Cadenas Articuladas

### Nombres:

- Joan Sebastian Roberto Puerto
- Baruj Vladimir Ramírez Escalante
- Diego Alberto Romero Olmos
- Maicol Sebastian Olarte Ramirez
- Jorge Isaac Alandete Díaz

### Fecha de entrega: 15/04/2026

### Descripción del tema:
Aplicar conceptos de cinemática directa (Forward Kinematics) para animar objetos enlazados como brazos robóticos, cadenas de huesos o criaturas segmentadas. El objetivo es comprender cómo rotaciones encadenadas afectan el movimiento y la posición de cada parte en una estructura jerárquica.

### Descripción de la implementación: 

#### Threejs:

Se crea una funcion para la creacion de segmentos de brazo, un generico para la creacion de cuantos fragmentos de brazo se quiera, esta funcion es la encargada de manejar el movimiento del brazo en el tiempo mediante UseFrame, moviendose en un rango de amplitud, que puede ser modificado mediante los controles de uso. Dentro de la funcion se crea un punto de conexion del segmento de brazo con su hijo.

Para el trazo del la linea correspondiente a la posicion del brazo se dibujan los ultimos 150 puntos del trazo.

En la función principal se crean tres segmentos de brazo, identificados jerarquicamente por su rotacion en Hombro, Codo y Muñeca, siendo Muñeca hijo de Codo y Codo hijo de Hombro.


### Resultados visuales: 

#### Threejs:

Al aumentar el rango de movimientos de la *Muñeca* restringiendo el rango de movimiento del *Codo* y el *Hombro* se obtiene:

![alt_text](media/Brazo_movimiento_muñeca.gif)

Al aumentar el rango de movimientos del *Codo* restringiendo el rango de movimiento de la *Muñeca* y el *Hombro* se obtiene:

![alt_text](media/Brazo_movimiento_codo.gif)

Al aumentar el rango de movimientos del *Hombro* restringiendo el rango de movimiento de la *Muñeca* y el *Codo* se obtiene:

![alt_text](media/Brazo_movimiento_hombro.gif)

Al aumentar el rango de movimientos del *Codo* y de la *Muñeca* restringiendo el rango de movimiento del *Hombro* se obtiene:

![alt_text](media/Brazo_movimiento_muñeca_codo.gif)

Al aumentar el rango de movimientos del *Hombro* y de la *Muñeca* restringiendo el rango de movimiento del *Codo* se obtiene:

![alt_text](media/Brazo_movimiento_muñeca_hombro.gif)

Al aumentar el rango de movimientos del *Codo*, la *Muñeca* y del *Hombro* se obtiene:

![alt_text](media/Brazo_movimiento_muñeca_codo_hombro.gif)


### Código relevante

#### Threejs:

Codigo del resultado de la funcion para crear segmentos de brazo

    const ArmSegment = ({ length, amplitude, speed, offset, color, children }) => {
    const groupRef = useRef()
    
    useFrame((state) => {
        const t = state.clock.getElapsedTime()
        // La amplitud define el rango máximo de rotación en radianes
        // Math.sin oscila entre -1 y 1, por lo que el ángulo final será [-amplitude, amplitude]
        groupRef.current.rotation.z = Math.sin(t * speed + offset) * amplitude
    })

    return (
        <group ref={groupRef}>
        {/* Visualización del eslabón */}
        <Box args={[length, 0.2, 0.2]} position={[length / 2, 0, 0]}>
            <meshStandardMaterial color={color} />
        </Box>
        {/* Punto de conexión para el hijo al final del eslabón */}
        <group position={[length, 0, 0]}>
            {children}
        </group>
        </group>
    )
    }


### Aprendizajes y dificultades

Se tuvieron varios aprendizajer relevante en la animación de objetos con hijos y padre en el tiempo.