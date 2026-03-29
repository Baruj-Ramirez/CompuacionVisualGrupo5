Shader "Custom/ToonOutline"
{
    Properties
    {
        _OutlineColor     ("Outline Color",     Color)        = (0, 0, 0, 1)
        _OutlineThickness ("Outline Thickness", Range(0, 0.1)) = 0.02
    }

    SubShader
    {
        Tags { "RenderType"="Opaque" "RenderPipeline"="UniversalPipeline" }
        LOD 100

        Pass
        {
            Name "Outline"
            Tags { "LightMode"="UniversalForward" }

            Cull Front          // render back faces only → creates the hull

            HLSLPROGRAM
            #pragma vertex   vert
            #pragma fragment frag

            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"

            CBUFFER_START(UnityPerMaterial)
                float4 _OutlineColor;
                float  _OutlineThickness;
            CBUFFER_END

            struct Attributes
            {
                float4 positionOS : POSITION;
                float3 normalOS   : NORMAL;
            };

            struct Varyings
            {
                float4 positionCS : SV_POSITION;
            };

            Varyings vert(Attributes IN)
            {
                Varyings OUT;

                // Expand vertex along its normal in clip space
                // (view-space expansion avoids distortion on non-uniform scale)
                float3 posVS    = TransformWorldToView(
                                    TransformObjectToWorld(IN.positionOS.xyz));
                float3 normalVS = TransformWorldToViewDir(
                                    TransformObjectToWorldDir(IN.normalOS));

                posVS.xy       += normalize(normalVS.xy) * _OutlineThickness;
                OUT.positionCS  = TransformWViewToHClip(posVS);
                return OUT;
            }

            half4 frag(Varyings IN) : SV_Target
            {
                return _OutlineColor;
            }
            ENDHLSL
        }
    }
}