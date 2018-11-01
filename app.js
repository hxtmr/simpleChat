var buffer=require('buffer')
process.on('uncaughtException', function(err) {
    console.log('uncaughtException：' + err.stack);
});
var videoHeader=null;
var firstCluster=null;
var http = require('http');
var log = require('log4js').getLogger('app');
var https = require('https');
var fs=require("fs");
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');//-
var ejs = require('ejs');//
var cookieParser = require('cookie-parser');//-
var bodyParser = require('body-parser');//-

var routes = require('./routes/index');
var users = require('./routes/users');
var domain = require('domain');

var config = require('./config/simpleChat-config');
uuid = require('./lib/uuid');
var app = express();

// general variables
var webrtc_clients = [];
var webrtc_discussions = {};

// all environments
var privateKey  = fs.readFileSync(path.join(__dirname,'ssl/1539248837742.key'), 'utf8');
var certificate = fs.readFileSync(path.join(__dirname,'ssl/1539248837742.pem'), 'utf8');
var credentials = {key: privateKey, cert: certificate};
var httpsServer = https.createServer(credentials, app);
var io;

app.set('port', config.port || 443);
app.set('host', config.host);
//gzip支持
//app.use(express.compress());
app.set('views', __dirname + '/views');
app.engine('.html', ejs.__express);
app.set('view engine', 'html');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/', routes);
app.use('/users', users);


// assume "not found" in the error msgs
// is a 404. this is somewhat silly, but
// valid, you can do whatever you like, set
// properties, use instanceof etc.
app.use(function(err, req, res, next) {
    // treat as 404  ~位运算 NOT 实质上是对数字求负，然后减 1
    if (~err.message.indexOf('not found')) return next();
    log.info(err.stack);
    res.json(500, {
        sucess: false,
        errors: err.message
    });
});

// assume 404 since no middleware responded
app.use(function(req, res, next) {
    res.status(404).render('404', {
        url: req.originalUrl
    });
});

io = require('socket.io')(httpsServer);
httpsServer.listen(app.get('port'), function() {
    console.log('HTTPS Server is running on: https://localhost:%s', app.get('port'));
});
// web socket functions

// usernames which are currently connected to the chat
var usernames = {};
var numUsers = 0;
var userClients={};
io.on('connection', function (socket) {
    var addedUser = false;
    socket.emit('videoHeader',videoHeader)
    // when the client emits 'new message', this listens and executes
    socket.on('new message', function (data) {
        // we tell the client to execute 'new message'
        socket.broadcast.emit('new message', {
            username: socket.username,
            message: data
        });
    });
    socket.on('getHeader', function (data) {
        // we tell the client to execute 'new message'
        socket.emit('videoHeader',videoHeader)
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
    /* var s=[fs.createWriteStream('./b1.webM',{
         flags:'a'
     }),
     fs.createWriteStream('./b2.webM',{
         flags:'a'
     }),
     fs.createWriteStream('./b3.webM',{
         flags:'a'
     }), fs.createWriteStream('./b4.webM',{
             flags:'a'
         })]*/
    var count=0
    socket.on('receiveBuffer',function(data){
        var b=Buffer.from(data)
        //console.log(b.toText())
        /*var header={}
        var bf=Buffer.from(data)
        header['EBML']=Buffer.from(bf,4)*/
        var b1=new Buffer(new Int8Array(b.buffer, 0,50));
      /*  console.log('\n')
        var b2=new Buffer(new Int8Array(b.buffer, 50,50));
        var b3=new Buffer(new Int8Array(b.buffer, 100,50));
        var b4=new Buffer(new Int8Array(b.buffer, 150,50));
        var b5=new Buffer(new Int8Array(b.buffer, 200,50));
        var b6= new Buffer(new Int8Array(b.buffer, 250,50));
        var b7=new Buffer(new Int8Array(b.buffer, 300,50));
        var b8=new Buffer(new Int8Array(b.buffer, 350,50));
        console.log(b1)
        console.log(b2)
        console.log(b3)
        console.log(b4)
        console.log(b5)
        console.log(b6)
        console.log(b7)
        console.log(b8)
        console.log('--')
        console.log(b1.readUInt8(0),b1.readUInt8(1),b1.readUInt8(2),b1.readUInt8(3))*/
        if(b1.readUInt8(0)==26&&b1.readUInt8(1)==69&&b1.readUInt8(2)==223&&b1.readUInt8(3)==163){
            videoHeader=new Buffer(new Int8Array(b.buffer, 0,189));
            //console.log(videoHeader)
            //console.log(videoHeader.readUInt8(188),videoHeader.readUInt8(187),videoHeader.readUInt8(186),videoHeader.readUInt8(185))
        }
        /*s[count].write(data)
        count++*/
        socket.broadcast.emit('videobuffer',[data,videoHeader])
    })

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
