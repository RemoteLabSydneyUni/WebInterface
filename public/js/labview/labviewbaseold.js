/**
 * Rig rig interface.
 * 
 * @author Michael Diponio
 * @date 13th February 2011
 */
 
function Rig() {
        /* -- Constants ------------------------------------ */
        this.controller = "LabVIEWController";
        this.STATIC_LOAD = 4;
       
        
        /* Experiment variables. */
        this.add = 0;
        
        this.widgets = [];
}

 // Transfers data to the controller
Rig.prototype.command = function(action, params) {
	var thiz = this;
    $.get("/primitive/json/pc/" + this.controller + "/pa/" + action,
                params,
                function (resp) {
                        if (typeof resp == "object") { 
							thiz.values(resp);
							thiz.repaint();
						}
                }
    );
};

 /*-- Only modify Specified Values Below this point --*/

/* Display debug information. */
Rig.prototype.debug = false;

/* Whether the page is ready for interaction. */
Rig.prototype.ready = false;

Rig.prototype.init = function() {
        
        this.startDisplay();
        if (this.debug)
        {
                $('#rigdebugpanel').show();
                this.updateDebug();
        }
        
        this.addOverlay("Initalising");
        this.paramsInit();
        this.valuesRequest();
};

Rig.prototype.changeExperiment = function() {
        $("body").append(
                "<div id='changeexperiment' title='Change Experiment'>" +
                        "<div class='ui-state-primary'>Are you sure you want to change experiment?</div>" +
                        "<div class='ui-state-highlight ui-corner-all'>" +
                                "<span class='ui-icon ui-icon-info'></span>" +
                                "This will reset the rig but you will not be removed from the rig." +
                        "</div>" +
                "<div>"
        );
        
        var thiz  = this;
        $("#changeexperiment").dialog({
                modal: true,
                resizable: false,
                width: 400,
                buttons: {
                        Yes: function() {
                                if (thiz.pump == 0 && thiz.flowrate < 0.1)
                                {
                                        thiz.startDisplay();
                                        $(this).dialog("close").remove();
                                }
                                
                                var func = '', diag = $('div[aria-labelledby="ui-dialog-title-changeexperiment"]')
                                        .css("width", 150);
                                
                                diag.css("left", parseInt(diag.css("left")) + 125);
                                diag.children(".ui-dialog-titlebar").hide();
                                diag.children(".ui-dialog-buttonpane").hide();
                                $(this).html(
                                                "<div id='rigresetting'>" +
                                                        "<img src='/images/ajax-loading.gif' alt=' ' /><br />" +
                                                        "Resetting..." +
                                                "</div>"
                                );
                                
                                thiz.setPressure(0);
                                thiz.setLoad(0);

                                setTimeout(func = function() {
                                        if (thiz.pump == 0 && thiz.flowrate < 0.1)
                                        {
                                                thiz.startDisplay();
                                                $("#changeexperiment").dialog("close").remove();
                                        }
                                        else setTimeout(func, 500);
                                }, 500);

                        },
                        No: function() {
                                $(this).dialog("close").remove();
                        }
                }
        });
};

Rig.prototype.startDisplay = function() {
        var i = 0;
        
        /* Clear the existing display. */
        while (this.widgets.length > 0) this.widgets.pop().destroy();
        
        this.widgets.push(new CameraWidget(this));
        this.widgets.push(new PhotosWidget(this));
		this.widgets.push(new SelectorWidget(this));
		this.widgets.push(new FlowGaugeWidget(this));
		this.widgets.push(new ScaledPressureSliderWidget(this));

        for (i in this.widgets) this.widgets[i].init();
};

Rig.prototype.repaint = function() {
        var i = 0;
        for (i in this.widgets) this.widgets[i].repaint();
        
        if (this.debug) this.updateDebug();
};

Rig.prototype.resetPosition = function() {
        for (i in this.widgets) this.widgets[i].posReset();
};

/* ============================================================================
 * == Utility & debug.                                                       ==
 * ============================================================================ */
Rig.prototype.addOverlay = function(message) {
        this.isOverlayDeployed = true;
};

Rig.prototype.clearOverlay = function() {
        this.isOverlayDeployed = false;
};

Rig.prototype.raiseError = function(error, level) {
        if (typeof console == "undefined") return;
        
        switch (level)
        {
        case 'DEBUG':
                console.debug("Rig debug: " + error);
                break;
        
        case 'INFO':
                console.info("Rig Info: " + error);
                break;
        
        case 'WARN':
                console.warn("Rig Warn: " + error);
                break;
                
        case 'ERR':
        default:
                console.error("Rig Err: " + error);                
        }
};

