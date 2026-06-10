using UnityEngine;

public class PickupItem : MonoBehaviour, IInteractable
{
    [SerializeField] private string itemName = "Item";

    public void Interact()
    {
        Debug.Log($"[Pickup] Picked up {itemName}");
        // TODO: add to inventory, play sound, etc.
        gameObject.SetActive(false);
    }

    public string GetPrompt() => $"Pick up {itemName}";
}