using UnityEngine;

public class SummonHelp : MonoBehaviour, IInteractable
{
    [SerializeField] private GameObject compass;

    public void Interact()
    {
        compass.SetActive(true);
    }

    public string GetPrompt() => "Summon help";
}
