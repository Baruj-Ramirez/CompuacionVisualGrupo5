using UnityEngine;
using UnityEngine.InputSystem;

public class PlayerInteraction : MonoBehaviour
{
    [Header("Interaction")]
    [SerializeField] private float interactRange = 3f;
    [SerializeField] private LayerMask interactableLayer;

    [Header("References")]
    [SerializeField] private Transform cameraTarget; // drag CameraTarget here, or assign in Awake

    private PlayerInputActions _actions;
    private IInteractable _currentTarget;

    private void Awake()
    {
        _actions = new PlayerInputActions();

        // If not assigned in Inspector, try to find CameraTarget by name
        if (cameraTarget == null)
            cameraTarget = transform.Find("CameraTarget");
    }

    private void OnEnable()
    {
        _actions.Player.Enable();
        _actions.Player.Interact.performed += OnInteract;
    }

    private void OnDisable()
    {
        _actions.Player.Interact.performed -= OnInteract;
        _actions.Player.Disable();
    }

    private void Update()
    {
        DetectInteractable();
    }

    private void DetectInteractable()
    {
        Ray ray = new Ray(cameraTarget.position, cameraTarget.forward);

        if (Physics.Raycast(ray, out RaycastHit hit, interactRange, interactableLayer))
        {
            IInteractable interactable = hit.collider.GetComponent<IInteractable>();

            if (interactable != null)
            {
                // Highlight or show prompt when target changes
                if (interactable != _currentTarget)
                {
                    _currentTarget = interactable;
                    Debug.Log($"[Interaction] Looking at: {_currentTarget.GetPrompt()}");
                    // TODO: pass prompt to your UI system here
                }
                return;
            }
        }

        // Nothing in range — clear the target
        if (_currentTarget != null)
        {
            _currentTarget = null;
            Debug.Log("[Interaction] No interactable in range.");
            // TODO: hide prompt in your UI system here
        }
    }

    private void OnInteract(InputAction.CallbackContext ctx)
    {
        _currentTarget?.Interact();
    }
}