Rig.prototype.updateDebug = function() {
        if (!this.debug) return;
        
        $('#rigdebug').empty().append(
                   '<div>Mode: ' + this.mode + '</div>' +
                   '<div>Pump: ' + this.pump + '</div>' + 
                   '<div>Load: ' + this.load + '</div>' + 
                   '<div>Power: ' + this.power + '</div>' + 
                   '<div>Voltage: ' + this.voltage + '</div>' + 
                   '<div>Current: ' + this.current + '</div>' + 
                   '<div>Torque: ' + this.torque + '</div>' + 
                   '<div>RPM: ' + this.rpm + '</div>' + 
                   '<div>Flow rate: ' + this.flowrate + '</div>' + 
                   '<div>Pressure: ' + this.pressure + '</div>'
        );
};

/* ============================================================================
 * == Generic Widgets                                                          ==
 * ============================================================================ */
function RigWidget(riginst) 
{
        this.rig = riginst;
        this.canvas = $("#rig");
        
        this.jqEle;
        
        this.defaultCoords = "0x0";
}
RigWidget.prototype.init = function() { };
RigWidget.prototype.postInit = function() {
        this.draggable();
        this.defaultCoords = parseInt(this.jqEle.css("left")) + "x" + parseInt(this.jqEle.css("top"));
        this.setPos(getRigCookie(this.jqEle.attr("id") + "_M"));
};
RigWidget.prototype.repaint = function() { };
RigWidget.prototype.draggable = function() {
        var thiz = this;
        this.jqEle.addClass('rigdrag')
                .draggable({
                        handle: 'p',
                        opacity: 0.6,
                        stack: '.rigdrag',
                        stop:function() { thiz.posMoved(); }
                });
};
RigWidget.prototype.posMoved = function() {
        setRigCookie(this.jqEle.attr("id") + "_M", 
                        parseInt(this.jqEle.css("left")) + "x" + parseInt(this.jqEle.css("top")));
        
        resizeFooter();
};
RigWidget.prototype.posReset = function() {
        this.setPos(this.defaultCoords);
        setRigCookie(this.jqEle.attr("id") + "_M", this.defaultCoords);
};
RigWidget.prototype.setPos = function(pos) {
        if (!pos || pos == "") return;
        
        var coords = pos.split("x");
        
        if (coords.length == 2)
        {
                this.jqEle.css({
                        "left": parseInt(coords[0]) + "px",
                        "top": parseInt(coords[1]) + "px"
                });
        }
        else this.rig.raiseError("Provided position for widget " + this.jqEle.attr("id") + " has incorrect format.", "WARN");
        
        resizeFooter();
};
RigWidget.prototype.destroy = function() {
        this.jqEle.remove();
};

/*-- Selector Widget - List of buttons --*/
function SelectorWidget(riginst)
{
        RigWidget.call(this, riginst);
        
        this.NUM_MODES = 1;
        this.MODE_LABELS = ['Selector', 
                            'LabVIEW Add'];
        this.MODE_IMGS =   ['',
                            'selvis'];
}
SelectorWidget.prototype = new RigWidget;
SelectorWidget.prototype.init = function() {
        var s = 1,
                html = '<div id="rigselector"><ul>';
                    
                for ( ; s <= this.NUM_MODES; s++) html +=
                                        '<li><a id="exp' + s + '" class="modesel">' +
                                                '<img src="/uts/rig/images/' + this.MODE_IMGS[s] + '.png" alt="img" />' +
                                                s + '. ' + this.MODE_LABELS[s] +
                                        '</a></li>';
        
            html += '</ul></div>';

        this.canvas.append(html);
        var riginst = this.rig;
		var thiz = this;
        $('.modesel').click(function() {
                thiz.rig.setAdd(3,4);
        });
        
        this.jqEle = $("#rigselector");
		this.postInit();
};

