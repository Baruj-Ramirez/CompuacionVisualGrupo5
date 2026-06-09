using UnityEngine;
using Cinemachine;

[RequireComponent(typeof(CharacterController))]
[RequireComponent(typeof(PlayerInputHandler))]
public class PlayerController : MonoBehaviour
{
    [Header("Movement")]
    [SerializeField] private float moveSpeed    = 5f;
    [SerializeField] private float gravity      = -9.81f;
    [SerializeField] private float groundedGravity = -0.5f;

    [Header("Camera")]
    [SerializeField] private CinemachineVirtualCamera virtualCamera;
    [SerializeField] private float lookSensitivity = 0.1f;
    [SerializeField] private float maxPitchAngle   = 80f;

    private CharacterController _cc;
    private PlayerInputHandler  _input;
    private Transform           _camTarget;

    private float   _verticalVelocity;
    private float   _yaw;
    private float   _pitch;

    private void Awake()
    {
        _cc    = GetComponent<CharacterController>();
        _input = GetComponent<PlayerInputHandler>();

        _camTarget = new GameObject("CameraTarget").transform;
        _camTarget.SetParent(transform);
        _camTarget.localPosition = new Vector3(0f, 1.6f, 0f);

        if (virtualCamera != null)
        {
            virtualCamera.Follow = null;
            virtualCamera.LookAt = null;
            virtualCamera.transform.SetParent(_camTarget);
            virtualCamera.transform.localPosition = Vector3.zero;
            virtualCamera.transform.localRotation = Quaternion.identity;// ← remove LookAt for Do Nothing aim
        }

        Cursor.lockState = CursorLockMode.Locked;
        Cursor.visible   = false;
    }

    private void Update()
    {
        HandleLook();
        HandleMovement();
    }

    private void HandleLook()
    {
        _yaw   += _input.LookInput.x * lookSensitivity;
        _pitch -= _input.LookInput.y * lookSensitivity;

        transform.rotation  = Quaternion.Euler(0f, _yaw, 0f);
        _camTarget.rotation = Quaternion.Euler(_pitch, _yaw, 0f);
    }

    private void HandleMovement()
    {
        // Apply gravity
        if (_cc.isGrounded)
            _verticalVelocity = groundedGravity;
        else
            _verticalVelocity += gravity * Time.deltaTime;

        // Build move direction relative to where the character faces
        Vector3 moveDir = transform.right   * _input.MoveInput.x
                        + transform.forward * _input.MoveInput.y;

        Vector3 velocity = moveDir * moveSpeed;
        velocity.y = _verticalVelocity;

        _cc.Move(velocity * Time.deltaTime);
    }
}