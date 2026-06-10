using UnityEngine;

public class TriggerZone : MonoBehaviour
{
    [SerializeField] private GameObject target;
    [SerializeField] private bool activateObject = true;
    private void OnTriggerEnter(Collider other)
    {
        if (!other.CompareTag("Player"))
            return;
        target.SetActive(activateObject);
        Destroy(gameObject);
    }
}
