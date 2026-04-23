using UnityEngine;
using UnityEngine.SceneManagement;

public class Navegacion : MonoBehaviour
{
    public void IrAlMenu()
    {
        SceneManager.LoadScene("Menu");
    }

    public void IrAlJuego()
    {
        SceneManager.LoadScene("Juego");
    }

    public void IrACreditos()
    {
        SceneManager.LoadScene("Creditos");
    }
}