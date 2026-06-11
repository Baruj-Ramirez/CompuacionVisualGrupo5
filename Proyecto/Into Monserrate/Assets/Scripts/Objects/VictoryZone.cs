using UnityEngine;

public class VictoryZone : MonoBehaviour
{
    private void OnTriggerEnter(Collider other)
    {
        if (!other.CompareTag("Player"))
            return;

        if (ObjectCounter.Instance.HasEnoughItems())
        {
            Debug.Log("¡Victoria!");
            ObjectCounter.Instance.WinGame();
        }
        else
        {
            Debug.Log("Aún faltan objetos por recolectar.");
        }
    }
}