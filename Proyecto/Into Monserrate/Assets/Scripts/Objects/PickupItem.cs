using UnityEngine;

public class PickupItem : MonoBehaviour, IInteractable
{
    [SerializeField] private string itemName = "Item";
    private SlendermanController slenderman;
    [SerializeField] private CompassOrbit compass;

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
        compass.DelayedRefresh();        
        Destroy(gameObject);
    }

    public string GetPrompt() => $"Pick up {itemName}";
}