/*-- Camera Widget --*/
function CameraWidget(riginst)
{
        RigWidget.call(this, riginst);
        
        /* Default camera properties. */
        this.width = 320;
        this.height = 240;
        
        this.positions = [];
        
        this.deployed = '';
        this.currentPosition = '';
}
CameraWidget.prototype = new RigWidget;
CameraWidget.prototype.init = function() {
        var thiz = this,
                html = '<div id="rigcamera" class="rigpanel ui-corner-all">' +
                              '<div class="rigpaneltitle" class="rigdrag">' +
                                 '<p>' +
                                    '<span class="ui-icon ui-icon-video"></span>Camera' +
                                 '</p>' +
                              '</div>' +
                              '<div id="rigcamerastream">' +
                              '</div>' +
                              '<div id="rigcamerabuttons">' +
                              '</div>' +
                           '</div>';

        this.canvas.append(html);
        $("#rigcamerastream").css({
                width: this.width,
                height: this.height
        });
        
        this.jqEle = $("#rigcamera");
        
        this.jqEle.resizable({
                minHeight: 386,
                maxHeight: 626,
                minWidth: 320,
                maxWidth: 640,
                ghost: true,
                aspectRatio: true,
                stop: function(event, ui) {
                        thiz.resize(ui.size.width, ui.size.height);
                }
        });
        
        this.postInit();
        
        $.get('/primitive/json/pc/CameraController/pa/details', 
                null, 
                function(response) {
                        thiz.draw(response);
                        thiz.move("House");
        });
};
CameraWidget.prototype.draw = function(resp) {
        if (typeof resp != "object") 
        {
                this.rig.raiseError('Unable to load cameras details.');
                return;
        }
        
        var i = 0, html, thiz = this;
        
        for (i in resp)
        {
                switch(resp[i].name)
                {
                case 'mpeg':
                        this.video = resp[i].value;
                        break;
                case 'mjpeg':
                        this.mjpeg = resp[i].value;
                        break;
                default:
                        this.positions.push(resp[i].value);
                        break;
                }
        }
        
        /* Deploy buttons. */
        html = '<div id="rigcamformats">' +
               '<div class="camheader">Formats</div>' +
                               '<div id="imagesbutton" class="camerabutton">MJPEG</div>';
        
        /* MS WMP does not play mpeg files until they are complete so there is no point
         * giving the option. */
        if (!$.browser.msie) html +=  '<div id="videobutton"  class="camerabutton">ASF</div>'; 
        
        html +=   
                   '</div>' +
                   
                   '<div id="rigcampositions">' +
               '<div class="camheader">Positions</div>';;
        
        for (i in this.positions)
        {
                html += '<div class="positionbutton camerabutton">' + this.positions[i] + '</div>';
        }
        
        html += '</div>' +
                   '<div style="clear:both"></div>';
                   
        
        $("#rigcamerabuttons").append(html);
        
        /* Event listeners. */
        if (!$.browser.msie) $("#imagesbutton").click(function() { thiz.deployImages(); });
        $("#videobutton").click(function() { thiz.deployVideo(); });
        $("#rigcamerabuttons .positionbutton").click(function() {
                $("#rigcampositions .selectedbutton").removeClass("selectedbutton");
                $(this).addClass("selectedbutton");
                thiz.move($(this).text()); 
        });
        
        /* Default deployment. */
        this.deployImages();
};
CameraWidget.prototype.deployImages = function() {
        this.deployed = 'mjpeg';
        
        $("#rigcamformats .selectedbutton").removeClass("selectedbutton");
        $("#imagesbutton").addClass("selectedbutton");
        
        var $rigCam = $("#rigcamerastream");
        $rigCam.empty();
        
        if ($.browser.msie)
        {
                /* Internet explorer does not display motion JPEG a Java applet is 
                 * deployed to stream it. */
                $rigCam.append(
                                '<applet code="com.charliemouse.cambozola.Viewer" archive="/applets/cambozola.jar" ' + 
                                                'width="' + this.width + '" height="' + this.height + '">' +
                                        '<param name="url" value="' + this.mjpeg + '"/>' +
                                        '<param name="accessories" value="none"/>' +
                                '</applet>'
                );
        }
        else
        {
                /* Other browsers can play motion JPEG natively. */
                $rigCam.append(
                                "<img style='width:" + this.width + "px;height:" + this.height + "px' " +
                                                "src='" + this.mjpeg + "?" + new Date().getTime() + "' alt='&nbsp;'/>"
                );
        }
};
CameraWidget.prototype.deployVideo = function() {
        this.deployed = 'asf';
        
        $("#rigcamformats .selectedbutton").removeClass("selectedbutton");
        $("#videobutton").addClass("selectedbutton");
        $("#rigcamerastream").empty().html(
                        "<object " +
                        "        classid='CLSID:22d6f312-b0f6-11d0-94ab-0080c74c7e95' " +
                        "        codebase='http://activex.microsoft.com/activex/controls/mplayer/en/nsmp2inf.cab' " +
                        "        standby='Loading Microsoft Windows Media Player...' " +
                        "        type='application/x-oleobject' " +
                        "        width='" + this.width + "' " +
                        "        height='" + this.height + "' >" +
                        "                <param name='fileName' value='" + this.video + "'>" +
                        "                <param name='animationatStart' value='1'>" +
                        "                <param name='transparentatStart' value='1'>" +
                        "                <param name='autoStart' value='1'>" +
                        "                <param name='ShowControls' value='0'>" +
                        "                <param name='ShowDisplay' value='0'>" +
                        "                <param name='ShowStatusBar' value='0'>" +
                        "                <param name='loop' value='0'>" +
                        "                <embed type='video/x-ms-asf-plugin' " +
                        "                        pluginspage='http://microsoft.com/windows/mediaplayer/en/download/' " +
                        "                        showcontrols='0' " +
                        "                        showtracker='1' " +
                        "                        showdisplay='0' " +
                        "                        showstatusbar='0' " +
                        "                        videoborder3d='0' " +
                        "                        width='" + this.width + "' " +
                        "                        height='" + this.height + "' " +
                        "                        src='" + this.video + "' " +
                        "                        autostart='1' " +
                        "                        loop='0' /> " +
                        "</object>");
};
CameraWidget.prototype.move = function(pos) {
        if (pos == this.currentPosition) return;
        
        this.currentPosition = pos;
        $.get('/primitive/json/pc/CameraController/pa/move/position/' + pos);
        
};
CameraWidget.prototype.resize = function(width, height) {
        this.width = width;
        this.height = height - 146 ;
        
        switch(this.deployed) 
        {
        case 'mjpeg':
                this.deployImages();
                break;
        case 'asf':
                this.deployVideo();
                break;
        }
};

