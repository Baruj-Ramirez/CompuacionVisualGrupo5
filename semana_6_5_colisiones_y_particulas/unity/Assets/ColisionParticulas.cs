using UnityEngine;

/// <summary>
/// ColisionParticulas - Unity URP
/// Spawns a particle effect on trigger collision, adapting color/shape and playing
/// a sound depending on the tag of the object that enters the trigger.
///
/// SETUP REQUIREMENTS:
///  1. Add a Collider to this GameObject and enable "Is Trigger".
///  2. Assign a ParticleSystem prefab (or scene object) to the "efecto" field.
///  3. Assign an AudioSource component (on any GameObject) to "fuenteAudio".
///  4. Populate the "configuraciones" array with one entry per tag you want to handle.
/// </summary>
public class ColisionParticulas : MonoBehaviour
{
    // -------------------------------------------------------------------------
    // Inspector-exposed data
    // -------------------------------------------------------------------------

    [Tooltip("ParticleSystem that will be played on collision.")]
    public ParticleSystem efecto;

    [Tooltip("AudioSource used to play collision sounds.")]
    public AudioSource fuenteAudio;

    [Tooltip("One configuration entry per object tag.")]
    public TagConfig[] configuraciones;

    // -------------------------------------------------------------------------
    // Inner configuration class (serializable so it appears in the Inspector)
    // -------------------------------------------------------------------------

    [System.Serializable]
    public class TagConfig
    {
        [Tooltip("Tag of the colliding object (e.g. 'Enemy', 'Wall', 'Player').")]
        public string tag;

        [Header("Color")]
        [Tooltip("Main particle color for this tag.")]
        public Color colorInicio   = Color.white;
        [Tooltip("End color of the gradient (optional).")]
        public Color colorFin      = Color.white;

        [Header("Shape")]
        [Tooltip("Emission shape to use for this tag.")]
        public ParticleSystemShapeType forma = ParticleSystemShapeType.Sphere;
        [Tooltip("Radius / size of the emission shape.")]
        [Range(0.01f, 5f)]
        public float radioForma    = 0.5f;

        [Header("Size & Speed")]
        [Tooltip("Override start size (0 = keep original).")]
        [Range(0f, 5f)]
        public float tamanoInicio  = 0f;
        [Tooltip("Override start speed (0 = keep original).")]
        [Range(0f, 20f)]
        public float velocidadInicio = 0f;

        [Header("Audio")]
        [Tooltip("Sound clip to play when this tag collides.")]
        public AudioClip sonido;
        [Range(0f, 1f)]
        public float volumen       = 1f;
    }

    // -------------------------------------------------------------------------
    // Trigger callback
    // -------------------------------------------------------------------------

    private void OnTriggerEnter(Collider other)
    {
        // Find the configuration that matches the colliding object's tag
        TagConfig cfg = BuscarConfig(other.tag);

        if (efecto != null)
        {
            // Position at the closest surface point of the collider
            Vector3 puntoContacto = other.ClosestPoint(transform.position);
            efecto.transform.position = puntoContacto;

            // Apply tag-specific settings before playing
            if (cfg != null)
            {
                AplicarColor(cfg);
                AplicarForma(cfg);
                AplicarTamanoVelocidad(cfg);
            }

            // Stop any current playback and restart
            efecto.Stop(true, ParticleSystemStopBehavior.StopEmittingAndClear);
            efecto.Play();
        }

        // Play sound
        if (cfg != null && cfg.sonido != null && fuenteAudio != null)
        {
            fuenteAudio.PlayOneShot(cfg.sonido, cfg.volumen);
        }
    }

    // -------------------------------------------------------------------------
    // Helper – find config by tag
    // -------------------------------------------------------------------------

    private TagConfig BuscarConfig(string tag)
    {
        if (configuraciones == null) return null;
        foreach (var cfg in configuraciones)
        {
            if (cfg.tag == tag) return cfg;
        }
        return null;   // No matching config – effect still plays with original settings
    }

    // -------------------------------------------------------------------------
    // Particle system modifiers
    // -------------------------------------------------------------------------

    private void AplicarColor(TagConfig cfg)
    {
        var main = efecto.main;

        // Build a two-color gradient from colorInicio to colorFin
        Gradient gradiente = new Gradient();
        gradiente.SetKeys(
            new GradientColorKey[]
            {
                new GradientColorKey(cfg.colorInicio, 0f),
                new GradientColorKey(cfg.colorFin,    1f)
            },
            new GradientAlphaKey[]
            {
                new GradientAlphaKey(1f, 0f),
                new GradientAlphaKey(0f, 1f)   // fade out at end of lifetime
            }
        );

        main.startColor = new ParticleSystem.MinMaxGradient(gradiente);
    }

    private void AplicarForma(TagConfig cfg)
    {
        var shape       = efecto.shape;
        shape.enabled   = true;
        shape.shapeType = cfg.forma;

        // Set the relevant size property based on shape type
        switch (cfg.forma)
        {
            case ParticleSystemShapeType.Sphere:
            case ParticleSystemShapeType.Hemisphere:
                shape.radius = cfg.radioForma;
                break;
            case ParticleSystemShapeType.Circle:
                shape.radius = cfg.radioForma;
                break;
            case ParticleSystemShapeType.Box:
                shape.scale  = Vector3.one * cfg.radioForma;
                break;
            case ParticleSystemShapeType.Cone:
                shape.angle  = cfg.radioForma * 10f;   // treat radioForma as angle factor
                break;
            default:
                shape.radius = cfg.radioForma;
                break;
        }
    }

    private void AplicarTamanoVelocidad(TagConfig cfg)
    {
        var main = efecto.main;

        if (cfg.tamanoInicio > 0f)
            main.startSize  = cfg.tamanoInicio;

        if (cfg.velocidadInicio > 0f)
            main.startSpeed = cfg.velocidadInicio;
    }
}