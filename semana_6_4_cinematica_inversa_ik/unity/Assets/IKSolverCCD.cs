using UnityEngine;
using UnityEngine.UI;
using UnityEngine.EventSystems;
using TMPro;

public class IKSolverCCD : MonoBehaviour
{
    [Header("Cadena IK")]
    public Transform[] joints;
    public Transform   endEffector;
    public Transform   target;

    [Header("Parámetros CCD")]
    public int   iterations  = 10;
    public float threshold   = 0.01f;

    [Header("Movimiento del objetivo")]
    public float targetSpeed = 3f;

    // UI
    private TextMeshProUGUI labelStatus;
    private TextMeshProUGUI labelDistance;
    private TextMeshProUGUI labelIterations;
    private TextMeshProUGUI labelMode;
    private Slider          sliderIterations;
    private Slider          sliderSpeed;

    // Estado
    private Quaternion[] initialRotations;
    private float        totalArmLength = 0f;
    private bool         outOfReach     = false;
    private bool         autoMove       = true;

    // Colores
    private readonly Color bg         = new Color(0.06f, 0.07f, 0.10f, 0.95f);
    private readonly Color headerBg   = new Color(0.04f, 0.05f, 0.07f, 1f);
    private readonly Color accent     = new Color(0.29f, 0.85f, 0.60f);
    private readonly Color accentRed  = new Color(0.95f, 0.37f, 0.37f);
    private readonly Color accentBlue = new Color(0.40f, 0.65f, 0.95f);
    private readonly Color accentGold = new Color(0.95f, 0.78f, 0.35f);
    private readonly Color textCol    = new Color(0.85f, 0.88f, 0.95f);
    private readonly Color mutedCol   = new Color(0.35f, 0.38f, 0.50f);
    private readonly Color divCol     = new Color(0.14f, 0.16f, 0.22f);

    // ─────────────────────────────────────────────
    void Start()
    {
        EnsureEventSystem();
        SaveInitialPose();
        ComputeArmLength();
        BuildUI();
    }

    void Update()
    {
        MoveTarget();
        SolveIK();
        CheckReach();
        DrawDebug();
        RefreshLabels();
    }

    // ── 1. SOLVER CCD ─────────────────────────────
    void SolveIK()
    {
        if (target == null || joints == null || joints.Length == 0 || endEffector == null)
            return;

        int maxIter = sliderIterations != null ? (int)sliderIterations.value : iterations;

        for (int iter = 0; iter < maxIter; iter++)
        {
            if (Vector3.Distance(endEffector.position, target.position) < threshold)
                break;

            for (int i = joints.Length - 1; i >= 0; i--)
            {
                Transform joint    = joints[i];
                Vector3   toEnd    = (endEffector.position - joint.position).normalized;
                Vector3   toTarget = (target.position      - joint.position).normalized;
                Vector3   axis     = Vector3.Cross(toEnd, toTarget);
                float     angle    = Vector3.Angle(toEnd, toTarget);

                if (axis.magnitude > 0.001f && angle > 0.01f)
                    joint.rotation = Quaternion.AngleAxis(angle, axis.normalized) * joint.rotation;
            }
        }
    }

    // ── 2. MOVIMIENTO DEL TARGET ──────────────────
    void MoveTarget()
    {
        if (target == null) return;

        float   spd   = targetSpeed * Time.deltaTime;
        Vector3 input = Vector3.zero;

        if (Input.GetKey(KeyCode.W)) input += Vector3.forward;
        if (Input.GetKey(KeyCode.S)) input += Vector3.back;
        if (Input.GetKey(KeyCode.A)) input += Vector3.left;
        if (Input.GetKey(KeyCode.D)) input += Vector3.right;
        if (Input.GetKey(KeyCode.Q)) input += Vector3.up;
        if (Input.GetKey(KeyCode.E)) input += Vector3.down;

        if (input != Vector3.zero)
        {
            target.position += input * spd;
        }
        else if (autoMove)
        {
            target.position = new Vector3(
                Mathf.Sin(Time.time * 0.8f) * 1.5f,
                1.0f + Mathf.Cos(Time.time * 0.5f) * 0.4f,
                Mathf.Cos(Time.time * 0.6f) * 0.8f
            );
        }
    }

