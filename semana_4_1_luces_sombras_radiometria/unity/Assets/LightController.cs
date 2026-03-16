using UnityEngine;
using UnityEngine.UI;
using TMPro;

public class LightController : MonoBehaviour
{
    [Header("Arrastra aquí el Directional Light")]
    public Light dirLight;

    private Slider intensitySlider;
    private Slider rotationSlider;
    private Slider colorSlider;

    private void Start()
    {
        if (dirLight == null)
            Debug.LogWarning("⚠ Asigna el Directional Light en el Inspector.");

        BuildUI();

        intensitySlider.onValueChanged.AddListener(_ => ApplyLight());
        rotationSlider.onValueChanged.AddListener(_ => ApplyLight());
        colorSlider.onValueChanged.AddListener(_ => ApplyLight());

        ApplyLight();
    }

    private void ApplyLight()
    {
        if (dirLight == null) return;
        dirLight.intensity = intensitySlider.value;
        dirLight.transform.rotation = Quaternion.Euler(rotationSlider.value, -30f, 0f);
        dirLight.color = Color.Lerp(Color.white, Color.red, colorSlider.value);
    }

    // ════════════════════════════════════════════════
    //  BUILD UI
    // ════════════════════════════════════════════════
    private void BuildUI()
    {
        Canvas canvas = FindFirstObjectByType<Canvas>();
        if (canvas == null)
        {
            var cgo = new GameObject("Canvas");
            canvas = cgo.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            cgo.AddComponent<CanvasScaler>();
            cgo.AddComponent<GraphicRaycaster>();
        }

        // Panel anclado esquina inferior-izquierda
        var panel = MakeRect("LightPanel", canvas.transform, new Vector2(320, 300));
        var panelRt = panel.GetComponent<RectTransform>();
        panelRt.anchorMin = panelRt.anchorMax = new Vector2(0f, 0f);
        panelRt.pivot = new Vector2(0f, 0f);
        panelRt.anchoredPosition = new Vector2(20f, 20f);

        panel.AddComponent<Image>().color = new Color(0.05f, 0.05f, 0.1f, 0.95f);

        // Borde dorado
        var borderGo = MakeRect("Border", panel.transform, Vector2.zero);
        var bRt = borderGo.GetComponent<RectTransform>();
        bRt.anchorMin = Vector2.zero;
        bRt.anchorMax = Vector2.one;
        bRt.offsetMin = new Vector2(-2, -2);
        bRt.offsetMax = new Vector2(2, 2);
        bRt.SetAsFirstSibling();
        borderGo.AddComponent<Image>().color = new Color(1f, 0.75f, 0.1f, 0.5f);

        // Layout vertical automático
        var vlg = panel.AddComponent<VerticalLayoutGroup>();
        vlg.padding = new RectOffset(16, 16, 14, 14);
        vlg.spacing = 6;
        vlg.childAlignment = TextAnchor.UpperCenter;
        vlg.childControlWidth = true;
        vlg.childControlHeight = false;
        vlg.childForceExpandWidth = true;
        vlg.childForceExpandHeight = false;

        var csf = panel.AddComponent<ContentSizeFitter>();
        csf.verticalFit = ContentSizeFitter.FitMode.PreferredSize;

        // ── Título ──────────────────────────────────
        MakeTitle(panel.transform, "☀  LIGHT CONTROLLER");
        MakeDivider(panel.transform, new Color(1f, 0.75f, 0.1f, 0.4f));

        // ── Intensidad ──────────────────────────────
        var intensityVal = MakeRowLabel(panel.transform,
            "⬡  INTENSIDAD", "1.00",
            new Color(1f, 0.85f, 0.25f), new Color(1f, 0.65f, 0.1f));

        intensitySlider = MakeSlider(panel.transform,
            0f, 8f, 1f, new Color(1f, 0.65f, 0.1f));

        intensitySlider.onValueChanged.AddListener(v =>
            intensityVal.text = v.ToString("F2"));

        MakeDivider(panel.transform, new Color(1f, 1f, 1f, 0.07f));

        // ── Rotación ────────────────────────────────
        var rotationVal = MakeRowLabel(panel.transform,
            "↻  ROTACIÓN X", "45°",
            new Color(0.35f, 0.8f, 1f), new Color(0.55f, 0.9f, 1f));

        rotationSlider = MakeSlider(panel.transform,
            -180f, 180f, 45f, new Color(0.25f, 0.65f, 1f));

        rotationSlider.onValueChanged.AddListener(v =>
            rotationVal.text = $"{v:F0}°");

        MakeDivider(panel.transform, new Color(1f, 1f, 1f, 0.07f));

        // ── Color ───────────────────────────────────
        var colorVal = MakeRowLabel(panel.transform,
            "◐  COLOR", "0.00",
            new Color(1f, 0.45f, 0.45f), new Color(1f, 0.3f, 0.3f));

        colorSlider = MakeSlider(panel.transform,
            0f, 1f, 0f, new Color(0.9f, 0.15f, 0.15f));

        colorSlider.onValueChanged.AddListener(v =>
            colorVal.text = v.ToString("F2"));

        MakeHint(panel.transform, "◀ blanco ──────────────── rojo ▶");
    }