/*-- Photos Widget --*/
function PhotosWidget(riginst) 
{
        RigWidget.call(this, riginst);
        
        this.photos = [];
}
PhotosWidget.prototype = new PhotosWidget;
PhotosWidget.prototype.init = function() {
        this.canvas.append(
                "<div id='photo-open' class='rigbutton ui-corner-all'>" +
                        "<span class='ui-icon ui-icon-image'></span>" +
                        "Photos" +
                "</div>"
        );
        
        //this.addPhoto("frontview.jpg", "Front", 640, 445); // Add Custom Photo's here

        
        var thiz = this;
        $("#photo-open").click(function() { thiz.show(); });
};
PhotosWidget.prototype.repaint = function() { };
PhotosWidget.prototype.show = function() {
        var ph, thiz = this, i = 0, html = 
                "<div id='photos-dialog'>" + 
                        "<div id='photo-displayed'> </div>" +
                        "<div id='photo-bar' style='width:" + 80 * (this.photos.length) + "px'>";
        
        for (i in this.photos)
        {
                ph = this.photos[i];
                html += "<div id='photo-" + i + "' class='photo-option'>" +
                                        "<img src='" + ph.path + "' alt='" + ph.name + "' />" +
                                "</div>";
        }
        
        html += "</div>";
        
        $("body").append(html).find(".photo-option").click(function() {
                thiz.displayPhoto(parseInt($(this).attr("id").substring($(this).attr("id").indexOf("-") + 1)));
        });
        this.displayPhoto(0);
        
        $("#photos-dialog").dialog({
                autoOpen: true,
                closeOnEscape: true,
                modal: true,
                resizable: false,
                width: 700,
                title: "Rigelectric Rig",
                close: function() { $(this).dialog("destroy").remove(); },
        });
};
PhotosWidget.prototype.addPhoto = function(file, name, width, height) {
        this.photos.push({
                path: "/uts/rig/images/photos/" + file,
                name: name,
                width: width,
                height: height
        });
};
PhotosWidget.prototype.displayPhoto = function(i) {
        var ph = this.photos[i];
        
        $("#photo-displayed")
                .empty()
                .append("<img src='" + ph.path + "' alt='" + ph.name + "' />")
                .css({
                        width:  ph.width,
                        height: ph.height
                });
};


/*-- Slider Widget --*/
function SliderWidget(riginst)
{
        RigWidget.call(this, riginst);
        this.setter = function (val) { };
}
SliderWidget.prototype = new RigWidget;
SliderWidget.prototype.init = function() {
        this.val = rig.pump;
        var i, html =
                '<div id="slidercont" class="rigpanel ui-corner-all">' +
                        '<div class="rigpaneltitle">' +
                                '<p><span class="ui-icon ui-icon-gear"></span>Pump</p>' +
                        '</div>' +
                        '<div id="sliderinner">' +
                                '<div id="slider"> </div>' +
                                '<div id="sliderleg">';
                for (i = 0; i <= 10; i++)
                {
                        html += 
                                '<div class="slidertick">' +
                                        '<span class="ui-icon ui-icon-arrowthick-1-w"> </span>' +
                                        (i < 10 ? (this.maxValue - i * this.minValue/10) + ' ' + this.unit  : 'Off') +
                                '</div>';
                }
                
        
                html +=        '</div>' +
                        '</div>' +
                        '<div id="sliderval">Value: <span>' + this.val + '</span> %</div>' +
                '</div>';
        this.canvas.append(html);
        
        this.jqEle = $("#slidercont");
        
        var thiz = this;
        $("#slider").slider({
                orientation: "vertical",
                min: this.minValue,
                max: this.maxValue,
                value: this.val,
                range: "min",
                slide: function(event, ui) {
                        $("#sliderval span").empty().append(ui.value);
                },
                stop: function(event, ui) {
                        thiz.setter.call(thiz.rig, ui.value);
                }
        });
        
        this.slider = $("#slider");
        this.slider.children(".ui-slider-handle").css('width', 30)
                .css("left", "-11px")
                .css("cursor", "row-resize");
        
        this.slider.children(".ui-slider-range").removeClass("ui-widget-header")
                .css("background-color", "#EFEFEF")
                .css("overflow", "hidden")
                .css("width", "10px");
        this.sliderVal = $("#sliderval span");
        
        this.postInit();
};
SliderWidget.prototype.repaint = function() {
        if (this.val != rig.pump)
        {
                this.slider.slider("value", rig.pump);
                this.sliderVal.empty().append(rig.pump);
        }
        return this;
};
SliderWidget.prototype.destroy = function() {
        this.slider.slider("destory");
        $("#slidercont").remove();
};


