using UnityEngine;

public class PickupItem : MonoBehaviour, IInteractable
{
    [SerializeField] private string itemName = "Item";
    private SlendermanController slenderman;

    [System.Obsolete]
    private void Start()
    {
        slenderman = FindFirstObjectByType<SlendermanController>();
    }

    public void Interact()
    {
        Debug.Log($"[Pickup] Picked up {itemName}");
        slenderman.RegisterCollectedObject();
        ObjectCounter.Instance.CollectItem();        
        gameObject.SetActive(false);
    }

    public string GetPrompt() => $"Pick up {itemName}";
}