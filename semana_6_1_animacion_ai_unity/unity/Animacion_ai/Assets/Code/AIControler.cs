using UnityEngine;
using UnityEngine.AI;

public enum AIState { Idle, Patrol, Chase }

public class AIController : MonoBehaviour 
{
    [Header("Configuración de Movimiento")]
    public Transform[] waypoints;
    public Transform player;
    public float detectionRadius = 10f;
    public float loseRadius = 15f;
    
    private NavMeshAgent agent;
    private Animator animator;
    private AIState currentState = AIState.Idle;
    private int currentWaypointIndex = 0;
    private float idleTimer = 0f;

    void Start() {
        agent = GetComponent<NavMeshAgent>();
        animator = GetComponent<Animator>();
        currentState = AIState.Patrol; // Empezamos patrullando
    }

    void Update() {
        // 1. Control de Animaciones (se ejecuta siempre)
        float speed = agent.velocity.magnitude;
        animator.SetFloat("Speed", speed);

        // 2. Lógica de Estados
        float distanceToPlayer = Vector3.Distance(transform.position, player.position);

        // Actualizamos el booleano del Animator
            if (currentState == AIState.Chase) {
                animator.SetBool("IsChasing", true);
            } else {
                animator.SetBool("IsChasing", false);
            }

        switch (currentState) {
            case AIState.Idle:
                HandleIdleState(distanceToPlayer);
                break;
            case AIState.Patrol:
                HandlePatrolState(distanceToPlayer);
                break;
            case AIState.Chase:
                HandleChaseState(distanceToPlayer);
                break;
        }
    }

//------------------------------------------------------

    void HandleIdleState(float distance) {
        agent.isStopped = true;
        agent.speed = 0f;
        idleTimer += Time.deltaTime;
        if (idleTimer > 3f) {
            currentState = AIState.Patrol;
            idleTimer = 0f;
            agent.isStopped = false;
        }
        if (distance < detectionRadius) currentState = AIState.Chase;
    }

    void HandlePatrolState(float distance) {
        if (waypoints.Length == 0) return;

        agent.SetDestination(waypoints[currentWaypointIndex].position);
        agent.speed = 2f;

        if (!agent.pathPending && agent.remainingDistance < 0.5f) {
            currentWaypointIndex = (currentWaypointIndex + 1) % waypoints.Length;
            currentState = AIState.Idle; // Descansa un momento al llegar a cada punto
        }

        if (distance < detectionRadius) currentState = AIState.Chase;
    }

    void HandleChaseState(float distance) {
        agent.SetDestination(player.position);
        agent.speed = 4f; // Aumentamos la velocidad al perseguir
        if (distance > loseRadius) currentState = AIState.Patrol;
    }
}