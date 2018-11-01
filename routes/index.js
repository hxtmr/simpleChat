var express = require('express');
var router = express.Router();
var controllers = require('../controllers');


/* restful support
 GET     /forums              ->  index
 GET     /forums/new          ->  new
 POST    /forums              ->  create
 GET     /forums/:forum       ->  show
 GET     /forums/:forum/edit  ->  edit
 PUT     /forums/:forum       ->  update
 DELETE  /forums/:forum       ->  destroy
 */

router.get('/', controllers.index);
//router.post('/getlrc',controllers.getLrc);
// app.get('/lancet-anesthesia', sys.desktop);
//app.get('/sys/now', sys.now);
router.get('/push', function (req, res) {
    res.render('live_push',{
        title:'视频采集'
    })
});
router.get('/pull', function (req, res) {
    res.render('live_pull',{
        title:'视频采集'
    })
});
router.get('/read', function (req, res) {
    res.render('readable',{
        title:'视频采集'
    })
});
module.exports=router;
