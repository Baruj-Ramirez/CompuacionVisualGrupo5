using System.Collections;
using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// Brújula 3D que orbita alrededor del jugador en el plano horizontal.
///
/// SETUP: Este GameObject debe ser hijo directo del jugador en la jerarquía.
/// Su posición local en el círculo orbital indica la dirección al objetivo.
/// El objeto NO rota sobre sí mismo — la posición orbital es la "aguja".
///
/// RefreshTarget() fija el objeto con <targetTag> más cercano al jugador
/// en ese momento. El objetivo queda fijo hasta la próxima llamada.
/// </summary>
public class CompassOrbit : MonoBehaviour
{
    private static WaitForSeconds _waitForSeconds2 = new WaitForSeconds(2f);

    // ─── Referencias ──────────────────────────────────────────────────────────

    [Header("Referencias")]
    [Tooltip("Tag de los objetos candidatos a señalar")]
    public string targetTag = "Objetivo";

    // ─── Órbita ───────────────────────────────────────────────────────────────
    [Header("Órbita")]
    [Tooltip("Radio del círculo de órbita (en espacio local del jugador)")]
    public float orbitRadius = 1.5f;

    [Tooltip("Altura local respecto al pivot del jugador")]
    public float orbitHeight = 1.2f;

    [Tooltip("Velocidad máxima de desplazamiento angular (grados/segundo)")]
    public float rotationSpeed = 180f;

    [Tooltip("Suavizado del movimiento orbital (0 = instantáneo)")]
    [Range(0f, 20f)]
    public float smoothing = 8f;

    // ─── Estado interno ───────────────────────────────────────────────────────
    private Transform playerTransform;  // padre directo (el jugador)
    private Transform currentTarget;
    private float currentAngle;         // ángulo actual en el plano XZ (grados, espacio mundo)
    private float desiredAngle;

    // ─────────────────────────────────────────────────────────────────────────
    void Start()
    {
        playerTransform = transform.parent;

        if (playerTransform == null)
        {
            Debug.LogError("[CompassOrbit] Este GameObject debe ser hijo del jugador.");
            enabled = false;
            return;
        }

        RefreshTarget();

        // Arrancar ya en el ángulo correcto para evitar giro inicial brusco
        if (currentTarget != null)
        {
            desiredAngle = GetAngleToTarget();
            currentAngle = desiredAngle;
        }

        UpdateLocalPosition();
    }

    void LateUpdate()   // LateUpdate: se ejecuta después de que el jugador se haya movido
    {
        // 1. Ángulo deseado hacia el objetivo (plano XZ mundo, ignorando Y)
        if (currentTarget != null)
            desiredAngle = GetAngleToTarget();

        // 2. Avanzar currentAngle hacia desiredAngle respetando velocidad y suavizado
        float delta   = Mathf.DeltaAngle(currentAngle, desiredAngle);
        float maxStep = rotationSpeed * Time.deltaTime;
        float advance = Mathf.Clamp(delta, -maxStep, maxStep);

        currentAngle += smoothing > 0f
            ? advance * Mathf.Clamp01(smoothing * Time.deltaTime)
            : delta;

        // 3. Posición LOCAL: el padre (jugador) ya define el origen y la Y real
        UpdateLocalPosition();
    }

    // ─── Privado ──────────────────────────────────────────────────────────────

    void UpdateLocalPosition()
    {
        float rad = currentAngle * Mathf.Deg2Rad;
        // Posición local pura: no depende de la posición mundo del jugador,
        // por lo que se mueve automáticamente con él sin frame-lag
        transform.localPosition = new Vector3(
            Mathf.Sin(rad) * orbitRadius,
            orbitHeight,
            Mathf.Cos(rad) * orbitRadius
        );

        // Sin rotación local propia: la posición en el círculo ES la indicación
        transform.localRotation = Quaternion.identity;
    }

