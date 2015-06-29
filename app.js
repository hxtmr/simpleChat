var fs = require('fs');

//logs 文件夹不存在则创建
var hasLogForder = fs.existsSync(__dirname + '/logs');
if (!hasLogForder) {
    fs.mkdirSync(__dirname + '/logs');
}

var log4js = require('log4js');
log4js.configure(__dirname + '/config/log4js.json', {
    cwd: __dirname
});

var logger = require('morgan');

process.on('uncaughtException', function(err) {
    console.log('uncaughtException：' + err.stack);
    log.error('uncaughtException：', err.stack);
});

var log = log4js.getLogger('simpleChat');

var http = require('http');
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');//-
var ejs = require('ejs');//
var cookieParser = require('cookie-parser');//-
var bodyParser = require('body-parser');//-

var routes = require('./routes/index');
var users = require('./routes/users');
var domain = require('domain');
var domainMiddleware = require('./lib/domain-middleware');

//var launcher = require('./models/socketio/launcher');
//var helper = require('./models/cache/helper-code');

var config = require('./config/simpleChat-config');
uuid = require('./lib/uuid');
var app = express();



// general variables
var webrtc_clients = [];
var webrtc_discussions = {};


/**
 * response增加通用的返回方法
 * @param err 错误信息
 * @param data 返回的数据
 * @param info 操作提示信息（不想前台提示的话，则不传递info），若后台报错的话，传递info参数值无效
 */
app.response.sendResult = function(err, data, info) {
    if (data) {
        if (err) {
            var jsonObj = {
                errors: err.stack
            };
            if (info) jsonObj.info = info;
            this.json(500, jsonObj);
        } else {
            var jsonObj = {
                success: true,
                data: data
            };
            if (info) jsonObj.info = info;
            this.json(jsonObj);
        }
    } else {
        if (err instanceof Error) {
            var jsonObj = {
                errors: err.stack
            };
            if (info) jsonObj.info = info;
            this.json(500, jsonObj);
        } else {
            var jsonObj = {
                success: true,
                data: err
            };
            if (info) jsonObj.info = info;
            this.json(jsonObj);
        }
    }
};
//response增加通用分页的返回方法
app.response.sendPageResult = function(err, data) {

    if (data) {
        if (err) {
            this.json(500, {
                errors: err.stack
            });
        } else {
            this.json({
                success: true,
                data: data.result,
                start: data.start,
                limit: data.limit,
                totalCount: data.totalCount
            });
        }
    } else {
        if (err instanceof Error) {
            this.json(500, {
                errors: err.stack
            });
        } else {
            this.json({
                success: true,
                data: err.result,
                start: err.start,
                limit: err.limit,
                totalCount: err.totalCount
            });
        }
    }
};


if (!config.host || config.host == '') {
    config.host = '0.0.0.0';
}
// all environments
var server = http.createServer(app);
var io;
/*app.use(domainMiddleware({
 server: server,
 killTimeout: -1 //-1不退出
 }));*/
app.set('port', config.port || 2014);
app.set('host', config.host);
//gzip支持
//app.use(express.compress());
app.set('views', __dirname + '/views');
app.engine('.html', ejs.__express);
app.set('view engine', 'html');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
/*app.use(logger('dev'));*/
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/', routes);
app.use('/users', users);

// log (development only)
// app.use(express.logger('dev'));
//app.use(express.bodyParser());
//app.use(express.methodOverride());
//app.use(express.cookieParser('mdsbthl'));
//app.use(express.session());
//app.use(app.router);
//路由定义
//routes(app);
//License validation
//var License = require('./lib/license.js');
//new License(__dirname + '/lancet-anesthesia.key').validate();

// assume "not found" in the error msgs
// is a 404. this is somewhat silly, but
// valid, you can do whatever you like, set
// properties, use instanceof etc.
app.use(function(err, req, res, next) {
    // treat as 404  ~位运算 NOT 实质上是对数字求负，然后减 1
    if (~err.message.indexOf('not found')) return next();
    log.error(err.stack);
    res.json(500, {
        sucess: false,
        errors: err.message
    });
    // error page
    // res.status(500).render('500');
});

// assume 404 since no middleware responded
app.use(function(req, res, next) {
    res.status(404).render('404', {
        url: req.originalUrl
    });
});

io = require('socket.io')(server);
// web socket functions

server.listen(app.get('port'), app.get('host'), function(req, rsp) {
    log.info('服务端启动成功, http://%s:%d', app.get('host'), app.get('port'));
    //start socket.io service.
    //exports.socketIO = new launcher(server);
    //加载汉字助词码字典表
    //helper.load();
});

