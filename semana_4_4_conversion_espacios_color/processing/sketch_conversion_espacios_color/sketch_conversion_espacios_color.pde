// ═══════════════════════════════════════════════════════════
// Taller - Conversión de Espacios de Color
// Processing
//
// Controles:
//   1 → imagen original (RGB)
//   2 → canal Hue (HSB)
//   3 → canal Saturation (HSB)
//   4 → canal Brightness (HSB)
//   5 → filtro Warm
//   6 → filtro Cool
//   7 → filtro Grayscale
//   8 → rueda de color HSB
//   R → rueda de color interactiva
//   Click → color picker sobre la imagen
// ═══════════════════════════════════════════════════════════

PImage imgOriginal;       // imagen cargada
PImage imgActual;         // imagen que se muestra
int modo = 1;             // modo actual de visualización
color colorSeleccionado;  // color bajo el cursor
boolean mostrarRueda = false;

// ── Variables del color picker ────────────────────────────
float picker_h, picker_s, picker_b;
int picker_r, picker_g, picker_b_val;

void setup() {
  size(900, 600);
  colorMode(RGB, 255);   // modo RGB para carga inicial

  // Cargamos la imagen desde data/
  imgOriginal = loadImage("imagen.jpg");

  // Redimensionamos para que quepa en la ventana
  imgOriginal.resize(600, 0);   // ancho 600, alto proporcional
  if (imgOriginal.height > 500) {
    imgOriginal.resize(0, 500);
  }

  imgActual = imgOriginal.copy();

  println("Imagen cargada: " + imgOriginal.width + "x" + imgOriginal.height);
  println("Controles: 1=RGB  2=Hue  3=Sat  4=Bright  5=Warm  6=Cool  7=Gray  8=Rueda  R=Rueda interactiva");
}

void draw() {
  background(20, 20, 30);

  if (mostrarRueda) {
    dibujarRuedaInteractiva();
  } else {
    // ── Imagen principal ───────────────────────────────────
    image(imgActual, 0, 0);

    // ── Panel lateral ─────────────────────────────────────
    dibujarPanelLateral();

    // ── Color picker bajo el cursor ───────────────────────
    if (mouseX < imgActual.width && mouseY < imgActual.height) {
      actualizarColorPicker();
      dibujarColorPicker();
    }
  }

  // ── Texto de modo actual ──────────────────────────────
  dibujarTituloModo();
}

// ════════════════════════════════════════════════════════════
// CONVERSIÓN RGB → HSB MANUAL
// Implementación del algoritmo estándar sin usar colorMode()
// ════════════════════════════════════════════════════════════
float[] rgbAhsb(float r, float g, float b) {
  // Normalizamos a [0,1]
  float rn = r / 255.0;
  float gn = g / 255.0;
  float bn = b / 255.0;

  float cmax = max(rn, max(gn, bn));
  float cmin = min(rn, min(gn, bn));
  float delta = cmax - cmin;

  // Brightness (Valor)
  float brightness = cmax;

  // Saturation
  float saturation = (cmax == 0) ? 0 : delta / cmax;

  // Hue
  float hue = 0;
  if (delta != 0) {
    if (cmax == rn) {
      hue = ((gn - bn) / delta) % 6;
    } else if (cmax == gn) {
      hue = (bn - rn) / delta + 2;
    } else {
      hue = (rn - gn) / delta + 4;
    }
    hue = hue / 6.0;   // normalizamos a [0,1]
    if (hue < 0) hue += 1.0;
  }

  return new float[]{hue, saturation, brightness};
}

// ════════════════════════════════════════════════════════════
// FILTROS DE COLOR
// ════════════════════════════════════════════════════════════

// Muestra el canal Hue de la imagen
PImage filtroHue() {
  PImage resultado = imgOriginal.copy();
  resultado.loadPixels();
  for (int i = 0; i < resultado.pixels.length; i++) {
    color c = resultado.pixels[i];
    float[] hsb = rgbAhsb(red(c), green(c), blue(c));
    float h = hsb[0] * 255;
    resultado.pixels[i] = color(h, h, h);
  }
  resultado.updatePixels();
  return resultado;
}

