module.exports = function (api) {
	api.cache(true);

	const noModules = String(process.env.BABEL_NO_MODULES) === 'true';

	const rename = {};
	const mangle = require('./mangle.json');
	for (let prop in mangle.props.props) {
		let name = prop;
		if (name[0] === '$') {
			name = name.slice(1);
		}

		rename[name] = mangle.props.props[prop];
	}

	return {
		presets: [
			[
				'@babel/preset-env',
				{
					loose: true,
					// Don't transform modules when using esbuild
					modules: noModules ? false : 'auto',
					exclude: ['@babel/plugin-transform-typeof-symbol'],
					targets: {
						browsers: [
							'chrome >= 40',
							'safari >= 9',
							'firefox >= 36',
							'edge >= 12',
							'not dead'
						]
					}
				}
			]
		],
		plugins: [
			'@babel/plugin-transform-react-jsx',
			['babel-plugin-transform-rename-properties', { rename }]
		],
		include: ['**/src/**/*.js', '**/test/**/*.js'],
		overrides: [
			{
				test: /(component-stack|debug)\.test\.js$/,
				plugins: ['@babel/plugin-transform-react-jsx-source']
			}
		]
	};
};