/*-- Horz Setter Widget --*/
/*
function LoadSetterWidget(riginst)
{
        RigWidget.call(this, riginst);
        
        this.val = this.rig.load;
}
LoadSetterWidget.prototype = new RigWidget;
LoadSetterWidget.prototype.init = function() {
        var i, html = 
                "<div id='loadsetterpanel' class='rigpanel ui-corner-all'>" +
                        "<div class='rigpaneltitle'><p>" +
                                "<span class='rigicon rigiconload'></span>" +
                                "Load" +
                        "</p></div>" +
                        "<div class='loadsetterinner'>" +
                                "<div id='loadsetter'> </div>" +
                                "<div id='loadticks'>";

        for (i = 0; i <= 4; i++) html +=         
                                        "<div class='loadtick'>" +
                                                "<span class='ui-icon ui-icon-arrowthick-1-n'> </span>" + i +
                                        "</div>";

        html +=         "</div>" +
                        "<div>" +
                "</div>";
        
        this.canvas.append(html);
        
        this.jqEle = $("#loadsetterpanel");
        
        var thiz = this;
        this.ls = $("#loadsetter").slider({
                orientation: "horizontal",
                min: 0,
                max: 4,
                value: this.val,
                stop: function(evt, ui) {
                        thiz.rig.setLoad.call(thiz.rig, ui.value);
                }
        });
        
        this.ls.children(".ui-slider-handle").css('height', 30)
                .css("cursor", "col-resize");
        
        this.postInit();
};
LoadSetterWidget.prototype.repaint = function() {
        if (this.val != this.rig.load)
        {
                this.val = this.rig.load;
                this.ls.slider("option", "value", this.val);
        }
};
LoadSetterWidget.prototype.destroy = function() {
        $("#loadsetterpanel").remove();
};
*/
/*-- Gauge Widget --*/
var gac = 0;
function GaugeWidget(riginst)
{
        RigWidget.call(this, riginst);
        
        this.WIDTH = 172;
        this.STEP_SIZE = 3;
        this.ANIME_PERIOD = 33;
        
        this.id = "gauge" + gac++;

        this.currentVal = 0;
        this.animeVal = 0;
        this.isAnime = false;
        
        /* Animation values. */
        this.isAnime = false;
        this.cr = 0.0;
        this.dr = 0.0;
        
        /* Browser detection. */
        this.browser = "unknown";

        if      ($.browser.mozilla) this.browser = 'moz';
        else if ($.browser.webkit) this.browser = 'webkit';
        else if ($.browser.msie && parseInt($.browser.version) >= 9) this.browser = 'msie9';
        else if ($.browser.msie) this.browser = 'msie';
        else if ($.browser.opera && parseInt($.browser.version) >= 11) this.browser = 'opera';
}
GaugeWidget.prototype = new RigWidget;
GaugeWidget.prototype.init = function() {
        if ($("#gaugecontainer").length != 1)
        {
                this.canvas.append("<div id='gaugecontainer'> </div>");
        }
        
        var s = '' + this.animeVal;
        if (s.indexOf('.') == -1) s += '.00';
        else while (s.length - s.indexOf('.') < 3) s += '0';
        
        $("#gaugecontainer").append(
                "<div id='" + this.id + "' class='gauge rigpanel ui-corner-all'>" +
                        "<div class='rigpaneltitle'><p>" +
                                "<span class='rigicon " + this.icon + "'> </span>" +
                                this.name +
                        "</p></div>" +
                        "<div class='gaugeinner'>" +
                                "<div class='gaugetick'><img src='/uts/rig/images/tick.png' alt='T' /></div>" +
                                "<div class='gaugekeystone'><img src='/uts/rig/images/keystone.png' alt='k' /></div>" +
                                "<div class='gaugegrad gaugegradmin'><img src='/uts/rig/images/gradh.png' alt='k' /></div>" +
                                "<div class='gaugegrad gaugegradne'><img src='/uts/rig/images/gradne.png' alt='k' /></div>" +
                                "<div class='gaugegrad gaugegradmid'><img src='/uts/rig/images/gradv.png' alt='k' /></div>" +
                                "<div class='gaugegrad gaugegradnw'><img src='/uts/rig/images/gradnw.png' alt='k' /></div>" +
                                "<div class='gaugegrad gaugegradmax'><img src='/uts/rig/images/gradh.png' alt='k' /></div>" +
                                "<div class='gaugegradlabel gaugegradlabelmin'>" + this.minVal + "</div>" +
                                "<div class='gaugegradlabel gaugegradlabelmid'>" + round((this.maxVal - this.minVal) / 2, 2) + "</div>" +
                                "<div class='gaugegradlabel gaugegradlabelmax'>" + this.maxVal + "</div>" +
                                "<div class='gaugevalouter'>" +
                                        "<span class='gaugeval'>" + s + "</span> " + this.units +
                                "</div>" +
                        "</div>" + 
                "</div>"
        );
        
        this.id = "#" + this.id;        
        this.tick = $(this.id + " .gaugetick");
        this.tickVal = $(this.id + " .gaugeval");
        this.dr = this.cr = this.getValue() / (this.maxVal - this.minVal) * 180 - 90;
        this.rotate(this.dr);
        
        this.jqEle = $(this.id);
        
        if ((s = $("#gaugecontainer .gauge").length) > 3)
        {
                this.canvas.css("height", 550 + (s - 3) * 160);
                resizeFooter();        
        }
        
        this.postInit();
};
GaugeWidget.prototype.repaint = function() {
        if (this.currentVal != this.getValue())
        {
                /* Gauge display. */
                this.currentVal = this.getValue();
                this.dr = this.currentVal / (this.maxVal - this.minVal) * 180 - 90;
                if (!this.isAnime)
                {
                        this.isAnime = true;
                        this.animate();
                }
        }
};
GaugeWidget.prototype.destroy = function() {
        if (this.st) clearTimeout(this.st);
        
        $(this.id).remove();
        var w, gc = $("#gaugecontainer");
        if ((w = parseInt(gc.css("width"))) == this.WIDTH)
        {
                gc.remove();
                gac = 0;
        }
        else 
        {
                gc.css("width", w - this.WIDTH);
                gac--;
        }
        
        if ((s = $("#gaugecontainer .gauge").length) <= 3)
        {
                this.canvas.css("height", 550);
                resizeFooter();
        }
};
GaugeWidget.prototype.animate = function() {
        if (this.dr == this.cr)
        {
                this.isAnime = false;
                return;
        }
        else if (this.dr > this.cr)
        {
                if (this.dr - this.cr > this.STEP_SIZE)
                {
                        this.cr += this.STEP_SIZE;
                        var thiz = this;
                        this.st = setTimeout(function(){
                                thiz.animate();
                        }, this.ANIME_PERIOD);
                }
                else
                {
                        this.isAnime = false;
                        this.cr = this.dr; 
                }
        }
        else
        {
                if (this.cr - this.dr > this.STEP_SIZE)
                {
                        this.cr -= this.STEP_SIZE;
                        var thiz = this;
                        this.st = setTimeout(function(){
                                thiz.animate();
                        }, this.ANIME_PERIOD);
                }
                else
                {
                        this.isAnime = false;
                        this.cr = this.dr; 
                }
        }
        
        /* Work backwords to find the interpolated value. */
        var s = '' + round((this.cr + 90) / 180 * (this.maxVal - this.minVal), 2);
        if (s.indexOf('.') == -1) s += '.00';
        else while (s.length - s.indexOf('.') < 3) s += '0';
        
        this.tickVal.html(s);
        this.rotate(this.cr);
};
GaugeWidget.prototype.rotate = function(deg) {
        switch (this.browser)
        {
        case "moz":
                this.tick.css("-moz-transform", "rotate(" + deg + "deg)");
                break;
        case "webkit":
                this.tick.css("-webkit-transform", "rotate(" + deg + "deg)");
                break;
        case "opera":
                this.tick.css("-o-transform", "rotate(" + deg + "deg)");
                break;
        case "msie9":
                this.tick[0].style.msTransform = "rotate(" + deg + "deg)";
                break;
        case "msie":
                var rad = deg * Math.PI / 180,
                        a = parseFloat(parseFloat(Math.cos(rad)).toFixed(8)),
                        b = parseFloat(parseFloat(Math.sin(rad)).toFixed(8)),
                        c = -b, 
                        d = a;
                
                this.tick.css("filter", "progid:DXImageTransform.Microsoft.Matrix(" +
                                                "M11=" + a + ", M12=" + c + ", " +
                                                "M21=" + b + ", M22=" + d + ", " +
                                                "SizingMethod='auto expand'" +
                                           ")");
                
                var i = 0, j = 0,
                    m = [
                         [a, c, 0],
                         [b, d, 0],
                         [0, 0, 1]
                    ],
                        to = [
                             [4],
                             [60],
                             [1]
                        ], tc = [],
                        fo = [
                             [0],
                             [0],
                             [1]
                        ], fc = [];
                
                for (i in m)
                {
                        var tp = 0, fp = 0;
                        for (j in m[i])
                        {
                                tp += m[i][j] * to[j];
                                fp += m[i][j] * fo[j];
                        }
                        tc.push(tp);
                        fc.push(fp);
                }
                
                if (0 <= deg && deg < 90)
                {
                        this.tick.css({
                                left: (70 - 60 * b + (fc[0] - fo[0][0] - (tc[0] - to[0]))) + 'px', 
                                top: (45 + fc[1] - fo[1][0] - (tc[1] - to[1][0])) + 'px'
                        });
                }
                else if (90 <= deg && deg < 180)
                {
                        this.tick.css({
                                left: (70 - 60 * b + (fc[0] - fo[0][0] - (tc[0] - to[0]))) + 'px', 
                                top: (45 + 65 * a + fc[1] - fo[1][0] - (tc[1] - to[1][0])) + 'px'
                        });
                }
                else if (180 <= deg && deg < 270)
                {
                        this.tick.css({
                                left: (70 + (fc[0] - fo[0][0] - (tc[0] - to[0]))) + 'px', 
                                top: (45 + 65 * a + fc[1] - fo[1][0] - (tc[1] - to[1][0])) + 'px'
                        });
                }
                else
                {
                        this.tick.css({
                                left: (70 + (fc[0] - fo[0][0] - (tc[0] - to[0]))) + 'px', 
                                top: (45 + fc[1] - fo[1][0] - (tc[1] - to[1][0])) + 'px'
                        });
                }

                break;
        default:
                this.tick.css("transform", "rotate(" + deg + "deg)");
                break;
        }
};