    // ── 3. DEBUG VISUAL ───────────────────────────
    void DrawDebug()
    {
        if (endEffector == null || target == null) return;

        Color lineColor = outOfReach ? accentRed : accent;
        Debug.DrawLine(endEffector.position, target.position, lineColor);

        for (int i = 0; i < joints.Length - 1; i++)
            Debug.DrawLine(joints[i].position, joints[i + 1].position, accentBlue);

        if (joints.Length > 0)
            Debug.DrawLine(joints[joints.Length - 1].position, endEffector.position, accentBlue);

        Vector3 p = endEffector.position;
        float   s = 0.08f;
        Debug.DrawLine(p - Vector3.up      * s, p + Vector3.up      * s, Color.red);
        Debug.DrawLine(p - Vector3.right   * s, p + Vector3.right   * s, Color.green);
        Debug.DrawLine(p - Vector3.forward * s, p + Vector3.forward * s, Color.blue);
    }

    // ── 4. VERIFICAR ALCANCE ──────────────────────
    void CheckReach()
    {
        if (joints == null || joints.Length == 0 || target == null) return;
        outOfReach = Vector3.Distance(joints[0].position, target.position) > totalArmLength;
    }

    // ── 5. RESET ──────────────────────────────────
    public void ResetPose()
    {
        if (initialRotations == null) return;
        for (int i = 0; i < joints.Length; i++)
            if (i < initialRotations.Length)
                joints[i].rotation = initialRotations[i];
    }

    // ── Helpers ───────────────────────────────────
    void SaveInitialPose()
    {
        if (joints == null) return;
        initialRotations = new Quaternion[joints.Length];
        for (int i = 0; i < joints.Length; i++)
            initialRotations[i] = joints[i].rotation;
    }

    void ComputeArmLength()
    {
        totalArmLength = 0f;
        if (joints == null) return;
        for (int i = 0; i < joints.Length - 1; i++)
            totalArmLength += Vector3.Distance(joints[i].position, joints[i + 1].position);
        if (joints.Length > 0 && endEffector != null)
            totalArmLength += Vector3.Distance(joints[joints.Length - 1].position, endEffector.position);
    }

    void EnsureEventSystem()
    {
        if (FindObjectOfType<EventSystem>() == null)
        {
            GameObject es = new GameObject("EventSystem");
            es.AddComponent<EventSystem>();
            es.AddComponent<StandaloneInputModule>();
        }
    }

    // ── Refresh labels ────────────────────────────
    void RefreshLabels()
    {
        if (labelStatus != null)
        {
            if (outOfReach)
            {
                labelStatus.text  = "OBJETIVO FUERA DE ALCANCE";
                labelStatus.color = accentRed;
            }
            else
            {
                float dist      = (endEffector != null && target != null)
                    ? Vector3.Distance(endEffector.position, target.position) : 0f;
                bool  converged = dist < threshold;
                labelStatus.text  = converged ? "CONVERGIDO" : "RESOLVIENDO...";
                labelStatus.color = converged ? accent : accentBlue;
            }
        }

        if (labelDistance != null && endEffector != null && target != null)
            labelDistance.text = $"Distancia: {Vector3.Distance(endEffector.position, target.position):F3} m";

        if (labelMode != null)
            labelMode.text = autoMove ? "● AUTO" : "○ MANUAL";
    }