// Muestra el canal Saturation
PImage filtroSaturacion() {
  PImage resultado = imgOriginal.copy();
  resultado.loadPixels();
  for (int i = 0; i < resultado.pixels.length; i++) {
    color c = resultado.pixels[i];
    float[] hsb = rgbAhsb(red(c), green(c), blue(c));
    float s = hsb[1] * 255;
    resultado.pixels[i] = color(s, s, s);
  }
  resultado.updatePixels();
  return resultado;
}

// Muestra el canal Brightness
PImage filtroBrightness() {
  PImage resultado = imgOriginal.copy();
  resultado.loadPixels();
  for (int i = 0; i < resultado.pixels.length; i++) {
    color c = resultado.pixels[i];
    float[] hsb = rgbAhsb(red(c), green(c), blue(c));
    float bri = hsb[2] * 255;
    resultado.pixels[i] = color(bri, bri, bri);
  }
  resultado.updatePixels();
  return resultado;
}

// Filtro Warm: potencia rojos, reduce azules
PImage filtroWarm() {
  PImage resultado = imgOriginal.copy();
  resultado.loadPixels();
  for (int i = 0; i < resultado.pixels.length; i++) {
    color c = resultado.pixels[i];
    float r = constrain(red(c)   * 1.2, 0, 255);
    float g = constrain(green(c) * 1.05, 0, 255);
    float b = constrain(blue(c)  * 0.8, 0, 255);
    resultado.pixels[i] = color(r, g, b);
  }
  resultado.updatePixels();
  return resultado;
}

// Filtro Cool: potencia azules, reduce rojos
PImage filtroCool() {
  PImage resultado = imgOriginal.copy();
  resultado.loadPixels();
  for (int i = 0; i < resultado.pixels.length; i++) {
    color c = resultado.pixels[i];
    float r = constrain(red(c)   * 0.8, 0, 255);
    float g = constrain(green(c) * 0.95, 0, 255);
    float b = constrain(blue(c)  * 1.2, 0, 255);
    resultado.pixels[i] = color(r, g, b);
  }
  resultado.updatePixels();
  return resultado;
}

// Filtro Grayscale manual (luminancia perceptual)
PImage filtroGrayscale() {
  PImage resultado = imgOriginal.copy();
  resultado.loadPixels();
  for (int i = 0; i < resultado.pixels.length; i++) {
    color c = resultado.pixels[i];
    // Pesos de luminancia ITU-R BT.601
    float gray = red(c)*0.299 + green(c)*0.587 + blue(c)*0.114;
    resultado.pixels[i] = color(gray, gray, gray);
  }
  resultado.updatePixels();
  return resultado;
}

// ════════════════════════════════════════════════════════════
// COLOR PICKER
// ════════════════════════════════════════════════════════════
void actualizarColorPicker() {
  // Obtenemos el color del píxel bajo el cursor
  imgOriginal.loadPixels();
  int px = constrain(mouseX, 0, imgOriginal.width - 1);
  int py = constrain(mouseY, 0, imgOriginal.height - 1);
  colorSeleccionado = imgOriginal.pixels[py * imgOriginal.width + px];

  picker_r = (int)red(colorSeleccionado);
  picker_g = (int)green(colorSeleccionado);
  picker_b_val = (int)blue(colorSeleccionado);

  float[] hsb = rgbAhsb(picker_r, picker_g, picker_b_val);
  picker_h = hsb[0] * 360;
  picker_s = hsb[1] * 100;
  picker_b = hsb[2] * 100;
}

