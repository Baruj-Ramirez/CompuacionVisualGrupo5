using UnityEngine;
using UnityEngine.UI;

public class health_bar : MonoBehaviour
{
    public Image healthBar;
    public float currentHealth;
    private float maxHealth = 100f;

    void start(){
        currentHealth = 100f;
    }


    void Update()
    {
        healthBar.fillAmount = currentHealth / maxHealth;
    }

    public void takeDamage(){
        currentHealth -= 5f;
    }
}
