using System.Collections;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.SceneManagement;

/// <summary>
/// Adjunta este script a un GameObject vacío en la escena (p. ej. "GameManager").
/// Requiere un Canvas con:
///   - Un Panel con Image (color negro o con textura de estática)  ← staticPanel
///   - Un RawImage con textura de ruido animado (opcional pero recomendado) ← staticNoiseImage
/// </summary>
public class SanityEffect : MonoBehaviour
{
    // ─── Referencias ─────────────────────────────────────────────────────────
    [Header("Componentes")]
    [Tooltip("Detector de Slenderman en el jugador")]
    public SlendermanDetector detector;

    [Tooltip("Image del panel de 'estática' (color negro semitransparente o textura)")]
    public Image staticPanel;

    [Tooltip("(Opcional) RawImage con textura de ruido para el efecto de estática visual")]
    public RawImage staticNoiseImage;

    [Tooltip("(Opcional) AudioSource con un clip de estática/ruido")]
    public AudioSource staticAudio;

    // ─── Configuración ───────────────────────────────────────────────────────
    [Header("Velocidades de Alfa")]
    [Tooltip("Alfa por segundo al mirar directamente (lookIntensity = 1)")]
    public float maxFillSpeed = 0.35f;

    [Tooltip("Alfa por segundo al mirar desde el borde del FOV (lookIntensity ≈ 0)")]
    public float minFillSpeed = 0.05f;

    [Tooltip("Alfa por segundo que se recupera cuando NO se mira a Slenderman")]
    public float recoverySpeed = 0.12f;

    [Header("Estática visual")]
    [Tooltip("Velocidad con la que se desplaza la textura de ruido (UVs)")]
    public float noiseScrollSpeed = 2.5f;

    [Tooltip("Alfa mínimo del panel para que el ruido sea visible")]
    public float noiseVisibleThreshold = 0.05f;

    [Header("Derrota")]
    [Tooltip("Nombre de la escena a recargar al perder (vacío = escena actual)")]
    public string sceneToReload = "";

    [Tooltip("Segundos de pausa antes de recargar la escena")]
    public float deathDelay = 1.2f;

    // ─── Estado interno ───────────────────────────────────────────────────────
    private float currentAlpha = 0f;
    private bool isDead = false;
    private float noiseOffsetX, noiseOffsetY;

    void Start()
    {
        if (detector == null)
            Debug.LogWarning("[SanityEffect] No se asignó el SlendermanDetector.");

        SetPanelAlpha(0f);

        if (staticNoiseImage != null)
            staticNoiseImage.enabled = false;

        if (staticAudio != null)
        {
            staticAudio.loop = true;
            staticAudio.volume = 0f;
            staticAudio.Play();
        }
    }

    void Update()
    {
        if (isDead) return;

        // ── 1. Calcular cambio de alfa ────────────────────────────────────────
        if (detector != null && detector.isLookingAtSlenderman)
        {
            // Interpolar velocidad de llenado según la intensidad de la mirada
            float fillSpeed = Mathf.Lerp(minFillSpeed, maxFillSpeed, detector.lookIntensity);
            currentAlpha += fillSpeed * Time.deltaTime;
        }
        else
        {
            currentAlpha -= recoverySpeed * Time.deltaTime;
        }

        currentAlpha = Mathf.Clamp01(currentAlpha);

        // ── 2. Aplicar alfa al panel ──────────────────────────────────────────
        SetPanelAlpha(currentAlpha);

        // ── 3. Efecto de estática / ruido ─────────────────────────────────────
        UpdateStaticEffect();

        // ── 4. Condición de derrota ───────────────────────────────────────────
        if (currentAlpha >= 1f)
        {
            StartCoroutine(OnPlayerDeath());
        }
    }

    // ─── Métodos privados ─────────────────────────────────────────────────────

    void SetPanelAlpha(float alpha)
    {
        if (staticPanel == null) return;
        Color c = staticPanel.color;
        c.a = alpha;
        staticPanel.color = c;
    }

    void UpdateStaticEffect()
    {
        bool showNoise = currentAlpha > noiseVisibleThreshold;

        // Ruido visual (RawImage con textura de ruido desplazada)
        if (staticNoiseImage != null)
        {
            staticNoiseImage.enabled = showNoise;
            if (showNoise)
            {
                // Desplazar UVs para simular estática en movimiento
                noiseOffsetX += noiseScrollSpeed * Time.deltaTime * Random.Range(0.8f, 1.2f);
                noiseOffsetY += noiseScrollSpeed * Time.deltaTime * Random.Range(0.8f, 1.2f);
                staticNoiseImage.uvRect = new Rect(noiseOffsetX, noiseOffsetY, 1f, 1f);

                // Alfa del ruido proporcional al estado de sanidad
                Color nc = staticNoiseImage.color;
                nc.a = Mathf.Lerp(0.15f, 0.65f, currentAlpha);
                staticNoiseImage.color = nc;
            }
        }

        // Audio de estática
        if (staticAudio != null)
        {
            staticAudio.volume = showNoise
                ? Mathf.Lerp(0f, 0.85f, currentAlpha)
                : Mathf.MoveTowards(staticAudio.volume, 0f, Time.deltaTime * 2f);
        }
    }

    IEnumerator OnPlayerDeath()
    {
        isDead = true;

        // Asegurarse de que el panel esté totalmente opaco
        SetPanelAlpha(1f);

        // Pausa dramática antes de recargar
        yield return new WaitForSeconds(deathDelay);

        string scene = string.IsNullOrEmpty(sceneToReload)
            ? SceneManager.GetActiveScene().name
            : sceneToReload;

        SceneManager.LoadScene(scene);
    }

    // ─── API pública (útil para eventos externos) ─────────────────────────────

    /// <summary>Resetea el alfa de sanidad a cero.</summary>
    public void ResetSanity()
    {
        currentAlpha = 0f;
        isDead = false;
        SetPanelAlpha(0f);
    }

    /// <summary>Devuelve el alfa actual (0‒1).</summary>
    public float GetSanityAlpha() => currentAlpha;
}
