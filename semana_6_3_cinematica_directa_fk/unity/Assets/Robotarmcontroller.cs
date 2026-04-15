using UnityEngine;
using UnityEngine.UI;
using UnityEngine.EventSystems;   // ← needed for EventSystem
using TMPro;

public class RobotArmController : MonoBehaviour
{
    [Header("Joints")]
    public Transform baseJoint;
    public Transform joint1;
    public Transform joint2;
    public Transform endEffector;

    [Header("Animation")]
    public float speed = 2f;
    public bool autoAnimate = true;

    // Current angles — single source of truth
    private float currentBase  = 0f;
    private float currentJ1    = 0f;
    private float currentJ2    = 0f;

    // Private UI references
    private Slider             baseSlider;
    private Slider             joint1Slider;
    private Slider             joint2Slider;
    private TextMeshProUGUI    baseLabel;
    private TextMeshProUGUI    joint1Label;
    private TextMeshProUGUI    joint2Label;
    private TextMeshProUGUI    modeLabel;
    private Toggle             animToggle;

    // Trail
    private Vector3[] trail    = new Vector3[100];
    private int       trailIdx = 0;
    private bool      trailFull = false;

    // Colors
    private readonly Color panelBg    = new Color(0.075f, 0.086f, 0.118f, 0.95f);
    private readonly Color headerBg   = new Color(0.051f, 0.059f, 0.078f, 0.92f);
    private readonly Color accentGold = new Color(0.784f, 0.663f, 0.431f);
    private readonly Color accentCyan = new Color(0.431f, 0.710f, 0.784f);
    private readonly Color accentRed  = new Color(0.784f, 0.341f, 0.341f);
    private readonly Color textColor  = new Color(0.831f, 0.847f, 0.910f);
    private readonly Color mutedColor = new Color(0.353f, 0.376f, 0.502f);
    private readonly Color dividerCol = new Color(0.145f, 0.165f, 0.220f);

    // ─────────────────────────────────────────────────────────────────────────
    void Start()
    {
        EnsureEventSystem();   // ← makes mouse/touch input work on UI
        BuildUI();
    }

    // ─────────────────────────────────────────────────────────────────────────
    void Update()
    {
        if (autoAnimate)
        {
            float t = Time.time * speed;
            currentBase = Mathf.Sin(t)        * 45f;
            currentJ1   = Mathf.Sin(t + 1.0f) * 45f;
            currentJ2   = Mathf.Sin(t + 2.0f) * 30f;

            // Update sliders visually without firing onValueChanged
            baseSlider.SetValueWithoutNotify(currentBase);
            joint1Slider.SetValueWithoutNotify(currentJ1);
            joint2Slider.SetValueWithoutNotify(currentJ2);

            ApplyAngles();
        }

        RefreshLabels();
        RecordTrail();
        DrawTrail();
        DrawMarker();
    }

    // ── Apply current angles to joints ───────────────────────────────────────
    void ApplyAngles()
    {
        if (baseJoint) baseJoint.localRotation = Quaternion.Euler(0f,        currentBase, 0f);
        if (joint1)    joint1.localRotation    = Quaternion.Euler(currentJ1, 0f,          0f);
        if (joint2)    joint2.localRotation    = Quaternion.Euler(currentJ2, 0f,          0f);
    }

    // ── EventSystem guard ─────────────────────────────────────────────────────
    // Without an EventSystem in the scene, NO slider/button/toggle responds
    // to mouse or touch. This creates one automatically if absent.
    void EnsureEventSystem()
    {
        if (FindObjectOfType<EventSystem>() == null)
        {
            GameObject es = new GameObject("EventSystem");
            es.AddComponent<EventSystem>();
            es.AddComponent<StandaloneInputModule>();
        }
    }

    // ── Trail ─────────────────────────────────────────────────────────────────
    void RecordTrail()
    {
        if (endEffector == null) return;
        trail[trailIdx] = endEffector.position;
        trailIdx = (trailIdx + 1) % trail.Length;
        if (trailIdx == 0) trailFull = true;
    }

    void DrawTrail()
    {
        int count = trailFull ? trail.Length : trailIdx;
        for (int i = 1; i < count; i++)
        {
            int   a     = (trailIdx - i     + trail.Length) % trail.Length;
            int   b     = (trailIdx - i - 1 + trail.Length) % trail.Length;
            float alpha = 1f - (float)i / count;
            Debug.DrawLine(trail[a], trail[b], new Color(0f, 1f, 1f, alpha));
        }
    }

