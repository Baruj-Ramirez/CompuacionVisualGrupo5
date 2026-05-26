using UnityEngine;

public class PlayerAnimatorController : MonoBehaviour
{
    private Animator animator;
    private float currentSpeed = 0f;
    private float speedIncrement = 0.5f; // Cuánto aumenta la velocidad por frame
    private float maxSpeed = 2f; // Velocidad máxima para correr
    private bool isPaused = false;

    void Awake()
    {
        // Obtener el componente Animator del personaje
        animator = GetComponent<Animator>();
    }

    void Update()
    {
        if (isPaused)
            return; // Si está pausado, no hacer nada

        HandleMovementInput();
        HandleAnimationTriggers();
        UpdateAnimatorSpeed();
    }

    /// <summary>
    /// Controla el aumento/disminución de velocidad con las teclas
    /// </summary>
    void HandleMovementInput()
    {
        // W para acelerar
        if (Input.GetKey(KeyCode.W))
        {
            currentSpeed = Mathf.Min(currentSpeed + speedIncrement * Time.deltaTime, maxSpeed);
        }
        // S para desacelerar
        else if (Input.GetKey(KeyCode.S))
        {
            currentSpeed = Mathf.Max(currentSpeed - speedIncrement * Time.deltaTime, 0f);
        }
        // Desaceleración gradual si no presiona nada
        else
        {
            currentSpeed = Mathf.Max(currentSpeed - speedIncrement * 0.5f * Time.deltaTime, 0f);
        }
    }

    /// <summary>
    /// Controla acciones especiales (saludo, etc.)
    /// </summary>
    void HandleAnimationTriggers()
    {
        if (Input.GetKeyDown(KeyCode.Space))
        {
            // Dispara el trigger "Wave" en el Animator
            animator.SetTrigger("Wave");
            // Pausar el movimiento mientras saluda
            currentSpeed = 0f;
        }
    }

    /// <summary>
    /// Actualiza el parámetro "Speed" en el Animator
    /// </summary>
    void UpdateAnimatorSpeed()
    {
        animator.SetFloat("Speed", currentSpeed);
    }

    /// <summary>
    /// Pausa/Reanuda las animaciones
    /// </summary>
    public void PauseAnimation()
    {
        isPaused = true;
        animator.speed = 0f; // Detiene la animación
    }

    public void ResumeAnimation()
    {
        isPaused = false;
        animator.speed = 1f; // Reanuda a velocidad normal
    }

    public void ResetAnimation()
    {
        // Vuelve al estado Idle
        currentSpeed = 0f;
        animator.SetTrigger("Reset");
        animator.SetFloat("Speed", 0f);
    }

    /// <summary>
    /// Cambia la velocidad de reproducción de las animaciones
    /// </summary>
    public void SetAnimationSpeed(float speed)
    {
        animator.speed = Mathf.Max(speed, 0.1f); // Mínimo 0.1 para no congelar
    }

    /// <summary>
    /// Fuerza una animación específica
    /// </summary>
    public void PlayAnimation(string animationName)
    {
        animator.SetTrigger(animationName);
        currentSpeed = 0f;
    }
}