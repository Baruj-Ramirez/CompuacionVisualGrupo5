using UnityEngine;
using UnityEngine.InputSystem;

public class animations_event : MonoBehaviour
{

    public Animator animator;

    private animationState state = animationState.Idle;

    enum animationState { Idle, Walk, Jump, Wave };

    // Start is called once before the first execution of Update after the MonoBehaviour is created
    void Start()
    {
        animator = GetComponent<Animator>();
    }

    // Update is called once per frame
    void Update()
    {
        if (Input.GetMouseButtonDown(0)) {
            state = animationState.Wave;
        }
        else if(Input.GetKeyDown("w")) {
            state = animationState.Walk;
        }
        else if(Input.GetKeyDown("space")) {
            state = animationState.Jump;
        }
        else{
            state = animationState.Idle;
        }

        checkAnimations();
    }

    void checkAnimations(){
        switch(state){
            case animationState.Idle:
                animationIdle();
                break;
            case animationState.Walk:
                animationWalk();
                break;
            case animationState.Jump:
                animationJump();
                break;
            case animationState.Wave:
                animationWave();
                break;
        }
        
    }

    void animationWave(){
        Debug.Log("Wave");
        animator.SetTrigger("Wave");
    }

    void animationWalk(){
        Debug.Log("Walk");
        animator.SetTrigger("Walk");
    }

    void animationJump(){
        Debug.Log("Backflip");
        animator.SetTrigger("Jump");
    }    

    void animationIdle(){
        Debug.Log("Idle");
        animator.SetTrigger("Idle");
    }    

}