/*-- Meter Widget --*/
function MeterWidget(riginst)
{
        RigWidget.call(this, riginst);
        
        this.HEIGHT = 300;
        this.STEP_SIZE = 5;
        this.ANIME_PERIOD = 33;

        this.val = 0;
        this.cval = 0;
        this.dval = 0;
        
        this.isAnime = false;
}
MeterWidget.prototype = new RigWidget;
MeterWidget.prototype.init = function() {
        this.val = this.getValue();
        this.dval = this.cval = this.val / (this.maxVal - this.minVal) * this.HEIGHT;
        
        var html = "<div id='" + this.id + "' class='meter rigpanel ui-corner-all'>" +
                                        "<div class='rigpaneltitle'><p>" +
                                        "        <span class='rigicon " + this.icon + "'></span>" +
                                                this.name +
                                        "</p></div>" +
                                        "<div class='meterinner'>" +
                                                "<div class='metercol' style='height:" + this.HEIGHT + "px'>" +
                                                        "<div class='metershe'></div>" +
                                                        "<div class='meterind'>" +
                                                                "<img src='/uts/rig/images/marrow.png' alt='a' />" +
                                                        "</div>" +
                                                "</div>" +
                                                "<div class='meterleg'>";
        
        for (i = 0; i <= 10; i++)
        {
                html += 
                        '<div class="metertick">' +
                                ((this.maxVal - this.minVal) - i * (this.maxVal - this.minVal) / 10) +
                                '<span class="ui-icon ui-icon-arrowthick-1-w"> </span>' +
                        '</div>';
        }

        html +=                "</div>" + // meterleg
                                "<div class='metervalouter' style='top:" + (this.HEIGHT + 20) + "px'>" +
                                        "<span class='meterval'>" + this.val + "</span> " + this.units + 
                                "</div>" +
                        "</div>" +
                "</div>";
        
        this.canvas.append(html);
        
        this.id = "#" + this.id;
        this.jqEle = $(this.id);
        this.ind = $(this.id + " .meterind");
        this.she = $(this.id + " .metershe");
        this.metv = $(this.id + " .meterval");
        this.move(this.dval);
        
        this.postInit();
};
MeterWidget.prototype.repaint = function() {
        if (this.val != this.getValue())
        {
                this.val = this.getValue();
                this.dval = this.val / (this.maxVal - this.minVal) * this.HEIGHT;
                if (!this.isAnime)
                {
                        this.isAnime = true;
                        this.animate();
                }
        }
};
MeterWidget.prototype.destroy = function() {
        $(this.id).remove();
};
MeterWidget.prototype.animate = function() {
        if (this.dval == this.cval)
        {
                this.isAnime = false;
                return;
        }
        else if (this.dval > this.cval)
        {
                if (this.dval - this.cval > this.STEP_SIZE)
                {
                        this.cval += this.STEP_SIZE;
                        var thiz = this;
                        this.st = setTimeout(function(){
                                thiz.animate();
                        }, this.ANIME_PERIOD);
                }
                else
                {
                        this.isAnime = false;
                        this.cval = this.dval;
                }
        }
        else
        {
                if (this.cval - this.dval > this.STEP_SIZE)
                {
                        this.cval -= this.STEP_SIZE;
                        var thiz = this;
                        this.st = setTimeout(function(){
                                thiz.animate();
                        }, this.ANIME_PERIOD);
                }
                else
                {
                        this.isAnime = false;
                        this.cval = this.dval;
                }
        }
        
        this.move(this.cval);
};
MeterWidget.prototype.move = function(val) {
        this.ind.css("bottom", val - 19);
        this.she.css("height", val);
        
        /* Interpolate val back. */
        var ival = Math.floor(val / this.HEIGHT * (this.maxVal - this.minVal));
        this.metv.empty().append(ival);
};