    // ═════════════════════════════════════════════
    //  UI BUILDER
    // ═════════════════════════════════════════════
    void BuildUI()
    {
        // ── Canvas ───────────────────────────────
        GameObject canvasGO = new GameObject("IKCanvas");
        Canvas canvas = canvasGO.AddComponent<Canvas>();
        canvas.renderMode   = RenderMode.ScreenSpaceOverlay;
        canvas.sortingOrder = 10;

        // ✅ ConstantPixelSize: el panel siempre se ve
        //    del mismo tamaño sin importar la resolución
        CanvasScaler cs  = canvasGO.AddComponent<CanvasScaler>();
        cs.uiScaleMode   = CanvasScaler.ScaleMode.ConstantPixelSize;
        cs.scaleFactor   = 1f;

        canvasGO.AddComponent<GraphicRaycaster>();

        // ── Panel ────────────────────────────────
        GameObject panel = MakeImage("Panel", canvasGO.transform, bg);
        RectTransform pRt = panel.GetComponent<RectTransform>();
        pRt.anchorMin        = pRt.anchorMax = new Vector2(0, 1);
        pRt.pivot            = new Vector2(0, 1);
        pRt.anchoredPosition = new Vector2(15, -15);
        pRt.sizeDelta        = new Vector2(320, 390);

        // ── Header ───────────────────────────────
        GameObject header = MakeImage("Header", panel.transform, headerBg);
        RectTransform hRt = header.GetComponent<RectTransform>();
        hRt.anchorMin        = new Vector2(0, 1);
        hRt.anchorMax        = new Vector2(1, 1);
        hRt.pivot            = new Vector2(0.5f, 1);
        hRt.anchoredPosition = Vector2.zero;
        hRt.sizeDelta        = new Vector2(0, 44);

        // Dot decorativo
        GameObject dot = MakeImage("Dot", header.transform, accent);
        RectTransform dRt = dot.GetComponent<RectTransform>();
        dRt.anchorMin        = dRt.anchorMax = new Vector2(0, 0.5f);
        dRt.pivot            = new Vector2(0, 0.5f);
        dRt.anchoredPosition = new Vector2(12, 0);
        dRt.sizeDelta        = new Vector2(10, 10);

        // Título
        MakeTMP("IK SOLVER — CCD", header.transform, textCol, 12, FontStyles.Bold,
            new Vector2(32, 0), new Vector2(-42, 28),
            new Vector2(0, 0.5f), new Vector2(1, 0.5f), new Vector2(0, 0.5f));

        // Divider
        GameObject div = MakeImage("Div", panel.transform, divCol);
        RectTransform divRt = div.GetComponent<RectTransform>();
        divRt.anchorMin        = new Vector2(0, 1);
        divRt.anchorMax        = new Vector2(1, 1);
        divRt.pivot            = new Vector2(0.5f, 1);
        divRt.anchoredPosition = new Vector2(0, -44);
        divRt.sizeDelta        = new Vector2(0, 1);

        // Subtítulo
        MakeTMP("W A S D Q E = mover objetivo manualmente", panel.transform,
            mutedCol, 9, FontStyles.Normal,
            new Vector2(12, -54), new Vector2(-24, 18),
            new Vector2(0, 1), new Vector2(1, 1), new Vector2(0, 1));

        // ── Estado ───────────────────────────────
        labelStatus = MakeTMP("Estado: calculando...", panel.transform, accent, 11, FontStyles.Bold,
            new Vector2(12, -80), new Vector2(-24, 20),
            new Vector2(0, 1), new Vector2(1, 1), new Vector2(0, 1));

        labelDistance = MakeTMP("Distancia: 0.000 m", panel.transform, textCol, 10, FontStyles.Normal,
            new Vector2(12, -104), new Vector2(-24, 18),
            new Vector2(0, 1), new Vector2(1, 1), new Vector2(0, 1));

        // ── Slider Iteraciones ───────────────────
        MakeTMP("Iteraciones por frame", panel.transform, textCol, 10, FontStyles.Normal,
            new Vector2(12, -132), new Vector2(-24, 18),
            new Vector2(0, 1), new Vector2(1, 1), new Vector2(0, 1));

        sliderIterations = MakeSlider("SliderIter", panel.transform, accent,
            new Vector2(12, -154), new Vector2(-24, 22), 1, 30, iterations);

        labelIterations = MakeTMP($"Iteraciones: {iterations}", panel.transform, mutedCol, 9, FontStyles.Normal,
            new Vector2(12, -180), new Vector2(-24, 16),
            new Vector2(0, 1), new Vector2(1, 1), new Vector2(0, 1));

        sliderIterations.onValueChanged.AddListener(v =>
        {
            iterations = (int)v;
            if (labelIterations) labelIterations.text = $"Iteraciones: {(int)v}";
        });

        // ── Slider Velocidad ─────────────────────
        MakeTMP("Velocidad del objetivo (modo AUTO)", panel.transform, textCol, 10, FontStyles.Normal,
            new Vector2(12, -204), new Vector2(-24, 18),
            new Vector2(0, 1), new Vector2(1, 1), new Vector2(0, 1));

        sliderSpeed = MakeSlider("SliderSpeed", panel.transform, accentBlue,
            new Vector2(12, -226), new Vector2(-24, 22), 0.5f, 10f, targetSpeed);

        sliderSpeed.onValueChanged.AddListener(v => targetSpeed = v);

        // ── Botón AUTO / MANUAL ──────────────────
        GameObject btnMode = MakeImage("BtnMode", panel.transform, accentGold);
        RectTransform bmRt = btnMode.GetComponent<RectTransform>();
        bmRt.anchorMin        = new Vector2(0, 1);
        bmRt.anchorMax        = new Vector2(1, 1);
        bmRt.pivot            = new Vector2(0.5f, 1);
        bmRt.anchoredPosition = new Vector2(0, -262);
        bmRt.sizeDelta        = new Vector2(-24, 32);

        labelMode = MakeTMP("● AUTO", btnMode.transform, headerBg, 11, FontStyles.Bold,
            Vector2.zero, Vector2.zero,
            Vector2.zero, Vector2.one, new Vector2(0.5f, 0.5f));
        labelMode.alignment = TextAlignmentOptions.Center;

        Button btnModeComp        = btnMode.AddComponent<Button>();
        ColorBlock cmCb           = btnModeComp.colors;
        cmCb.normalColor          = accentGold;
        cmCb.highlightedColor     = Color.Lerp(accentGold, Color.white, 0.25f);
        cmCb.pressedColor         = Color.Lerp(accentGold, Color.black, 0.2f);
        cmCb.fadeDuration         = 0.07f;
        btnModeComp.colors        = cmCb;
        btnModeComp.targetGraphic = btnMode.GetComponent<Image>();
        btnModeComp.onClick.AddListener(() => autoMove = !autoMove);

        // ── Botones Reset ────────────────────────
        MakeButton("Reset Pose", panel.transform,
            new Vector2(12, -308), new Vector2(138, 32), accent,
            () => ResetPose());

        MakeButton("Reset Target", panel.transform,
            new Vector2(158, -308), new Vector2(138, 32), accentBlue,
            () => { if (target != null) target.position = new Vector3(1.5f, 1.5f, 0f); });

        // ── Leyenda ──────────────────────────────
        MakeTMP("W/S adelante·atrás  |  A/D izquierda·derecha  |  Q/E arriba·abajo",
            panel.transform, mutedCol, 8, FontStyles.Normal,
            new Vector2(12, -354), new Vector2(-24, 32),
            new Vector2(0, 1), new Vector2(1, 1), new Vector2(0, 1));
    }