    // ════════════════════════════════════════════════
    //  HELPERS
    // ════════════════════════════════════════════════

    private GameObject MakeRect(string name, Transform parent, Vector2 sizeDelta)
    {
        var go = new GameObject(name);
        go.transform.SetParent(parent, false);
        var rt = go.AddComponent<RectTransform>();
        rt.sizeDelta = sizeDelta;
        return go;
    }

    private void MakeTitle(Transform parent, string text)
    {
        var go = MakeRect("Title", parent, new Vector2(280, 28));
        var rt = go.GetComponent<RectTransform>();
        rt.anchorMin = new Vector2(0, 0.5f);
        rt.anchorMax = new Vector2(1, 0.5f);

        var tmp = go.AddComponent<TextMeshProUGUI>();
        tmp.text = text;
        tmp.fontSize = 15;
        tmp.fontStyle = FontStyles.Bold;
        tmp.color = new Color(1f, 0.82f, 0.28f);
        tmp.alignment = TextAlignmentOptions.Center;
        tmp.enableWordWrapping = false;

        var le = go.AddComponent<LayoutElement>();
        le.preferredHeight = 28;
        le.preferredWidth = 280;
        le.flexibleWidth = 1;
    }

    private TMP_Text MakeRowLabel(Transform parent,
        string labelText, string valText,
        Color labelColor, Color valColor)
    {
        var row = MakeRect("Row_" + labelText.Substring(0, Mathf.Min(8, labelText.Length)),
            parent, new Vector2(280, 24));

        var le = row.AddComponent<LayoutElement>();
        le.preferredHeight = 24;
        le.preferredWidth = 280;
        le.flexibleWidth = 1;

        var hlg = row.AddComponent<HorizontalLayoutGroup>();
        hlg.childAlignment = TextAnchor.MiddleLeft;
        hlg.childControlWidth = true;
        hlg.childControlHeight = true;
        hlg.childForceExpandWidth = false;
        hlg.childForceExpandHeight = true;
        hlg.spacing = 4;

        // Nombre izquierda
        var lblGo = MakeRect("Name", row.transform, new Vector2(200, 24));
        var lblLE = lblGo.AddComponent<LayoutElement>();
        lblLE.flexibleWidth = 1;
        lblLE.preferredHeight = 24;
        var lbl = lblGo.AddComponent<TextMeshProUGUI>();
        lbl.text = labelText;
        lbl.fontSize = 13;
        lbl.fontStyle = FontStyles.Bold;
        lbl.color = labelColor;
        lbl.alignment = TextAlignmentOptions.Left;
        lbl.enableWordWrapping = false;
        lbl.overflowMode = TextOverflowModes.Overflow;

        // Valor derecha
        var valGo = MakeRect("Val", row.transform, new Vector2(60, 24));
        var valLE = valGo.AddComponent<LayoutElement>();
        valLE.preferredWidth = 60;
        valLE.preferredHeight = 24;
        valLE.flexibleWidth = 0;
        var val = valGo.AddComponent<TextMeshProUGUI>();
        val.text = valText;
        val.fontSize = 13;
        val.fontStyle = FontStyles.Bold;
        val.color = valColor;
        val.alignment = TextAlignmentOptions.Right;
        val.enableWordWrapping = false;
        val.overflowMode = TextOverflowModes.Overflow;

        return val;
    }

