#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif

#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif

// Cel Shading -- also changes alpha
vec3 lighting = outgoingLight / texture2D(map, vMapUv).xyz;
float shadow_thresh = 0.3;
float shadow_out = 1.0;
if (dot(lighting.xyz * vec3(0.3, 0.59, 0.11), vec3(1.0)) < shadow_thresh) {
    shadow_out = 0.3;
    outgoingLight *= 0.3;
} else if (dot(lighting.xyz * vec3(0.3, 0.59, 0.11), vec3(1.0)) < shadow_thresh + 0.1) {
    shadow_out = 0.5;
    outgoingLight *= 0.6;
}

// LINE PARAMETERS
float a = 0.9;
float thinness = 0.4;
float threshold = 0.4;
float opacity = 0.8;
float ampl = 2.0;

// Edge detection
int strength = 15;
mat3 sobel_h;
sobel_h[0] = vec3(-1, 0, 1);
sobel_h[1] = vec3(-strength, 0, strength);
sobel_h[2] = vec3(-1, 0, 1);
mat3 sobel_v;
sobel_v[0] = vec3(-1, -strength, -1);
sobel_v[1] = vec3(0, 0, 0);
sobel_v[2] = vec3(1, strength, 1);

vec2 tex_c = vViewPosition.xy / (vViewPosition.z);
vec2 tex_size = vec2(textureSize(depthBaked, 0));
tex_c.x *= windowDims.y / (2.0 * windowDims.x/windowDims.y);
tex_c.y *= windowDims.y / 2.0;
tex_c *= -0.5;
tex_c += 0.5;
vec4 norm = texture2D(normalBaked, tex_c);
vec4 d = texture2D(depthBaked, tex_c);
float g = dot(((norm.xyz * a) + (d.xyz * (1.0 - a)))* vec3(0.3, 0.59, 0.11), vec3(1.0));
float edge_h = 0.0;
float edge_v = 0.0;

for(int i = 0; i < 9; i++) {
    int delta_x = (i % 3) - 1;
    int delta_y = (i / 3) - 1;
    vec2 tex_coord = (vViewPosition.xy)/ (vViewPosition.z);
    tex_coord.x *= windowDims.y / (2.0 * windowDims.x/windowDims.y);
    tex_coord.y *= windowDims.y / 2.0;
    tex_coord *= -0.5;
    tex_coord += 0.5;
    vec2 offset = vec2(delta_x, delta_y) / (tex_size * thinness);
    vec4 depth_curr = texture2D(depthBaked, tex_coord + offset);
    vec4 normal_curr = texture2D(normalBaked, tex_coord + offset);
    vec3 gray_curr = ((depth_curr.xyz * a) + (normal_curr.xyz * (1.0 - a))) * vec3(0.3, 0.59, 0.11);
    edge_h += sobel_h[delta_x + 1][delta_y + 1] * dot(gray_curr, vec3(1.0));
    edge_v += sobel_v[delta_x + 1][delta_y + 1] * dot(gray_curr, vec3(1.0));
}
float edge = sqrt(pow(edge_h, 2.0) + pow(edge_v, 2.0));
if (edge > threshold) {
    vec3 line = vec3(0.04, 0.02, 0.0);
    outgoingLight = mix(outgoingLight, line, opacity);
    shadow_out = 1.0;
}
// outgoingLight = vec3(edge);
// outgoingLight = vec3(g);

float fade = tex_c.y + 0.4;
vec3 adjust = vec3(1.05, 1.03, 1.0);

gl_FragColor = vec4( outgoingLight , shadow_out * fade );