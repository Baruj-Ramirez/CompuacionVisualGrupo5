using UnityEngine;

public class TriggerZone : MonoBehaviour
{
    [SerializeField] private GameObject target;
    private void OnTriggerEnter(Collider other)
    {
        if (!other.CompareTag("Player"))
            return;
        target.SetActive(true);
    }
}
