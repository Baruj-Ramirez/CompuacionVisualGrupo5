using UnityEngine;
using UnityEngine.UI;
using TMPro;

// ═══════════════════════════════════════════════════════════
// NormalesController
// Calcula y visualiza normales de una malla 3D en Unity.
//
// Funcionalidades:
//   - Accede a mesh.normals (normales automáticas de Unity)
//   - Calcula normales manualmente desde mesh.triangles
//   - Recalcula normales con mesh.RecalculateNormals()
//   - Dibuja normales con Gizmos en el editor
//   - Compara flat shading vs smooth shading
//
// Se adjunta directamente al objeto Tree.
// ═══════════════════════════════════════════════════════════
public class NormalesController : MonoBehaviour
{
    // ── Referencia a la malla ────────────────────────────────
    private Mesh mesh;
    private MeshFilter meshFilter;
    private MeshRenderer meshRenderer;

    // ── Normales guardadas ───────────────────────────────────
    private Vector3[] normalesOriginales;   // copia de las normales al inicio
    private Vector3[] normalesManuales;     // calculadas por nosotros

    // ── Estado actual ────────────────────────────────────────
    private bool mostrarNormales    = true;
    private bool usarNormalesManuales = false;
    private bool esFlatShading      = false;

    // ── Parámetros de visualización ──────────────────────────
    [Header("Visualización de normales")]
    [Range(0.01f, 1f)]
    public float longitudNormal = 0.1f;

    [Range(1, 500)]
    public int maxNormalesVisibles = 200;

    public Color colorNormalCara    = Color.red;
    public Color colorNormalVertice = Color.green;

    // ── Referencias UI ───────────────────────────────────────
    [Header("UI")]
    public TMP_Text textoInfo;
    public TMP_Text textoModo;

    // ────────────────────────────────────────────────────────
    // Start
    // ────────────────────────────────────────────────────────
    void Start()
    {
        meshFilter   = GetComponent<MeshFilter>();
        meshRenderer = GetComponent<MeshRenderer>();

        if (meshFilter == null || meshFilter.sharedMesh == null)
        {
            Debug.LogError("❌ No se encontró MeshFilter o malla en este objeto.");
            return;
        }

        // Trabajamos sobre una instancia para no modificar el asset original
        mesh = Instantiate(meshFilter.sharedMesh);
        meshFilter.mesh = mesh;

        // Guardamos las normales originales para poder restaurarlas
        normalesOriginales = mesh.normals;

        // Calculamos las normales manuales al inicio
        CalcularNormalesManuales();

        // Log inicial en consola
        LogInfoMalla();
        ActualizarUI();
    }

    // ────────────────────────────────────────────────────────
    // Update — detecta teclas para cambiar modos
    // ────────────────────────────────────────────────────────
    void Update()
    {
        var keyboard = UnityEngine.InputSystem.Keyboard.current;
        if (keyboard == null) return;

        // N → toggle mostrar/ocultar normales en Gizmos
        if (keyboard.nKey.wasPressedThisFrame)
        {
            mostrarNormales = !mostrarNormales;
            Debug.Log($"Normales visibles: {mostrarNormales}");
        }

        // M → alternar entre normales manuales y automáticas
        if (keyboard.mKey.wasPressedThisFrame)
        {
            usarNormalesManuales = !usarNormalesManuales;
            AplicarNormales();
        }

        // R → recalcular normales con Unity
        if (keyboard.rKey.wasPressedThisFrame)
        {
            RecalcularNormalesUnity();
        }

        // F → toggle flat / smooth shading
        if (keyboard.fKey.wasPressedThisFrame)
        {
            ToggleFlatSmooth();
        }

        // O → restaurar normales originales
        if (keyboard.oKey.wasPressedThisFrame)
        {
            RestaurarOriginales();
        }

    ActualizarUI();
    }

