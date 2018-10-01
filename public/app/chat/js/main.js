/**
 * 生成guest ID
 * @param len
 * @param radix
 * @returns {string}
 */
function gid(len, radix) {
    var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
    var uuid = [], i;
    radix = radix || chars.length;

    if (len) {
        // Compact form
        for (i = 0; i < len; i++) uuid[i] = chars[0 | Math.random()*radix];
    } else {
        // rfc4122, version 4 form
        var r;

        // rfc4122 requires these characters
        uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
        uuid[14] = '4';

        // Fill in random data. At i==19 set the high bits of clock sequence as
        // per rfc4122, sec. 4.1.5
        for (i = 0; i < 36; i++) {
            if (!uuid[i]) {
                r = 0 | Math.random()*16;
                uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r];
            }
        }
    }

    return uuid.join('');
}
function is_weixn(){
    var ua = navigator.userAgent.toLowerCase();
    if(ua.match(/MicroMessenger/i)=="micromessenger") {
        return true;
    } else {
        return false;
    }
}
function IsPC() {
    var userAgentInfo = navigator.userAgent;
    var Agents = ["Android", "iPhone",
        "SymbianOS", "Windows Phone",
        "iPad", "iPod",'Mobile','QQBrowser'];
    var flag = true;
    for (var v = 0; v < Agents.length; v++) {
        if (userAgentInfo.indexOf(Agents[v]) > 0) {
            flag = false;
            break;
        }
    }
    return flag;
}

var isPc = IsPC();
//进入全屏
function requestFullScreen(de) {
    if (de.requestFullscreen) {
        de.requestFullscreen();
    } else if (de.mozRequestFullScreen) {
        de.mozRequestFullScreen();
    } else if (de.webkitRequestFullScreen) {
        de.webkitRequestFullScreen();
    }
}

