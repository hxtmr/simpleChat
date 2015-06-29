//展示系统的内存及数据库连接展示情况。适配器的运行情况（不会查询数据库，避免数据库连接不可用的时候页面无法显示）
var db = require('../../db');
var adapterPool = require('../../models/cache/adapter-task-queue');
exports.index = function(req, res) {
	var dbPool = db.getPoolState();
	var adapter = adapterPool.getAll();
	var memoray = process.memoryUsage();
	memoray.rss = memoray.rss / 1024 / 1024; //byte转为M
	memoray.heapTotal = memoray.heapTotal / 1024 / 1024;
	memoray.heapUsed = memoray.heapUsed / 1024 / 1024;
	var pid = process.pid;
	var version = process.version;
	res.render('run2', {
		dbPool: dbPool,
		adapter: adapter,
		memoray: memoray,
		pid: pid,
		version: version
	});
};