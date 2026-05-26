using UnityEngine;
using TMPro; // Requerido para usar TMP_Dropdown

public class SpeedDropdownHandler : MonoBehaviour
{
    private PlayerAnimatorController playerController;
    
    [Header("Referencias de UI")]
    public TMP_Dropdown speedDropdown; 

    [Header("Configuración de Velocidades")]
    // Los valores deben coincidir con el orden de las opciones en el Dropdown
    private float[] speeds = { 0.5f, 1f, 1.5f };

    void Start()
    {
        // 1. Buscamos al personaje en la escena
        playerController = FindObjectOfType<PlayerAnimatorController>();

        // 2. Verificamos que el Dropdown esté asignado para evitar errores
        if (speedDropdown != null)
        {
            // Limpiamos eventos previos por seguridad y añadimos el nuevo
            speedDropdown.onValueChanged.RemoveAllListeners();
            speedDropdown.onValueChanged.AddListener(OnSpeedChanged);
            
            // Opcional: Forzar la velocidad inicial según la opción actual
            OnSpeedChanged(speedDropdown.value);
        }
        else
        {
            Debug.LogError("¡Falta asignar el TMP_Dropdown en el Inspector!");
        }
        
        if (playerController == null)
        {
            Debug.LogError("No se encontró un objeto con el script PlayerAnimatorController.");
        }
    }

    /// <summary>
    /// Se ejecuta automáticamente cuando cambias la opción en el menú desplegable.
    /// </summary>
    void OnSpeedChanged(int selectedIndex)
    {
        if (playerController != null && selectedIndex >= 0 && selectedIndex < speeds.Length)
        {
            float newSpeed = speeds[selectedIndex];
            playerController.SetAnimationSpeed(newSpeed);
            Debug.Log($"Velocidad de animación cambiada a: {newSpeed}");
        }
    }
}