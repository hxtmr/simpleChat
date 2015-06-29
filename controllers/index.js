/*
 * GET home page.
 */
var rf=require("fs");
exports.index = function(req, res) {
    res.render('index', {
        title: 'simpleChat'
    });
};