    private Slider MakeSlider(Transform parent,
        float min, float max, float val, Color fillColor)
    {
        var go = MakeRect("Slider", parent, new Vector2(280, 20));

        var le = go.AddComponent<LayoutElement>();
        le.preferredHeight = 20;
        le.preferredWidth = 280;
        le.flexibleWidth = 1;

        // Track
        var track = MakeRect("Track", go.transform, Vector2.zero);
        var trackRt = track.GetComponent<RectTransform>();
        trackRt.anchorMin = Vector2.zero;
        trackRt.anchorMax = Vector2.one;
        trackRt.offsetMin = new Vector2(0, 6);
        trackRt.offsetMax = new Vector2(0, -6);
        track.AddComponent<Image>().color = new Color(0.2f, 0.2f, 0.25f);

        // Fill area
        var fillArea = MakeRect("Fill Area", go.transform, Vector2.zero);
        var faRt = fillArea.GetComponent<RectTransform>();
        faRt.anchorMin = Vector2.zero;
        faRt.anchorMax = Vector2.one;
        faRt.offsetMin = new Vector2(6, 6);
        faRt.offsetMax = new Vector2(-6, -6);

        var fill = MakeRect("Fill", fillArea.transform, new Vector2(10, 0));
        var fillRt = fill.GetComponent<RectTransform>();
        fillRt.anchorMin = Vector2.zero;
        fillRt.anchorMax = new Vector2(0, 1);
        fill.AddComponent<Image>().color = fillColor;

        // Handle area
        var handleArea = MakeRect("Handle Area", go.transform, Vector2.zero);
        var haRt = handleArea.GetComponent<RectTransform>();
        haRt.anchorMin = Vector2.zero;
        haRt.anchorMax = Vector2.one;
        haRt.offsetMin = new Vector2(8, 0);
        haRt.offsetMax = new Vector2(-8, 0);

        var handle = MakeRect("Handle", handleArea.transform, new Vector2(20, 20));
        var hImg = handle.AddComponent<Image>();
        hImg.color = Color.white;

        var slider = go.AddComponent<Slider>();
        slider.fillRect = fill.GetComponent<RectTransform>();
        slider.handleRect = handle.GetComponent<RectTransform>();
        slider.targetGraphic = hImg;
        slider.direction = Slider.Direction.LeftToRight;
        slider.minValue = min;
        slider.maxValue = max;
        slider.value = val;

        return slider;
    }

    private void MakeDivider(Transform parent, Color color)
    {
        var go = MakeRect("Divider", parent, new Vector2(280, 1));
        go.AddComponent<Image>().color = color;
        var le = go.AddComponent<LayoutElement>();
        le.preferredHeight = 1;
        le.preferredWidth = 280;
        le.flexibleWidth = 1;
    }

    private void MakeHint(Transform parent, string text)
    {
        var go = MakeRect("Hint", parent, new Vector2(280, 16));
        var le = go.AddComponent<LayoutElement>();
        le.preferredHeight = 16;
        le.preferredWidth = 280;
        le.flexibleWidth = 1;

        var tmp = go.AddComponent<TextMeshProUGUI>();
        tmp.text = text;
        tmp.fontSize = 9;
        tmp.fontStyle = FontStyles.Italic;
        tmp.color = new Color(0.45f, 0.45f, 0.5f);
        tmp.alignment = TextAlignmentOptions.Center;
        tmp.enableWordWrapping = false;
        tmp.overflowMode = TextOverflowModes.Overflow;
    }
}