/*******************************************************************
************************ UTILITY FUNCTIONS *************************
*******************************************************************/
function setRigCookie(key, value)
{
        var expiry = new Date();
        expiry.setDate(expiry.getDate() + 365);
        var cookie = 'Rig_' + key + '=' + value + ';path=/;expires=' + expiry.toUTCString();

        document.cookie = cookie;
}

function getRigCookie(key)
{
        var cookies = document.cookie.split('; ');
        var fqKey = 'Rig_' + key;
        for (i in cookies)
        {
                var c = cookies[i].split('=', 2);
                if (c[0] == fqKey)
                {
                        return c[1];
                }
        }
        return "";

}

function round(num, pts)
{
        return Math.round(num * Math.pow(10, pts)) / Math.pow(10, pts);
}


/*******************************************************************
********************** USER DEFINED FUNCTIONS **********************
*******************************************************************/

/*******************************************************************
********************** RIG PARAMETER SETTINGS **********************
*******************************************************************/
Rig.prototype.paramsInit= function() {
        var thiz = this;
        $.get('/primitive/json/pc/' + this.PCONTROLLER + '/pa/getParams',
                null,
                function(response) {
                        var i = 0;
                        for (i in response)
                        {
                                switch (response[i].name)
                                {
                                case 'add': thiz.add = response[i].value; break;
                                }
                        }
                thiz.ready = true;
                thiz.clearOverlay();
        });
};