    // ────────────────────────────────────────────────────────
    // OnDrawGizmos — dibuja las normales en el editor
    // Se ejecuta siempre (incluso sin seleccionar el objeto)
    // ────────────────────────────────────────────────────────
    void OnDrawGizmosSelected()
    {
        if (!mostrarNormales) return;

        Mesh m = Application.isPlaying
            ? mesh
            : GetComponent<MeshFilter>()?.sharedMesh;

        if (m == null) return;

        Vector3[] vertices = m.vertices;
        Vector3[] normales = m.normals;

        if (normales == null || normales.Length == 0) return;

        int paso = Mathf.Max(1, vertices.Length / maxNormalesVisibles);

        for (int i = 0; i < vertices.Length; i += paso)
        {
            Vector3 posicionMundo = transform.TransformPoint(vertices[i]);
            Vector3 normalMundo   = transform.TransformDirection(normales[i]);

            Gizmos.color = usarNormalesManuales ? colorNormalCara : colorNormalVertice;

            Gizmos.DrawLine(
                posicionMundo,
                posicionMundo + normalMundo * longitudNormal
            );
        }
    }

    // ────────────────────────────────────────────────────────
    // Cálculo manual de normales desde mesh.triangles
    // Implementa el producto cruz igual que en Python:
    //   v1 = B - A
    //   v2 = C - A
    //   normal = cross(v1, v2).normalized
    // ────────────────────────────────────────────────────────
    void CalcularNormalesManuales()
    {
        Vector3[] vertices  = mesh.vertices;
        int[]     triangulos = mesh.triangles;

        // Inicializamos el array de normales en cero
        normalesManuales = new Vector3[vertices.Length];

        // Para cada triángulo calculamos su normal y la acumulamos
        // en los 3 vértices que lo componen (para smooth shading)
        for (int i = 0; i < triangulos.Length; i += 3)
        {
            int idxA = triangulos[i];
            int idxB = triangulos[i + 1];
            int idxC = triangulos[i + 2];

            Vector3 A = vertices[idxA];
            Vector3 B = vertices[idxB];
            Vector3 C = vertices[idxC];

            // Producto cruz de las dos aristas
            Vector3 v1 = B - A;
            Vector3 v2 = C - A;
            Vector3 normalCara = Vector3.Cross(v1, v2).normalized;

            // Acumulamos en los 3 vértices del triángulo
            normalesManuales[idxA] += normalCara;
            normalesManuales[idxB] += normalCara;
            normalesManuales[idxC] += normalCara;
        }

        // Normalizamos cada normal de vértice
        for (int i = 0; i < normalesManuales.Length; i++)
        {
            normalesManuales[i] = normalesManuales[i].normalized;
        }

        Debug.Log($"✅ Normales manuales calculadas: {normalesManuales.Length} vértices");
    }

    // ────────────────────────────────────────────────────────
    // Aplica las normales manuales o restaura las automáticas
    // ────────────────────────────────────────────────────────
    void AplicarNormales()
    {
        if (usarNormalesManuales)
        {
            mesh.normals = normalesManuales;
            Debug.Log("🔧 Normales manuales aplicadas a la malla.");
        }
        else
        {
            mesh.normals = normalesOriginales;
            Debug.Log("🔧 Normales originales restauradas.");
        }
    }

    // ────────────────────────────────────────────────────────
    // Recalcula normales usando el método de Unity
    // ────────────────────────────────────────────────────────
    void RecalcularNormalesUnity()
    {
        mesh.RecalculateNormals();
        normalesOriginales = mesh.normals;   // actualizamos la copia
        Debug.Log("🔄 Normales recalculadas con mesh.RecalculateNormals()");

        // Imprimimos las primeras 5 normales para inspección
        Debug.Log("════ Primeras 5 normales recalculadas ════");
        for (int i = 0; i < Mathf.Min(5, mesh.normals.Length); i++)
        {
            Vector3 n = mesh.normals[i];
            Debug.Log($"  V{i}: ({n.x:F4}, {n.y:F4}, {n.z:F4})  |mag|={n.magnitude:F6}");
        }
    }

    // ────────────────────────────────────────────────────────
    // Alterna entre Flat Shading y Smooth Shading
    // Flat:   duplicamos vértices para que cada cara tenga
    //         su propia normal (sin compartir entre caras)
    // Smooth: usamos las normales interpoladas (por defecto)
    // ────────────────────────────────────────────────────────
    void ToggleFlatSmooth()
    {
        esFlatShading = !esFlatShading;

        if (esFlatShading)
        {
            AplicarFlatShading();
            Debug.Log("🔲 Flat Shading activado — normales de cara");
        }
        else
        {
            RestaurarOriginales();
            Debug.Log("🟢 Smooth Shading activado — normales de vértice");
        }
    }