    // ═════════════════════════════════════════════
    //  FACTORIES
    // ═════════════════════════════════════════════
    GameObject MakeImage(string name, Transform parent, Color color)
    {
        GameObject go = new GameObject(name);
        go.transform.SetParent(parent, false);
        go.AddComponent<Image>().color = color;
        return go;
    }

    TextMeshProUGUI MakeTMP(string text, Transform parent, Color color,
        float fontSize, FontStyles style,
        Vector2 pos, Vector2 size,
        Vector2 anchorMin, Vector2 anchorMax, Vector2 pivot)
    {
        GameObject go = new GameObject("TMP_" + text.Substring(0, Mathf.Min(10, text.Length)));
        go.transform.SetParent(parent, false);
        var tmp = go.AddComponent<TextMeshProUGUI>();
        tmp.text               = text;
        tmp.fontSize           = fontSize;
        tmp.fontStyle          = style;
        tmp.color              = color;
        tmp.alignment          = TextAlignmentOptions.Left;
        tmp.enableWordWrapping = true;
        RectTransform rt = go.GetComponent<RectTransform>();
        rt.anchorMin        = anchorMin;
        rt.anchorMax        = anchorMax;
        rt.pivot            = pivot;
        rt.anchoredPosition = pos;
        rt.sizeDelta        = size;
        return tmp;
    }