    void DrawMarker()
    {
        if (endEffector == null) return;
        Vector3 p = endEffector.position;
        float   s = 0.1f;
        Debug.DrawLine(p - Vector3.up      * s, p + Vector3.up      * s, Color.red);
        Debug.DrawLine(p - Vector3.right   * s, p + Vector3.right   * s, Color.green);
        Debug.DrawLine(p - Vector3.forward * s, p + Vector3.forward * s, Color.blue);
    }

    // ── UI Builder ────────────────────────────────────────────────────────────
    void BuildUI()
    {
        // Canvas
        GameObject canvasGO = new GameObject("RobotArmCanvas");
        Canvas canvas = canvasGO.AddComponent<Canvas>();
        canvas.renderMode   = RenderMode.ScreenSpaceOverlay;
        canvas.sortingOrder = 10;
        CanvasScaler scaler = canvasGO.AddComponent<CanvasScaler>();
        scaler.uiScaleMode         = CanvasScaler.ScaleMode.ScaleWithScreenSize;
        scaler.referenceResolution = new Vector2(1920, 1080);
        canvasGO.AddComponent<GraphicRaycaster>();

        // Panel
      
        GameObject panel = CreateImage("Panel", canvasGO.transform, panelBg);
        RectTransform pRt = panel.GetComponent<RectTransform>();
        pRt.anchorMin        = new Vector2(0, 1);   // top-left
        pRt.anchorMax        = new Vector2(0, 1);
        pRt.pivot            = new Vector2(0, 1);
        pRt.anchoredPosition = new Vector2(15, -15); // offset down-right from top-left
        pRt.sizeDelta        = new Vector2(300, 265);
        // Header
        GameObject header = CreateImage("Header", panel.transform, headerBg);
        RectTransform hRt = header.GetComponent<RectTransform>();
        hRt.anchorMin = new Vector2(0, 1); hRt.anchorMax = new Vector2(1, 1);
        hRt.pivot     = new Vector2(0.5f, 1);
        hRt.anchoredPosition = Vector2.zero;
        hRt.sizeDelta        = new Vector2(0, 40);

        // Accent dot
        GameObject dot = CreateImage("Dot", header.transform, accentGold);
        RectTransform dotRt = dot.GetComponent<RectTransform>();
        dotRt.anchorMin = dotRt.anchorMax = new Vector2(0, 0.5f);
        dotRt.pivot     = new Vector2(0, 0.5f);
        dotRt.anchoredPosition = new Vector2(12, 0);
        dotRt.sizeDelta        = new Vector2(10, 10);

        // Title
        CreateLabel("ROBOT ARM CONTROLLER", header.transform, textColor, 11, FontStyles.Bold,
            new Vector2(30, 0), new Vector2(-40, 24),
            new Vector2(0, 0.5f), new Vector2(1, 0.5f), new Vector2(0, 0.5f));

        // Divider
        GameObject div = CreateImage("Divider", panel.transform, dividerCol);
        RectTransform divRt = div.GetComponent<RectTransform>();
        divRt.anchorMin = new Vector2(0, 1); divRt.anchorMax = new Vector2(1, 1);
        divRt.pivot     = new Vector2(0.5f, 1);
        divRt.anchoredPosition = new Vector2(0, -40);
        divRt.sizeDelta        = new Vector2(0, 1);

        // Subtitle
        CreateLabel("Kinematic Chain  •  Sine Animation", panel.transform, mutedColor, 9, FontStyles.Normal,
            new Vector2(12, -46), new Vector2(-24, 18),
            new Vector2(0, 1), new Vector2(1, 1), new Vector2(0, 1));

        // ── Base slider ───────────────────────────────────────────────────────
        baseLabel  = CreateLabel("Base Y  0.0°", panel.transform, textColor, 10, FontStyles.Normal,
            new Vector2(12, -72), new Vector2(-24, 18),
            new Vector2(0, 1), new Vector2(1, 1), new Vector2(0, 1));
        baseSlider = CreateSlider("BaseSlider", panel.transform, accentGold,
            new Vector2(12, -94), new Vector2(-24, 20));
        baseSlider.onValueChanged.AddListener(v =>
        {
            if (!autoAnimate)
            {
                currentBase = v;
                ApplyAngles();
            }
        });

        // ── Joint 1 slider ────────────────────────────────────────────────────
        joint1Label  = CreateLabel("Joint 1 X  0.0°", panel.transform, textColor, 10, FontStyles.Normal,
            new Vector2(12, -124), new Vector2(-24, 18),
            new Vector2(0, 1), new Vector2(1, 1), new Vector2(0, 1));
        joint1Slider = CreateSlider("Joint1Slider", panel.transform, accentCyan,
            new Vector2(12, -146), new Vector2(-24, 20));
        joint1Slider.onValueChanged.AddListener(v =>
        {
            if (!autoAnimate)
            {
                currentJ1 = v;
                ApplyAngles();
            }
        });

        // ── Joint 2 slider ────────────────────────────────────────────────────
        joint2Label  = CreateLabel("Joint 2 X  0.0°", panel.transform, textColor, 10, FontStyles.Normal,
            new Vector2(12, -176), new Vector2(-24, 18),
            new Vector2(0, 1), new Vector2(1, 1), new Vector2(0, 1));
        joint2Slider = CreateSlider("Joint2Slider", panel.transform, accentRed,
            new Vector2(12, -198), new Vector2(-24, 20));
        joint2Slider.onValueChanged.AddListener(v =>
        {
            if (!autoAnimate)
            {
                currentJ2 = v;
                ApplyAngles();
            }
        });

        // ── Toggle ────────────────────────────────────────────────────────────
        animToggle = CreateToggle("Auto Animate", panel.transform,
            new Vector2(12, -234), new Vector2(160, 24));
        animToggle.isOn = true;
        animToggle.onValueChanged.AddListener(v =>
        {
            autoAnimate = v;
            // Sync current angles from sliders when switching to manual
            if (!autoAnimate)
            {
                currentBase = baseSlider.value;
                currentJ1   = joint1Slider.value;
                currentJ2   = joint2Slider.value;
            }
        });

        modeLabel = CreateLabel("AUTO ANIMATE  ●", panel.transform, accentGold, 9, FontStyles.Bold,
            new Vector2(40, -234), new Vector2(-52, 24),
            new Vector2(0, 1), new Vector2(1, 1), new Vector2(0, 1));
    }

