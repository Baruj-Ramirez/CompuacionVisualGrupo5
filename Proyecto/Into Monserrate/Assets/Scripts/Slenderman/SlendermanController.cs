using UnityEngine;
using UnityEngine.AI;

[RequireComponent(typeof(NavMeshAgent))]
public class SlendermanController : MonoBehaviour
{
    [Header("Referencias")]
    private Transform player;               // Se buscará automáticamente
    private NavMeshAgent agent;

    [Header("Persecución")]
    [SerializeField] private float chaseSpeed = 3.5f;
    [SerializeField] private float detectionRange = 15f;   // Distancia a la que detecta al jugador
    [SerializeField] private float attackRange = 2f;       // Distancia para "atrapar" al jugador

    [Header("Teletransporte (cuando pierde al jugador)")]
    [SerializeField] private float maxTimeWithoutSeeingPlayer = 40f;   // 40 segundos (puedes cambiarlo)
    [SerializeField] private float behindDistance = 2.5f;
    [SerializeField] private float frontDistance = 10f;
    [SerializeField] private float behindTeleportWeight = 0.8f;
    [SerializeField] private float frontTeleportWeight = 0.2f;
    [SerializeField] private LayerMask groundLayer;
    [SerializeField] private float raycastHeight = 20f;

    private float timeSinceLastSight;

    [Header("Detección por línea de visión")]
    [SerializeField] private LayerMask obstacleMask = -1;   // Para no atravesar paredes
    [SerializeField] private float visionConeAngle = 60f;   // Ángulo de visión (frente)

    [Header("Efectos (opcional)")]
    [SerializeField] private ParticleSystem teleportEffect;
    [SerializeField] private AudioClip teleportSound;

    private bool playerIsVisible = false;
    [Header("Recolectables")]
    [SerializeField] private int totalCollectibles = 5;
    private int collectedObjects = 0;
    private float progression = 0f;

    void Start()
    {
        // Buscar al jugador por tag (asegúrate de que el jugador tenga la tag "Player")
        GameObject playerObj = GameObject.FindGameObjectWithTag("Player");
        if (playerObj != null)
            player = playerObj.transform;
        else
            Debug.LogError("No se encontró un objeto con tag 'Player' - Slenderman no funcionará.");

        agent = GetComponent<NavMeshAgent>();
        if (agent != null)
        {
            agent.speed = chaseSpeed;
            agent.autoBraking = false;       // Para que no se frene al llegar
        }

        timeSinceLastSight = 0f;
    }

    void Update()
    {
        if (player == null) return;

        // Calcular distancia al jugador
        float distanceToPlayer = Vector3.Distance(transform.position, player.position);

        // Ver si el jugador está dentro del rango de detección y además visible (raycast)
        bool inRange = distanceToPlayer <= detectionRange;
        playerIsVisible = inRange && HasLineOfSight();
        //playerIsVisible = inRange;
        // Comportamiento de persecución
        if (playerIsVisible)
        {
            // Lo ve: perseguir y reiniciar el temporizador
            timeSinceLastSight = 0f;
            agent.SetDestination(player.position);
            agent.isStopped = false;

            // Si está muy cerca, "atrapa" al jugador (pierde el juego)
            if (distanceToPlayer <= attackRange)
            {
                CatchPlayer();
            }
        }
        else
        {
            // No ve al jugador: incrementa el tiempo
            timeSinceLastSight += Time.deltaTime;

            // Si pasa el tiempo máximo sin verlo, teletransportarse detrás de él
            if (timeSinceLastSight >= maxTimeWithoutSeeingPlayer)
            {
                RandomTeleport();
                timeSinceLastSight = 0f;   // reiniciar contador tras TP
            }
            else
            {
                // Opcional: mientras no lo ve, sigue la última posición conocida
                // Si quieres que se quede quieto, comenta la siguiente línea
                if (agent.hasPath)
                    agent.isStopped = true;   // se para hasta volver a verlo
            }
        }
    }

    /// <summary>
    /// Comprueba si hay línea de visión directa entre el enemigo y el jugador, sin obstáculos.
    /// </summary>
    private bool HasLineOfSight()
    {
        // Primero, dirección hacia el jugador
        Vector3 directionToPlayer = (player.position - transform.position).normalized;
        float angleToPlayer = Vector3.Angle(transform.forward, directionToPlayer);

        // Si está fuera del ángulo de visión (por ejemplo, por detrás), no lo ve
        if (angleToPlayer > visionConeAngle * 0.5f)
            return false;

        // Raycast desde los ojos del enemigo (podemos usar la posición + altura)
        Vector3 eyePosition = transform.position + Vector3.up * 1.5f;
        Vector3 targetPosition = player.position + Vector3.up * 1.5f;
        RaycastHit hit;

        if (Physics.Linecast(eyePosition, targetPosition, out hit, obstacleMask))
        {
            // Si el objeto golpeado es el jugador (o tiene tag "Player"), hay visión
            if (hit.collider.CompareTag("Player"))
                return true;
            else
                return false;   // Hay una pared u objeto de por medio
        }
        return false; // por si no golpea nada, no se considera visible
    }

