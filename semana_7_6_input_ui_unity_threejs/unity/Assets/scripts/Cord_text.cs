using UnityEngine;
using TMPro;

public class Cord_text : MonoBehaviour
{

    public TextMeshProUGUI cord_text;

    public TorchLight light;

    // Start is called once before the first execution of Update after the MonoBehaviour is created
    void Start()
    {
        cord_text.text = "Hola";
    }

    // Update is called once per frame
    void Update()
    {
        if(light.lightState == TorchLight.LightEnumState.ON){
            cord_text.text = "Encendido";
        }
        else{
            cord_text.text = "Apagado";
        }
    }
}