// usernames which are currently connected to the chat
var usernames = {};
var numUsers = 0;
var userClients={};
io.on('connection', function (socket) {
    var addedUser = false;
    // when the client emits 'new message', this listens and executes
    socket.on('new message', function (data) {
        // we tell the client to execute 'new message'
        socket.broadcast.emit('new message', {
            username: socket.username,
            message: data
        });
    });
    // when the client emits 'add user', this listens and executes
    socket.on('add user', function (username) {
        // we store the username in the socket session for this client
        var token=uuid.generate();
        socket.username = username;
        socket.token=token;
        // add the client's username to the global list
        usernames[token] = {username:username,token:token};
        userClients[token]=socket;
        ++numUsers;
        addedUser = true;
        socket.emit('login', {
            numUsers: numUsers,
            username:socket.username,
            token:socket.token,
            userNames:usernames
        });
        // echo globally (all clients) that a person has connected
        socket.broadcast.emit('user joined', {
            username: socket.username,
            token:socket.token,
            numUsers: numUsers
        });
        //console.log(socket.client.send('calling'));
    });

    // when the client emits 'typing', we broadcast it to others
    socket.on('typing', function () {
        socket.broadcast.emit('typing', {
            username: socket.username
        });
    });



    // when the client emits 'stop typing', we broadcast it to others
    socket.on('stop typing', function () {
        socket.broadcast.emit('stop typing', {
            username: socket.username
        });
    });

    // when the client emits 'private typing', we emit it to target
    socket.on('private typing', function (data) {
        if(data.to in userClients){
            userClients[data.to].emit('private typing',data);
        }
    });

    // when the client emits 'stop private typing', we emit it to target
    socket.on('stop private typing', function (data) {
        if(data.to in userClients){
            userClients[data.to].emit('stop private typing',data);
        }
    });
    // when the user disconnects.. perform this
    socket.on('disconnect', function () {
        // remove the username from global usernames list
        if (addedUser) {
            delete usernames[socket.token];
            --numUsers;

            // echo globally that this client has left
            socket.broadcast.emit('user left', {
                username: socket.username,
                token:socket.token,
                numUsers: numUsers
            });
        }
    });

    socket.on('private message', function (data) {
       /* console.log('I received a private message by ', data.from, ' say to ',data.to, data.message);*/
        if(data.to in userClients){
            userClients[data.to].emit('receive private message',data);
        }
    });

    socket.on('video request', function (data) {
     /*   console.log('I received a private message by ', data.from, ' say to ',data.to, '来自'+data.username+"的视频请求");*/
        if(data.to in userClients){
            data.message="收到了来自"+data.username+"的视频请求，是否接受？";
            userClients[data.to].emit('receive video',data);
        }
    });

    socket.on('handle video request', function (data) {
      /*  console.log('I received a private message by ', data.from, ' say to ',data.to,data.message);*/
        var operation=data.operation;
        if(data.to in userClients){
            if(operation=='accept'){
                // data.message=data.username+"接受了你视频请求";
                userClients[data.from].emit('accept video',data);
                userClients[data.to].emit('accepted video',data);
            }else{
                // data.message=data.username+"拒绝了你视频请求";
                userClients[data.from].emit('reject video',data)
                userClients[data.to].emit('rejected video',data);
            }
        }
    });

    //RTC PEER EVENT START
    socket.on('new_ice_caller_candidate', function (data) {
       /* console.log('set caller candidate:'+data.from+"#"+JSON.stringify(data.candidate)+" to callee:"+data.to);*/
        if(data.to in userClients){
            userClients[data.to].emit('new_ice_candidate',data);
        }
    });
    socket.on('new_ice_callee_candidate', function (data) {
        /*console.log('set callee candidate:'+data.to+"#"+JSON.stringify(data.candidate)+" to caller:"+data.from);*/
        if(data.from in userClients){
            userClients[data.from].emit('new_ice_candidate',data);
        }
    });

    socket.on('set_caller_description', function (data) {
       /* console.log('set caller description:'+data.from+"#"+JSON.stringify(data.sdp)+" to callee:"+data.to);*/
        if(data.to in userClients){
            userClients[data.to].emit('set_description',data);
        }
    });
    socket.on('set_callee_description', function (data) {
       /* console.log('set callee description:'+data.to+"#"+JSON.stringify(data.sdp)+" to caller:"+data.from);*/
        if(data.from in userClients){
            userClients[data.from].emit('set_description',data);
        }
    });

    socket.on('video started', function (data) {
      /*  console.log('callee have started video');*/
        if(data.from in userClients){
            userClients[data.from].emit('callee have started video',data);
        }
    });
    socket.on('caller video start',function (data) {
       /* console.log('caller have started video');*/
        if(data.from in userClients){
            userClients[data.from].emit('caller have started video',data);
        }
    });
    socket.on('callee hangup',function(data){
       /* console.log('callee have created peer');*/
        if(data.from in userClients){
            userClients[data.from].emit('hangup',data);
        }
    });
    socket.on('caller hangup',function(data){
      /*  console.log('callee have created peer');*/
        if(data.to in userClients){
            userClients[data.to].emit('hangup',data);
        }
    });
    //RTC PEER EVENT END
});