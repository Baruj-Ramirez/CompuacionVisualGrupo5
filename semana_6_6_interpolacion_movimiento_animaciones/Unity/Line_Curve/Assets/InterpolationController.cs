using UnityEngine;
using System.Collections.Generic;

public class InterpolationController : MonoBehaviour
{
    [Header("Puntos de trayectoria")]
    public Transform startPoint;
    public Transform endPoint;
    public Transform controlPoint1;  // Para curva Bézier
    public Transform controlPoint2;

    [Header("Configuración de movimiento")]
    public float animationSpeed = 0.5f; // Velocidad (0 a 1 por segundo)
    public bool pingPong = true;        // Si true, rebota; si false, reinicia
    public bool useBezierCurve = false; // Usar curva en lugar de línea recta

    [Header("Visualización de trayectoria")]
    public LineRenderer lineRenderer;
    public int lineSegments = 50;

    private Vector3 startPos, endPos, cp1, cp2;
    private Quaternion startRot, endRot;
    private float t = 0f;               // Progreso (0..1)
    private bool movingForward = true;  // Para ping-pong

    void Start()
    {
        // Guardar posiciones
        startPos = startPoint.position;
        endPos = endPoint.position;
        cp1 = controlPoint1.position;
        cp2 = controlPoint2.position;

        // Rotación: de 0 a 180 grados sobre Y
        startRot = Quaternion.identity;
        endRot = Quaternion.Euler(0, 180, 0);

        // Dibujar la trayectoria inicial
        UpdatePathVisualization();
    }

    void Update()
    {
        // Actualizar t automáticamente
        if (pingPong)
        {
            // Movimiento de ida y vuelta
            t += Time.deltaTime * animationSpeed * (movingForward ? 1 : -1);
            if (t >= 1f)
            {
                t = 1f;
                movingForward = false;
            }
            else if (t <= 0f)
            {
                t = 0f;
                movingForward = true;
            }
        }
        else
        {
            // Movimiento cíclico (reinicia al llegar a 1)
            t += Time.deltaTime * animationSpeed;
            if (t >= 1f) t = 0f;
        }

        // Calcular posición según modo
        Vector3 targetPos;
        if (useBezierCurve)
            targetPos = GetBezierPoint(t, startPos, cp1, cp2, endPos);
        else
            targetPos = Vector3.Lerp(startPos, endPos, t);

        // Aplicar easing (SmoothStep)
        float easedT = Mathf.SmoothStep(0, 1, t);
        Vector3 finalPos = Vector3.Lerp(startPos, targetPos, easedT);
        transform.position = finalPos;

        // Rotación con SLERP
        transform.rotation = Quaternion.Slerp(startRot, endRot, t);
    }

    // Curva Bézier cúbica
    Vector3 GetBezierPoint(float t, Vector3 p0, Vector3 p1, Vector3 p2, Vector3 p3)
    {
        float u = 1 - t;
        float tt = t * t;
        float uu = u * u;
        float uuu = uu * u;
        float ttt = tt * t;

        return uuu * p0 + 3 * uu * t * p1 + 3 * u * tt * p2 + ttt * p3;
    }



    // Actualizar la línea de trayectoria
    public void UpdatePathVisualization()
    {
        if (lineRenderer == null) return;

        List<Vector3> points = new List<Vector3>();
        if (!useBezierCurve)
        {
            points.Add(startPos);
            points.Add(endPos);
        }
        else
        {
            for (int i = 0; i <= lineSegments; i++)
            {
                float step = i / (float)lineSegments;
                points.Add(GetBezierPoint(step, startPos, cp1, cp2, endPos));
            }
        }
        lineRenderer.positionCount = points.Count;
        lineRenderer.SetPositions(points.ToArray());
    }

    // Interfaz simple con OnGUI (solo indicador y toggle)
    void OnGUI()
    {
        // Ventana pequeña en la esquina superior izquierda
        Rect windowRect = new Rect(10, 10, 300, 100);
        windowRect = GUI.Window(0, windowRect, WindowFunction, "Animación - Interpolación");
    }

    void WindowFunction(int windowID)
    {
        // Indicador de tiempo (porcentaje)
        GUILayout.Label($"Progreso: {(t * 100).ToString("F0")}%");

        // Barra de progreso manual
        Rect barRect = GUILayoutUtility.GetRect(280, 20);
        GUI.Box(barRect, "");
        GUI.Box(new Rect(barRect.x, barRect.y, barRect.width * t, barRect.height), "", GUI.skin.box);

        // Toggle para elegir trayectoria (bonus)
        bool newMode = GUILayout.Toggle(useBezierCurve, " Usar curva Bézier");
        if (newMode != useBezierCurve)
        {
            useBezierCurve = newMode;
            UpdatePathVisualization();
        }

        GUILayout.Label("Modo: " + (useBezierCurve ? "CURVA" : "LINEAL"));

        GUI.DragWindow();
    }

    // Actualizar línea si se modifican valores en el editor
    private void OnValidate()
    {
        if (Application.isPlaying && lineRenderer != null)
        {
            if (startPoint != null) startPos = startPoint.position;
            if (endPoint != null) endPos = endPoint.position;
            if (controlPoint1 != null) cp1 = controlPoint1.position;
            if (controlPoint2 != null) cp2 = controlPoint2.position;
            UpdatePathVisualization();
        }
    }
}