const fp = require('path');
const jetpack = require('fs-jetpack');
const connect = require('connect');
const http = require('http');

class Mod {
	constructor(modFolder) {
		this.modFolder = fp.isAbsolute(modFolder) ? modFolder : fp.join(process.cwd(), modFolder);
		this.init();
	}
	init() {
		if (!(jetpack.exists(this.modFolder)))
			throw new Error(`the mod folder ${this.modFolder} does not exist.`);
		const metaPath = fp.join(this.modFolder, 'meta.cpp');
		if (!(jetpack.exists(this.modFolder)))
			throw new Error(`the mod meta file ${metaPath} does not exist.\nPlease use the Steam Workshop version of the mod.`);
		(jetpack.read(metaPath))
			.split('\r\n')
			.forEach(line => {
				if (line.match(/^publishedid/)) {
					this.publishedId = parseInt(line.slice(14, 14 + line.length - 15));
				} else if (line.match(/^name/)) {
					this.name = line.slice(8, 8 + line.length - 10);
				}
			});
		if (!this.name) {
			this.name = fp.basename(this.modFolder);
		}

		if (this.publishedId === 0) {
			throw new Error(`The publishedid is 0 in file ${metaPath}, this normally means the author of mod has not updated the mod.\nManually set the publishedid in ${metaPath} to the mods steam workshop id or ask the author to update the mod.`);
		}

		if (!this.publishedId) {
			throw new Error(`The mod meta file ${metaPath} does not contain a publishedid.\nThe file meta.cpp looks corrupted, verify mod files are correct.`);
		}
	}
}

function getMods() {
	const modArgument = process.argv.find(arg => !!arg.match(/^\-mod=/));
	if (!modArgument) throw new Error('Mod argument not found. Please include the comment line arguments: "-mod=..." arguments.');
	const modFolders = (modArgument.match(/^\-mod=(.*)$/)[1] || '')
		.split(';')
		.map(m => m.trim())
		.filter(m => m && m !== '')
		.map(m => new Mod(m));
	if (modFolders.length === 0) throw new Error('Mod argument found but is empty.');
	return modFolders;
}

function getPort() {
	const portArgument = process.argv.find(arg => !!arg.match(/^\-port=/));
	if (!portArgument) throw new Error('Port not set');
	return parseInt(portArgument.match(/^-port=([0-9]+)$/)[1]);
}

let mods;
try {
	mods = getMods();
} catch (err) {
	console.log(`There was a problem loading the mod:\n${err.message || err}`);
	return;
}

let port;
try {
	port = getPort();
} catch (err) {
	console.log('There was a problem get the port number.\nPlease set -port=0000, use the game port of the dayz server.');
	return;
}

const app = connect();
const modJson = JSON.stringify(mods.map(m => ({
	name: m.name,
	steamWorkshopId: m.publishedId
})));
app.use(require('compression')());
app.use('/', (_, res) => {
	res.setHeader('Content-Type', 'application/json');
	res.end(modJson);
});
http.createServer(app).listen(port + 10, err => {
	if (err) return console.log(`Error starting HTTP server: ${err}`);
	console.log(`HTTP server listening on port ${port + 10}`);
});