    Slider MakeSlider(string name, Transform parent, Color col,
        Vector2 pos, Vector2 size, float min, float max, float val)
    {
        GameObject root = new GameObject(name);
        root.transform.SetParent(parent, false);
        RectTransform rootRt = root.AddComponent<RectTransform>();
        rootRt.anchorMin        = new Vector2(0, 1);
        rootRt.anchorMax        = new Vector2(1, 1);
        rootRt.pivot            = new Vector2(0, 1);
        rootRt.anchoredPosition = pos;
        rootRt.sizeDelta        = size;

        // Track
        GameObject bg = new GameObject("BG");
        bg.transform.SetParent(root.transform, false);
        bg.AddComponent<Image>().color = new Color(0.14f, 0.16f, 0.22f);
        RectTransform bgRt = bg.GetComponent<RectTransform>();
        bgRt.anchorMin        = new Vector2(0, 0.25f);
        bgRt.anchorMax        = new Vector2(1, 0.75f);
        bgRt.sizeDelta        = Vector2.zero;
        bgRt.anchoredPosition = Vector2.zero;

        // Fill area
        GameObject fa = new GameObject("FillArea");
        fa.transform.SetParent(root.transform, false);
        RectTransform faRt = fa.AddComponent<RectTransform>();
        faRt.anchorMin        = new Vector2(0, 0.25f);
        faRt.anchorMax        = new Vector2(1, 0.75f);
        faRt.sizeDelta        = new Vector2(-20, 0);
        faRt.anchoredPosition = new Vector2(-5, 0);

        GameObject fill = new GameObject("Fill");
        fill.transform.SetParent(fa.transform, false);
        Image fillImg = fill.AddComponent<Image>();
        fillImg.color = new Color(col.r, col.g, col.b, 0.6f);
        RectTransform fillRt = fill.GetComponent<RectTransform>();
        fillRt.anchorMin        = Vector2.zero;
        fillRt.anchorMax        = new Vector2(0.5f, 1f);
        fillRt.sizeDelta        = new Vector2(10, 0);
        fillRt.anchoredPosition = Vector2.zero;

        // Handle area
        GameObject ha = new GameObject("HandleArea");
        ha.transform.SetParent(root.transform, false);
        RectTransform haRt = ha.AddComponent<RectTransform>();
        haRt.anchorMin        = Vector2.zero;
        haRt.anchorMax        = Vector2.one;
        haRt.sizeDelta        = new Vector2(-20, 0);
        haRt.anchoredPosition = Vector2.zero;

        GameObject handle = new GameObject("Handle");
        handle.transform.SetParent(ha.transform, false);
        Image handleImg = handle.AddComponent<Image>();
        handleImg.color = col;
        RectTransform handleRt = handle.GetComponent<RectTransform>();
        handleRt.sizeDelta        = new Vector2(22, 22);
        handleRt.anchorMin        = handleRt.anchorMax = new Vector2(0.5f, 0.5f);
        handleRt.anchoredPosition = Vector2.zero;

        Slider slider        = root.AddComponent<Slider>();
        slider.fillRect      = fillRt;
        slider.handleRect    = handleRt;
        slider.targetGraphic = handleImg;
        slider.direction     = Slider.Direction.LeftToRight;
        slider.minValue      = min;
        slider.maxValue      = max;
        slider.value         = val;
        slider.interactable  = true;

        ColorBlock cb       = ColorBlock.defaultColorBlock;
        cb.normalColor      = col;
        cb.highlightedColor = Color.Lerp(col, Color.white, 0.25f);
        cb.pressedColor     = Color.Lerp(col, Color.white, 0.5f);
        cb.fadeDuration     = 0.05f;
        slider.colors       = cb;

        return slider;
    }

    void MakeButton(string label, Transform parent,
        Vector2 pos, Vector2 size, Color col,
        UnityEngine.Events.UnityAction onClick)
    {
        GameObject go = new GameObject("Btn_" + label);
        go.transform.SetParent(parent, false);
        Image img = go.AddComponent<Image>();
        img.color = new Color(col.r, col.g, col.b, 0.20f);

        RectTransform rt = go.GetComponent<RectTransform>();
        rt.anchorMin        = new Vector2(0, 1);
        rt.anchorMax        = new Vector2(0, 1);
        rt.pivot            = new Vector2(0, 1);
        rt.anchoredPosition = pos;
        rt.sizeDelta        = size;

        Button btn = go.AddComponent<Button>();
        ColorBlock cb       = btn.colors;
        cb.normalColor      = new Color(col.r, col.g, col.b, 0.20f);
        cb.highlightedColor = new Color(col.r, col.g, col.b, 0.45f);
        cb.pressedColor     = new Color(col.r, col.g, col.b, 0.70f);
        cb.fadeDuration     = 0.07f;
        btn.colors          = cb;
        btn.targetGraphic   = img;
        btn.onClick.AddListener(onClick);

        GameObject txtGO = new GameObject("Text");
        txtGO.transform.SetParent(go.transform, false);
        var tmp = txtGO.AddComponent<TextMeshProUGUI>();
        tmp.text      = label;
        tmp.fontSize  = 11;
        tmp.fontStyle = FontStyles.Bold;
        tmp.color     = col;
        tmp.alignment = TextAlignmentOptions.Center;
        RectTransform tRt = txtGO.GetComponent<RectTransform>();
        tRt.anchorMin        = Vector2.zero;
        tRt.anchorMax        = Vector2.one;
        tRt.sizeDelta        = Vector2.zero;
        tRt.anchoredPosition = Vector2.zero;
    }
}