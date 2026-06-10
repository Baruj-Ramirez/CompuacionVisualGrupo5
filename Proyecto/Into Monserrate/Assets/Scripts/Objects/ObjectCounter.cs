using UnityEngine;
using UnityEngine.SceneManagement;

public class ObjectCounter : MonoBehaviour
{
    public static ObjectCounter Instance;

    [SerializeField] private int requiredItems = 3;

    private int collectedItems = 0;

    private void Awake()
    {
        if (Instance == null)
            Instance = this;
        else
            Destroy(gameObject);
    }

    public void CollectItem()
    {
        collectedItems++;
        Debug.Log($"Objetos recolectados: {collectedItems}/{requiredItems}");
    }

    public bool HasEnoughItems()
    {
        return collectedItems >= requiredItems;
    }

    public void WinGame()
    {
        SceneManager.LoadScene("VictoryScene");
    }
}