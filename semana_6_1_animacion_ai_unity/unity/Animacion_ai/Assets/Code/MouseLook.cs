using UnityEngine;
using UnityEngine.InputSystem; // Añadir esta línea

public class MouseLook : MonoBehaviour
{
    public float mouseSensitivity = 20f; // El sistema nuevo usa valores distintos
    public Transform playerBody;
    float xRotation = 0f;

    void Start() {
        Cursor.lockState = CursorLockMode.Locked;
    }

    void Update() {
        // En el sistema nuevo se lee así el mouse directamente
        Vector2 mouseDelta = Mouse.current.delta.ReadValue() * mouseSensitivity * Time.deltaTime;

        float mouseX = mouseDelta.x;
        float mouseY = mouseDelta.y;

        xRotation -= mouseY;
        xRotation = Mathf.Clamp(xRotation, -90f, 90f);

        transform.localRotation = Quaternion.Euler(xRotation, 0f, 0f);
        playerBody.Rotate(Vector3.up * mouseX);
    }
}