    /// <summary>
    /// Ángulo en el plano XZ en espacio LOCAL del jugador hacia el objetivo.
    /// Así localPosition usa los mismos ejes que la dirección calculada,
    /// independientemente de hacia dónde esté rotado el jugador.
    /// </summary>
    private float GetAngleToTarget()
    {
        // Dirección mundo aplanada
        Vector3 worldDir = currentTarget.position - playerTransform.position;
        worldDir.y = 0f;

        // Convertir a espacio local del jugador (solo rotación, sin escala)
        Vector3 localDir = playerTransform.InverseTransformDirection(worldDir);

        return Mathf.Atan2(localDir.x, localDir.z) * Mathf.Rad2Deg;
    }

    // ─── API pública ──────────────────────────────────────────────────────────

    /// <summary>
    /// Busca todos los GameObjects con <targetTag> y fija como objetivo
    /// el más cercano al jugador (distancia en plano XZ) en este momento.
    /// </summary>
    IEnumerator DelayedRefreshCoroutine()
    {
        yield return _waitForSeconds2;
        RefreshTarget();
    }
    public void DelayedRefresh() => StartCoroutine(DelayedRefreshCoroutine());
    public void RefreshTarget()
    {
        if (playerTransform == null) playerTransform = transform.parent;

        GameObject[] candidates = GameObject.FindGameObjectsWithTag(targetTag);

        if (candidates.Length == 0)
        {
            Debug.LogWarning($"[CompassOrbit] No se encontró ningún objeto con tag '{targetTag}'.");
            currentTarget = null;
            return;
        }

        GameObject closest     = null;
        float      closestSqr  = float.MaxValue;
        Vector3    playerPos   = playerTransform != null
                                     ? playerTransform.position
                                     : Vector3.zero;

        foreach (GameObject candidate in candidates)
        {
            Vector3 flat = candidate.transform.position - playerPos;
            flat.y = 0f;
            float sqr = flat.sqrMagnitude;
            if (sqr < closestSqr)
            {
                closestSqr = sqr;
                closest    = candidate;
            }
        }

        currentTarget = closest.transform;
        Debug.Log($"[CompassOrbit] Objetivo: {closest.name} " +
                  $"(dist XZ: {Mathf.Sqrt(closestSqr):F1} m)");
    }

    /// <summary>Fija un Transform concreto como objetivo sin buscar por tag.</summary>
    public void SetTarget(Transform newTarget)
    {
        currentTarget = newTarget;
        if (newTarget != null)
            Debug.Log($"[CompassOrbit] Objetivo manual: {newTarget.name}");
    }

    /// <summary>Cambia el tag de búsqueda y refresca al más cercano.</summary>
    public void SetTargetTag(string newTag)
    {
        targetTag = newTag;
        RefreshTarget();
    }

    /// <summary>Devuelve el Transform del objetivo actual (puede ser null).</summary>
    public Transform GetCurrentTarget() => currentTarget;

    // ─── Gizmos ───────────────────────────────────────────────────────────────
#if UNITY_EDITOR
    void OnDrawGizmosSelected()
    {
        Transform pivot = Application.isPlaying ? playerTransform : transform.parent;
        if (pivot == null) return;

        // Círculo de órbita en espacio mundo
        Gizmos.color = new Color(0.2f, 0.8f, 1f, 0.35f);
        Vector3 center = pivot.position + Vector3.up * orbitHeight;
        int     segs   = 40;
        float   step   = 360f / segs;
        Vector3 prev   = center + new Vector3(Mathf.Sin(0f) * orbitRadius, 0f,
                                              Mathf.Cos(0f) * orbitRadius);
        for (int i = 1; i <= segs; i++)
        {
            float   a    = i * step * Mathf.Deg2Rad;
            Vector3 next = center + new Vector3(Mathf.Sin(a) * orbitRadius, 0f,
                                                Mathf.Cos(a) * orbitRadius);
            Gizmos.DrawLine(prev, next);
            prev = next;
        }

        // Línea al objetivo
        if (currentTarget != null)
        {
            Gizmos.color = Color.yellow;
            Gizmos.DrawLine(transform.position, currentTarget.position);
            Gizmos.DrawWireSphere(currentTarget.position, 0.3f);
        }
    }
#endif
}