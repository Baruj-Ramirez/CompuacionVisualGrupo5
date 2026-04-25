public interface IInteractable
{
    /// <summary>Called when the player interacts with this object.</summary>
    void Interact();

    /// <summary>Optional prompt shown in the UI, e.g. "Pick up Sword".</summary>
    string GetPrompt();
}