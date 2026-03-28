PVector lightDir;

void setup(){
  size(600,600,P3D);
  lightDir = new PVector(0.5, -0.5, -1);
  lightDir.normalize();
}

void draw(){
  background(0);
  translate(width/2, height/2);
  rotateY(frameCount*0.01);
  
  renderSphere(200, 20);
}

void renderSphere(float r, int detail){

  for(int i=0;i<detail;i++){
    
    float lat1 = map(i,0,detail,-HALF_PI,HALF_PI);
    float lat2 = map(i+1,0,detail,-HALF_PI,HALF_PI);
    
    beginShape(TRIANGLE_STRIP);G
    
    for(int j=0;j<=detail;j++){
      
      float lon = map(j,0,detail,-PI,PI);
      
      vertexSphere(lat1,lon,r);
      vertexSphere(lat2,lon,r);
      
    }
    
    endShape();
  }
}

void vertexSphere(float lat,float lon,float r){

  float x = r*cos(lat)*cos(lon);
  float y = r*sin(lat);
  float z = r*cos(lat)*sin(lon);

  //Calculo de la normal en cada punto de la esfera
  PVector normal = new PVector(x,y,z);
  normal.normalize();

  //Ecuacion de Lambert, entre 0 y 1, 0=negro 1=blanco
  float diffuse = max(0, normal.dot(lightDir));

  //Gradiente de iluminacion
  float brightness = diffuse*255;
  fill(brightness);
  
  noStroke();

  vertex(x,y,z);
}
