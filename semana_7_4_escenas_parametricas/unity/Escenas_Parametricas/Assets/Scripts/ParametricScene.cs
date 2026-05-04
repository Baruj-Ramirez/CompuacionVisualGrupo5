using UnityEngine;
using System.Collections;
using System.Collections.Generic;

public enum ColorMode { ByCategory, ByType, ByValue }

public class ParametricScene : MonoBehaviour
{
    // ─── REFERENCIAS ─────────────────────────────────────────────────────────
    [Header("Dataset")]
    public ObjectData dataset;                        // ScriptableObject
    public bool       loadFromJson = false;           // Alternar fuente

    [Header("Contenedor")]
    public Transform  generatedContainer;             // [GeneratedObjects]

    [Header("Modo de color")]
    public ColorMode  colorMode = ColorMode.ByCategory;

    [Header("Parámetros en tiempo real")]
    [Range(0.1f, 5f)]  public float  globalScale    = 1f;
    [Range(0f, 5f)]    public float  rotationSpeed  = 1f;
    [Range(0f, 1f)]    public float  minValue       = 0f;
    [Range(0f, 1f)]    public float  maxValue       = 1f;
    public             ObjectCategory filterCategory = ObjectCategory.A;
    public             bool           filterEnabled  = false;

    // ─── ESTADO INTERNO ───────────────────────────────────────────────────────
    private List<GameObject>   _spawnedObjects = new List<GameObject>();
    private List<ObjectPoint>  _activePoints   = new List<ObjectPoint>();
    private ObjectPoint[]      _currentDataset;

    // ─── INICIALIZACIÓN ────────────────────────────────────────────────────────
    void Start()
    {
        LoadDataset();
        GenerateScene();
    }

    // ─── CARGAR DATASET ────────────────────────────────────────────────────────
    public void LoadDataset()
    {
        if (loadFromJson)
        {
            var wrapper = JsonDataReader.LoadFromResources();
            if (wrapper != null)
            {
                _currentDataset = JsonDataReader.ConvertToObjectPoints(wrapper);
                globalScale     = wrapper.globalScale;
                rotationSpeed   = wrapper.rotationSpeed;
                Debug.Log($"[ParametricScene] Cargado desde JSON: {_currentDataset.Length} objetos");
                return;
            }
        }

        // Fallback: ScriptableObject
        _currentDataset = dataset != null ? dataset.points : new ObjectPoint[0];
        Debug.Log($"[ParametricScene] Cargado desde ScriptableObject: {_currentDataset.Length} objetos");
    }

    // ─── GENERAR ESCENA ────────────────────────────────────────────────────────
    public void GenerateScene()
    {
        ClearScene();

        _activePoints.Clear();

        // ── Filtrado ──────────────────────────────────────────────────────────
        foreach (var point in _currentDataset)
        {
            bool valueOk = point.value >= minValue && point.value <= maxValue;
            bool catOk   = !filterEnabled || point.category == filterCategory;

            if (valueOk && catOk)
                _activePoints.Add(point);
        }

        Debug.Log($"[ParametricScene] Generando {_activePoints.Count}/{_currentDataset.Length} objetos");

        // ── Instanciar con bucle + condicionales ──────────────────────────────
        foreach (var point in _activePoints)
        {
            GameObject go = InstantiateObject(point);
            if (go != null)
                _spawnedObjects.Add(go);
        }
    }

    // ─── INSTANCIAR UN OBJETO ─────────────────────────────────────────────────
    private GameObject InstantiateObject(ObjectPoint point)
    {
        // ── Condicional: elegir tipo de primitiva ─────────────────────────────
        PrimitiveType primitiveType;
        switch (point.shape)
        {
            case PrimitiveShape.Sphere:   primitiveType = PrimitiveType.Sphere;   break;
            case PrimitiveShape.Cylinder: primitiveType = PrimitiveType.Cylinder; break;
            case PrimitiveShape.Capsule:  primitiveType = PrimitiveType.Capsule;  break;
            case PrimitiveShape.Quad:     primitiveType = PrimitiveType.Quad;     break;
            default:                      primitiveType = PrimitiveType.Cube;     break;
        }

        // ── Crear primitiva ───────────────────────────────────────────────────
        GameObject go = GameObject.CreatePrimitive(primitiveType);
        go.name       = $"{point.label}_{point.shape}";

        // ── Posición ──────────────────────────────────────────────────────────
        float posY = point.value * 1.8f;                        // altura ← value
        go.transform.position = new Vector3(
            point.position.x,
            point.position.y + posY,
            point.position.z
        );

        // ── Escala proporcional al valor ──────────────────────────────────────
        float scale = point.value * globalScale;
        scale       = Mathf.Max(scale, 0.1f);                   // mínimo visual
        go.transform.localScale = Vector3.one * scale;

        // ── Rotación inicial aleatoria ─────────────────────────────────────────
        go.transform.rotation = Quaternion.Euler(
            Random.Range(0f, 360f),
            Random.Range(0f, 360f),
            0f
        );

        // ── Color condicional por modo ─────────────────────────────────────────
        Color objectColor = ResolveColor(point);

        // ── Aplicar material URP ───────────────────────────────────────────────
        ApplyURPMaterial(go, objectColor, point.value);

        // ── Agregar al contenedor ──────────────────────────────────────────────
        if (generatedContainer != null)
            go.transform.SetParent(generatedContainer);

        // ── Agregar comportamiento de animación ────────────────────────────────
        var anim = go.AddComponent<ObjectAnimator>();
        anim.Initialize(point, dataset, rotationSpeed * point.value);

        return go;
    }