void dibujarColorPicker() {
  int px = 615;
  int py = 10;
  int pw = 275;

  // Fondo del picker
  fill(15, 15, 25, 220);
  stroke(80, 80, 120);
  strokeWeight(1);
  rect(px, py, pw, 120, 8);

  // Muestra del color
  fill(colorSeleccionado);
  noStroke();
  rect(px + 10, py + 10, 50, 50, 5);

  // Cursor de posición
  noFill();
  stroke(255);
  strokeWeight(1.5);
  ellipse(mouseX, mouseY, 12, 12);

  // Textos RGB y HSB
  fill(200, 200, 220);
  textSize(11);
  textAlign(LEFT);
  int tx = px + 75;
  text("RGB", tx, py + 25);
  text("R: " + picker_r + "  G: " + picker_g + "  B: " + picker_b_val, tx, py + 40);
  text("HSB", tx, py + 60);
  text("H: " + nf(picker_h, 0, 1) + "°", tx, py + 75);
  text("S: " + nf(picker_s, 0, 1) + "%  B: " + nf(picker_b, 0, 1) + "%", tx, py + 90);
  text("HEX: #" + hex(picker_r,2) + hex(picker_g,2) + hex(picker_b_val,2), tx, py + 105);
}

// ════════════════════════════════════════════════════════════
// PANEL LATERAL — controles e info
// ════════════════════════════════════════════════════════════
void dibujarPanelLateral() {
  int px = 615;
  int py = 145;
  int pw = 275;

  fill(15, 15, 25, 200);
  stroke(80, 80, 120);
  strokeWeight(1);
  rect(px, py, pw, 440, 8);

  fill(180, 180, 220);
  textSize(11);
  textAlign(LEFT);

  // Título
  fill(255, 200, 50);
  textSize(12);
  text("CONTROLES", px + 15, py + 25);

  // Lista de modos
  String[] modos = {
    "1 → RGB original",
    "2 → Canal Hue",
    "3 → Canal Saturacion",
    "4 → Canal Brightness",
    "5 → Filtro Warm",
    "6 → Filtro Cool",
    "7 → Grayscale",
    "8 → Rueda de color",
    "R → Rueda interactiva",
  };

  String[] coloresModo = {
    "#88bbee","#ff7043","#ffcc02","#c8e6c9",
    "#ff8a65","#80d8ff","#bdbdbd","#ce93d8","#80cbc4"
  };

  for (int i = 0; i < modos.length; i++) {
    // Resaltamos el modo activo
    boolean activo = (modo == i+1) || (modo == 9 && i == 8);
    if (activo) {
      fill(255, 220, 50);
      textSize(12);
    } else {
      fill(160, 160, 200);
      textSize(11);
    }
    text(modos[i], px + 15, py + 55 + i * 28);
  }

  // Info de imagen
  fill(100, 100, 140);
  strokeWeight(0.5);
  stroke(60, 60, 100);
  line(px + 10, py + 330, px + pw - 10, py + 330);

  fill(140, 140, 180);
  textSize(10);
  text("IMAGEN: " + imgOriginal.width + " x " + imgOriginal.height + " px", px + 15, py + 350);
  text("Click: color picker activo", px + 15, py + 368);
  text("Mueve el mouse sobre la imagen", px + 15, py + 386);
}

void dibujarTituloModo() {
  String[] titulos = {
    "", "RGB Original", "Canal Hue (HSB)",
    "Canal Saturacion (HSB)", "Canal Brightness (HSB)",
    "Filtro Warm", "Filtro Cool", "Grayscale",
    "Rueda de color HSB"
  };

  String titulo = (modo < titulos.length) ? titulos[modo] : "";

  fill(255, 220, 50, 200);
  textSize(13);
  textAlign(LEFT);
  text(titulo, 10, imgActual.height + 20);
}

