using UnityEngine;
using UnityEngine.InputSystem;

[RequireComponent(typeof(PlayerInput))]
public class PlayerInputHandler : MonoBehaviour
{
    public Vector2 MoveInput { get; private set; }
    public Vector2 LookInput { get; private set; }

    private PlayerInputActions _actions;

    private void Awake()
    {
        _actions = new PlayerInputActions();
    }

    private void OnEnable()
    {
        _actions.Player.Enable();
        _actions.Player.Move.performed += OnMove;
        _actions.Player.Move.canceled  += OnMove;
        _actions.Player.Look.performed += OnLook;
        _actions.Player.Look.canceled  += OnLook;
    }

    private void OnDisable()
    {
        _actions.Player.Move.performed -= OnMove;
        _actions.Player.Move.canceled  -= OnMove;
        _actions.Player.Look.performed -= OnLook;
        _actions.Player.Look.canceled  -= OnLook;
        _actions.Player.Disable();
    }

    private void OnMove(InputAction.CallbackContext ctx) =>
        MoveInput = ctx.ReadValue<Vector2>();

    private void OnLook(InputAction.CallbackContext ctx) =>
        LookInput = ctx.ReadValue<Vector2>();
}