Rig.prototype.valuesRequest = function() {
        var thiz = this;
        $.get('/primitive/json/pc/' + this.PCONTROLLER + '/pa/getValues', 
                null, 
                function(response) {
                        thiz.valuesReceived(response);
        });
};

Rig.prototype.valuesReceived = function(values) {
        var thiz = this;
        if (typeof values != "object")
        {
                /* Error occurred. */
                this.raiseError("Values response errored");
                setTimeout(function(){
                        thiz.valuesRequest();
                }, 5000);
                return;
        }

        this.values(values);
        
        if (this.debug) this.updateDebug();
        this.repaint();
        
        setTimeout(function(){
                thiz.valuesRequest();
        }, 500);
};

Rig.prototype.values = function(values) {
        for (i in values)
        {
		this.add = values[i];
		/*
                switch (values[i].name)
                {
                case "res":
                        this.add = values[i].value;
                        break;
                }
		*/
        }
};


/*******************************************************************
********************** RIG CONTROL FUNCTIONS ***********************
*******************************************************************/
Rig.prototype.setAdd = function(aInput, bInput) {
    this.command("add", {a : aInput, b : bInput});
};

/*******************************************************************
*********************** USER DEFINED WIDGETS ***********************
*******************************************************************/

/*-- Flow rate gauge --*/
function FlowGaugeWidget(riginst)
{
        GaugeWidget.call(this, riginst);
        
        this.name = "Add Result";
        this.icon = "rigiconflow";
        this.units = "Int";
        
        this.minVal = 0;
        this.maxVal = 50;
}
FlowGaugeWidget.prototype = new GaugeWidget;
FlowGaugeWidget.prototype.getValue = function() {
        return this.rig.add;
};

/* == Pressure Slider which interpolates 0 to 100% PP to mean 55% to 100%. ==== */
function ScaledPressureSliderWidget(riginst)
{
        SliderWidget.call(this, riginst);
        
        this.setter = this.scaledSlide; 
		
		this.maxValue = 100;
		this.minValue = 50;
		this.unit = "C"
		
};
ScaledPressureSliderWidget.prototype = new SliderWidget;
ScaledPressureSliderWidget.prototype.scaledSlide = function(val) {
        if (val < 5)
        {
                /* Lower threshold. */
                this.setPressure(0);
        }
        else
        {
                this.setPressure(Math.floor(val / 2) + 50);
        }
};
ScaledPressureSliderWidget.prototype.repaint = function() {
        /* Don't need repainting on this widget. */
};

/* Example Slider
function PressureSliderWidget(riginst)
{
        SliderWidget.call(this, riginst);
        
        this.setter = this.rig.setPressure;
		
		this.maxValue = 100;
		this.minValue = 50;
		this.unit = "C"
}
PressureSliderWidget.prototype = new SliderWidget;
*/

 /* Example Meter
function RpmMeterWidget(riginst)
{
        MeterWidget.call(this, riginst);
        
        this.minVal = 0;
        this.maxVal = 1100;
        
        this.id = 'rpmmeter';
        this.name = "RPM";
        this.icon = "rigicontacho";
        this.units = 'r/min';
}
RpmMeterWidget.prototype = new MeterWidget;
RpmMeterWidget.prototype.getValue = function() {
        return this.rig.rpm;
};
*/

/* Example Gauge
function PressureGaugeWidget(riginst)
{
        GaugeWidget.call(this, riginst);
        
        this.name = "Pressure";
        this.icon = "rigiconpressure";
        this.units = "kPa";
        
        this.minVal = 0;
        this.maxVal = 40;
}
PressureGaugeWidget.prototype = new GaugeWidget;
PressureGaugeWidget.prototype.getValue = function() {
        return this.rig.pressure;
};
*/