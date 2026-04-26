Shader "Custom/BlinnPhongURP"
{
    Properties
    {
        _Color ("Color", Color) = (1,1,1,1)
        _Kd ("Diffuse", Range(0,1)) = 1
        _Ks ("Specular", Range(0,1)) = 1
        _Shininess ("Shininess", Range(1,128)) = 32
    }

    SubShader
    {
        Tags { "RenderPipeline"="UniversalRenderPipeline" }

        Pass
        {
            HLSLPROGRAM

            #pragma vertex vert
            #pragma fragment frag

            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"

            struct Attributes
            {
                float4 positionOS : POSITION;
                float3 normalOS : NORMAL;
            };

            struct Varyings
            {
                float4 positionCS : SV_POSITION;
                float3 normalWS : TEXCOORD0;
                float3 positionWS : TEXCOORD1;
            };

            float4 _Color;
            float _Kd;
            float _Ks;
            float _Shininess;

            Varyings vert (Attributes IN)
            {
                Varyings OUT;

                OUT.positionWS = TransformObjectToWorld(IN.positionOS.xyz);
                OUT.positionCS = TransformWorldToHClip(OUT.positionWS);
                OUT.normalWS = TransformObjectToWorldNormal(IN.normalOS);

                return OUT;
            }

            half4 frag (Varyings IN) : SV_Target
            {
                float3 N = normalize(IN.normalWS);
                float3 L = normalize(_MainLightPosition.xyz);
                float3 V = normalize(_WorldSpaceCameraPos - IN.positionWS);

                float3 H = normalize(L + V);

                float diff = max(dot(N,L),0);
                float spec = pow(max(dot(N,H),0), _Shininess);

                float3 color =
                    _Color.rgb * diff * _Kd +
                    spec * _Ks;

                return float4(color,1);
            }

            ENDHLSL
        }
    }
}