//退出全屏
function exitFullscreen(de) {
    if (de.exitFullscreen) {
        de.exitFullscreen();
    } else if (de.mozCancelFullScreen) {
        de.mozCancelFullScreen();
    } else if (de.webkitCancelFullScreen) {
        de.webkitCancelFullScreen();
    }
}
function stopStream(stream) {
    var i;
    var tracks;

    tracks = stream.getAudioTracks();
    for( i = 0; i < tracks.length; i++ ) {
        try {
            tracks[i].stop();
        } catch(err){}
    }
    tracks = stream.getVideoTracks();
    for( i = 0; i < tracks.length; i++ ) {
        try {
            tracks[i].stop();
        } catch(err){}
    }

    if (typeof stream.stop === 'function') {
        try {
            stream.stop();
        } catch(err){}
    }
}
$(function () {
    var socket = io({
        transports: ['websocket']
    });
    socket.on('connect',function () {
        console.log('connected')
    })
    socket.on('disconnect',function () {
        console.log('disconnect')
    })
    //rtc start
    var isSupport = true;
    var rtc_pc = null;
    var rtc_session_description = null;
    var get_user_media = null;
    var connect_stream_to_src = null;
    var stun_server = {
        "iceServers": [
            {
                "url": 'turn:123.15.36.82:3478',
                username: 'aims',
                credential: 'AIMS5@dcsoft'
            },
            {"url": "stun:stun.voiparound.com"},
            {"url": "stun:stun.sipgate.net"},
            {"url": "stun:217.10.68.152"},
            {"url": "stun:stun.sipgate.net:10000"},
            {"url": "stun:217.10.68.152:10000"},
        ]
    };
    var iceCandidate = null
    var isStarted = false;
    var option = {};
    var sdpConstraints = {
        'mandatory': {
            'OfferToReceiveAudio': true,
            'OfferToReceiveVideo': true
        }
    };

    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
    window.URL = window.URL || window.webkitURL || window.mozURL || window.msURL;
    try {
        rtc_pc = RTCPeerConnection;
        rtc_session_description = RTCSessionDescription;
        iceCandidate = RTCIceCandidate;
    } catch (e) {
        try {
            rtc_pc = webkitRTCPeerConnection;
            rtc_session_description = RTCSessionDescription;
            iceCandidate = RTCIceCandidate;
        } catch (e) {
            rtc_pc = mozRTCPeerConnection;
            rtc_session_description = mozRTCSessionDescription;
            iceCandidate = mozRTCIceCandidate;
        }
    }
    get_user_media = navigator.getUserMedia.bind(navigator);
    if (navigator.getUserMedia) {
        connect_stream_to_src = function (media_stream, $media_element) {
            var srcObject = '';
            var media_element = $media_element.get(0);
            if (media_element.srcObject) {
                srcObject = 'srcObject';
            } else if (media_element.mozSrcObject) {
                srcObject = 'mozSrcObject';
            } else {
                srcObject = 'src';
            }
            if (window.URL) {
                media_element.src = window.URL.createObjectURL(media_stream);
            } else {
                media_element[srcObject] = media_stream;
            }
            if ($media_element.hasClass('local_video')) {
                media_element.volume = 0;
            } else {
                media_element.volume = 1;
            }
            media_element.autoplay = true;
            //media_element.play();
        }
    } else {
        alert("This browser does not support WebRTC - visit WebRTC.org for more info");
        isSupport = false;
    }

    // setup stream from the local camera
    function setup_video(videoOption) {
        option = videoOption;
        get_user_media(
            option[0], option[1], option[2]
        );
    }

    function log_error(err) {
        console.log(err);
        if (err.name == 'DevicesNotFoundError') {
            delete option[0].video;
            setup_video(option);
        } else {
            console.log(err);
        }
        ;
    }

    function createPeerConnection(data, isCaller) {
        pc = new rtc_pc(stun_server, {
            optional: [
                {DtlsSrtpKeyAgreement: true},
                {RtpDataChannels: true}
            ]
        });
        // send any ice candidates to the other peer
        pc.onicecandidate = function (evt) {
            if (evt.candidate) {
                data.candidate = evt.candidate;
                socket.emit('new_ice_' + (isCaller ? 'caller' : 'callee') + '_candidate', data);
            }
        };
        // display remote video streams when they arrive using local <video> MediaElement
        pc.onaddstream = function (event) {
            console.log('onaddstream');
            connect_stream_to_src(event.stream, $("#remoteVideo"));
        };
    }

    function doCall(data) {
        pc.createOffer(function (desc) {
            pc.setLocalDescription(desc, function () {
            }, function () {
            });
            data.sdp = desc;
            socket.emit('set_caller_description', data);
        }, function (err) {
            console.log(err)
        });
    }

    socket.on('new_ice_candidate', function (data) {
        pc.addIceCandidate(new iceCandidate(data.candidate), function () {
        }, function () {
        });
    });
    socket.on('set_description', function (data) {
        if (data.sdp)
            pc.setRemoteDescription(new rtc_session_description(data.sdp), function () {
                    if (pc.remoteDescription.type == "offer") {
                        // Since the 'remote' side has no media stream we need
                        // to pass in the right constraints in order for it to
                        // accept the incoming offer of audio and video.
                        pc.createAnswer(gotDescription, function (erro) {
                            console.log(erro)
                        }, sdpConstraints);
                    }
                },
                function (erro) {
                    console.log(erro)
                });

        function gotDescription(desc) {
            pc.setLocalDescription(desc, function () {
            }, function () {
            });
            data.sdp = desc;
            if (pc.remoteDescription.type == "offer") {
                socket.emit('set_callee_description', data);
            } else {
                socket.emit('set_caller_description', data);
            }
        }
    });
    //rtc end
    //video controller start

    $("#hangup").click(function () {
        if (pc) {
            pc.close();
            $("#localVideo").get(0).src = "";
            if (window.stream) {
                stopStream(window.stream)
            }
            exitFullscreen(document);
            videoAreaOff();
        }

        socket.emit(pc.isCaller ? 'caller hangup' : 'callee hangup', pc.data);
        /*  var videoTrack = localStream.getVideoTracks();
          var audioTrack = userStream.getAudioTracks();
          if (videoTrack.length > 0) {
              localStream.removeTrack(videoTrack[0]);
          }
          if (audioTrack.length > 0) {
              localStream.removeTrack(audioTrack[0]);
          }
          connect_stream_to_src(localStream,$("#localVido"));*/
    });
    socket.on('hangup', function (data) {
        if (pc) {
            pc.close();
            $("#localVideo").get(0).src = "";
            if (window.stream) {
                stopStream(stream)
            }
            exitFullscreen(document);
            videoAreaOff();
        }
    });

    $("#fullscreen").click(function () {
        if ($(this).html() == '全屏') {
            requestFullScreen($(".video-area")[0]);
        } else {
            exitFullscreen(document);
        }

    });


    document.addEventListener('fullscreenchange', fullscreenChange, false);
    document.addEventListener('msfullscreenchange', fullscreenChange, false);
    document.addEventListener('mozfullscreenchange', fullscreenChange, false);
    document.addEventListener('webkitfullscreenchange', fullscreenChange, false);

    function fullscreenChange() {
        var isFullScreen = document.webkitIsFullScreen || document.mozFullScreen || document.msFullscreen || document.fullscreen;
        if (isFullScreen) {
            $("#fullscreen").html("退出");
        } else {
            $("#fullscreen").html("全屏");
        }
    }

    $("#swapview").click(function () {
        var local = $("#localVideo");
        var remote = $("#remoteVideo");
        if (local.hasClass("local_video")) {
            local.removeClass("local_video");
            local.addClass("remote_video");
            remote.removeClass("remote_video");
            remote.addClass("local_video");
            remote.css('z-index', 1);
            local.css('z-index', 0);
        } else {
            local.removeClass("remote_video");
            local.addClass("local_video");
            remote.removeClass("local_video");
            remote.addClass("remote_video");
            remote.css('z-index', 0);
            local.css('z-index', 1);
        }
    });

    //video controller end
    var FADE_TIME = 150; // ms
    var TYPING_TIMER_LENGTH = 400; // ms

    var unReadMessages = {};

    var COLORS = [
        '#e21400', '#91580f', '#f8a700', '#f78b00',
        '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
        '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
    ];

    // Initialize varibles
    var $window = $(window);
    var $usernameInput = $('#username'); // Input for username
    var $passwordInput = $('#password'); // Input for pwd
    var $messages = $('.messages'); // Messages area
    var $userList = $('.userlist');
    var $inputMessage = $('.inputMessage'); // Input message input box

    var $loginPage = $('.login.page'); // The login page
    var $chatPage = $('.container'); // The chatroom page
    var $videoArea = $('.video-area');
    var $videoSwitchBtn = $('.switch-button-off,.switch-button-on');

    var $slidebox = $('.slidebox');

    // Prompt for setting a username
    var username, password, token;
    var connected = false;
    var typing = false;
    var lastTypingTime;
    var privateTyping = false;
    var lastPrivateTypingTime;
    var $currentInput = $usernameInput.focus();

    var userList = [];

//事件响应初始化
    $usernameInput.focus(function () {
        $currentInput = $usernameInput;
    });
    $passwordInput.focus(function () {
        $currentInput = $passwordInput;
    });

    $videoSwitchBtn.click(function () {
        if ($videoSwitchBtn.hasClass("switch-button-off")) {
            videoAreaOn();
        } else {
            videoAreaOff();
        }
    });
    function videoAreaOn() {
       // alert(isPc)
        if(!isPc){
            $videoArea.css({width:'100vw'})
            $('.controlbuttons').css({display:'block',width:'100%'})
        }
        $videoArea.animate({right: "0px"}, 500);
        $videoSwitchBtn.removeClass("switch-button-off");
        $videoSwitchBtn.addClass("switch-button-on");
    }

    function videoAreaOff() {
        $videoArea.animate({right: isPc?"-667px":'-100vw'}, 500);
        $videoSwitchBtn.removeClass("switch-button-on");
        $videoSwitchBtn.addClass("switch-button-off");
    }

    function addParticipantsMessage(data) {
        var message = '';
        if (data.numUsers === 1) {
            message += "there are 1 participants(当前共有 1 位参与者)";
        } else {
            message += "there are "+data.numUsers +" participants,(当前共有 " + data.numUsers + " 位参与者)";
        }
        log(message);
    }

    $(".controller").mouseenter(function () {
        $(".controlbuttons").fadeIn();
    });
    $(".controller").mouseleave(function () {
        $(".controlbuttons").fadeOut();
    });

    // Sets the client's username
    function setUsername() {
        username = cleanInput($usernameInput.val().trim());
        password = cleanInput($passwordInput.val().trim());
        // If the username is valid
        if (username && password) {
            $loginPage.fadeOut();
            $chatPage.show();
            $inputMessage.show();
            $videoArea.show();
            $loginPage.off('click');
            $currentInput = $inputMessage.focus();

            // Tell the server your username
            socket.emit('add user', username);
        } else {
            if (!username) {
                alert("请输入用户名");
                $currentInput = $usernameInput.focus();
                return;
            }
            if (!password) {
                alert("请输入密码");
                $currentInput = $passwordInput.focus();
                return;
            }
        }
    }

    // Sends a chat message
    function sendMessage() {
        var message = $inputMessage.val();
        // Prevent markup from being injected into the message
        message = cleanInput(message);
        // if there is a non-empty message and a socket connection
        if (message && connected) {
            $inputMessage.val('');
            addChatMessage({
                token: token,
                username: username,
                message: message
            });
            // tell server to execute 'new message' and send along one parameter
            socket.emit('new message', {token: token, username: username, message: message});
        }
    }

    function sendPrivateMessage(inputArea) {
        var $privateMessageSend;
        var $inputMessage = $(inputArea);
        var message = $inputMessage.val();
        // Prevent markup from being injected into the message
        message = cleanInput(message);
        var twin = (((($inputMessage.parent()).parent()).parent()).parent());
        var toToken = twin.attr('toToken');
        // if there is a non-empty message and a socket connection
        if (message && connected) {
            $inputMessage.val('');
            addPrivateChatMessage({
                token: token,
                username: username,
                message: message,
                from: token,
                to: toToken
            }, {action: 'send private message'});
            // tell server to execute 'new message' and send along one parameter
            socket.emit('private message', {from: token, username: username, message: message, to: toToken});
        }
        /* $("#send").click(function(e){
         var from = $('#user_name').val(),
         msg  = $('#message').val(),
         to   = $('#to').val(),
         $message_list = $('#message_list');
         socket.emit('new user',from);
         socket.emit('private message',from,to,msg);
         socket.on('to'+from, function (data) {
         $message_list.append('                '+data.from+'说'+data.message+'   ');
         });
         });*/
    }

    // Log a message
    function log(message, options) {
        var $el = $('<li>').addClass('log').text(message);
        addMessageElement($el, options);
    }

    function addToUserList(user, options) {
        var $el = $('<li id="user-' + user.token + '">').addClass('user');
        var $userWrap = $('<div style="width:108px;display:inline-block" title="private(私聊)"></div>').text(user.username).css('color', getUsernameColor(user.username));
        var $videoIcon = $('<img src="../app/chat/image/webcam.png" title="video call(视频通话)" height="15" width="15" style="padding-top: 3px;">');
        $el.append($userWrap);
        $el.append($videoIcon);
        $el.attr("token", user.token);
        $el.attr("username", user.username);
        $userWrap.click(onUserClick);
        $videoIcon.click(onVideoIconClick);
        addUserElement($el, options);
    }

    function removeFromUserList(user, options) {
        var $el = $userList.children('li[token=' + user.token + ']');
        if ($el.get(0)) {
            $el.remove();
        }
    }

    function onUserClick() {
        var $user = $(this).parent();
        var me = {username: username, token: token};
        var target = {username: $user.attr('username'), token: $user.attr('token')};
        if (me.token != target.token) {
            var talkWindow = $("#privateTalkWindow" + target.token);
            if (talkWindow.get(0)) {
                $.setWindowFocus(talkWindow);
            } else {
                $.newWindow({
                    id: "privateTalkWindow" + target.token,
                    minimizeButton: true,
                    maximizeButton: true,
                    closeButton: true,
                    sendBtn:true,
                    onSendBtnClick:function(_this,privateWin){
                        sendPrivateMessage(privateWin.find('.private-input')[0])
                    },
                    width: isPc?600:window.innerWidth, height: isPc?500:window.innerHeight-50,
                    posx: isPc?300:0, posy: isPc?50:0, title: "与" + target.username + "的对话",
                    content: '<div class="private-container">' +
                    '<div class="private-messagesEl"><ul class="private-messages">' +
                    '</ul></div>' +
                    '<div class="private-inputEl"></didv>' +
                    '<textarea resize="false" class="private-input"></textarea>'+
                    '</div>'
                });
                $("#privateTalkWindow" + target.token).find('.private-messages').slimScroll({
                    size: 8,
                    color: '#555',
                    height: '100%',
                    alwaysVisible: true,
                    railVisible: false
                });
                $("#privateTalkWindow" + target.token).find('.private-input').on('input', function () {
                    updatePrivateTyping({token: token, from: token, to: target.token, username: username});
                });

                talkWindow = $("#privateTalkWindow" + target.token);
            }
            talkWindow.attr('fromToken', token);
            talkWindow.attr('toToken', target.token);
            if (unReadMessages[target.token]) {
                var msgs = unReadMessages[target.token];
                var messageEl = talkWindow.find('.private-messages');
                for (var i = 0; i < msgs.length; i++) {
                    addPrivateChatMessage(msgs[i], {action: 'open message window'});
                }
                delete unReadMessages[target.token];
                $('#user-' + target.token).removeClass('new-private-message');
            }
        } else {
            var profileWindow = $("#profileWindow" + target.token);
            if (profileWindow.get(0)) {
                $.setWindowFocus(profileWindow);
            } else {
                $.newWindow({
                    id: "profileWindow" + target.token,
                    minimizeButton: true,
                    maximizeButton: true,
                    closeButton: true,
                    closeButton: true,
                    width: isPc?600:window.innerWidth, height: isPc?500:window.innerHeight,
                    posx: isPc?300:0, posy: isPc?50:0, title: '编辑 ' + target.username + " 的个人信息",
                    content: '<div class="profile-container">姓名:' + target.username + '</p> token:' + target.token + '</div>'
                });
            }
        }
    }

    function onVideoIconClick() {
        var $user = $(this).parent();
        var target = {username: $user.attr('username'), token: $user.attr('token')};
        var me = {username: username, token: token};
        if (me.token != target.token) {
            // if(RTC.isSupport==true){
            //RTC.start();
            var data = {
                title: "Info(提示)",
                username: username,
                message: "waiting for "+ target.username + "accept your call(发送请求，等待" + target.username + "的响应！)",
                from: token,
                to: target.token
            };
            sendVideoRequest(data);
            //}else{
            //alert('您的浏览器不支持视频通信，请升级浏览器版本（推荐使用Chrome）！');
            //}
        } else {
            alert('不能向自己发送视频请求！');
        }

    }

    // Adds the visual chat message to the message list
    function addChatMessage(data, options) {
        // Don't fade the message in if there is an 'X was typing'
        var $typingMessages = getTypingMessages(data);
        options = options || {};
        if ($typingMessages.length !== 0) {
            options.fade = false;
            $typingMessages.remove();
        }

        var $usernameDiv = $('<span class="username"/>')
        //  .text(((data.username==username)?'我':data.username) + ":")
            .text(data.username + ":")
            .css('color', getUsernameColor(data.username));
        var $messageBodyDiv = $('<span class="messageBody">')
            .text(data.message);

        var typingClass = data.typing ? 'typing' : '';
        var $messageDiv = $('<li class="message"/>')
            .data('username', data.username)
            .addClass(typingClass)
            .append($usernameDiv, $messageBodyDiv);

        addMessageElement($messageDiv, options);
    }

    function addPrivateChatMessage(data, options) {
        // Don't fade the message in if there is an 'X was typing'
        var typingClass = data.typing ? 'typing' : '';
        data.typingClass = typingClass;
        var $typingMessages = getPrivateTypingMessages(data);
        options = options || {};
        if ($typingMessages.length !== 0) {
            options.fade = false;
            $typingMessages.remove();
        }
        var $usernameDiv = $('<span class="username"/>')
            .text(data.username + ":")
            .css('color', getUsernameColor(data.username));
        var $messageBodyDiv = $('<span class="messageBody">')
            .text(data.message);

        var $messageDiv = $('<li class="message"/>')
            .data('talkToken', data.from + data.to + data.typingClass)
            .addClass(typingClass)
            .append($usernameDiv, $messageBodyDiv);
        var messageEl;
        if (options.action == 'send private message') {
            messageEl = $("#privateTalkWindow" + data.to).find('.private-messages');
        } else if (options.action == 'receive private message' || options.action == 'open message window') {
            messageEl = $("#privateTalkWindow" + data.from).find('.private-messages');
            if (!messageEl.get(0)) {
                if (unReadMessages[data.from]) {
                    unReadMessages[data.from].push(data);
                } else {
                    unReadMessages[data.from] = [data];
                }
                $('#user-' + data.from).addClass('new-private-message');
                return;
            }
        } else if (options.action == 'private typing') {
            var win = $("#privateTalkWindow" + data.from)
            messageEl = win.find('.private-messages');
            if (!messageEl.get(0) || data.to != win.attr("fromToken")) {
                return;
            }
            ;
        }
        addPrivateMessageElement($messageDiv, options, messageEl);
    }

    // Adds the visual chat typing message
    function addChatTyping(data) {
        data.typing = true;
        data.message = '正在输入...';
        addChatMessage(data);
    }

    // Adds the visual chat typing message
    function addPrivateChatTyping(data) {
        data.typing = true;
        data.message = '正在输入...';
        addPrivateChatMessage(data, {action: 'private typing'});
    }

    // Removes the visual chat typing message
    function removeChatTyping(data) {
        getTypingMessages(data).fadeOut(function () {
            $(this).remove();
        });
    }

    function removePrivateChatTyping(data) {
        getPrivateTypingMessages(data).fadeOut(function () {
            $(this).remove();
        });
    }

    // Adds a message element to the messages and scrolls to the bottom
    // el - The element to add as a message
    // options.fade - If the element should fade-in (default = true)
    // options.prepend - If the element should prepend
    //   all other messages (default = false)
    function addMessageElement(el, options) {
        var $el = $(el);

        // Setup default options
        if (!options) {
            options = {};
        }
        if (typeof options.fade === 'undefined') {
            options.fade = true;
        }
        if (typeof options.prepend === 'undefined') {
            options.prepend = false;
        }

        // Apply options
        if (options.fade) {
            $el.hide().fadeIn(FADE_TIME);
        }
        if (options.prepend) {
            $messages.prepend($el);
        } else {
            $messages.append($el);
        }
        $messages[0].scrollTop = $messages[0].scrollHeight;
    }

    function addPrivateMessageElement(el, options, messageEl) {
        var $el = $(el);
        // Setup default options
        if (!options) {
            options = {};
        }
        if (typeof options.fade === 'undefined') {
            options.fade = true;
        }
        if (typeof options.prepend === 'undefined') {
            options.prepend = false;
        }

        // Apply options
        if (options.fade) {
            $el.hide().fadeIn(FADE_TIME);
        }
        if (options.prepend) {
            messageEl.prepend($el);
        } else {
            messageEl.append($el);
        }
        messageEl[0].scrollTop = messageEl[0].scrollHeight;
    }

    function addUserElement(el, options) {
        var $el = $(el);

        // Setup default options
        if (!options) {
            options = {};
        }
        if (typeof options.fade === 'undefined') {
            options.fade = true;
        }
        if (typeof options.prepend === 'undefined') {
            options.prepend = false;
        }

        // Apply options
        if (options.fade) {
            $el.hide().fadeIn(FADE_TIME);
        }
        if (options.prepend) {
            $userList.prepend($el);
        } else {
            $userList.append($el);
        }
        $userList[0].scrollTop = $userList[0].scrollHeight;
    }

    // Prevents input from having injected markup
    function cleanInput(input) {
        return $('<div/>').text(input).text();
    }

    // Updates the typing event
    function updateTyping() {
        if (connected) {
            if (!typing) {
                typing = true;
                socket.emit('typing');
            }
            lastTypingTime = (new Date()).getTime();

            setTimeout(function () {
                var typingTimer = (new Date()).getTime();
                var timeDiff = typingTimer - lastTypingTime;
                if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
                    socket.emit('stop typing');
                    typing = false;
                }
            }, TYPING_TIMER_LENGTH);
        }
    }

    // Updates the typing event
    function updatePrivateTyping(data) {
        if (data) {
            if (!privateTyping) {
                privateTyping = true;
                socket.emit('private typing', data);
            }
            lastPrivateTypingTime = (new Date()).getTime();

            setTimeout(function () {
                var typingTimer = (new Date()).getTime();
                var timeDiff = typingTimer - lastPrivateTypingTime;
                if (timeDiff >= TYPING_TIMER_LENGTH && privateTyping) {
                    socket.emit('stop private typing', data);
                    privateTyping = false;
                }
            }, TYPING_TIMER_LENGTH);
        }
    }

    function sendVideoRequest(data) {
        $slidebox.slidebox();
        $slidebox.open(data);
        socket.emit('video request', data);
    }

    function receiveVideoRequest(data) {
        data.title = "提示";
        data.message = data.message + '<br/><button id="rejectVideoRequestBtnYes">yes</button>&nbsp;&nbsp;&nbsp;<button id="rejectVideoRequestBtnNo">no</button>';
        $slidebox.slidebox();
        $slidebox.open(data);
        var handleBtnYes = document.getElementById('rejectVideoRequestBtnYes');
        var handleBtnNo = document.getElementById('rejectVideoRequestBtnNo');
        if (handleBtnYes && handleBtnYes) {
            handleBtnYes.onclick = handleBtnNo.onclick = function (e) {
                if (this.id == 'rejectVideoRequestBtnNo') {
                    handleVideoRequest('reject', data)
                } else {
                    handleVideoRequest('accept', data)
                }
            }
        }
    }

    function handleVideoRequest(operation, data) {
        data.operation = operation;
        data.username = username;
        data.message = data.username + (operation == 'accept' ? 'accepted(接受了)' : 'rejected(拒绝了)') + "your call(你的视频请求)！";
        socket.emit('handle video request', data);
    }

    // Gets the 'X is typing' messages of a user
    function getTypingMessages(data) {
        return $('.typing.message').filter(function (i) {
            return $(this).data('username') === data.username;
        });
    }

    function getPrivateTypingMessages(data) {
        return $('.typing.message').filter(function (i) {
            return $(this).data('talkToken') === data.from + data.to + data.typingClass;
        });
    }

    // Gets the color of a username through our hash function
    function getUsernameColor(username) {
        // Compute hash code
        var hash = 7;
        for (var i = 0; i < username.length; i++) {
            hash = username.charCodeAt(i) + (hash << 5) - hash;
        }
        // Calculate color
        var index = Math.abs(hash % COLORS.length);
        return COLORS[index];
    }


    // Keyboard events

    $window.keydown(function (event) {
        // Auto-focus the current input when a key is typed
        if (!(event.ctrlKey || event.metaKey || event.altKey) && event.target.tagName != 'TEXTAREA') {
            $currentInput.focus();
        }
        // When the client hits ENTER on their keyboard
        if (event.which === 13) {
            if (username && password) {
                if (event.target.tagName == 'TEXTAREA' && (isPc&&event.ctrlKey)) {
                    socket.emit('stop typing');
                    typing = false;
                    sendPrivateMessage(event.target);
                } else {
                    sendMessage();
                    socket.emit('stop typing');
                    typing = false;
                }
                ;
            } else {
                if ($currentInput.get(0).id == 'username' && !cleanInput($passwordInput.val().trim())) {
                    $currentInput = $passwordInput.focus();
                    return;
                }

                setUsername();
            }
        }
    });

    $inputMessage.on('input', function () {
        updateTyping();
    });

    // Click events

    // Focus input when clicking anywhere on login page
    $loginPage.click(function () {
        $currentInput.focus();
    });

    // Focus input when clicking on the message input's border
    $inputMessage.click(function () {
        $inputMessage.focus();
    });

    // Socket events

    // Whenever the server emits 'login', log the login message
    socket.on('login', function (data) {
        connected = true;
        // Display the welcome message
        var message = "welcome to join us  ^_^(欢迎进入聊天室) ";
        log(message, {
            prepend: true
        });
        addParticipantsMessage(data);
        username = data.username;
        token = data.token;
        userList = data.userNames;
        for (p in userList) {
            var $el = $userList.children('li[token=' + userList[p].token + ']');
            if (!$el.get(0)) {
                addToUserList(userList[p]);
            }
        }

        // console.log(p+':'+userList[p].token);
    });

    // Whenever the server emits 'new message', update the chat body
    socket.on('new message', function (data) {
        addChatMessage(data.message);
    });

    // Whenever the server emits 'user joined', log it in the chat body
    socket.on('user joined', function (data) {
        log(data.username + ' joined(加入)');
        userList[data.token] = {username: data.username, token: data.token};
        addParticipantsMessage(data);
        addToUserList(data);
    });

    // Whenever the server emits 'user left', log it in the chat body
    socket.on('user left', function (data) {
        log(data.username + ' left(离开)');
        addParticipantsMessage(data);
        removeChatTyping(data);
        removeFromUserList(data);
    });

    // Whenever the server emits 'typing', show the typing message
    socket.on('typing', function (data) {
        addChatTyping(data);
    });

    // Whenever the server emits 'stop typing', kill the typing message
    socket.on('stop typing', function (data) {
        removeChatTyping(data);
    });

    // Whenever the server emits 'stop typing', kill the typing message
    socket.on('stop private typing', function (data) {
        data.typingClass = 'typing';
        removePrivateChatTyping(data);
    });

    // Whenever the server emits 'typing', show the typing message
    socket.on('private typing', function (data) {
        addPrivateChatTyping(data);
    });

    /*userClients[data.to].emit('received'+data.to,data);*/
    socket.on('receive private message', function (data) {
        /* console.log('I received a private message by ', data.from, ' say to ',data.to, data.message);
         if(data.to in users){
         userClients[data.to].emit('received'+data.to,data);
         }*/
        addPrivateChatMessage(data, {action: 'receive private message'});
    });
    socket.on('receive video', function (data) {
        receiveVideoRequest(data);
    });

    socket.on('accept video', function (data) {
        /*  start(data,true);
          $slidebox.close();
          videoAreaOn();*/
    });

    socket.on('reject video', function (data) {
        console.log('reject');
    });
    socket.on('accepted video', function (data) {
        createPeerConnection(data, false);
        var option = [{
            "audio": true, // request access to local microphone
            "video": true  // request access to local camera
        },
            // success callback
            function (stream) { // success callback
                window.stream = stream;
                socket.emit('video started', data);
                // display preview from the local camera & microphone using local <video> MediaElement
                connect_stream_to_src(stream, $("#localVideo"));
                pc.isCaller = false;
                pc.data = data
                pc.addStream(stream);
            },
            log_error
        ];
        setup_video(option);
        $slidebox.close();
        videoAreaOn();
    });
    socket.on('callee have started video', function (data) {
        createPeerConnection(data, true);
        var option = [{
            "audio": true, // request access to local microphone
            "video": true  // request access to local camera
        },
            // success callback
            function (stream) { // success callback
                window.stream = stream;
                // display preview from the local camera & microphone using local <video> MediaElement
                connect_stream_to_src(stream, $("#localVideo"));
                pc.isCaller = true;
                pc.data = data
                pc.addStream(stream);
                socket.emit('caller video start', data);
                doCall(data);
            },
            log_error
        ]
        setup_video(option);
        $slidebox.close();
        videoAreaOn();
    });
    socket.on('rejected video', function (data) {
        //console.log(data.username+'rejected');
    });
    var isWeiXin=is_weixn()
    if(/*isWeiXin*/true){
        $('.form').append('<button class="guestbtn">访客登陆</button>')
        $('.form').find('.guestbtn').on('click',function () {
            var username='访客'+gid(4,16),password='1'
            $('#username').val(username)
            $('#password').val(password)
           // setTimeout(function(){
                alert('生成的访客ID：'+username)
                setUsername()
           //},3000)
        })
    }
});
