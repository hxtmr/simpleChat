var uuid = require('uuid');

function generate() {
	return uuid.v1().replace(/-/g, '');
}

exports.generate = generate