using UnityEngine;
using UnityEngine.UI;
using System.Collections;

public class ObjectController : MonoBehaviour
{
    // Referencias a los objetos de la UI
    public Slider scaleSlider;
    public Dropdown colorDropdown;
    public Button actionButton;
    public Text scaleValueText;   // Bonus: muestra el valor actual de escala

    // Referencia al objeto 3D (Cube)
    public GameObject targetObject;

    // Material del objeto para cambiar color
    private Material targetMaterial;

    // Control de animación (rotación automática)
    private bool isRotating = false;

    // Colores predefinidos para el Dropdown
    private Color[] colors = {
        Color.red,
        Color.green,
        Color.blue,
        Color.yellow,
        Color.cyan
    };

    void Start()
    {
        // Obtener el material del objeto destino
        targetMaterial = targetObject.GetComponent<Renderer>().material;

        // Configurar los valores iniciales
        scaleSlider.value = targetObject.transform.localScale.x;
        scaleSlider.onValueChanged.AddListener(OnScaleChanged);

        // Configurar Dropdown
        colorDropdown.ClearOptions();
        foreach (Color col in colors)
        {
            // Agregar opciones con el nombre del color
            colorDropdown.options.Add(new Dropdown.OptionData(ColorUtility.ToHtmlStringRGB(col)));
        }
        // Aplicar el primer color (rojo)
        targetMaterial.color = colors[0];
        colorDropdown.value = 0;
        colorDropdown.onValueChanged.AddListener(OnColorChanged);

        // Configurar botón
        actionButton.onClick.AddListener(ToggleRotation);

        // Inicializar texto de escala
        UpdateScaleText(scaleSlider.value);
    }

    void OnScaleChanged(float newScale)
    {
        // Aplicar nueva escala uniforme (XYZ iguales)
        targetObject.transform.localScale = new Vector3(newScale, newScale, newScale);
        UpdateScaleText(newScale);
    }

    void OnColorChanged(int index)
    {
        if (index >= 0 && index < colors.Length)
        {
            targetMaterial.color = colors[index];
        }
    }

    void ToggleRotation()
    {
        isRotating = !isRotating;
        // Cambiar el texto del botón
        actionButton.GetComponentInChildren<Text>().text = isRotating ? "Stop Rotation" : "Start Rotation";
        // Si no está rotando, podemos detener la corrutina (opcional)
        if (!isRotating)
        {
            // No es necesario detener, solo la condicional en Update evita rotar
        }
    }

    void Update()
    {
        if (isRotating)
        {
            // Rotar el objeto en el eje Y
            targetObject.transform.Rotate(Vector3.up, 90 * Time.deltaTime);
        }
    }

    void UpdateScaleText(float value)
    {
        if (scaleValueText != null)
            scaleValueText.text = "Scale: " + value.ToString("F2");
    }
}