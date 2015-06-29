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

module.exports=router;
