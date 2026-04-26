using UnityEngine;
using UnityEngine.UI;
using TMPro;

// ═══════════════════════════════════════════════════════════
// ControladorEnergia
// Controla en tiempo real los parámetros del shader de energía
// y el sistema de partículas desde sliders de UI.
//
// Se adjunta a un GameObject vacío llamado "GameController".
// ═══════════════════════════════════════════════════════════
public class ControladorEnergia : MonoBehaviour
{
    // ── Referencias a la escena ──────────────────────────────
    [Header("Objetos de la escena")]
    public Renderer rendererEsfera;
    public ParticleSystem chispas;

    // ── Parámetros del shader ────────────────────────────────
    [Header("Parámetros del shader")]
    [Range(0f, 5f)]  public float velocidadPulso    = 2f;
    [Range(0f, 8f)]  public float intensidadEmision = 3f;
    [Range(0f, 0.5f)] public float distorsionUV     = 0.1f;

    // ── Parámetros de partículas ─────────────────────────────
    [Header("Parámetros de partículas")]
    [Range(0f, 200f)] public float tasaParticulas   = 50f;
    [Range(0f, 10f)]  public float velocidadParticulas = 3f;
    [Range(0f, 2f)]   public float tamanoParticulas  = 0.05f;

    // ── Estado ───────────────────────────────────────────────
    private bool particulasActivas = true;
    private Material materialEsfera;

    // ── IDs de propiedades del shader ────────────────────────
    // Usar IDs es más eficiente que strings en cada frame
    private static readonly int ID_VelocidadPulso    = Shader.PropertyToID("_VelocidadPulso");
    private static readonly int ID_IntensidadEmision = Shader.PropertyToID("_IntensidadEmision");
    private static readonly int ID_DistorsionUV      = Shader.PropertyToID("_DistorsionUV");

    // ── Referencias UI ───────────────────────────────────────
    [Header("UI — Sliders")]
    public Slider sliderVelocidad;
    public Slider sliderEmision;
    public Slider sliderDistorsion;
    public Slider sliderParticulas;
    public Slider sliderVelParticulas;
    public Slider sliderTamano;

    [Header("UI — Textos")]
    public TMP_Text textoVelocidad;
    public TMP_Text textoEmision;
    public TMP_Text textoDistorsion;
    public TMP_Text textoParticulas;
    public TMP_Text textoEstado;

    // ────────────────────────────────────────────────────────
    // Start
    // ────────────────────────────────────────────────────────
    void Start()
    {
        // Obtenemos una instancia del material para no
        // modificar el asset original
        if (rendererEsfera != null)
            materialEsfera = rendererEsfera.material;

        InicializarSliders();
        ActualizarUI();
    }

    // ────────────────────────────────────────────────────────
    // Update
    // ────────────────────────────────────────────────────────
    void Update()
    {
        LeerSliders();
        AplicarShader();
        AplicarParticulas();
        ActualizarUI();
    }

    // ────────────────────────────────────────────────────────
    // Aplica los parámetros actuales al material del shader
    // ────────────────────────────────────────────────────────
    void AplicarShader()
    {
        if (materialEsfera == null) return;

        materialEsfera.SetFloat(ID_VelocidadPulso,    velocidadPulso);
        materialEsfera.SetFloat(ID_IntensidadEmision, intensidadEmision);
        materialEsfera.SetFloat(ID_DistorsionUV,      distorsionUV);
    }

    // ────────────────────────────────────────────────────────
    // Aplica los parámetros al sistema de partículas
    // ────────────────────────────────────────────────────────
    void AplicarParticulas()
    {
        if (chispas == null) return;

        // Emission — tasa de partículas por segundo
        var emission = chispas.emission;
        emission.rateOverTime = tasaParticulas;

        // Main — velocidad y tamaño
        var main = chispas.main;
        main.startSpeed = new ParticleSystem.MinMaxCurve(
            velocidadParticulas * 0.5f,
            velocidadParticulas
        );
        main.startSize = new ParticleSystem.MinMaxCurve(
            tamanoParticulas * 0.5f,
            tamanoParticulas
        );
    }

    // ────────────────────────────────────────────────────────
    // Toggle partículas ON/OFF — llamado por botón UI
    // ────────────────────────────────────────────────────────
    public void ToggleParticulas()
    {
        particulasActivas = !particulasActivas;

        if (chispas == null) return;

        if (particulasActivas)
            chispas.Play();
        else
            chispas.Stop();
    }

    // ────────────────────────────────────────────────────────
    // Reinicia todos los parámetros a sus valores por defecto
    // ────────────────────────────────────────────────────────
    public void Reiniciar()
    {
        velocidadPulso      = 2f;
        intensidadEmision   = 3f;
        distorsionUV        = 0.1f;
        tasaParticulas      = 50f;
        velocidadParticulas = 3f;
        tamanoParticulas    = 0.05f;

        InicializarSliders();

        if (chispas != null && !particulasActivas)
        {
            chispas.Play();
            particulasActivas = true;
        }
    }

    // ────────────────────────────────────────────────────────
    // Inicializa sliders con valores por defecto
    // ────────────────────────────────────────────────────────
    void InicializarSliders()
    {
        if (sliderVelocidad    != null) sliderVelocidad.value    = velocidadPulso;
        if (sliderEmision      != null) sliderEmision.value      = intensidadEmision;
        if (sliderDistorsion   != null) sliderDistorsion.value   = distorsionUV;
        if (sliderParticulas   != null) sliderParticulas.value   = tasaParticulas;
        if (sliderVelParticulas!= null) sliderVelParticulas.value = velocidadParticulas;
        if (sliderTamano       != null) sliderTamano.value       = tamanoParticulas;
    }

    // ────────────────────────────────────────────────────────
    // Lee los valores actuales de los sliders
    // ────────────────────────────────────────────────────────
    void LeerSliders()
    {
        if (sliderVelocidad    != null) velocidadPulso      = sliderVelocidad.value;
        if (sliderEmision      != null) intensidadEmision   = sliderEmision.value;
        if (sliderDistorsion   != null) distorsionUV        = sliderDistorsion.value;
        if (sliderParticulas   != null) tasaParticulas      = sliderParticulas.value;
        if (sliderVelParticulas!= null) velocidadParticulas = sliderVelParticulas.value;
        if (sliderTamano       != null) tamanoParticulas    = sliderTamano.value;
    }

    // ────────────────────────────────────────────────────────
    // Actualiza textos de la UI
    // ────────────────────────────────────────────────────────
    void ActualizarUI()
    {
        if (textoVelocidad  != null) textoVelocidad.text  = $"Velocidad pulso: {velocidadPulso:F1}";
        if (textoEmision    != null) textoEmision.text    = $"Emision: {intensidadEmision:F1}";
        if (textoDistorsion != null) textoDistorsion.text = $"Distorsion UV: {distorsionUV:F2}";
        if (textoParticulas != null) textoParticulas.text = $"Chispas/s: {tasaParticulas:F0}";
        if (textoEstado     != null) textoEstado.text     = particulasActivas ? "ACTIVO" : "PAUSADO";
    }
}