    // ── Label refresh ─────────────────────────────────────────────────────────
    void RefreshLabels()
    {
        if (baseLabel   && baseSlider)   baseLabel.text   = $"Base Y  {baseSlider.value:F1}°";
        if (joint1Label && joint1Slider) joint1Label.text = $"Joint 1 X  {joint1Slider.value:F1}°";
        if (joint2Label && joint2Slider) joint2Label.text = $"Joint 2 X  {joint2Slider.value:F1}°";
        if (modeLabel)                   modeLabel.text   = autoAnimate ? "AUTO ANIMATE  ●" : "MANUAL MODE  ○";
    }

    // ── Factory helpers ───────────────────────────────────────────────────────
    GameObject CreateImage(string name, Transform parent, Color color)
    {
        GameObject go = new GameObject(name);
        go.transform.SetParent(parent, false);
        go.AddComponent<Image>().color = color;
        return go;
    }

    TextMeshProUGUI CreateLabel(string text, Transform parent, Color color,
        float fontSize, FontStyles style,
        Vector2 anchoredPos, Vector2 sizeDelta,
        Vector2 anchorMin, Vector2 anchorMax, Vector2 pivot)
    {
        GameObject go = new GameObject("Label_" + text.Substring(0, Mathf.Min(8, text.Length)));
        go.transform.SetParent(parent, false);
        var tmp = go.AddComponent<TextMeshProUGUI>();
        tmp.text      = text;
        tmp.fontSize  = fontSize;
        tmp.fontStyle = style;
        tmp.color     = color;
        tmp.alignment = TextAlignmentOptions.Left;
        RectTransform rt = go.GetComponent<RectTransform>();
        rt.anchorMin        = anchorMin;
        rt.anchorMax        = anchorMax;
        rt.pivot            = pivot;
        rt.anchoredPosition = anchoredPos;
        rt.sizeDelta        = sizeDelta;
        return tmp;
    }

