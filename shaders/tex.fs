uniform sampler2D texture2;

varying vec2 vUv;

void main() {
    vec4 texColor = texture2D(texture2, vUv);
    gl_FragColor = texColor;
}