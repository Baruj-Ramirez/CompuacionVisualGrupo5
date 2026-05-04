using UnityEngine;

public class ObjectAnimator : MonoBehaviour
{
    private float       _rotSpeed;
    private float       _floatAmplitude;
    private float       _floatFrequency;
    private bool        _floatEnabled;
    private float       _baseY;
    private float       _timeOffset;    // offset para que no todos floten sincronizados
    private ObjectPoint _data;

    public void Initialize(ObjectPoint data, ObjectData config, float rotSpeed)
    {
        _data          = data;
        _rotSpeed      = rotSpeed;
        _baseY         = transform.position.y;
        _timeOffset    = Random.Range(0f, Mathf.PI * 2f);

        if (config != null)
        {
            _floatEnabled   = config.floatAnimation;
            _floatAmplitude = config.floatAmplitude;
            _floatFrequency = config.floatFrequency;
        }
        else
        {
            _floatEnabled   = true;
            _floatAmplitude = 0.3f;
            _floatFrequency = 1f;
        }
    }

    void Update()
    {
        // ── Rotación continua ──────────────────────────────────────────────────
        transform.Rotate(
            Vector3.up   * _rotSpeed   * Time.deltaTime * 60f,
            Space.World
        );
        transform.Rotate(
            Vector3.right * _rotSpeed * 0.25f * Time.deltaTime * 60f,
            Space.World
        );

        // ── Flotación sinusoidal ───────────────────────────────────────────────
        if (_floatEnabled)
        {
            float yOffset = Mathf.Sin(
                (Time.time * _floatFrequency + _timeOffset)
            ) * _floatAmplitude * _data.value;

            Vector3 pos = transform.position;
            pos.y = _baseY + yOffset;
            transform.position = pos;
        }
    }
}