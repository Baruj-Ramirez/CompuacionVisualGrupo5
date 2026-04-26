using UnityEngine;
using UnityEngine.InputSystem;

public class TorchLight : MonoBehaviour {
    public Light torchLight;
    public float minIntensity = Mathf.PingPong(1, 1);
    public float maxIntensity = Mathf.PingPong(2, 50);

    private Animator animator;

    public LightEnumState lightState;

    public health_bar vida; 

    public enum LightEnumState{
        ON,
        OFF
    }

    void Start() {
        lightState = LightEnumState.ON;
        animator = GetComponent<Animator>();
    }

    void Update(){
        if (Mouse.current.leftButton.wasPressedThisFrame) {
            animate_torch();
            changeState();
            vida.takeDamage();
            
        }
    }

    void changeState(){
        if(lightState == LightEnumState.ON){
            torchLight.intensity = minIntensity;
            lightState = LightEnumState.OFF;
            Debug.Log("Change to OFF");
        }
        else if(lightState == LightEnumState.OFF){
            torchLight.intensity = maxIntensity;
            lightState = LightEnumState.ON;
            Debug.Log("Change to ON");
        }
    }

    void animate_torch(){
        if(lightState == LightEnumState.ON){
            animator.Play("Linterna_animation_off");
        }
        else if(lightState == LightEnumState.OFF){
            animator.Play("Linterna_animation_on");
        }
    }

}