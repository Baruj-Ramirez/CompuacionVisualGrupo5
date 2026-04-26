Shader "Custom/ToonGradient"
{
    Properties
    {
        // --- Gradient ---
        _ColorBottom ("Color Bottom", Color) = (0.1, 0.3, 0.8, 1)
        _ColorTop    ("Color Top",    Color) = (0.9, 0.2, 0.4, 1)
        _GradientMin ("Gradient World Y Min", Float) = -1.0
        _GradientMax ("Gradient World Y Max", Float) = 1.0

        // --- Time Animation ---
        [Toggle] _EnableTimeAnim ("Enable Time Animation", Float) = 1
        _TimeSpeed   ("Time Speed",   Float) = 1.0
        _TimeStrength("Time Strength (Hue Shift)", Range(0,1)) = 0.3

        // --- Wireframe ---
        [Toggle] _Wireframe ("Wireframe Mode", Float) = 0
        _WireColor     ("Wire Color",     Color) = (1,1,1,1)
        _WireThickness ("Wire Thickness", Range(0.0, 0.05)) = 0.01
    }

    SubShader
    {
        Tags { "RenderType"="Opaque" "RenderPipeline"="UniversalPipeline" }
        LOD 100

        Pass
        {
            Name "ForwardUnlit"
            Tags { "LightMode"="UniversalForward" }

            HLSLPROGRAM
            #pragma vertex   vert
            #pragma geometry geom   // needed for wireframe barycentric coords
            #pragma fragment frag

            #pragma shader_feature _ENABLETIMEANIM_ON
            #pragma shader_feature _WIREFRAME_ON

            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"

            // ── Properties ──────────────────────────────────────────────
            CBUFFER_START(UnityPerMaterial)
                float4 _ColorBottom;
                float4 _ColorTop;
                float  _GradientMin;
                float  _GradientMax;

                float  _EnableTimeAnim;
                float  _TimeSpeed;
                float  _TimeStrength;

                float  _Wireframe;
                float4 _WireColor;
                float  _WireThickness;
            CBUFFER_END

            // ── Structs ──────────────────────────────────────────────────
            struct Attributes
            {
                float4 positionOS : POSITION;
            };

            struct Varyings
            {
                float4 positionCS  : SV_POSITION;
                float  worldY      : TEXCOORD0;
            };

            struct GeoOut
            {
                float4 positionCS  : SV_POSITION;
                float  worldY      : TEXCOORD0;
                float3 bary        : TEXCOORD1;   // barycentric coords for wireframe
            };

            // ── Utility: RGB ↔ HSV ──────────────────────────────────────
            float3 RGBtoHSV(float3 c)
            {
                float4 K = float4(0.0, -1.0/3.0, 2.0/3.0, -1.0);
                float4 p = c.g < c.b ? float4(c.bg, K.wz) : float4(c.gb, K.xy);
                float4 q = c.r < p.x ? float4(p.xyw, c.r) : float4(c.r, p.yzx);
                float d  = q.x - min(q.w, q.y);
                float e  = 1.0e-10;
                return float3(abs(q.z + (q.w - q.y) / (6.0*d + e)), d / (q.x + e), q.x);
            }

            float3 HSVtoRGB(float3 c)
            {
                float4 K = float4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
                float3 p = abs(frac(c.xxx + K.xyz) * 6.0 - K.www);
                return c.z * lerp(K.xxx, saturate(p - K.xxx), c.y);
            }

            // ── Vertex ───────────────────────────────────────────────────
            Varyings vert(Attributes IN)
            {
                Varyings OUT;
                VertexPositionInputs vpi = GetVertexPositionInputs(IN.positionOS.xyz);
                OUT.positionCS = vpi.positionCS;
                OUT.worldY     = vpi.positionWS.y;
                return OUT;
            }

            // ── Geometry (adds barycentric coords for wireframe) ─────────
            [maxvertexcount(3)]
            void geom(triangle Varyings IN[3], inout TriangleStream<GeoOut> stream)
            {
                GeoOut o;

                [unroll]
                for (int i = 0; i < 3; i++)
                {
                    o.positionCS = IN[i].positionCS;
                    o.worldY     = IN[i].worldY;

                    // assign one barycentric axis per vertex
                    if      (i == 0) o.bary = float3(1,0,0);
                    else if (i == 1) o.bary = float3(0,1,0);
                    else             o.bary = float3(0,0,1);

                    stream.Append(o);
                }
            }

            // ── Fragment ─────────────────────────────────────────────────
            half4 frag(GeoOut IN) : SV_Target
            {
                // 1. Vertical gradient
                float t = saturate((_GradientMax == _GradientMin) ? 0.5 :
                          (IN.worldY - _GradientMin) / (_GradientMax - _GradientMin));
                float4 col = lerp(_ColorBottom, _ColorTop, t);

                // 2. Time-based hue shift
                #if defined(_ENABLETIMEANIM_ON)
                {
                    float3 hsv  = RGBtoHSV(col.rgb);
                    hsv.x       = frac(hsv.x + _Time.y * _TimeSpeed * 0.1 * _TimeStrength);
                    col.rgb     = HSVtoRGB(hsv);
                }
                #endif

                // 3. Wireframe overlay
                #if defined(_WIREFRAME_ON)
                {
                    float minBary = min(IN.bary.x, min(IN.bary.y, IN.bary.z));
                    // fwidth gives screen-space derivative → stable thickness
                    float wire    = smoothstep(_WireThickness, _WireThickness * 1.5,
                                               minBary / fwidth(minBary));
                    col = lerp(_WireColor, col, wire);
                }
                #endif

                return col;
            }
            ENDHLSL
        }
    }
}