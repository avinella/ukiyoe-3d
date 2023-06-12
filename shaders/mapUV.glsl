vec2 mapUV(vec3 pos)
{
    vec2 tex_coord = pos.xy / pos.z;
    tex_coord.x *= windowDims.y / (2.0 * windowDims.x/windowDims.y);
    tex_coord.y *= windowDims.y / 2.0;
    tex_coord *= -0.5;
    tex_coord += 0.5;

    return tex_coord;
}