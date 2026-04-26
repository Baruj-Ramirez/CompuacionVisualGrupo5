using UnityEngine;
using UnityEngine.UI;
using TMPro;

public class MaterialController : MonoBehaviour
{
    [Header("Material")]
    public Material targetMaterial;

    [Header("Sliders")]
    public Slider metallicSlider;
    public Slider smoothnessSlider;

    [Header("Labels")]
    public TextMeshProUGUI metallicTitle;
    public TextMeshProUGUI smoothnessTitle;

    [Header("Positions")]
    public Vector2 metallicTitlePosition    = new Vector2(20, 130);
    public Vector2 smoothnessTitlePosition  = new Vector2(20, 90);
    public Vector2 metallicSliderPosition   = new Vector2(20, 110);
    public Vector2 smoothnessSliderPosition = new Vector2(20, 70);

    // UI references
    private GameObject background;
    private TextMeshProUGUI panelTitle;

    // Colors
    private readonly Color bgDark       = new Color(0.051f, 0.059f, 0.078f, 0.92f);
    private readonly Color panelColor   = new Color(0.075f, 0.086f, 0.118f, 0.95f);
    private readonly Color accentGold   = new Color(0.784f, 0.663f, 0.431f);
    private readonly Color accentCyan   = new Color(0.431f, 0.710f, 0.784f);
    private readonly Color textColor    = new Color(0.831f, 0.847f, 0.910f);
    private readonly Color mutedColor   = new Color(0.353f, 0.376f, 0.502f);

    void Start()
    {
        BuildBackground();

        ResizeSliderHandle(metallicSlider,   new Vector2(28, 28));
        ResizeSliderHandle(smoothnessSlider, new Vector2(28, 28));

        ResizeSliderTrack(metallicSlider,   new Vector2(0, 6));
        ResizeSliderTrack(smoothnessSlider, new Vector2(0, 6));

        ColorSlider(metallicSlider,   accentGold);
        ColorSlider(smoothnessSlider, accentCyan);

        metallicSlider.value   = targetMaterial.GetFloat("_Metallic");
        smoothnessSlider.value = targetMaterial.GetFloat("_Smoothness");

        metallicSlider.onValueChanged.AddListener(UpdateMaterial);
        smoothnessSlider.onValueChanged.AddListener(UpdateMaterial);

        PositionElement(metallicTitle.GetComponent<RectTransform>(),    metallicTitlePosition);
        PositionElement(smoothnessTitle.GetComponent<RectTransform>(),  smoothnessTitlePosition);
        PositionElement(metallicSlider.GetComponent<RectTransform>(),   metallicSliderPosition);
        PositionElement(smoothnessSlider.GetComponent<RectTransform>(), smoothnessSliderPosition);

        RefreshLabels();
    }

