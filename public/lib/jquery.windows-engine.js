/**
 *  jQuery Windows Engine Plugin
 *  @requires jQuery v1.2.6 or greater
 *  http://hernan.amiune.com/labs
 *
 *  Copyright(c)  Hernan Amiune (hernan.amiune.com)
 *  Licensed under MIT license:
 *  http://www.opensource.org/licenses/mit-license.php
 * 
 *  Version: 1.7
 */

(function(jQuery){

    if(jQuery.browser) return;

    jQuery.browser = {};
    jQuery.browser.mozilla = false;
    jQuery.browser.webkit = false;
    jQuery.browser.opera = false;
    jQuery.browser.msie = false;

    var nAgt = navigator.userAgent;
    jQuery.browser.name = navigator.appName;
    jQuery.browser.fullVersion = ''+parseFloat(navigator.appVersion);
    jQuery.browser.majorVersion = parseInt(navigator.appVersion,10);
    var nameOffset,verOffset,ix;

// In Opera, the true version is after "Opera" or after "Version"
    if ((verOffset=nAgt.indexOf("Opera"))!=-1) {
        jQuery.browser.opera = true;
        jQuery.browser.name = "Opera";
        jQuery.browser.fullVersion = nAgt.substring(verOffset+6);
        if ((verOffset=nAgt.indexOf("Version"))!=-1)
            jQuery.browser.fullVersion = nAgt.substring(verOffset+8);
    }
// In MSIE, the true version is after "MSIE" in userAgent
    else if ((verOffset=nAgt.indexOf("MSIE"))!=-1) {
        jQuery.browser.msie = true;
        jQuery.browser.name = "Microsoft Internet Explorer";
        jQuery.browser.fullVersion = nAgt.substring(verOffset+5);
    }
// In Chrome, the true version is after "Chrome"
    else if ((verOffset=nAgt.indexOf("Chrome"))!=-1) {
        jQuery.browser.webkit = true;
        jQuery.browser.name = "Chrome";
        jQuery.browser.fullVersion = nAgt.substring(verOffset+7);
    }
// In Safari, the true version is after "Safari" or after "Version"
    else if ((verOffset=nAgt.indexOf("Safari"))!=-1) {
        jQuery.browser.webkit = true;
        jQuery.browser.name = "Safari";
        jQuery.browser.fullVersion = nAgt.substring(verOffset+7);
        if ((verOffset=nAgt.indexOf("Version"))!=-1)
            jQuery.browser.fullVersion = nAgt.substring(verOffset+8);
    }
// In Firefox, the true version is after "Firefox"
    else if ((verOffset=nAgt.indexOf("Firefox"))!=-1) {
        jQuery.browser.mozilla = true;
        jQuery.browser.name = "Firefox";
        jQuery.browser.fullVersion = nAgt.substring(verOffset+8);
    }
// In most other browsers, "name/version" is at the end of userAgent
    else if ( (nameOffset=nAgt.lastIndexOf(' ')+1) <
        (verOffset=nAgt.lastIndexOf('/')) )
    {
        jQuery.browser.name = nAgt.substring(nameOffset,verOffset);
        jQuery.browser.fullVersion = nAgt.substring(verOffset+1);
        if (jQuery.browser.name.toLowerCase()==jQuery.browser.name.toUpperCase()) {
            jQuery.browser.name = navigator.appName;
        }
    }
// trim the fullVersion string at semicolon/space if present
    if ((ix=jQuery.browser.fullVersion.indexOf(";"))!=-1)
        jQuery.browser.fullVersion=jQuery.browser.fullVersion.substring(0,ix);
    if ((ix=jQuery.browser.fullVersion.indexOf(" "))!=-1)
        jQuery.browser.fullVersion=jQuery.browser.fullVersion.substring(0,ix);

    jQuery.browser.majorVersion = parseInt(''+jQuery.browser.fullVersion,10);
    if (isNaN(jQuery.browser.majorVersion)) {
        jQuery.browser.fullVersion = ''+parseFloat(navigator.appVersion);
        jQuery.browser.majorVersion = parseInt(navigator.appVersion,10);
    }
    jQuery.browser.version = jQuery.browser.majorVersion;
})(jQuery);
var jqWindowsEngineZIndex = 100;

