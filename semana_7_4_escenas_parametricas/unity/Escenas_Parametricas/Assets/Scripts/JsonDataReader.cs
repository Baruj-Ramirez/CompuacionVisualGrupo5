using UnityEngine;
using System.IO;
using System.Collections.Generic;

// ─── ESTRUCTURA SERIALIZABLE para JSON ───────────────────────────────────────
[System.Serializable]
public class JsonObjectPoint
{
    public string shape;
    public float  x, y, z;
    public float  value;
    public string category;
    public string label;
}

[System.Serializable]
public class JsonDataWrapper
{
    public List<JsonObjectPoint> objects;
    public float globalScale    = 1f;
    public float rotationSpeed  = 30f;
}

// ─── CLASE UTILITARIA ─────────────────────────────────────────────────────────
public static class JsonDataReader
{
    private static readonly string JSON_FILE = "scene_data";   // en Resources/

    // ── Leer JSON desde Resources/ ────────────────────────────────────────────
    public static JsonDataWrapper LoadFromResources()
    {
        TextAsset asset = Resources.Load<TextAsset>(JSON_FILE);
        if (asset == null)
        {
            Debug.LogWarning($"[JsonDataReader] No se encontró '{JSON_FILE}.json' en Resources/");
            return null;
        }
        return JsonUtility.FromJson<JsonDataWrapper>(asset.text);
    }

    // ── Guardar JSON en persistentDataPath ────────────────────────────────────
    public static void SaveToFile(ObjectPoint[] points, ObjectData config)
    {
        JsonDataWrapper wrapper = new JsonDataWrapper
        {
            objects       = new List<JsonObjectPoint>(),
            globalScale   = config.globalScale,
            rotationSpeed = config.rotationSpeed,
        };

        foreach (var p in points)
        {
            wrapper.objects.Add(new JsonObjectPoint
            {
                shape    = p.shape.ToString(),
                x        = p.position.x,
                y        = p.position.y,
                z        = p.position.z,
                value    = p.value,
                category = p.category.ToString(),
                label    = p.label,
            });
        }

        string path    = Path.Combine(Application.persistentDataPath, "scene_export.json");
        string jsonStr = JsonUtility.ToJson(wrapper, prettyPrint: true);
        File.WriteAllText(path, jsonStr);

        Debug.Log($"[JsonDataReader] Exportado a: {path}");
        Debug.Log(jsonStr);
    }

    // ── Convertir JsonObjectPoint → ObjectPoint ────────────────────────────────
    public static ObjectPoint[] ConvertToObjectPoints(JsonDataWrapper wrapper)
    {
        if (wrapper == null || wrapper.objects == null) return new ObjectPoint[0];

        var result = new ObjectPoint[wrapper.objects.Count];

        for (int i = 0; i < wrapper.objects.Count; i++)
        {
            var  j = wrapper.objects[i];
            var  op = new ObjectPoint();

            // Parsear shape
            if (System.Enum.TryParse(j.shape, true, out PrimitiveShape shape))
                op.shape = shape;
            else
                op.shape = PrimitiveShape.Cube;

            // Parsear categoría
            if (System.Enum.TryParse(j.category, true, out ObjectCategory cat))
                op.category = cat;
            else
                op.category = ObjectCategory.A;

            op.position = new Vector3(j.x, j.y, j.z);
            op.value    = Mathf.Clamp01(j.value);
            op.label    = j.label;

            result[i] = op;
        }

        return result;
    }
}