    /// <summary>
    /// Teletransporta al enemigo justo detrás del jugador, orientándolo hacia él.
    /// </summary>
    [Header("Ajustes de modelo")]
    [SerializeField] private float pivotHeightOffset = 40.0f; // Distancia desde el pivote hasta los pies. Ajústalo.
    private void RandomTeleport()
    {
        float totalWeight = behindTeleportWeight + frontTeleportWeight;
        float randomValue = Random.Range(0f, totalWeight);

        if (randomValue < behindTeleportWeight)
        {
            TeleportBehindPlayer();
        }
        else
        {
            TeleportInFrontOfPlayer();
        }
    }
    private void TeleportBehindPlayer()
    {
        if (player == null) return;

        // Posición detrás del jugador, en el plano XZ
        Vector3 targetPos = player.position - player.forward * behindDistance;

        // Buscar el punto más cercano sobre el NavMesh (eso nos da una altura de suelo)
        NavMeshHit hit;
        if (NavMesh.SamplePosition(targetPos, out hit, 5.0f, NavMesh.AllAreas))
        {
            targetPos = hit.position;   // hit.position tiene Y = altura del suelo
        }

        // Ahora subimos el pivote la distancia que hay desde el suelo hasta la cadera
        targetPos.y += pivotHeightOffset;   // ← importante: SUMAR, no restar

        agent.Warp(targetPos);

        // Girar para mirar al jugador
        Vector3 lookDir = (player.position - transform.position).normalized;
        lookDir.y = 0;
        if (lookDir != Vector3.zero)
            transform.rotation = Quaternion.LookRotation(lookDir);

        // Efectos...
        if (teleportEffect != null) teleportEffect.Play();
        if (teleportSound != null) AudioSource.PlayClipAtPoint(teleportSound, transform.position);

        Debug.Log("Slenderman teletransportado con corrección de altura.");
    }

    private void TeleportInFrontOfPlayer()
    {
        if (player == null) return;

        // Posición delante del jugador
        Vector3 targetPos = player.position + player.forward * frontDistance;

        NavMeshHit hit;
        if (NavMesh.SamplePosition(targetPos, out hit, 5.0f, NavMesh.AllAreas))
        {
            targetPos = hit.position;
        }

        targetPos.y += pivotHeightOffset;

        agent.Warp(targetPos);

        // Mirar al jugador
        Vector3 lookDir = (player.position - transform.position).normalized;
        lookDir.y = 0;

        if (lookDir != Vector3.zero)
            transform.rotation = Quaternion.LookRotation(lookDir);

        if (teleportEffect != null) teleportEffect.Play();
        if (teleportSound != null) AudioSource.PlayClipAtPoint(teleportSound, transform.position);

        Debug.Log("Slenderman teletransportado delante del jugador.");
    }
    private bool TryGetGroundPosition(Vector3 position, out Vector3 groundPosition)
    {
        Ray ray = new Ray(
            position + Vector3.up * raycastHeight,
            Vector3.down);

        if (Physics.Raycast(ray, out RaycastHit hit,
            raycastHeight * 2f,
            groundLayer))
        {
            groundPosition = hit.point;
            return true;
        }

        groundPosition = position;
        return false;
    }

    /// <summary>
    /// Acción cuando atrapa al jugador. Aquí defines qué pasa (reiniciar nivel, mostrar pantalla de derrota...)
    /// </summary>
    private void CatchPlayer()
    {
        Debug.Log("¡Slenderman atrapó al jugador! Game Over.");
        // Ejemplo: cargar una escena de game over o llamar a un método del GameManager
        // Puedes invocar un evento o buscar un GameManager con FindObjectOfType
        // Time.timeScale = 0f; // pausar el juego (si quieres)
    }

    public void RegisterCollectedObject()
    {
        collectedObjects++;

        progression = Mathf.Clamp01(
            (float)collectedObjects / totalCollectibles);

        UpdateTeleportWeights();

        Debug.Log($"Progreso: {collectedObjects}/{totalCollectibles}");
    }

    private void UpdateTeleportWeights()
    {
        behindTeleportWeight = Mathf.Lerp(1f, 0.2f, progression);
        frontTeleportWeight = Mathf.Lerp(0f, 0.8f, progression);
        maxTimeWithoutSeeingPlayer = Mathf.Lerp(20f, 5f, progression);
    }

    // Opcional: dibujar gizmos para depuración
    private void OnDrawGizmosSelected()
    {
        Gizmos.color = Color.red;
        Gizmos.DrawWireSphere(transform.position, detectionRange);
        Gizmos.color = Color.green;
        Gizmos.DrawWireSphere(transform.position, attackRange);
        if (player != null)
        {
            Gizmos.color = playerIsVisible ? Color.green : Color.yellow;
            Gizmos.DrawLine(transform.position + Vector3.up * 1.5f, player.position + Vector3.up * 1.5f);
        }
    }
}