jQuery.extend({
    setWindowFocus:function($obj){
        if($obj.modal){
            $obj.css("z-index", 10001);
        }
        else{
            $obj.css("z-index", jqWindowsEngineZIndex++);
        }
    },
    newWindow: function(options) {
        var lastMouseX = 0;
        var lastMouseY = 0;

        var defaults = {
            id: "",
            title: "",
            width: 300,
            height: 200,
            posx: 50,
            posy: 50,
            content: "",
            onDragBegin: null,
            onDragEnd: null,
            onResizeBegin: null,
            onResizeEnd: null,
            onAjaxContentLoaded: null,
            onWindowClose: null,
            statusBar: true,
            minimizeButton: true,
            maximizeButton: true,
            closeButton: true,
            draggable: true,
            resizeable: true,
            type: "normal",
            modal: false
        };

        var options = $.extend(defaults, options);

        var idAttr = "";
        if (options.id != "") idAttr = 'id="' + options.id + '"';
        $modalBackground = $('<div class="modal-background"></div>');
        $modalBackground.css("z-index","10000");
        $windowContainer = $('<div ' + idAttr + ' class="window-container"></div>');
        $titleBar = $('<div class="window-titleBar"></div>');
        $titleBar.append('<div class="window-titleBar-leftCorner"></div>');
        $titleBarContent = $('<div class="window-titleBar-content">' + options.title + '</div>');
        $titleBar.append($titleBarContent);
        $titleBar.append('<div class="window-titleBar-rightCorner"></div>');
        $windowMinimizeButton = $('<div class="window-minimizeButton"></div>');
        $windowMaximizeButton = $('<div class="window-maximizeButton"></div>');
        $windowCloseButton = $('<div class="window-closeButton"></div>');
        $windowContent = $('<div class="window-content"></div>');
        $windowStatusBar = $('<div class="window-statusBar"></div>');
        $windowResizeIcon = $('<div class="window-resizeIcon"></div>');
        $windowSenderIcon = $('<span style="float: right;margin-right: 15px;" class="window-SenderIcon">发送</span>');
        if (options.minimizeButton) $titleBar.append($windowMinimizeButton);
        if (options.maximizeButton) $titleBar.append($windowMaximizeButton);
        if (options.closeButton) $titleBar.append($windowCloseButton);
        if (options.resizeable) $windowStatusBar.append($windowResizeIcon);
        if (options.sendBtn) $windowStatusBar.append($windowSenderIcon);
        $windowSenderIcon.on('click',function(){
            if(options.onSendBtnClick){
                options.onSendBtnClick(this,$windowContainer)
            }
        })
        $windowContainer.append($titleBar);
        $windowContent.append(options.content);
        $windowContainer.append($windowContent);
        if (options.statusBar) $windowContainer.append($windowStatusBar);
        
        if(options.type === "iframe"){
            $windowContent.css("overflow","hidden");
        }
        
        var disableSelection = function() {
            document.onselectstart = function() {
                return false;
            };
        }
        
        var enableSelection = function() {
            document.onselectstart = null;
        }
        
        var setFocus = function($obj) {
            if(options.modal){
                $obj.css("z-index", 10001);
            }
            else{
                $obj.css("z-index", jqWindowsEngineZIndex++);
            }
        }
        var resize = function($obj, width, height) {
            width = parseInt(width);
            height = parseInt(height);
            $obj.data("lastWidth", width).data("lastHeight", height);
            $obj.css("width", width + "px").css("height", height + "px");
            if (options.type === "iframe") {
                var dw = 3, dh = 2;
                if($.browser.msie && $.browser.version < 9.0)dw = dh = 0;
                $obj.find("iframe").css("width", (width-dw) + "px").css("height", (height-dh) + "px");
                
                $obj.find("iframe").each(function(){
                    $("#jquery-window-engine-iframe-cover").css({top:$(this).offset().top, left:$(this).offset().left,
                    width:this.offsetWidth,height:this.offsetHeight,
                    position: "absolute", opacity: "0.0001", zIndex: 10000,
                    background:"#444"});
                });
            }
        }
        
        var move = function($obj, x, y) {
            x = Math.max(0,parseInt(x));
            y = Math.max(0,parseInt(y));
            $obj.data("lastX", x).data("lastY", y);
            x = x + "px";
            y = y + "px";
            $obj.css("left", x).css("top", y);
            
            if (options.type === "iframe") {
                $obj.find("iframe").each(function(){
                    $("#jquery-window-engine-iframe-cover").css({top:$(this).offset().top, left:$(this).offset().left,
                    width:this.offsetWidth,height:this.offsetHeight,
                    position: "absolute", opacity: "0.0001", zIndex: 10000,
                    background:"#444"});
                });
            }
        }
        
        var dragging = function(e, $obj) {
            if (options.draggable) {
                e = e ? e : window.event;
                var newx = parseInt($obj.css("left")) + (e.clientX - lastMouseX);
                var newy = parseInt($obj.css("top")) + (e.clientY - lastMouseY);
                lastMouseX = e.clientX;
                lastMouseY = e.clientY;

                move($obj, newx, newy);
            }
        };
        
        var resizing = function(e, $obj) {
            e = e ? e : window.event;
            var w = parseInt($obj.css("width"));
            var h = parseInt($obj.css("height"));
            w = w < 100 ? 100 : w;
            h = h < 50 ? 50 : h;
            var neww = w + (e.clientX - lastMouseX);
            var newh = h + (e.clientY - lastMouseY);
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;

            resize($obj, neww, newh);
        };
        
        //Attach a mousedown event to the window's title bar to allow dragging
        $titleBarContent.bind('mousedown.jquerywindow', function(e) {
            $obj = $(e.target).parent().parent();
            setFocus($obj);
            disableSelection();
            
            if ($obj.data("state") != "maximized") {
                
                if (options.type === "iframe") {
                    var $tmpDiv = $('<div id="jquery-window-engine-iframe-cover" ></div>');
                    $obj.find("iframe").each(function(){
                        $tmpDiv.css({top:$(this).offset().top, left:$(this).offset().left,
                        width:this.offsetWidth,height:this.offsetHeight,
                        position: "absolute", opacity: "0.0001", zIndex: 10000,
                        background:"#444"});
                        $('body').append($tmpDiv);
                    });
                }
            
                e = e ? e : window.event;
                lastMouseX = e.clientX;
                lastMouseY = e.clientY;

                $(document).bind('mousemove.jquerywindow', function(e) {
                    dragging(e, $obj);
                });

                $(document).bind('mouseup.jquerywindow', function(e) {
                    if (options.type === "iframe") $("#jquery-window-engine-iframe-cover").remove();
                    if (options.onDragEnd != null) options.onDragEnd();
                    $(document).unbind('mousemove.jquerywindow');
                    $(document).unbind('mouseup.jquerywindow');
                    enableSelection();
                });

                if (options.onDragBegin != null) options.onDragBegin();
            }else if (options.type === "iframe"){
                $("#jquery-window-engine-iframe-cover").remove();
            }
            
            return false;
        });
        
        //Attach a double click event to the window's title bar to allow maximization
        $titleBarContent.dblclick(function(e) {
            $obj = $(e.target).parent().parent();
            $obj.find(".window-maximizeButton").click();
        });
        
        //Attach a mousedown event to the window's resize icon to allow resizing
        $windowResizeIcon.bind('mousedown.jquerywindow', function(e) {
            $obj = $(e.target).parent().parent();
            setFocus($obj);
            disableSelection();
            
            if ($obj.data("state") === "normal") {
            
                if (options.type === "iframe") {
                    var $tmpDiv = $('<div id="jquery-window-engine-iframe-cover" ></div>');
                    $obj.find("iframe").each(function(){
                        $tmpDiv.css({top:$(this).offset().top, left:$(this).offset().left,
                        width:this.offsetWidth,height:this.offsetHeight,
                        position: "absolute", opacity: "0.0001", zIndex: 10000,
                        background:"#444"});
                        $('body').append($tmpDiv);
                    });
                }
            
                e = e ? e : window.event;
                lastMouseX = e.clientX;
                lastMouseY = e.clientY;

                $(document).bind('mousemove.jquerywindow', function(e) {
                    resizing(e, $obj);
                });

                $(document).bind('mouseup.jquerywindow', function(e) {
                    if (options.type === "iframe") $("#jquery-window-engine-iframe-cover").remove();
                    if (options.onResizeEnd != null) options.onResizeEnd();
                    $(document).unbind('mousemove.jquerywindow');
                    $(document).unbind('mouseup.jquerywindow');
                    enableSelection();
                });

                if (options.onResizeBegin != null) options.onResizeBegin();
            }
            return false
        });
        
        //Attach a click event to the window's minimize button to allow window minimization
        $windowMinimizeButton.bind('click.jquerywindow', function(e) {
            $obj = $(e.target).parent().parent();
            setFocus($obj);
            var $icon=$obj.children('.window-container .window-titleBar').children(".window-minimizeButton");
            if ($obj.data("state") === "minimized") {
                $icon.css('width','11px').css('height','0px').css('top','10px').css('left','35px');;
                $obj.data("state", "normal");
                $obj.css("height", $obj.data("lastHeight"));
                $obj.find(".window-content").slideToggle("slow");
            }
            else if ($obj.data("state") === "normal") {
                $icon.css('width','0px').css('height','11px').css('top','6px').css('left','38px');
                $obj.data("state", "minimized");
                $obj.find(".window-content").slideToggle("slow", function() { $obj.css("height", 0); });
            }
            else {
                $obj.find(".window-maximizeButton").click();
            }
        });

        $windowMaximizeButton.bind('click.jquerywindow', function(e) {
            $obj = $(e.target).parent().parent();
            setFocus($obj);
            
            ////for iframe browser compatibility
            var dw = 3, dh = 2;
            var $icon=$obj.children('.window-container .window-titleBar').children(".window-maximizeButton");
            if($.browser.msie && $.browser.version < 9.0)dw = dh = 0;
            //////////////////////////////////////////////////////////
            if ($obj.data("state") === "minimized") {
                $obj.find(".window-minimizeButton").click();
            }
            else if ($obj.data("state") === "normal") {
                $obj.animate({
                    top: "5px",
                    left: "5px",
                    width: $(window).width() - 15,
                    height: $(window).height() - 45
                }, "slow");
                if (options.type === "iframe") {
                    $obj.find("iframe").animate({
                        top: "5px",
                        left: "5px",
                        width: $(window).width() - 15 - dw,
                        height: $(window).height() - 45 - dh
                    }, "slow");
                }
                $icon.css('border','4 ridge white');
                $obj.data("state", "maximized")
            }
            else if ($obj.data("state") === "maximized") {
                $obj.animate({
                    top: $obj.data("lastY"),
                    left: $obj.data("lastX"),
                    width: $obj.data("lastWidth"),
                    height: $obj.data("lastHeight")
                }, "slow");
                if (options.type === "iframe") {
                    $obj.find("iframe").animate({
                        top: $obj.data("lastY"),
                        left: $obj.data("lastX"),
                        width: parseInt($obj.data("lastWidth") - dw),
                        height: parseInt($obj.data("lastHeight") - dh)
                    }, "slow");
                }
                $icon.css('border','2 ridge white');
                $obj.data("state", "normal")
            }

        });
        
        //Attach a click event to the popup's close button to allow closing
        $windowCloseButton.bind('click.jquerywindow', function(e) {
            var $window = $(e.target).parent().parent();
            $window.fadeOut(function() { $window.remove(); });
            if (options.onWindowClose != null) options.onWindowClose();
            if(options.modal){
                $modalBackground.remove();
            }
        });
        
        //Attach a click event to the popup's background to allow closing
        $modalBackground.bind('click.jquerywindow', function(e) {
            $windowCloseButton.click();
        });

        $windowContent.click(function(e) {
            setFocus($(e.target).parent());
        });
        $windowStatusBar.click(function(e) {
            setFocus($(e.target).parent());
        });

        $windowContainer.data("state", "normal");
        //hide the popup to show it later using a visual effect
        $windowContainer.css("display", "none");

        $('body').append($windowContainer);
        if(options.modal){
            $('body').append($modalBackground);
        }

        $window = $windowContainer;
        if (!options.draggable) $window.children(".window-titleBar").css("cursor", "default");
        setFocus($window);
        
        //move the popup to the initial position
        move($windowContainer, options.posx, options.posy);
        //resize the popup to the initial size
        resize($windowContainer, options.width, options.height);
        
        
        
        //show the popup using the jquery fadeIn visual effect
        $window.fadeIn();


    },
    updateWindowContent: function(id, newContent) {
        $("#" + id + " .window-content").html(newContent);
    },

    updateWindowContentWithAjax: function(id, url, cache) {
        cache = cache === undefined ? true : false;
        $.ajax({
            url: url,
            cache: cache,
            dataType: "html",
            success: function(data) {
                $("#" + id + " .window-content").html(data);
            }
        });
    },

    moveWindow: function(id, x, y) {
        $obj = $("#" + id);
        x = parseInt(x);
        y = parseInt(y);
        $obj.data("lastX", x).data("lastY", y);
        x = x + "px";
        y = y + "px";
        $obj.css("left", x).css("top", y);
    },

    resizeWindow: function(id, width, height) {
        $obj = $("#" + id);
        width = parseInt(width);
        height = parseInt(height);
        $obj.data("lastWidth", width).data("lastHeight", height);
        width = width + "px";
        height = height + "px";
        $obj.css("width", width).css("height", height);
    },

    minimizeWindow: function(id) {
        $("#" + id + " .window-minimizeButton").click();
    },

    maximizeWindow: function(id) {
        $("#" + id + " .window-maximizeButton").click();
    },

    showWindow: function(id) {
        $("#" + id + " .window-closeButton").fadeIn();
    },

    hideWindow: function(id) {
        $("#" + id + " .window-closeButton").fadeOut();
    },

    closeWindow: function(id) {
        $("#" + id + " .window-closeButton").click();
    },

    closeAllWindows: function() {
        $(".window-container .window-closeButton").click();
    }

});
