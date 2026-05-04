using UnityEngine;

// ─── ENUM: Tipos de primitiva ────────────────────────────────────────────────
public enum PrimitiveShape
{
    Cube,
    Sphere,
    Cylinder,
    Capsule,
    Quad
}

// ─── ENUM: Categoría del objeto ──────────────────────────────────────────────
public enum ObjectCategory
{
    A,
    B,
    C
}

// ─── CLASE: Un punto del dataset ─────────────────────────────────────────────
[System.Serializable]
public class ObjectPoint
{
    [Header("Geometría")]
    public PrimitiveShape shape    = PrimitiveShape.Cube;
    public Vector3        position = Vector3.zero;

    [Header("Parámetros")]
    [Range(0f, 1f)]
    public float value             = 0.5f;   // 0-1: escala, color, rotación
    public ObjectCategory category = ObjectCategory.A;

    [Header("Visual")]
    public Color  colorOverride    = Color.white;
    public bool   useColorOverride = false;
    public string label            = "obj";
}

// ─── SCRIPTABLEOBJECT: Dataset completo ──────────────────────────────────────
[CreateAssetMenu(fileName = "SceneDataset", menuName = "ParametricScene/Dataset")]
public class ObjectData : ScriptableObject
{
    [Header("Dataset de objetos")]
    public ObjectPoint[] points = new ObjectPoint[]
    {
        new ObjectPoint { shape = PrimitiveShape.Cube,     position = new Vector3(-4,  0,  0), value = 0.80f, category = ObjectCategory.A, label = "alpha"   },
        new ObjectPoint { shape = PrimitiveShape.Sphere,   position = new Vector3(-2,  0,  2), value = 0.40f, category = ObjectCategory.B, label = "beta"    },
        new ObjectPoint { shape = PrimitiveShape.Cylinder, position = new Vector3( 0,  0, -2), value = 1.00f, category = ObjectCategory.A, label = "gamma"   },
        new ObjectPoint { shape = PrimitiveShape.Capsule,  position = new Vector3( 2,  0,  2), value = 0.60f, category = ObjectCategory.C, label = "delta"   },
        new ObjectPoint { shape = PrimitiveShape.Sphere,   position = new Vector3( 4,  0,  0), value = 0.35f, category = ObjectCategory.B, label = "epsilon" },
        new ObjectPoint { shape = PrimitiveShape.Cube,     position = new Vector3(-3,  0, -3), value = 0.90f, category = ObjectCategory.C, label = "zeta"    },
        new ObjectPoint { shape = PrimitiveShape.Cylinder, position = new Vector3( 1,  0, -4), value = 0.70f, category = ObjectCategory.A, label = "eta"     },
        new ObjectPoint { shape = PrimitiveShape.Capsule,  position = new Vector3(-1,  0,  4), value = 0.25f, category = ObjectCategory.B, label = "theta"   },
        new ObjectPoint { shape = PrimitiveShape.Sphere,   position = new Vector3( 3,  0,  3), value = 0.85f, category = ObjectCategory.C, label = "iota"    },
        new ObjectPoint { shape = PrimitiveShape.Cube,     position = new Vector3( 5,  0, -1), value = 0.55f, category = ObjectCategory.A, label = "kappa"   },
    };

    [Header("Configuración global")]
    public float  globalScale       = 1f;
    public float  rotationSpeed     = 30f;
    public bool   floatAnimation    = true;
    public float  floatAmplitude    = 0.3f;
    public float  floatFrequency    = 1f;

    [Header("Paleta de colores por categoría")]
    public Color colorA = new Color(0.00f, 0.83f, 1.00f); // Cyan
    public Color colorB = new Color(1.00f, 0.42f, 0.21f); // Naranja
    public Color colorC = new Color(0.66f, 0.33f, 0.97f); // Violeta

    [Header("Paleta por tipo")]
    public Color colorCube     = new Color(0.13f, 0.85f, 0.91f);
    public Color colorSphere   = new Color(0.96f, 0.62f, 0.04f);
    public Color colorCylinder = new Color(0.06f, 0.72f, 0.51f);
    public Color colorCapsule  = new Color(0.96f, 0.25f, 0.37f);
    public Color colorQuad     = new Color(0.55f, 0.36f, 0.97f);
}