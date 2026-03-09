Shader "Custom/URP/WaveGeometryShader"
{
    Properties
    {
        _MainTex ("Texture", 2D) = "white" {}
        _Color ("Tint", Color) = (1,1,1,1)

        _WaveAmplitude ("Wave Amplitude", Float) = 0.2
        _WaveFrequency ("Wave Frequency", Float) = 2

        _Extrusion ("Normal Extrusion", Float) = 0.05

        _DebugMode ("Debug Mode (0=off,1=UV,2=Normals,3=Lighting)", Float) = 0
    }

    SubShader
    {
        Tags { "RenderPipeline"="UniversalPipeline" "RenderType"="Opaque"}

        Pass
        {
            HLSLPROGRAM

            #pragma vertex vert
            #pragma geometry geom
            #pragma fragment frag

            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"

            struct Attributes
            {
                float4 positionOS : POSITION;
                float3 normalOS   : NORMAL;
                float2 uv         : TEXCOORD0;
            };

            struct Varyings
            {
                float4 positionCS : SV_POSITION;
                float3 positionWS : TEXCOORD1;
                float3 normalWS   : TEXCOORD2;
                float2 uv         : TEXCOORD0;
            };

            TEXTURE2D(_MainTex);
            SAMPLER(sampler_MainTex);

            float4 _Color;

            float _WaveAmplitude;
            float _WaveFrequency;

            float _Extrusion;

            float _DebugMode;

            //---------------------------------------
            // VERTEX SHADER
            //---------------------------------------

            Varyings vert(Attributes IN)
            {
                Varyings OUT;

                // Object → World
                float3 positionWS = TransformObjectToWorld(IN.positionOS.xyz);

                // deformación sinusoidal
                positionWS.y += sin(positionWS.x * _WaveFrequency + _Time.y) * _WaveAmplitude;

                // normal world
                float3 normalWS = TransformObjectToWorldNormal(IN.normalOS);

                // World → Clip
                float4 positionCS = TransformWorldToHClip(positionWS);

                OUT.positionCS = positionCS;
                OUT.positionWS = positionWS;
                OUT.normalWS = normalWS;
                OUT.uv = IN.uv;

                return OUT;
            }

            //---------------------------------------
            // GEOMETRY SHADER
            //---------------------------------------

            [maxvertexcount(3)]
            void geom(triangle Varyings IN[3], inout TriangleStream<Varyings> triStream)
            {
                for (int i = 0; i < 3; i++)
                {
                    Varyings v = IN[i];

                    // extrusión en dirección de la normal
                    v.positionWS += normalize(v.normalWS) * _Extrusion;

                    v.positionCS = TransformWorldToHClip(v.positionWS);

                    triStream.Append(v);
                }
            }

            //---------------------------------------
            // FRAGMENT SHADER
            //---------------------------------------

            float4 frag(Varyings IN) : SV_Target
            {
                float3 normal = normalize(IN.normalWS);

                // dirección de luz principal
                float3 lightDir = normalize(_MainLightPosition.xyz);

                // Lambert
                float NdotL = saturate(dot(normal, lightDir));

                // textura
                float4 tex = SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, IN.uv);

                // gradiente procedural
                float gradient = IN.positionWS.y * 0.5 + 0.5;

                // pattern procedural
                float pattern = sin(IN.uv.x * 20) * sin(IN.uv.y * 20);

                float3 color = tex.rgb * NdotL;

                color *= lerp(0.5, 1.5, gradient);

                color += pattern * 0.1;

                color *= _Color.rgb;

                //---------------------------------------
                // DEBUG MODES
                //---------------------------------------

                if (_DebugMode == 1)
                    return float4(IN.uv,0,1);

                if (_DebugMode == 2)
                    return float4(normal * 0.5 + 0.5,1);

                if (_DebugMode == 3)
                    return float4(NdotL,NdotL,NdotL,1);

                return float4(color,1);
            }

            ENDHLSL
        }
    }
}
