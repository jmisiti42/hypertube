const mongoose = require('mongoose');
// const ffmpeg = require('fluent-ffmpeg');
const ffmpeg = require('stream-transcoder');
const mime = require('mime');
const fs = require('fs');
const path = require('path');

const Movie = mongoose.model('Movie');

exports.getVideoPath = async (req, res, next) => {
	const mov = await Movie.findOne({ _id: req.query.id });
	if (!mov || !mov.file.path) {
		return res.send('No Movie or no Path yet');
	}
	req.fpath = mov.file.path;
	return next();
};

exports.streamVideo = (req, res) => {
	const full = path.join(process.env.DOWNLOAD_DIR, req.fpath);
	const part = path.join(process.env.DOWNLOAD_DIR, `${req.fpath}.part`);
	let fpath, mimeType;
	if (fs.existsSync(full)) {
		fpath = full;
		mimeType = fpath.split('.')[fpath.split('.').length - 1];
	} else {
		fpath = part;
		mimeType = fpath.split('.')[fpath.split('.').length - 2];
		console.log('Just a check', fpath.split('.')[fpath.split('.').length - 1]);
	}
	console.log(mimeType);
	// const fpath = '/Users/ben/goinfre/bunny.mkv';
	// console.log('Comes in with path: ', fpath);
	const size = fs.statSync(fpath).size;
	const range = req.headers.range;

	if (range) {
		const parts = range.replace(/bytes=/, '').split('-');
		const start = parseInt(parts[0], 10);
		const end = parts[1] ? parseInt(parts[1], 10) : size - 1;
		const chunksize = (end - start) + 1;
		const file = fs.createReadStream(fpath, { start, end });
		if (mime.lookup(fpath) !== 'video/mp4') {
			console.log('NOT MP4 range', mime.lookup(fpath));
			new ffmpeg(fpath)
				.maxSize(320, 240)
				.videoCodec('h264')
				.videoBitrate(800 * 1000)
				.fps(25)
				.audioCodec('aac')
				.sampleRate(44100)
				.channels(2)
				.audioBitrate(128 * 1000)
				.format('mp4')
				.on('error', (err, stdout, stderr) => {
					// console.log('ERROR	: ', err);
					// console.log('STDOUT	: ', stdout);
				})
				.on('progress', (progress) => {
					// console.log('PROGESS %	: ', progress.progress);
					// console.log('FRAME	: ', progress.frame);
					// console.log('FPS	: ', progress.fps);
				})
				.stream().pipe(res);
		} else {
			const head = {
				'Content-Range': `bytes ${start}-${end}/${size}`,
				'Accept-Ranges': 'bytes',
				'Content-Length': chunksize,
				'Content-Type': 'video/mp4',
			};
			res.writeHead(206, head);
			file.pipe(res);
		}
	} else {
	if (mime.lookup(fpath) !== 'video/mp4') {
		console.log('NOT MP4');
		new ffmpeg(fpath)
			.maxSize(320, 240)
			.videoCodec('h264')
			.videoBitrate(800 * 1000)
			.fps(25)
			.audioCodec('aac')
			.sampleRate(44100)
			.channels(2)
			.audioBitrate(128 * 1000)
			.format('mp4')
			.on('error', (err, stdout, stderr) => {
				// console.log('ERROR	: ', err);
				// console.log('STDOUT	: ', stdout);
			})
			.on('progress', (progress) => {
				// console.log('PROGESS %	: ', progress.progress);
				// console.log('FRAME	: ', progress.frame);
				// console.log('FPS	: ', progress.fps);
				const head = {
					'Content-Length': progess.size,
					'Content-Type': 'video/mp4',
				};
				res.writeHead(200, head);
			})
			.on('metadata', (data) => {
				console.log(data);
			})
			.stream().pipe(res);

	} else {
		const head = {
			'Content-Length': size,
			'Content-Type': 'video/mp4',
		};
		res.writeHead(200, head);
		fs.createReadStream(fpath).pipe(res);
	}
}
};
