using UnityEngine;

/// <summary>
/// Adjunta este script al GameObject del jugador (o a la cámara principal).
/// Detecta si Slenderman está en el campo de visión y calcula un factor
/// de intensidad según qué tan centrado esté en pantalla.
/// </summary>
public class SlendermanDetector : MonoBehaviour
{
    [Header("Referencias")]
    [Tooltip("Transform de Slenderman")]
    public Transform slenderman;

    [Tooltip("Cámara principal del jugador")]
    public Camera playerCamera;

    [Header("Detección")]
    [Tooltip("Distancia máxima a la que puede detectarse a Slenderman")]
    public float maxDetectionDistance = 40f;

    [Tooltip("Layer de obstáculos para el raycast (paredes, objetos, etc.)")]
    public LayerMask obstacleLayers;

    [Tooltip("Layer de Slenderman para el raycast")]
    public LayerMask slendermanLayer;

    // ─── Salida pública ──────────────────────────────────────────────────────
    /// <summary>¿El jugador está mirando a Slenderman sin obstrucciones?</summary>
    [HideInInspector] public bool isLookingAtSlenderman;

    /// <summary>
    /// Factor 0‒1 que indica cuán directamente se le mira:
    ///   1.0 = centro exacto del FOV  |  ~0.0 = borde del FOV
    /// </summary>
    [HideInInspector] public float lookIntensity;

    // ─── Privado ─────────────────────────────────────────────────────────────
    private float halfFOV;

    void Start()
    {
        if (playerCamera == null)
            playerCamera = Camera.main;

        if (slenderman == null)
            Debug.LogWarning("[SlendermanDetector] No se asignó el Transform de Slenderman.");
    }

    void Update()
    {
        halfFOV = playerCamera.fieldOfView * 0.5f;

        isLookingAtSlenderman = false;
        lookIntensity = 0f;

        if (slenderman == null) return;

        // 1. ¿Está dentro del rango?
        Vector3 toSlenderman = slenderman.position - playerCamera.transform.position;
        float distance = toSlenderman.magnitude;
        if (distance > maxDetectionDistance) return;

        // 2. ¿Está delante de la cámara? (producto punto)
        float dot = Vector3.Dot(playerCamera.transform.forward, toSlenderman.normalized);
        if (dot <= 0f) return;   // detrás del jugador

        // 3. Calcular ángulo real entre la dirección de la cámara y Slenderman
        float angleToSlenderman = Vector3.Angle(playerCamera.transform.forward, toSlenderman);
        if (angleToSlenderman > halfFOV) return;  // fuera del FOV

        // 4. ¿Hay algo bloqueando la línea de visión?
        if (Physics.Linecast(playerCamera.transform.position,
                             slenderman.position,
                             obstacleLayers))
            return;   // hay un obstáculo

        // 5. ¡Está siendo visto! Calcular intensidad
        //    0° (centro) → intensidad 1.0   |   halfFOV° (borde) → intensidad 0.0
        isLookingAtSlenderman = true;
        lookIntensity = 1f - Mathf.Clamp01(angleToSlenderman / halfFOV);

        // Curva opcional: potencia cuadrática para que el centro "pese" más
        lookIntensity = Mathf.Pow(lookIntensity, 1.5f);
    }

#if UNITY_EDITOR
    void OnDrawGizmosSelected()
    {
        if (slenderman == null || playerCamera == null) return;
        Gizmos.color = isLookingAtSlenderman ? Color.red : Color.yellow;
        Gizmos.DrawLine(playerCamera.transform.position, slenderman.position);
    }
#endif
}