    // ─── RESOLVER COLOR ────────────────────────────────────────────────────────
    private Color ResolveColor(ObjectPoint point)
    {
        if (point.useColorOverride)
            return point.colorOverride;

        switch (colorMode)
        {
            case ColorMode.ByCategory:
                switch (point.category)
                {
                    case ObjectCategory.A: return dataset != null ? dataset.colorA : Color.cyan;
                    case ObjectCategory.B: return dataset != null ? dataset.colorB : Color.red;
                    case ObjectCategory.C: return dataset != null ? dataset.colorC : Color.magenta;
                }
                break;

            case ColorMode.ByType:
                switch (point.shape)
                {
                    case PrimitiveShape.Cube:     return dataset != null ? dataset.colorCube     : Color.blue;
                    case PrimitiveShape.Sphere:   return dataset != null ? dataset.colorSphere   : Color.yellow;
                    case PrimitiveShape.Cylinder: return dataset != null ? dataset.colorCylinder : Color.green;
                    case PrimitiveShape.Capsule:  return dataset != null ? dataset.colorCapsule  : Color.red;
                    case PrimitiveShape.Quad:     return dataset != null ? dataset.colorQuad     : Color.magenta;
                }
                break;

            case ColorMode.ByValue:
                // Gradiente: 0=azul, 0.5=verde, 1=rojo
                return Color.HSVToRGB(point.value * 0.72f, 0.9f, 0.9f);
        }

        return Color.white;
    }

    // ─── APLICAR MATERIAL URP ─────────────────────────────────────────────────
    private void ApplyURPMaterial(GameObject go, Color color, float value)
    {
        Renderer rend = go.GetComponent<Renderer>();
        if (rend == null) return;

        // Crear material usando el shader URP Lit
        Material mat = new Material(Shader.Find("Universal Render Pipeline/Lit"));

        mat.SetColor("_BaseColor", color);
        mat.SetFloat("_Metallic",    0.3f);
        mat.SetFloat("_Smoothness",  0.6f + value * 0.3f); // más brillante = mayor valor

        // Emisión proporcional al valor
        mat.EnableKeyword("_EMISSION");
        mat.SetColor("_EmissionColor", color * (0.05f + value * 0.25f));

        rend.material = mat;
    }

    // ─── LIMPIAR ESCENA ────────────────────────────────────────────────────────
    public void ClearScene()
    {
        foreach (var go in _spawnedObjects)
            if (go != null) Destroy(go);

        _spawnedObjects.Clear();
    }

    // ─── EXPORTAR A JSON ───────────────────────────────────────────────────────
    public void ExportToJson()
    {
        if (dataset == null)
        {
            Debug.LogWarning("[ParametricScene] No hay dataset asignado para exportar.");
            return;
        }
        JsonDataReader.SaveToFile(_currentDataset, dataset);
    }

    // ─── REGENERAR CON PARÁMETROS ALEATORIOS ─────────────────────────────────
    public void RandomizeAndRegenerate()
    {
        globalScale   = Random.Range(0.5f, 2.5f);
        rotationSpeed = Random.Range(0.2f, 3f);
        colorMode     = (ColorMode)Random.Range(0, 3);
        minValue      = Random.Range(0f, 0.4f);
        maxValue      = Random.Range(0.6f, 1f);

        GenerateScene();
    }

    // ─── UPDATE: Actualizar parámetros en tiempo real ─────────────────────────
    void Update()
    {
        // Teclas rápidas para probar
        if (Input.GetKeyDown(KeyCode.Space)) GenerateScene();
        if (Input.GetKeyDown(KeyCode.R))     RandomizeAndRegenerate();
        if (Input.GetKeyDown(KeyCode.E))     ExportToJson();
    }
}