    Slider CreateSlider(string name, Transform parent, Color accent,
        Vector2 anchoredPos, Vector2 sizeDelta)
    {
        // Root
        GameObject root = new GameObject(name);
        root.transform.SetParent(parent, false);
        RectTransform rootRt = root.AddComponent<RectTransform>();
        rootRt.anchorMin        = new Vector2(0, 1);
        rootRt.anchorMax        = new Vector2(1, 1);
        rootRt.pivot            = new Vector2(0, 1);
        rootRt.anchoredPosition = anchoredPos;
        rootRt.sizeDelta        = sizeDelta;

        // Background track
        GameObject bg = new GameObject("Background");
        bg.transform.SetParent(root.transform, false);
        Image bgImg = bg.AddComponent<Image>();
        bgImg.color = new Color(0.15f, 0.17f, 0.23f);
        RectTransform bgRt = bg.GetComponent<RectTransform>();
        bgRt.anchorMin        = new Vector2(0f, 0.25f);
        bgRt.anchorMax        = new Vector2(1f, 0.75f);
        bgRt.sizeDelta        = Vector2.zero;
        bgRt.anchoredPosition = Vector2.zero;

        // Fill area
        GameObject fillArea = new GameObject("Fill Area");
        fillArea.transform.SetParent(root.transform, false);
        RectTransform faRt = fillArea.AddComponent<RectTransform>();
        faRt.anchorMin        = new Vector2(0f,  0.25f);
        faRt.anchorMax        = new Vector2(1f,  0.75f);
        faRt.sizeDelta        = new Vector2(-20, 0);
        faRt.anchoredPosition = new Vector2(-5,  0);

        // Fill
        GameObject fill = new GameObject("Fill");
        fill.transform.SetParent(fillArea.transform, false);
        Image fillImg = fill.AddComponent<Image>();
        fillImg.color = new Color(accent.r, accent.g, accent.b, 0.6f);
        RectTransform fillRt = fill.GetComponent<RectTransform>();
        fillRt.anchorMin        = Vector2.zero;
        fillRt.anchorMax        = new Vector2(0.5f, 1f);
        fillRt.sizeDelta        = new Vector2(10, 0);
        fillRt.anchoredPosition = Vector2.zero;

        // Handle slide area
        GameObject handleArea = new GameObject("Handle Slide Area");
        handleArea.transform.SetParent(root.transform, false);
        RectTransform haRt = handleArea.AddComponent<RectTransform>();
        haRt.anchorMin        = Vector2.zero;
        haRt.anchorMax        = Vector2.one;
        haRt.sizeDelta        = new Vector2(-20, 0);
        haRt.anchoredPosition = Vector2.zero;

        // Handle — anchor (0.5, 0.5) is critical so Unity can move it freely
        GameObject handle = new GameObject("Handle");
        handle.transform.SetParent(handleArea.transform, false);
        Image handleImg = handle.AddComponent<Image>();
        handleImg.color = accent;
        RectTransform handleRt = handle.GetComponent<RectTransform>();
        handleRt.sizeDelta        = new Vector2(20, 20);
        handleRt.anchorMin        = new Vector2(0.5f, 0.5f);
        handleRt.anchorMax        = new Vector2(0.5f, 0.5f);
        handleRt.anchoredPosition = Vector2.zero;

        // Slider component
        Slider slider = root.AddComponent<Slider>();
        slider.fillRect      = fillRt;
        slider.handleRect    = handleRt;
        slider.targetGraphic = handleImg;
        slider.direction     = Slider.Direction.LeftToRight;
        slider.minValue      = -90f;
        slider.maxValue      =  90f;
        slider.value         =   0f;

        ColorBlock cb = slider.colors;
        cb.normalColor      = accent;
        cb.highlightedColor = Color.Lerp(accent, Color.white, 0.25f);
        cb.pressedColor     = Color.Lerp(accent, Color.white, 0.5f);
        cb.selectedColor    = accent;
        cb.fadeDuration     = 0.05f;
        slider.colors = cb;

        return slider;
    }

    Toggle CreateToggle(string name, Transform parent, Vector2 anchoredPos, Vector2 sizeDelta)
    {
        GameObject root = new GameObject(name);
        root.transform.SetParent(parent, false);
        RectTransform rt = root.AddComponent<RectTransform>();
        rt.anchorMin        = new Vector2(0, 1);
        rt.anchorMax        = new Vector2(0, 1);
        rt.pivot            = new Vector2(0, 1);
        rt.anchoredPosition = anchoredPos;
        rt.sizeDelta        = sizeDelta;

        // Box
        GameObject box = new GameObject("Background");
        box.transform.SetParent(root.transform, false);
        Image boxImg = box.AddComponent<Image>();
        boxImg.color = new Color(0.15f, 0.17f, 0.23f);
        RectTransform boxRt = box.GetComponent<RectTransform>();
        boxRt.anchorMin        = boxRt.anchorMax = new Vector2(0, 0.5f);
        boxRt.pivot            = new Vector2(0, 0.5f);
        boxRt.anchoredPosition = Vector2.zero;
        boxRt.sizeDelta        = new Vector2(20, 20);

        // Checkmark
        GameObject check = new GameObject("Checkmark");
        check.transform.SetParent(box.transform, false);
        Image checkImg = check.AddComponent<Image>();
        checkImg.color = accentGold;
        RectTransform checkRt = check.GetComponent<RectTransform>();
        checkRt.anchorMin        = Vector2.zero;
        checkRt.anchorMax        = Vector2.one;
        checkRt.sizeDelta        = new Vector2(-4, -4);
        checkRt.anchoredPosition = Vector2.zero;

        Toggle toggle = root.AddComponent<Toggle>();
        toggle.targetGraphic = boxImg;
        toggle.graphic       = checkImg;
        toggle.isOn          = true;

        return toggle;
    }
}