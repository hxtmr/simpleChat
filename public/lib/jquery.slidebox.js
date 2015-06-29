/*
 (function ($) {
 jQuery.fn.slidebox = function (options) {
 var defaults = {pagePercentage: 0.9};
 var options = $.extend(defaults, options);
 var slidebox = this;
 var originalPosition = slidebox.css('right');
 var open = false;
 $(window).scroll(function () {
 if ($(window).scrollTop() > 0 && $(window).height() + $(window).scrollTop() > options.pagePercentage * $(document).height()) {
 if (!open) {
 open = true;
 slidebox.animate({'right': '0px'}, 300);
 }
 } else {
 open = false;
 slidebox.stop(true).animate({'right': originalPosition}, 100);
 }
 });
 slidebox.find('.slidebox-close').click(function (event) {
 event.preventDefault();
 slidebox.fadeOut(function () {
 100, slidebox.remove();
 });
 });
 }
 })(jQuery);*/
(function ($) {
    jQuery.fn.slidebox = function (options) {
        var defaults = {pagePercentage: 0.0};
        var options = $.extend(defaults, options);
        var slidebox = this;
       // var originalPosition = slidebox.css('right');
        slidebox.find('.slidebox-close').click(function (event) {
            event.preventDefault();
            /*slidebox.fadeOut(function () {
                100*//*, slidebox.remove();*//*
            });*/
            slidebox.animate({'right': '-400px'}, 300);
        });
    }
    jQuery.fn.open = function (data) {
        var slidebox=this;
        var originalPosition = slidebox.css('right');
        var open = false;
        var title=slidebox.find(".slidebox-title");
        var desc=slidebox.find(".slidebox-desc");
        title.html(data.title);
        desc.html(data.message);
        if (!open) {
            open = true;
            slidebox.animate({'right': '0px'}, 300);
        } else {
            open = false;
            slidebox.stop(true).animate({'right': originalPosition}, 100);
        }
    }
    jQuery.fn.close=function(){
        var slidebox=this;
        slidebox.animate({'right': '-400px'}, 300);
    }
})(jQuery);