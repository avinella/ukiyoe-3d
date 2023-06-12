const NoiseShader = {

	name: 'NoiseShader',

	uniforms: {

		'tDiffuse': { value: null },
		'seed': { value: 1.0}

	},

	vertexShader: /* glsl */`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,

	fragmentShader: /* glsl */`

		uniform float seed;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

        float random( vec2 p )
        {
        vec2 K1 = vec2(
        23.14069263277926, // e^pi (Gelfond's constant)
        2.665144142690225 // 2^sqrt(2) (Gelfond–Schneider constant)
        );
        return fract( cos( dot(p,K1) ) * 12345.6789 );
        }

		void main() {

			vec4 color = texture2D( tDiffuse, vUv );
            vec2 uvRandom = vUv;
            uvRandom.y *= random(vec2(uvRandom.y, seed));
            gl_FragColor.xyz = color.xyz + random(uvRandom) * 0.10;
			gl_FragColor.a = 1.0;


		}`

};

export { NoiseShader };