    // ────────────────────────────────────────────────────────
    // Flat Shading: cada triángulo tiene su propia normal
    // Para lograrlo duplicamos los vértices compartidos
    // para que cada cara tenga vértices únicos
    // ────────────────────────────────────────────────────────
    void AplicarFlatShading()
    {
        // Asignamos a cada vértice la normal de su primera cara adyacente
        // Esto simula flat shading sin duplicar vértices
        int[]     tris   = mesh.triangles;
        Vector3[] verts  = mesh.vertices;
        Vector3[] nuevasNormales = new Vector3[verts.Length];

        for (int i = 0; i < tris.Length; i += 3)
        {
            int idxA = tris[i];
            int idxB = tris[i + 1];
            int idxC = tris[i + 2];

            Vector3 A = verts[idxA];
            Vector3 B = verts[idxB];
            Vector3 C = verts[idxC];

            // Normal de la cara
            Vector3 normalCara = Vector3.Cross(B - A, C - A).normalized;

            // Asignamos la misma normal a los 3 vértices
            // El último en escribir gana — produce discontinuidades
            // visibles entre caras = efecto flat shading
            nuevasNormales[idxA] = normalCara;
            nuevasNormales[idxB] = normalCara;
            nuevasNormales[idxC] = normalCara;
        }

        mesh.normals = nuevasNormales;
    }

    // ────────────────────────────────────────────────────────
    // Restaura la malla a su estado original
    // ────────────────────────────────────────────────────────
    void RestaurarOriginales()
    {
        mesh = Instantiate(meshFilter.sharedMesh);
        meshFilter.mesh  = mesh;
        normalesOriginales = mesh.normals;
        esFlatShading      = false;
        usarNormalesManuales = false;
        CalcularNormalesManuales();
        Debug.Log("↺ Malla restaurada al estado original.");
    }

    // ────────────────────────────────────────────────────────
    // Imprime información de la malla en consola
    // ────────────────────────────────────────────────────────
    void LogInfoMalla()
    {
        Debug.Log("════════════════════════════════════════════");
        Debug.Log($"📦 Malla: {mesh.name}");
        Debug.Log($"   Vértices  : {mesh.vertexCount:N0}");
        Debug.Log($"   Triángulos: {mesh.triangles.Length / 3:N0}");
        Debug.Log($"   Normales  : {mesh.normals.Length:N0}");
        Debug.Log($"   Sub-mallas: {mesh.subMeshCount}");
        Debug.Log("════════════════════════════════════════════");
        Debug.Log("🎮 Controles:");
        Debug.Log("   N → mostrar/ocultar normales (Gizmos)");
        Debug.Log("   M → alternar normales manuales / automáticas");
        Debug.Log("   R → recalcular normales con Unity");
        Debug.Log("   F → toggle flat / smooth shading");
        Debug.Log("   O → restaurar malla original");
    }

    // ────────────────────────────────────────────────────────
    // Actualiza los textos de la UI
    // ────────────────────────────────────────────────────────
    void ActualizarUI()
    {
        if (textoInfo != null && mesh != null)
        {
            textoInfo.text =
                $"Vértices: {mesh.vertexCount:N0}\n" +
                $"Triángulos: {mesh.triangles.Length / 3:N0}\n" +
                $"Normales: {mesh.normals.Length:N0}";
        }

        if (textoModo != null)
        {
            string modo    = esFlatShading ? "FLAT" : "SMOOTH";
            string normales = usarNormalesManuales ? "Manuales" : "Automáticas";
            string visibles = mostrarNormales ? "ON" : "OFF";
            textoModo.text =
                $"Shading: {modo}\n" +
                $"Normales: {normales}\n" +
                $"Gizmos: {visibles}";
        }
    }

    // ────────────────────────────────────────────────────────
    // Métodos públicos para los botones de la UI
    // ────────────────────────────────────────────────────────
    public void UI_ToggleNormales()       => mostrarNormales = !mostrarNormales;
    public void UI_ToggleManuales()       { usarNormalesManuales = !usarNormalesManuales; AplicarNormales(); }
    public void UI_RecalcularNormales()   => RecalcularNormalesUnity();
    public void UI_ToggleFlatSmooth()     => ToggleFlatSmooth();
    public void UI_RestaurarOriginales()  => RestaurarOriginales();
}