using UnityEngine;
using UnityEngine.UI;
using TMPro;

public class SceneUI : MonoBehaviour
{
    [Header("Referencias")]
    public ParametricScene scene;

    [Header("Botones")]
    public Button btnRegenerate;
    public Button btnRandomize;
    public Button btnExportJson;
    public Button btnClear;
    public Button btnLoadJson;

    [Header("Sliders")]
    public Slider sliderScale;
    public Slider sliderRotation;
    public Slider sliderMinValue;
    public Slider sliderMaxValue;

    [Header("Dropdown")]
    public TMP_Dropdown dropdownColorMode;
    public TMP_Dropdown dropdownCategory;
    public Toggle       toggleFilter;

    [Header("Texto Info")]
    public TextMeshProUGUI txtInfo;
    public TextMeshProUGUI txtScale;
    public TextMeshProUGUI txtRotation;

    void Start()
    {
        // ── Botones ───────────────────────────────────────────────────────────
        btnRegenerate?.onClick.AddListener(() =>
        {
            scene.GenerateScene();
            UpdateInfo("Escena regenerada.");
        });

        btnRandomize?.onClick.AddListener(() =>
        {
            scene.RandomizeAndRegenerate();
            SyncSlidersFromScene();
            UpdateInfo("Parámetros aleatorizados.");
        });

        btnExportJson?.onClick.AddListener(() =>
        {
            scene.ExportToJson();
            UpdateInfo($"Exportado a: {Application.persistentDataPath}");
        });

        btnClear?.onClick.AddListener(() =>
        {
            scene.ClearScene();
            UpdateInfo("Escena limpiada.");
        });

        btnLoadJson?.onClick.AddListener(() =>
        {
            scene.loadFromJson = true;
            scene.LoadDataset();
            scene.GenerateScene();
            UpdateInfo("Cargado desde JSON.");
        });

        // ── Sliders ────────────────────────────────────────────────────────────
        if (sliderScale != null)
        {
            sliderScale.minValue = 0.1f;
            sliderScale.maxValue = 5f;
            sliderScale.value    = scene.globalScale;
            sliderScale.onValueChanged.AddListener(v =>
            {
                scene.globalScale = v;
                if (txtScale != null) txtScale.text = $"Escala: {v:F2}";
                scene.GenerateScene();
            });
        }

        if (sliderRotation != null)
        {
            sliderRotation.minValue = 0f;
            sliderRotation.maxValue = 5f;
            sliderRotation.value    = scene.rotationSpeed;
            sliderRotation.onValueChanged.AddListener(v =>
            {
                scene.rotationSpeed = v;
                if (txtRotation != null) txtRotation.text = $"Rotación: {v:F2}";
                scene.GenerateScene();
            });
        }

        if (sliderMinValue != null)
        {
            sliderMinValue.minValue = 0f;
            sliderMinValue.maxValue = 1f;
            sliderMinValue.value    = scene.minValue;
            sliderMinValue.onValueChanged.AddListener(v =>
            {
                scene.minValue = v;
                scene.GenerateScene();
            });
        }

        if (sliderMaxValue != null)
        {
            sliderMaxValue.minValue = 0f;
            sliderMaxValue.maxValue = 1f;
            sliderMaxValue.value    = scene.maxValue;
            sliderMaxValue.onValueChanged.AddListener(v =>
            {
                scene.maxValue = v;
                scene.GenerateScene();
            });
        }

        // ── Dropdown Color Mode ────────────────────────────────────────────────
        if (dropdownColorMode != null)
        {
            dropdownColorMode.ClearOptions();
            dropdownColorMode.AddOptions(new System.Collections.Generic.List<string>
                { "Por Categoría", "Por Tipo", "Por Valor" });
            dropdownColorMode.onValueChanged.AddListener(v =>
            {
                scene.colorMode = (ColorMode)v;
                scene.GenerateScene();
            });
        }

        // ── Dropdown Categoría ─────────────────────────────────────────────────
        if (dropdownCategory != null)
        {
            dropdownCategory.ClearOptions();
            dropdownCategory.AddOptions(new System.Collections.Generic.List<string>
                { "A", "B", "C" });
            dropdownCategory.onValueChanged.AddListener(v =>
            {
                scene.filterCategory = (ObjectCategory)v;
                if (scene.filterEnabled) scene.GenerateScene();
            });
        }

        // ── Toggle Filtro ─────────────────────────────────────────────────────
        if (toggleFilter != null)
        {
            toggleFilter.onValueChanged.AddListener(v =>
            {
                scene.filterEnabled = v;
                scene.GenerateScene();
            });
        }

        UpdateInfo("Listo. [Space] Regenerar | [R] Aleatorizar | [E] Exportar");
    }

    void SyncSlidersFromScene()
    {
        if (sliderScale    != null) sliderScale.value    = scene.globalScale;
        if (sliderRotation != null) sliderRotation.value = scene.rotationSpeed;
        if (sliderMinValue != null) sliderMinValue.value = scene.minValue;
        if (sliderMaxValue != null) sliderMaxValue.value = scene.maxValue;
    }

    void UpdateInfo(string msg)
    {
        if (txtInfo != null)
            txtInfo.text = msg;
        Debug.Log($"[UI] {msg}");
    }
}