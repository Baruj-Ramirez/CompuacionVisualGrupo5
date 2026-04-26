using UnityEngine;
using System.Collections.Generic;

public class ProceduralGenerator : MonoBehaviour
{
    [Header("Grid Settings")]
    public int gridSize = 5;          // Número de cubos por lado (5x5)
    public float gridSpacing = 1.5f;  // Separación entre cubos
    public GameObject gridParent;     // Objeto padre opcional

    [Header("Spiral Settings")]
    public int spiralSteps = 30;
    public float spiralRadius = 2f;
    public float spiralHeight = 4f;
    public float spiralTurns = 3f;
    public GameObject spiralParent;

    [Header("Fractal Pyramid Settings")]
    public int fractalLevels = 4;
    public float fractalBaseSize = 2f;
    public float fractalStep = 0.5f;
    public GameObject fractalParent;

    [Header("Custom Mesh Settings")]
    public Material customMaterial;    // Material para la malla personalizada

    void Start()
    {
        GenerateGrid();
        GenerateSpiral();
        GenerateFractalPyramid();
        CreateCustomMesh();
    }

    // ------------------------------------------------------------------
    // 1. Rejilla de cubos (usando GameObject.CreatePrimitive)
    // ------------------------------------------------------------------
    void GenerateGrid()
    {
        if (gridParent == null)
            gridParent = new GameObject("Grid");
        else
            // Limpiar hijos previos si quieres regenerar
            foreach (Transform child in gridParent.transform) DestroyImmediate(child.gameObject);

        int half = gridSize / 2;
        for (int i = 0; i < gridSize; i++)
        {
            for (int j = 0; j < gridSize; j++)
            {
                // Posición centrada en (0,0,0)
                float x = (i - half) * gridSpacing;
                float z = (j - half) * gridSpacing;
                Vector3 pos = new Vector3(x, 0, z);

                GameObject cube = GameObject.CreatePrimitive(PrimitiveType.Cube);
                cube.transform.position = pos;
                cube.transform.parent = gridParent.transform;
                // Asignar un color aleatorio o según posición
                Renderer rend = cube.GetComponent<Renderer>();
                rend.material.color = new Color(
                    (float)i / gridSize,
                    (float)j / gridSize,
                    0.5f
                );
            }
        }
    }

    // ------------------------------------------------------------------
    // 2. Espiral de cilindros
    // ------------------------------------------------------------------
    void GenerateSpiral()
    {
        if (spiralParent == null)
            spiralParent = new GameObject("Spiral");
        else
            foreach (Transform child in spiralParent.transform) DestroyImmediate(child.gameObject);

        for (int i = 0; i <= spiralSteps; i++)
        {
            float t = (float)i / spiralSteps; // 0..1
            float angle = t * Mathf.PI * 2 * spiralTurns;
            float x = Mathf.Cos(angle) * spiralRadius * t;
            float z = Mathf.Sin(angle) * spiralRadius * t;
            float y = (t - 0.5f) * spiralHeight;

            Vector3 pos = new Vector3(x, y, z);
            GameObject cylinder = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            cylinder.transform.position = pos;
            cylinder.transform.localScale = new Vector3(0.2f, 0.1f, 0.2f);
            cylinder.transform.parent = spiralParent.transform;

            // Color basado en el ángulo (HSV)
            Renderer rend = cylinder.GetComponent<Renderer>();
            rend.material.color = Color.HSVToRGB((angle % (Mathf.PI * 2)) / (Mathf.PI * 2), 1f, 1f);
        }
    }

    // ------------------------------------------------------------------
    // 3. Pirámide fractal (apilamiento de cubos de tamaño decreciente)
    // ------------------------------------------------------------------
    void GenerateFractalPyramid()
    {
        if (fractalParent == null)
            fractalParent = new GameObject("FractalPyramid");
        else
            foreach (Transform child in fractalParent.transform) DestroyImmediate(child.gameObject);

        for (int level = 0; level < fractalLevels; level++)
        {
            float size = fractalBaseSize - level * fractalStep;
            if (size <= 0) break;
            float yPos = level * fractalStep; // altura de cada nivel
            GameObject cube = GameObject.CreatePrimitive(PrimitiveType.Cube);
            cube.transform.position = new Vector3(0, yPos, 0);
            cube.transform.localScale = new Vector3(size, fractalStep, size);
            cube.transform.parent = fractalParent.transform;

            Renderer rend = cube.GetComponent<Renderer>();
            // Gradiente de color: de marrón a verde
            float t = (float)level / fractalLevels;
            rend.material.color = Color.Lerp(new Color(0.6f, 0.3f, 0.1f), new Color(0.2f, 0.8f, 0.2f), t);
        }
    }

    // ------------------------------------------------------------------
    // 4. Creación de una malla personalizada (pirámide de base cuadrada)
    // ------------------------------------------------------------------
    void CreateCustomMesh()
    {
        GameObject customObject = new GameObject("CustomPyramid");
        customObject.transform.position = new Vector3(4, 0, 3); // Separado del resto

        MeshFilter meshFilter = customObject.AddComponent<MeshFilter>();
        MeshRenderer meshRenderer = customObject.AddComponent<MeshRenderer>();

        // Asignar material (si no se asigna uno, usa el por defecto)
        meshRenderer.material = customMaterial != null ? customMaterial : new Material(Shader.Find("Standard"));

        // Construir la malla
        Mesh mesh = new Mesh();
        mesh.name = "PyramidMesh";

        // Vértices: base cuadrada (4) + vértice superior (1) = 5 vértices
        Vector3[] vertices = new Vector3[5];
        float halfBase = 1f;
        float height = 1.5f;
        // Base (y=0)
        vertices[0] = new Vector3(-halfBase, 0, -halfBase);
        vertices[1] = new Vector3(halfBase, 0, -halfBase);
        vertices[2] = new Vector3(halfBase, 0, halfBase);
        vertices[3] = new Vector3(-halfBase, 0, halfBase);
        // Vértice superior (y=height)
        vertices[4] = new Vector3(0, height, 0);

        // Triángulos: 4 caras laterales (cada una 2 triángulos) + base (2 triángulos) = 6 triángulos = 18 índices
        int[] triangles = new int[18];
        // Cara frontal (0-1-4) y (1-2-4)? No, orden correcto: cara hacia Z negativo (vértices 0,1,4)
        triangles[0] = 0; triangles[1] = 1; triangles[2] = 4;
        triangles[3] = 1; triangles[4] = 2; triangles[5] = 4;
        // Cara derecha (1,2,4) ya está, falta (2,3,4)
        triangles[6] = 2; triangles[7] = 3; triangles[8] = 4;
        // Cara trasera (3,0,4)
        triangles[9] = 3; triangles[10] = 0; triangles[11] = 4;
        // Base (0,1,2) y (0,2,3)
        triangles[12] = 0; triangles[13] = 1; triangles[14] = 2;
        triangles[15] = 0; triangles[16] = 2; triangles[17] = 3;

        // Opcional: asignar normales para que la luz incida correctamente
        mesh.vertices = vertices;
        mesh.triangles = triangles;
        mesh.RecalculateNormals();
        mesh.RecalculateBounds();

        meshFilter.mesh = mesh;
    }
}