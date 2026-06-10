using UnityEngine;
using UnityEngine.SceneManagement;
using TMPro;
using System.Collections;

public class ObjectCounter : MonoBehaviour
{
    public static ObjectCounter Instance;

    [SerializeField] private int requiredItems = 3;
    [SerializeField] private GameObject enemy;
    [SerializeField] private CompassOrbit compass;
    [SerializeField] private Transform ExitPoint;

    [SerializeField] private TMP_Text itemCounterText;

    private int collectedItems = 0;

    private void Awake()
    {
        if (Instance == null)
            Instance = this;
        else
            Destroy(gameObject);
    }

    private void Start()
    {
        UpdateUI();
    }

    IEnumerator SetFinalTarget()
    {
        yield return new WaitForSeconds(4f);
        compass.SetTarget(ExitPoint);
    }

    public void CollectItem()
    {
        collectedItems++;
        Debug.Log($"Objetos recolectados: {collectedItems}/{requiredItems}");
        UpdateUI();
        if (HasEnoughItems())
        {
            enemy.SetActive(false);
            StartCoroutine(SetFinalTarget());
        }
    }

    public bool HasEnoughItems()
    {
        return collectedItems >= requiredItems;
    }

    private void UpdateUI()
    {
        if (collectedItems >= requiredItems)
        {
            itemCounterText.text = "Cruces recolectadas";
        }
        else
        {
            itemCounterText.text =
                $"{collectedItems}/{requiredItems} Cruces";
        }
    }

    public void WinGame()
    {
        SceneManager.LoadScene("VictoryScene");
    }
}