// ════════════════════════════════════════════════════════════
// RUEDA DE COLOR HSB INTERACTIVA
// ════════════════════════════════════════════════════════════
void dibujarRuedaInteractiva() {
  int cx = width / 2;
  int cy = height / 2;
  int radio = 200;
  int radioInterno = 60;

  // Dibujamos la rueda píxel a píxel
  for (int x = cx - radio; x < cx + radio; x++) {
    for (int y = cy - radio; y < cy + radio; y++) {
      float dx = x - cx;
      float dy = y - cy;
      float dist = sqrt(dx*dx + dy*dy);

      if (dist > radioInterno && dist < radio) {
        // Ángulo → Hue, distancia → Saturation
        float angulo = atan2(dy, dx);
        float h = (angulo / TWO_PI + 1) % 1;   // [0,1]
        float s = map(dist, radioInterno, radio, 0.3, 1.0);
        float b = 1.0;

        // Convertimos HSB → RGB para colorear
        colorMode(HSB, 1.0);
        color c = color(h, s, b);
        colorMode(RGB, 255);

        stroke(c);
        point(x, y);
      }
    }
  }

  // Centro blanco
  fill(255);
  noStroke();
  ellipse(cx, cy, radioInterno*2, radioInterno*2);

  // Marcador del color bajo el cursor
  float dx = mouseX - cx;
  float dy = mouseY - cy;
  float dist = sqrt(dx*dx + dy*dy);

  if (dist > radioInterno && dist < radio) {
    float angulo = atan2(dy, dx);
    float h = (angulo / TWO_PI + 1) % 1;
    float s = map(dist, radioInterno, radio, 0.3, 1.0);

    colorMode(HSB, 1.0);
    color colorRueda = color(h, s, 1.0);
    colorMode(RGB, 255);

    // Marcador circular
    noFill();
    stroke(255);
    strokeWeight(2);
    ellipse(mouseX, mouseY, 18, 18);

    // Panel de info del color seleccionado
    fill(15, 15, 25, 220);
    stroke(80, 80, 120);
    strokeWeight(1);
    rect(20, 20, 220, 90, 8);

    fill(colorRueda);
    noStroke();
    rect(30, 30, 50, 50, 5);

    fill(200, 200, 220);
    textSize(11);
    textAlign(LEFT);
    text("H: " + nf(h*360, 0, 1) + "°", 95, 48);
    text("S: " + nf(s*100, 0, 1) + "%", 95, 65);
    text("B: 100%", 95, 82);
    text("#" + hex((int)red(colorRueda),2) +
              hex((int)green(colorRueda),2) +
              hex((int)blue(colorRueda),2), 95, 99);
  }

  // Instrucción
  fill(200, 200, 220);
  textSize(12);
  textAlign(CENTER);
  text("Rueda HSB interactiva — mueve el mouse | R para volver", cx, height - 20);
}

// ════════════════════════════════════════════════════════════
// TECLADO
// ════════════════════════════════════════════════════════════
void keyPressed() {
  if (key == 'r' || key == 'R') {
    mostrarRueda = !mostrarRueda;
    return;
  }

  if (mostrarRueda) return;

  modo = key - '0';   // convierte '1'→1, '2'→2, etc.

  switch(modo) {
    case 1: imgActual = imgOriginal.copy(); break;
    case 2: imgActual = filtroHue(); break;
    case 3: imgActual = filtroSaturacion(); break;
    case 4: imgActual = filtroBrightness(); break;
    case 5: imgActual = filtroWarm(); break;
    case 6: imgActual = filtroCool(); break;
    case 7: imgActual = filtroGrayscale(); break;
    case 8:
      mostrarRueda = false;
      imgActual = dibujarRuedaEstatica();
      break;
    default: modo = 1; imgActual = imgOriginal.copy(); break;
  }
}

// Rueda de color estática (modo 8) dibujada sobre un PImage
PImage dibujarRuedaEstatica() {
  PImage rueda = createImage(600, 500, RGB);
  rueda.loadPixels();

  int cx = 300;
  int cy = 250;
  int radio = 200;
  int radioInt = 60;

  for (int y = 0; y < rueda.height; y++) {
    for (int x = 0; x < rueda.width; x++) {
      float dx = x - cx;
      float dy = y - cy;
      float dist = sqrt(dx*dx + dy*dy);

      if (dist > radioInt && dist < radio) {
        float angulo = atan2(dy, dx);
        float h = (angulo / TWO_PI + 1) % 1;
        float s = map(dist, radioInt, radio, 0.2, 1.0);

        colorMode(HSB, 1.0);
        color c = color(h, s, 1.0);
        colorMode(RGB, 255);

        rueda.pixels[y * rueda.width + x] = c;
      } else if (dist <= radioInt) {
        rueda.pixels[y * rueda.width + x] = color(255);
      } else {
        rueda.pixels[y * rueda.width + x] = color(20, 20, 30);
      }
    }
  }

  rueda.updatePixels();
  return rueda;
}