    // ── Background panel + title ──────────────────
    void BuildBackground()
    {
        // Find the Canvas
        Canvas canvas = FindObjectOfType<Canvas>();
        if (canvas == null) return;

        // --- Dark background panel ---
        background = new GameObject("MaterialPanel");
        background.transform.SetParent(canvas.transform, false);
        background.transform.SetAsFirstSibling(); // behind sliders

        Image bgImage       = background.AddComponent<Image>();
        bgImage.color       = panelColor;

        RectTransform bgRt  = background.GetComponent<RectTransform>();
        bgRt.anchorMin      = new Vector2(0, 0);
        bgRt.anchorMax      = new Vector2(0, 0);
        bgRt.pivot          = new Vector2(0, 0);
        bgRt.anchoredPosition = new Vector2(10, 10);
        bgRt.sizeDelta      = new Vector2(320, 175);

        // --- Header bar ---
        GameObject header   = new GameObject("Header");
        header.transform.SetParent(background.transform, false);
        Image headerImg     = header.AddComponent<Image>();
        headerImg.color     = bgDark;

        RectTransform hRt   = header.GetComponent<RectTransform>();
        hRt.anchorMin       = new Vector2(0, 1);
        hRt.anchorMax       = new Vector2(1, 1);
        hRt.pivot           = new Vector2(0.5f, 1);
        hRt.anchoredPosition= Vector2.zero;
        hRt.sizeDelta       = new Vector2(0, 40);

        // --- Icon ---
        GameObject iconGO   = new GameObject("Icon");
        iconGO.transform.SetParent(header.transform, false);
        Image iconImg       = iconGO.AddComponent<Image>();
        iconImg.color       = accentGold;

        RectTransform iRt   = iconGO.GetComponent<RectTransform>();
        iRt.anchorMin       = new Vector2(0, 0.5f);
        iRt.anchorMax       = new Vector2(0, 0.5f);
        iRt.pivot           = new Vector2(0, 0.5f);
        iRt.anchoredPosition= new Vector2(12, 0);
        iRt.sizeDelta       = new Vector2(10, 10);

        // --- Panel title ---
        GameObject titleGO  = new GameObject("PanelTitle");
        titleGO.transform.SetParent(header.transform, false);
        panelTitle          = titleGO.AddComponent<TextMeshProUGUI>();
        panelTitle.text     = "MATERIAL CONTROLLER";
        panelTitle.fontSize = 11;
        panelTitle.fontStyle= FontStyles.Bold;
        panelTitle.color    = textColor;
        panelTitle.alignment= TextAlignmentOptions.Left;

        RectTransform tRt   = titleGO.GetComponent<RectTransform>();
        tRt.anchorMin       = new Vector2(0, 0.5f);
        tRt.anchorMax       = new Vector2(1, 0.5f);
        tRt.pivot           = new Vector2(0, 0.5f);
        tRt.anchoredPosition= new Vector2(30, 0);
        tRt.sizeDelta       = new Vector2(-40, 24);

        // --- Divider line ---
        GameObject divider  = new GameObject("Divider");
        divider.transform.SetParent(background.transform, false);
        Image divImg        = divider.AddComponent<Image>();
        divImg.color        = new Color(0.145f, 0.165f, 0.220f);

        RectTransform dRt   = divider.GetComponent<RectTransform>();
        dRt.anchorMin       = new Vector2(0, 1);
        dRt.anchorMax       = new Vector2(1, 1);
        dRt.pivot           = new Vector2(0.5f, 1);
        dRt.anchoredPosition= new Vector2(0, -40);
        dRt.sizeDelta       = new Vector2(0, 1);

        // --- Subtitle ---
        GameObject subGO    = new GameObject("Subtitle");
        subGO.transform.SetParent(background.transform, false);
        TextMeshProUGUI sub = subGO.AddComponent<TextMeshProUGUI>();
        sub.text            = "Standard Surface Shader  •  PBR";
        sub.fontSize        = 9;
        sub.color           = mutedColor;
        sub.alignment       = TextAlignmentOptions.Left;

        RectTransform sRt   = subGO.GetComponent<RectTransform>();
        sRt.anchorMin       = new Vector2(0, 1);
        sRt.anchorMax       = new Vector2(1, 1);
        sRt.pivot           = new Vector2(0, 1);
        bgRt.anchoredPosition = new Vector2(10, 10);
        bgRt.sizeDelta        = new Vector2(320, 175);
    }

    // ── Core update ───────────────────────────────
    void UpdateMaterial(float _)
    {
        targetMaterial.SetFloat("_Metallic",   metallicSlider.value);
        targetMaterial.SetFloat("_Smoothness", smoothnessSlider.value);
        RefreshLabels();
    }

    void RefreshLabels()
    {
        if (metallicTitle != null)
            metallicTitle.text = "Metallic  " + metallicSlider.value.ToString("F2");

        if (smoothnessTitle != null)
            smoothnessTitle.text = "Smoothness  " + smoothnessSlider.value.ToString("F2");
    }

    void PositionElement(RectTransform rt, Vector2 position)
    {
        if (rt == null) return;
        rt.anchoredPosition = position;
    }

    void ResizeSliderHandle(Slider slider, Vector2 size)
    {
        if (slider == null) return;
        Transform handle = slider.transform.Find("Handle Slide Area/Handle");
        if (handle != null)
            handle.GetComponent<RectTransform>().sizeDelta = size;
    }

    void ResizeSliderTrack(Slider slider, Vector2 sizeDelta)
    {
        if (slider == null) return;
        Transform bg = slider.transform.Find("Background");
        if (bg != null)
            bg.GetComponent<RectTransform>().sizeDelta = sizeDelta;
    }

    void ColorSlider(Slider slider, Color color)
    {
        if (slider == null) return;

        slider.interactable = true;

        Transform fill = slider.transform.Find("Fill Area/Fill");
        if (fill != null)
            fill.GetComponent<Image>().color = color;

        Transform handle = slider.transform.Find("Handle Slide Area/Handle");
        if (handle != null)
        {
            Image handleImg = handle.GetComponent<Image>();
            handleImg.color = color;

            ColorBlock cb       = slider.colors;
            cb.normalColor      = color;
            cb.highlightedColor = Color.Lerp(color, Color.white, 0.3f);
            cb.pressedColor     = Color.Lerp(color, Color.white, 0.5f);
            cb.selectedColor    = color;
            cb.disabledColor    = new Color(color.r, color.g, color.b, 0.5f);
            slider.colors       = cb;
        }
    }
}