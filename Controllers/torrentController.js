const Transmission = require('transmission');
const Path = require('path');
const mongoose = require('mongoose');
const Util = require('util');
const exec = require('child_process').execSync;

const Movie = mongoose.model('Movie');

const transmission = new Transmission({
	port: '9091',
	host: '127.0.0.1',
	username: '',
	password: '',
});

// Controlling global session

exports.getTransmissionStats = () => {
	transmission.sessionStats(callback = (err, result) => {
		if (err) {
			console.log(err);
		}
		return result;
	});
};

exports.freeSpace = (path) => {
	transmission.freeSpace(path, callback = (err, result) => {
		if (err) {
			console.log(err);
		}
		return result;
	});
};

// Controlling queue

exports.addTorrentUrlToQueue = url => new Promise((resolve, reject) => {
	transmission.addUrl(url, {
		'download-dir': process.env.DOWNLOAD_DIR,
	}, (err, result) => {
		if (err) {
			reject(err);
		}
		console.log(`Added Torrent with ID: ${result.id}`);
		resolve(result.id);
	});
});

exports.addTorrent = async (req, res, next) => {
	const mov = await Movie.findOne({ _id: req.params.id });
	const magnet = mov.magnet;
	transmission.addUrl(magnet, {
		'download-dir': process.env.DOWNLOAD_DIR,
	}, (err, result) => {
		if (err) {
			console.log(err);
			res.send('error while adding torrent');
		}
		req.id = result.id;
		console.log(`Added Torrent. ID: ${req.id}`);
		return next();
	});
};

const isPlayable = (movieBytes) => {
	if (!movieBytes) {
		return false;
	}
	for (let i = 2; i < 10; i += 1) {
		if (movieBytes[i] === '0') {
				return false;
		}
	}
	return true;
};

const getMovieStatus = (infos, movie) => {
	const movieBytes = exec(`./transmission-remote -t ${movie.hash} -ic`,
		{ cwd: './transmission/source-code/Transmission-svn/build/Debug/' }).toString('utf8');
	if (infos && infos.length > 0
		&& ((infos[0].eta > 0
			&& infos[0].eta < movie.length * 60
			&& isPlayable(movieBytes))
		|| infos[0].percentDone === 1)) {
		return true;
	}
	return false;
};

exports.getTorrentStatus = async (req, res) => {
	const movie = await Movie.findOne({ _id: req.params.id });
	transmission.get(movie.hash, async (err, result) => {
		if (err) {
			res.send(err);
		}
		if (getMovieStatus(result.torrents, movie)) {
			let filePath = null;
			let mlen = 0;
			result.torrents[0].files.forEach((file) => {
				if (file.length > mlen) {
					mlen = file.length;
					filePath = file.name;
				}
			});
			movie.file = {
				path: filePath,
				expires: Date.now(),
			};
			await movie.save();
			return res.send(true);
		}
		// return res.json(result.torrents[0]);
		return res.send(false);
	});
};

exports.deleteTorrent = (hash) => {
	transmission.remove(hash, true, (err, arg) => {
		if (err) {
			console.log(err);
		}
	});
};

exports.addTorrentFileToQueue = (filePath) => {
	transmission.addFile(filePath, callback(err, result));
};

exports.removeTorrentFromQueue = (torrentId) => {
	transmission.remove(id, callback(err, result));
};

exports.startAllActiveTorrent = () => {
	transmission.active((err, result) => {
		if (err) {
			console.log(err);
		} else {
			for (i = 0; i < result.torrents.length; i + 1) {
				stopTorrents(result.torrents[i].id);
			}
		}
	});
};

exports.stopAllActiveTorrents = () => {
	transmission.active((err, result) => {
		if (err) {
			console.log(err);
		} else {
			for (i = 0; i < result.torrents.length; i + 1) {
				stopTorrents(result.torrents[i].id);
			}
		}
	});
};

// Controlling torrents

exports.getTorrentInformations = (torrentId) => {
	transmission.get(parseInt(torrentId, 10), callback = (err, result) => {
		if (err) {
			throw err;
		}
		if (result.torrents.length > 0) {
			console.log(result.torrents[0]);
			return result.torrents[0];
		}
		return false;
	});
};

exports.startTorrent = (torrentId) => {
	transmission.start(torrentId, (err, result) => {});
};

exports.stopTorrent = (torrentId) => {
	transmission.stop(torrentId, (err, result) => {});
};

exports.getAllActiveTorrents = () => {
	transmission.active(callback = (err, result) => {
		if (err) {
			console.log(err);
		} else {
			for (i = 0; i < result.torrents.length; i + 1) {
				console.log(result.torrents[i].id);
				console.log(result.torrents[i].name);
			}
		}
	});
};

exports.verify = (torrentId) => {
	transmission.verify(torrentId, (err, arg) => {
		console.log(arg);
		return arg;
	});
};

exports.files = (torrentId) => {
	transmission.files(torrentId, (err, arg) => {
		console.log(Util.inspect(arg, { showHidden: false, depth: null }));
		return arg;
	});
};
