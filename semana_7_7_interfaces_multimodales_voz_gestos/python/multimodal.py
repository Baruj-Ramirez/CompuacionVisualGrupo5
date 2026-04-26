import cv2
import mediapipe as mp
import speech_recognition as sr
import threading
import numpy as np
import sounddevice as sd # Cambio clave aquí

# --- CONFIGURACIÓN GLOBAL ---
current_voice_command = ""
lock = threading.Lock()

obj_x, obj_y = 320, 240
obj_color = (0, 255, 0)
obj_radius = 50

# --- NUEVA FUNCIÓN DE VOZ CON SOUNDDEVICE ---
def listen_to_voice():
    global current_voice_command
    recognizer = sr.Recognizer()
    
    # Configuramos el sample rate estándar
    sample_rate = 16000 
    
    print("[VOZ] Iniciando escucha con SoundDevice...")
    
    while True:
        try:
            # Grabamos un pequeño fragmento de audio (3 segundos)
            # Esto reemplaza el uso de sr.Microphone() que depende de PyAudio
            duration = 3 
            recording = sd.rec(int(duration * sample_rate), samplerate=sample_rate, channels=1, dtype='int16')
            sd.wait() # Espera a que termine la grabación
            
            # Convertimos la grabación a un formato que SpeechRecognition entienda
            audio_data = sr.AudioData(recording.tobytes(), sample_rate, 2)
            
            text = recognizer.recognize_google(audio_data, language="es-ES").lower()
            print(f"[VOZ] Escuchado: {text}")
            
            with lock:
                if "azul" in text: current_voice_command = "azul"
                elif "rojo" in text: current_voice_command = "rojo"
                elif "mover" in text: current_voice_command = "mover"
                elif "reset" in text: current_voice_command = "reset"
                
        except Exception as e:
            # Silenciamos errores comunes de ruido o falta de habla
            pass

# --- EL RESTO DEL CÓDIGO (main, count_fingers, etc.) SIGUE IGUAL ---
# (Copia el resto del código del primer mensaje a partir de count_fingers)