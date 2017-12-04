/**
 * RedundantTruss Web Interface.
 * 
 * @author Yirui Deng (yden2600@uni.sydney.edu.au)
 * @date 29/03/2016
 **/

/* ============================================================================
 * == RedundantTrussControl.                                                     ==
 * ============================================================================ */

/**
 * This object controls the interface.
 * 
 * @param id container to add this interface to
 */
 
function RedundantTrussControl(id) 
{ 
        /** Display Manager. */
        this.display = undefined;

        /** Widgets. */
        this.widgets = [ ];

        /** Container. */
        this.$container = $('#' + id);

        /** Occurs if there is a data error. */
        this.dataError = false;
        
        /** Global error display. */
        this.errorDisplay = undefined;
		
		this.controller = "RedundantTrussRig";
};


/** 
 * Sets up this interface.
 */
RedundantTrussControl.prototype.setup = function() {
	
		/* Add Tab frame for control*/
		/*tframe = new TabbedWidget(this.$container,'RedTruss Control',
					[new ExperimentControl(this.$container),
					new ZeroCalControl(this.$container),
					new SGCalControl(this.$container)],
					'mode','setRigMode');		
		tframe.setDimensions(250,400);
		tframe.setToolTips([
				'Load control(Experiment), control the load value and angle to the truss',
				'Calibrate the zero loading angle position',
				'Calibrate the Strain Gauge bridges'
		]);
		this.widgets.push(tframe);*/
		
		/* Add status panel*/
		stsWidget = new STSPanel(this.$container, 'Status','sts');
		this.widgets.push(stsWidget);
		
		/* Add Mimic panel */
		this.widgets.push(new MimicPanel(this.$container, 'MimicPanel','mimic'));
		
		/* Add camera to page. */
        this.widgets.push(new CameraWidget(this.$container, 'Camera', 'http://10.66.31.233/videostream.cgi?user=admin&pwd=passwd&resolution=32&rate=0', ''));
		
        /* Display manager to allow things to be shown / removed. */
        this.display = new DisplayManager(this.$container, 'Display', this.widgets);
};

/** 
 * Runs the interface. 
 */
RedundantTrussControl.prototype.run = function() {
        /* Render the page. */
        this.display.init();

        /* Start acquiring data. */
        this.acquireLoop();
};

RedundantTrussControl.prototype.acquireLoop = function() {
        var thiz = this;
        $.ajax({
                url: "/primitive/mapjson/pc/RedundantTrussRigController/pa/getVals",
                data: {
                    from: 0,     // For now we are just asked for the latest data
                },
                success: function(data) {
                        thiz.processData(data);
                        setTimeout(function() { thiz.acquireLoop(); }, 1000);
                },
                error: function(data) {
                        thiz.errorData('Connection error.');
                        setTimeout(function() { thiz.acquireLoop(); }, 10000);
                }
        });
};

/**
 * Processes a successfully received data packet.  
 * 
 * @param data data packet
 */
RedundantTrussControl.prototype.processData = function(data) {
        /* A data packet may specify an error so we make need to make this into an 
         * error message. */

		/* 
		if (parseFloat(data['counter'])>10) {
			$.ajax({
				url : "/primitive/mapjson/pc/RedundantTrussRigController/pa/setCounterInc",
				data : {
					increment: -0.1,
				},
				success: function(data){
				}
			});
		}
		*/
		
        /* AJAX / Primitive / validation error. */
        if (!(data['success'] == undefined || data['success'])) return this.errorData(data['errorReason']);

        /* Hardware communication error. */
        if (data['system-err'] != undefined && data['system-err']) return this.errorData('Hardware communication error.');

        /* Seems like a good packet so it will be forwarded to the display to
         * render its contents and any error states will be cleared. */
        if (this.dataError)
        {
                this.dataError = false;
                this.display.unblur();
                this.errorDisplay.destroy();
        }
        
        this.display.consume(data);
};

/**
 * Processes an errored communication. 
 * 
 * @param msg error message
 */
RedundantTrussControl.prototype.errorData = function(msg) {    
        if (!this.dataError)
        {
            /* Going into errored state, display error message. */
                this.dataError = true;
                this.display.blur();
                
                this.errorDisplay.error = msg;
                this.errorDisplay.init();
        }
        else if (this.errorData && this.errorDisplay.error != msg)
        {
            /* Error has changed, update the error display. */
            this.errorDisplay.error = msg;
            this.errorDisplay.destroy();
            this.errorDisplay.init();
        }
};

/* ============================================================================
 * == Mimic Panel Widget                                              ==
 * ============================================================================ */
function MimicPanel($container, title, icon){
	Widget.call(this, $container, 'Mimic', 'mimic');
	this.id = "RedTruss-Mimic-Panel";
	
	var gaugeIds = [], unitIds = [], dataVals = [];
	for (var i  = 0; i < 10; i++){
		gaugeIds[i] = 'StrainGauge' + (i+1);
		unitIds[i] = 'sgUnit'+(i+1);
		dataVals[i] = undefined;
	}
	this.dataId = gaugeIds;
	this.unitId = unitIds;
	this.dataVal = dataVals;
	this.angleVal = undefined;
	this.loadVal = undefined;
	
}
MimicPanel.prototype = new Widget;

// initialization
MimicPanel.prototype.init = function() {
	this.$widget = this.generateBox('place-holder-mimic-panel');
	this.drawTruss();
	
	// initialize values
	for (var i in this.dataVal){
		this.dataVal[i] = undefined;
	}
	this.angleVal = undefined;
	this.loadVal = undefined;
	
	this.enableDraggable();
	this.enableResizable(515,400,false);
};

// draw objects
MimicPanel.prototype.getHTML = function() {
	return(
		'<div id="mimic-panel-content" style = "width:'+(this.window.width - 32)+'px;height:'+(this.window.height - 57)+'px">'+
			'<div>' +
				'<canvas id="bg-drawing" width = "'+(this.window.width - 32)+'px" height = "'+(this.window.height - 57)+'px"></canvas>' +
			'</div>' +
			'<div style = "top:'+ 15 +'px;left:'+ 23 +'px">' +
				'<label for ="sg-support-fix">'+
					'<span id = "'+this.dataId[8]+'" class = "mimic-valuetext">8888888</span>'+
					'<span id = "'+this.unitId[8]+'" class = "mimic-unittext">uu</span>'+
				'</label>'+	
			'</div>' +
			'<div style = "top:'+ (70+(this.window.height - 57)/2 +55) +'px;left:'+ 28 +'px">' + 
				'<label for ="sg-support-fix-roll">'+
					'<span id = "'+this.dataId[9]+'" class = "mimic-valuetext">8888888</span>'+
					'<span id = "'+this.unitId[9]+'" class = "mimic-unittext">uu</span>'+
				'</label>'+	
			'</div>' +
			'<div style = "top:'+(70-8)+'px;left:'+ (25 + (this.window.width - 32)/12)+'px">' + 
				'<label for ="sg-left-top">'+
					'<span id = "'+this.dataId[0]+'" class = "mimic-valuetext">8888888</span>'+
					'<span id = "'+this.unitId[0]+'" class = "mimic-unittext">uu</span>'+
				'</label>'+	
			'</div>' +
			'<div style = "top:'+(70-8 + (this.window.height - 57)/2)+'px;left:'+ (25 + (this.window.width - 32)/12)+'px">' + 
				'<label for ="sg-left-btm">'+
					'<span id = "'+this.dataId[3]+'" class = "mimic-valuetext">8888888</span>'+
					'<span id = "'+this.unitId[3]+'" class = "mimic-unittext">uu</span>'+
				'</label>'+	
			'</div>' +
			'<div style = "top:'+(70-8 + (this.window.height - 57)/4)+'px;left:'+ 12 +'px">' + 
				'<label for ="sg-left-left">'+
					'<span id = "'+this.dataId[4]+'" class = "mimic-valuetext">8888888</span>'+
					'<span id = "'+this.unitId[4]+'" class = "mimic-unittext">uu</span>'+
				'</label>'+	
			'</div>' +
			'<div style = "top:'+(70-8 + (this.window.height - 57)/4)+'px;left:'+ (12 + (this.window.width - 32)/3) +'px">' + 
				'<label for ="sg-lef-right">'+
					'<span id = "'+this.dataId[1]+'" class = "mimic-valuetext">8888888</span>'+
					'<span id = "'+this.unitId[1]+'" class = "mimic-unittext">uu</span>'+
				'</label>'+	
			'</div>' +
			'<div style = "top:'+(70-8 + (this.window.height - 57)/8)+'px;left:'+ (25 + (this.window.width - 32)/24)+'px">' + 
				'<label for ="sg-left-topleft-btmright">'+
					'<span id = "'+this.dataId[7]+'" class = "mimic-valuetext">8888888</span>'+
					'<span id = "'+this.unitId[7]+'" class = "mimic-unittext">uu</span>'+
				'</label>'+	
			'</div>' +
			'<div style = "top:'+(70-8 + 3*(this.window.height - 57)/8)+'px;left:'+ (25 + (this.window.width - 32)/24)+'px">' + 
				'<label for ="sg-left-btmleft-topright">'+
					'<span id = "'+this.dataId[5]+'" class = "mimic-valuetext">8888888</span>'+
					'<span id = "'+this.unitId[5]+'" class = "mimic-unittext">uu</span>'+
				'</label>'+	
			'</div>' +
			'<div style = "top:'+(70-8 + (this.window.height - 57)/2)+'px;left:'+ (25 + 5*(this.window.width - 32)/12)+'px">' + 
				'<label for ="sg-right-btm">'+
					'<span id = "'+this.dataId[2]+'" class = "mimic-valuetext">8888888</span>'+
					'<span id = "'+this.unitId[2]+'" class = "mimic-unittext">uu</span>'+
				'</label>'+	
			'</div>' +
			'<div style = "top:'+(70-8 + 3*(this.window.height - 57)/8)+'px;left:'+ (25 + (this.window.width - 32)/2)+'px">' + 
				'<label for ="sg-right-slope">'+
					'<span id = "'+this.dataId[6]+'" class = "mimic-valuetext">8888888</span>'+
					'<span id = "'+this.unitId[6]+'" class = "mimic-unittext">uu</span>'+
				'</label>'+	
			'</div>' +
			'<div style = "top:'+((this.window.height - 57) - 15)+'px;left:'+ (25 + 2*(this.window.width - 32)/3 - 150)+'px">' + 
				'<label for ="angle-now">Current Load Angle = '+
					'<span id = "data-angle" class = "mimic-valuetext">8888888</span>'+
					'<span class = "mimic-unittext"> deg</span>'+
				'</label>'+	
			'</div>' +
			'<div style = "top:'+ 25 +'px;left:'+ ((this.window.width - 32) - 250)+'px">' + 
				'<label for ="load-now">Current Load Force = '+
					'<span id = "data-load" class = "mimic-valuetext">8888888</span>'+
					'<span class = "mimic-unittext"> N</span>'+
				'</label>'+	
			'</div>' +
			'<div>' +
				'<canvas id="arrow-drawing" width = "'+(this.window.width - 32)+'px" height = "'+(this.window.height - 57)+'px "></canvas>' +
			'</div>' +
		'</div>'
	);
};
// update data
MimicPanel.prototype.consume = function(data) {
	for (var i = 0; i< 10; i++){
		if (this.dataVal[i] == undefined || this.dataVal[i] != data['StrainValue'+(i+1)]){
			this.dataVal[i] = data['StrainValue'+(i+1)];
			if (typeof(this.dataVal[i]) != 'undefined' && this.dataVal[i] != null && this.dataVal[i] != "NaN") {
				document.getElementById(this.dataId[i]).innerHTML = this.dataVal[i].toPrecision(6);
			}
			else if (this.dataVal[i] == "NaN"){
				document.getElementById(this.dataId[i]).innerHTML = 'Nan';
			}else{
				document.getElementById(this.dataId[i]).innerHTML = 'undef';
			}
		}
		document.getElementById(this.unitId[i]).innerHTML = 'N';
	}
	
	if (this.loadVal == undefined || this.loadVal != data['load']){
			this.loadVal = data['load'];
			document.getElementById('data-load').innerHTML = this.loadVal.toPrecision(3);
	}
	if (this.angleVal == undefined || this.angleVal != data['angle']){
			this.angleVal = data['angle'];
			document.getElementById('data-angle').innerHTML = this.angleVal.toPrecision(3);
	}
	
	this.drawArrow(this.angleVal);
};
// canvas draw - truss
MimicPanel.prototype.drawTruss = function(){
	var canvas = document.getElementById('bg-drawing');
	var context = canvas.getContext('2d');
	
	// initialize canvas
	context.clearRect(0,0,canvas.width,canvas.height);
	// draw Truss body
	context.lineWidth = 4;
	context.lineJoin = 'round';
	context.strokeStyle = '#808080';
	context.beginPath();
	context.rect(25,70,canvas.width / 3, canvas.height/2);
	context.stroke();
	context.beginPath();
	context.moveTo(25,70);
	context.lineTo((25 + canvas.width/3),(70+canvas.height/2));
	context.stroke();
	context.beginPath();
	context.moveTo((25 + canvas.width/3),70);
	context.lineTo(25,(70+canvas.height/2));
	context.stroke();
	context.beginPath();
	context.moveTo((25 + canvas.width/3),(70+canvas.height/2));
	context.lineTo((25 + 2*canvas.width/3),(70+canvas.height/2));
	context.lineTo((25 + canvas.width/3),70);
	context.closePath();
	context.stroke();
	// draw Truss support
	context.lineWidth = 2;
	context.beginPath();
	context.moveTo(25,70);
	context.lineTo(13,64);
	context.lineTo(13,76);
	context.closePath();
	context.stroke();	// complete of fix support
	
	context.beginPath();
	context.arc(19,(70+canvas.height/2),6,0,2*Math.PI,false);
	context.stroke();	// complete of rolling support
	
	context.setLineDash([3]);
	context.lineWidth = 2;
	context.strokeStyle = '#404040';
	context.beginPath();
	context.moveTo((25 + 2*canvas.width/3),(70+canvas.height/2));
	context.lineTo((25 + 2*canvas.width/3),(canvas.height-25));
	context.stroke();
	
	context.strokeStyle = '#0000FF';
	context.setLineDash([2]);
	context.lineWidth = 1;
	context.beginPath();
	context.moveTo(25,70);
	context.lineTo(28,15);
	context.stroke();
	context.beginPath();
	context.moveTo(25,(70+canvas.height/2));
	context.lineTo(28,(70+canvas.height/2 +55));
	context.stroke();
	context.beginPath();
	context.moveTo((25 + 2*canvas.width/3),(70+canvas.height/2));
	context.lineTo((25 + 2*canvas.width/3),25);
	context.stroke();
	
}
 // canvas draw load angle arrow
MimicPanel.prototype.drawArrow = function(angle){
	var canvas = document.getElementById('arrow-drawing');
	var context = canvas.getContext('2d');
	var distance = Math.tan(angle/180 *Math.PI) * (canvas.height/2 -110);
	var originLeft = (25 + 2*canvas.width/3), originTop = (70+canvas.height/2);
	var lineEndLeft = originLeft + distance, lineEndTop = (canvas.height-40);
		
	context.clearRect(0,0,canvas.width,canvas.height);
	context.lineWidth = 4;
	context.lineCap = 'round';
	context.lineJoin = 'round';
	context.strokeStyle = '#000000';
	
	context.beginPath();
	context.moveTo(originLeft,originTop);
	context.lineTo(lineEndLeft,lineEndTop);
	context.stroke();
	
	//draw arrow head
	var arrowangle = 40;	//arrow head angle (deg)
	var arrowsize = 20;		// pixel of arrow head side length
	// calculate arrow head
	var arrowStartLeft = lineEndLeft + Math.sin(angle/180 *Math.PI) * arrowsize/2,
		arrowStartTop = lineEndTop + Math.cos(angle/180 *Math.PI) * arrowsize/2;
	var arrowleft1 = arrowStartLeft - Math.sin((angle-arrowangle/2)/180 *Math.PI) * arrowsize,
		arrowtop1 = arrowStartTop - Math.cos((angle-arrowangle/2)/180 *Math.PI) * arrowsize;
	var arrowleft2 = arrowStartLeft - Math.sin((angle+arrowangle/2)/180 *Math.PI) * arrowsize,
		arrowtop2 = arrowStartTop - Math.cos((angle+arrowangle/2)/180 *Math.PI) * arrowsize;
	// draw
	context.lineWidth = 1;
	context.lineJoin = 'miter';
	context.fillStyle = '#000000';
	context.beginPath();
	context.moveTo(arrowStartLeft,arrowStartTop);
	context.lineTo(arrowleft1,arrowtop1);
	context.lineTo(arrowleft2,arrowtop2);
	context.closePath();
	context.fill();	
}
 

/* ============================================================================
 * == Status Panel Widget                                              ==
 * ============================================================================ */
function STSPanel($container, title, icon){
	Widget.call(this, $container, 'Status Panel', 'sts');
	/** Identifier of this widget. */
    this.id = "RedTruss-Status-Panel";
}
STSPanel.prototype = new Widget;

// initialization
STSPanel.prototype.init = function() {
	this.$widget = this.generateBox('place-holder-sts-panel');
	// initialize LED display - all black (OFF)
	this.drawLED('#000000','#cccccc','#000000','#cccccc','#000000','#cccccc');
	
	this.enableDraggable();
	this.enableResizable(250,150,false);
};

// draw objects
STSPanel.prototype.getHTML = function() {
	return(
		'<div class ="sts-panel-content-div">'+
			'<div>'+
				'<canvas id="comm-led" width="20px" height="20px"></canvas>'+
				'<label for="Comm-sts" class ="sts-panel-content-label">DAQ Comm</label>' +
			'</div>'+
			'<div>'+
				'<canvas id="ti-led" width="20px" height="20px"></canvas>'+
				'<label for="ti-sts" class ="sts-panel-content-label">Ctrl Comm</label>' +
			'</div>'+
			'<div>'+
				'<canvas id="man-led" width="20px" height="20px"></canvas>'+
				'<label for="Man-sts" class ="sts-panel-content-label">Load Sensor</label>' +
			'</div>'+
		'</div>'
	);
};
// update data
STSPanel.prototype.consume = function(data) {
	var styleFill1,styleFill2,styleFill3,styleStr1,styleStr2,styleStr3;
	if (data['daqlinksts'] == 2){
		styleFill1 = '#000000';
		styleStr1 = '#cccccc';
	}
	else if (data['daqlinksts'] == 0){
		styleFill1 = '#00cc00';
		styleStr1 = '#99ff99';
	}
	else if (data['daqlinksts'] == 1){
		styleFill1 = '#FF0000';
		styleStr1 = '#ff9999';
	}
	else {
		styleFill1 = '#0000ff';
		styleStr1 = '#9999ff';
	}
	if (data['ctrllinksts'] == 2){
		styleFill2 = '#000000';
		styleStr2 = '#cccccc';
	}
	else if (data['ctrllinksts'] == 0){
		styleFill2 = '#00cc00';
		styleStr2 = '#99ff99';
	}
	else if (data['ctrllinksts'] == 1){
		styleFill2 = '#FF0000';
		styleStr2 = '#ff9999';
	}
	else {
		styleFill2 = '#0000ff';
		styleStr2 = '#9999ff';
	}
	if (data['ctrllinksts'] == 0){
		if (data['loadhealth'] == 0){
			styleFill3 = '#00cc00';
			styleStr3 = '#99ff99';
		}
		else if (data['loadhealth'] == 1){
			styleFill3 = '#FF0000';
			styleStr3 = '#ff9999';
		}
		else{
		styleFill3 = '#000000';
		styleStr3 = '#999999';
	}
	} 
	else{
		styleFill3 = '#000000';
		styleStr3 = '#999999';
	}

	this.drawLED(styleFill1,styleStr1,styleFill2,styleStr2,styleFill3,styleStr3);
};
STSPanel.prototype.drawLED = function(color1,highlight1,color2,hightlight2,color3,highlight3){
	// define LED properties
	var centerX = 10;
	var centerY = 10;
	var radius = 8;

	// ready the canvas
	var canvas1 = document.getElementById('comm-led');
	var context1 = canvas1.getContext('2d');
	var canvas2 = document.getElementById('ti-led');
	var context2 = canvas2.getContext('2d');
	var canvas3 = document.getElementById('man-led');
	var context3 = canvas3.getContext('2d');
	
	// initialize the canvas
	context1.clearRect(0,0,20,20);
	context2.clearRect(0,0,20,20);
	context3.clearRect(0,0,20,20);
	
	// draw communication link led	
	context1.beginPath();
	context1.arc(centerX,centerY,radius,0,2*Math.PI,false);
	context1.fillStyle = color1;
	context1.fill();
	context1.lineWidth = 2;
	context1.strokeStyle = '#A0A0A0';
	context1.stroke();
	context1.beginPath();
	context1.arc(centerX,centerY,radius-3,0.1*Math.PI,1.55*Math.PI,true);
	context1.lineWidth = 2;
	context1.strokeStyle = highlight1;
	context1.stroke();
	
	// draw TI status led
	context2.beginPath();
	context2.arc(centerX,centerY,radius,0,2*Math.PI,false);
	context2.fillStyle = color2;
	context2.fill();
	context2.lineWidth = 2;
	context2.strokeStyle = '#A0A0A0';
	context2.stroke();
	context2.beginPath();
	context2.arc(centerX,centerY,radius-3,0.1*Math.PI,1.55*Math.PI,true);
	context2.lineWidth = 2;
	context2.strokeStyle = hightlight2;
	context2.stroke();	

	// draw Manual override LED
	context3.beginPath();
	context3.arc(centerX,centerY,radius,0,2*Math.PI,false);
	context3.fillStyle = color3;
	context3.fill();
	context3.lineWidth = 2;
	context3.strokeStyle = '#A0A0A0';
	context3.stroke();
	context3.beginPath();
	context3.arc(centerX,centerY,radius-3,0.1*Math.PI,1.55*Math.PI,true);
	context3.lineWidth = 2;
	context3.strokeStyle = highlight3;
	context3.stroke();
}


/* ============================================================================
 * == Experiment Control Widget                                              ==
 * ============================================================================ */
function ExperimentControl($container){
	Widget.call(this, $container, 'CTRL', 'exp');
	
	this.anglemax = 10;
	this.anglemin = -10;
	this.loadmax = 10;
	this.loadmin = -10;
	var scaleIds = [],scaleIds1 = [];
	for (var i=0; i<=10;i++){
		scaleIds[i] = 'anglescaleVal'+i;
		scaleIds1[i] = 'loadscaleVal'+i;
	}
	this.anglescale = scaleIds;
	this.loadscale = scaleIds1;
	this.angleVal = undefined;
	this.loadVal = undefined;
	this.angleChanged = false;
	this.loadChanged = false;
	
	this.isAngleSliding = false;
	this.isLoadSliding = false;
	
	this.leftlastCoordinate = undefined;
	this.rightlastCoordinate = undefined;
	
	this.$angleKnob = undefined;
	this.$loadKnob = undefined;
	this.$anglearea= undefined;
	this.$loadarea= undefined;
	this.$angleinput= undefined;
	this.$loadinput= undefined;

}
ExperimentControl.prototype = new Widget;

// initialization
ExperimentControl.prototype.init = function() {
	this.$widget = this.generateBox('expctrl');
	
	//initialize values
	this.angleVal = undefined;
	this.loadVal = undefined;
	this.anglemax = 10;
	this.anglemin = -10;
	this.loadmax = 10;
	this.loadmin = -10;
	
	var thiz = this;
	
	/* Slider events. */
    this.$angleKnob = this.$widget.find(".leftdiv").find(".slider-knob")
        .mousedown(function(e) { thiz.leftSlideStart(e.pageX, e.pageY); });
	this.$loadKnob = this.$widget.find(".rightdiv").find(".slider-knob")
        .mousedown(function(e) { thiz.rightSlideStart(e.pageX, e.pageY); });

	/* Slider position click. */
//    this.$widget.find(".leftdiv").find(".slider-outer").bind("click." + this.id, function(e) { thiz.leftSliderClicked(e.pageX, e.pageY); });
//	this.$widget.find(".rightdiv").find(".slider-outer").bind("click." + this.id, function(e) { thiz.rightSliderClicked(e.pageX, e.pageY); });
	this.$anglearea = this.$widget.find(".leftdiv").find(".exp-ctrl-slider-outer")
		.click(function(e) { thiz.leftSliderClicked(e.pageX, e.pageY); });
	this.$loadarea = this.$widget.find(".rightdiv").find(".exp-ctrl-slider-outer")
		.click(function(e) { thiz.rightSliderClicked(e.pageX, e.pageY); });
	
	
	/* Value box events. */
    this.$angleinput = this.$widget.find(".leftdiv").find("input")
        .focusin(formFocusIn)
        .focusout(formFocusOut)
        .change(function() { thiz.handleLeftTextBoxChange($(this).val()); });
		/*.keypress(function(e) {
	            if (e.keyCode == 13){
					thiz.handleLeftTextBoxChange($(this).val());
					$(this).blur();
				}
	        });*/
	this.$loadinput = this.$widget.find(".rightdiv").find("input")
        .focusin(formFocusIn)
        .focusout(formFocusOut)
        .change(function() { thiz.handleRightTextBoxChange($(this).val()); });
	
};

// draw objects
ExperimentControl.prototype.getHTML = function() {
	var scaledisplay = '', scaledisplay2 = '';
	var knob = '';
	for (var i = 0; i<=10;i++){
		scaledisplay += '<div class="slider-scales slider-scales-vertical">' +
					'<div class = "slider-scale" style = "top:'+ 25 *i +'px">' +
					'<span class = "ui-icon ui-icon-arrowthick-1-w"></span>' +
					'<span id = "'+ this.anglescale[i]+'" class = "slider-scale-value">' + 
					(Math.floor(this.anglemax - i*((this.anglemax - this.anglemin)/10))) + '</span>' +
					'</div>' +
				'</div>';
		scaledisplay2 += '<div class="slider-scales slider-scales-vertical">' +
					'<div class = "slider-scale" style = "top:'+ 25 *i +'px">' +
					'<span class = "ui-icon ui-icon-arrowthick-1-w"></span>' +
					'<span id = "'+ this.loadscale[i]+'" class = "slider-scale-value">' + 
					(Math.floor(this.loadmax - i*((this.loadmax - this.loadmin)/10))) + '</span>' +
					'</div>' +
				'</div>';
	}
	for (var j = 0; j<9; j++){
		knob += '<div class="slider-knob-slice slider-knob-slice-' + j + '"></div>';
	}
	return(	
		'<div id = "exp-control-settings" class = "leftdiv">'+
			'<div style = "position:absolute;width:100%;margin:5px 0 5px 0;text-align:center">' +
				'<label class = "exp-bar-title-label">Load Angle<br>Control</label>'+
			'</div>' +
			'<div class = "exp-ctrl-slider-outer" style = "height:250px">' +
				scaledisplay +
				'<div class = "slider-post slider-post-vertical"></div>' +
				'<div class = "slider-knob slider-knob-vertical">' +
					'<div class = "slider-knob-slice slider-knob-back"></div>' +
					knob +
				'</div>' +
			'</div>' +
			'<div class = "slider-text exp-slider-text-vertical" style = "margin: 350px 0 0 0;text-align:center">' +
				'<label for = "angle-input-text" class="exp-slider-text-label">Target Angle:</label>' +
				'<input id = "angle-input-text"  class="exp-slider-text-input" type = "text" />'+
				'<span> deg</span>' +
			'</div>'+
		'</div>' +
		'<div id = "exp-control-settings" class = "rightdiv">'+
			'<div style = "position:absolute;width:100%;margin:5px 0 5px 0;text-align:center">' +
				'<label class = "exp-bar-title-label">Load Force<br>Control</label>'+
			'</div>' +
			'<div class = "exp-ctrl-slider-outer" style = "height:250px">' +
				scaledisplay2 +
				'<div class = "slider-post slider-post-vertical"></div>' +
				'<div class = "slider-knob slider-knob-vertical">' +
					'<div class = "slider-knob-slice slider-knob-back"></div>' +
					knob +
				'</div>' +
			'</div>' +
			'<div class = "slider-text exp-slider-text-vertical" style = "margin: 350px 0 0 0;text-align:center">' +
				'<label for = "load-input-text" class="exp-slider-text-label">Target Load:</label>' +
				'<input id = "load-input-text"  class="exp-slider-text-input" type = "text" />'+
				'<span> N</span>' +
			'</div>'+
		'</div>'+
		'<div class="data-blur"></div>'
	);
};

// update data
ExperimentControl.prototype.consume = function(data) {
	//lock when local override
	if (data['manovrd'] == 0) this.$widget.find(".data-blur").hide();
	else this.$widget.find(".data-blur").show();
	//update scales
	if ((this.anglemax != data['anglemax']) || this.anglemin != data['anglemin']){
		this.anglemax = data['anglemax'];
		this.anglemin = data['anglemin'];
		// re-draw scale values
		var sectVal1 = (this.anglemax - this.anglemin)/10;
		for (var i=0; i<=10; i++){
			document.getElementById(this.anglescale[i]).innerHTML = Math.floor(this.anglemax - i * sectVal1);
		}
		this.leftMoveTo();
	}
	if ((this.loadmax != data['tensionmax']) || this.loadmin != data['tensionmin']){
		this.loadmax = data['tensionmax'];
		this.loadmin = data['tensionmin'];
		// re-draw scale values
		var sectVal2 = (this.loadmax - this.loadmin)/10;
		for (var i=0; i<=10; i++){
			document.getElementById(this.loadscale[i]).innerHTML = Math.floor(this.loadmax - i * sectVal2);
		}
		this.rightMoveTo();
	}
	// update values
	if (!(data['angletarget'] == undefined || data['angletarget'] == this.angleVal || this.angleChanged))
    {
        this.angleVal = data['angletarget'];
        this.leftMoveTo();
        this.$angleinput.val(zeroPad(this.angleVal, 1));
    }
	if (!(data['tensiontarget'] == undefined || data['tensiontarget'] == this.loadVal || this.loadChanged))
    {
        this.loadVal = data['tensiontarget'];
        this.rightMoveTo();
        this.$loadinput.val(zeroPad(this.loadVal, 1));
    }
};
/**
 * Handles a slider position click.
 * 
 * @param x coordinate of mouse
 * @param y coordiante of mouse
 */
ExperimentControl.prototype.leftSliderClicked = function(x, y) {
    if (this.isAngleSliding) return;
    
    var off = this.$widget.find(".leftdiv").find(".exp-ctrl-slider-outer").offset();
    var    p = y - off.top - 7;
    
    /* Value scaling. */
    this.angleChanged = true;
    this.angleVal = this.anglemin + (this.anglemax - this.anglemin) * p / 250;
   
    /* Range check. */
    if (this.angleVal < this.anglemin) this.angleVal = this.anglemin;
    if (this.angleVal > this.anglemax) this.angleVal = this.anglemax;
    
    /* Vertical sliders have the scale inverse to positioning. */
    this.angleVal = this.anglemax - this.angleVal;
    
    /* Update display. */
    this.leftMoveTo();
    this.$angleinput.val(zeroPad(this.angleVal, 1));
    
    /* Send results. */
    this.leftSend();
};
ExperimentControl.prototype.rightSliderClicked = function(x, y) {
    if (this.isLoadSliding) return;
    
    var off = this.$widget.find(".rightdiv").find(".exp-ctrl-slider-outer").offset(),
        p = y - off.top - 7;
    
    /* Value scaling. */
    this.loadChanged = true;
    this.loadVal = this.loadmin + (this.loadmax - this.loadmin) * p / 250;
   
    /* Range check. */
    if (this.loadVal < this.loadmin) this.loadVal = this.loadmin;
    if (this.loadVal > this.loadmax) this.loadVal = this.loadmax;
    
    /* Vertical sliders have the scale inverse to positioning. */
    this.loadVal = this.loadmax - this.loadVal;
    
    /* Update display. */
    this.rightMoveTo();
    this.$loadinput.val(zeroPad(this.loadVal, 1));
    
    /* Send results. */
    this.rightSend();
};

/**
 * Handles slider start.
 * 
 * @param x x coordinate of mouse
 * @param y y coordinate of mouse
 */
ExperimentControl.prototype.leftSlideStart = function(x, y) {
    /* State management. */
    this.isAngleSliding = true;
    this.angleChanged = true;
    
    /* Position tracking. */
    this.leftlastCoordinate = y;
    
    /* Event handlings. */
    var thiz = this;
    $(document)
        .bind('mousemove.' + this.id, function(e) { thiz.leftSlideMove (e.pageX, e.pageY); })
        .bind('mouseup.' + this.id,   function(e) { thiz.leftSlideStop (e.pageX, e.pageY); });
    
    /* Stop double handling. */
    this.$widget.find(".leftdiv").find(".exp-ctrl-slider-outer").unbind("click." + this.id);
};
ExperimentControl.prototype.rightSlideStart = function(x, y) {
    /* State management. */
    this.isLoadSliding = true;
    this.loadChanged = true;
    
    /* Position tracking. */
    this.rightlastCoordinate = y;
    
    /* Event handlings. */
    var thiz = this;
    $(document)
        .bind('mousemove.' + this.id, function(e) { thiz.rightSlideMove (e.pageX, e.pageY); })
        .bind('mouseup.' + this.id,   function(e) { thiz.rightSlideStop (e.pageX, e.pageY); });
    
    /* Stop double handling. */
    this.$widget.find(".rightdiv").find(".exp-ctrl-slider-outer").unbind("click." + this.id);
};

/**
 * Handles slider move.
 *  
 * @param x x coordinate of mouse
 * @param y y coordinate of mouse
 */
ExperimentControl.prototype.leftSlideMove = function(x, y) {
    if (!this.isAngleSliding) return;
    
    /* Scaling to value. */
    var dist = y - this.leftlastCoordinate;
//    this.angleVal += (this.anglemin + (this.anglemax - this.anglemin) * dist / 250) * (-1);
    this.angleVal += (-(this.anglemax - this.anglemin) * dist / 250);
    
    /* Range check. */
    if (this.angleVal < this.anglemin) this.angleVal = this.anglemin;
    if (this.angleVal > this.anglemax) this.angleVal = this.anglemax;
    
    /* Display update. */
    this.$angleinput.val(zeroPad(this.angleVal, 1));
    this.leftMoveTo();
    
    /* Position tracking. */
    this.leftlastCoordinate = y;
};
ExperimentControl.prototype.rightSlideMove = function(x, y) {
    if (!this.isLoadSliding) return;
    
    /* Scaling to value. */
    var dist = y - this.rightlastCoordinate;
//    this.loadVal += (this.loadmin + (this.loadmax - this.loadmin) * dist / 250) * (-1);
    this.loadVal += (-(this.loadmax - this.loadmin) * dist / 250);
    
    /* Range check. */
    if (this.loadVal < this.loadmin) this.loadVal = this.loadmin;
    if (this.loadVal > this.loadmax) this.loadVal = this.loadmax;
    
    /* Display update. */
    this.$loadinput.val(zeroPad(this.loadVal, 1));
    this.rightMoveTo();
    
    /* Position tracking. */
    this.rightlastCoordinate = y;
};

/**
 * Handles slide stop.
 * 
 * @param x x coordinate of mouse
 * @param y y coordinate of mouse
 */
ExperimentControl.prototype.leftSlideStop = function(x, y) {
    if (!this.isAngleSliding) return;
    
    $(document)
        .unbind('mousemove.' + this.id)
        .unbind('mouseup.' + this.id);
    
    this.isAngleSliding = false;
    this.leftSend();
    
    var thiz = this;
    this.$widget.find(".leftdiv").find(".exp-ctrl-slider-outer").bind("click." + this.id, function(e) { thiz.leftSliderClicked(e.pageX, e.pageY); });
};

ExperimentControl.prototype.rightSlideStop = function(x, y) {
    if (!this.isLoadSliding) return;
    
    $(document)
        .unbind('mousemove.' + this.id)
        .unbind('mouseup.' + this.id);
    
    this.isLoadSliding = false;
    this.rightSend();
    
    var thiz = this;
    this.$widget.find(".rightdiv").find(".exp-ctrl-slider-outer").bind("click." + this.id, function(e) { thiz.rightSliderClicked(e.pageX, e.pageY); });
};


/**
 * Moves the slider to the specified value 
 */
ExperimentControl.prototype.leftMoveTo = function() {
    var p = (this.angleVal - this.anglemin) / (this.anglemax - this.anglemin) * 250;
    this.$angleKnob.css("top", 250-p);
};

ExperimentControl.prototype.rightMoveTo = function() {
    var p = (this.loadVal - this.loadmin) / (this.loadmax - this.loadmin) * 250;
    this.$loadKnob.css("top", 250-p);
};

/** 
 * Sends the updated value to the server.
 */
ExperimentControl.prototype.leftSend = function() {
    var thiz = this, params = { };
    params['angletarget'] = this.angleVal;
    this.postControl('setAngle', params,
        function(data) {
            thiz.angleChanged = false;
        }
    );
};
ExperimentControl.prototype.rightSend = function() {
    var thiz = this, params = { };
    params['tensiontarget'] = this.loadVal;
    this.postControl('setTension', params,
        function(data) {
            thiz.loadChanged = false;
        }
    );
};

/**
 * Handles a value text box change.
 * 
 * @param val new value
 */
ExperimentControl.prototype.handleLeftTextBoxChange = function(val) {
    var ttLeft = 80,
        ttTop  = 374;
    
    this.removeMessages();
    if (!val.match(/^-?\d+\.?\d*$/))
    {
        this.addMessage("slider-validation-Angle", "Value must be a number.", "error", ttLeft, ttTop, "left");
        return;
    }
    
    n = parseFloat(val);
    if (n < this.anglemin || n > this.anglemax)
    {
        this.addMessage("slider-validation-Angle", "Value out of range.", "error", ttLeft, ttTop, "left");
        return;
    }
    
    this.angleChanged = true;
    this.angleVal = n;
    this.leftMoveTo();
    this.leftSend();  
};

ExperimentControl.prototype.handleRightTextBoxChange = function(val) {
    var ttLeft = 210,
        ttTop  = 374;
    
    this.removeMessages();
    if (!val.match(/^-?\d+\.?\d*$/))
    {
        this.addMessage("slider-validation-Load", "Value must be a number.", "error", ttLeft, ttTop, "left");
        return;
    }
    
    n = parseFloat(val);
    if (n < this.loadmin || n > this.loadmax)
    {
        this.addMessage("slider-validation-Load", "Value out of range.", "error", ttLeft, ttTop, "left");
        return;
    }
    
    this.loadChanged = true;
    this.loadVal = n;
    this.rightMoveTo();
    this.rightSend();  
};

/* ============================================================================
 * == Zero Calibration Widget	                                             ==
 * ============================================================================ */
function ZeroCalControl($container){
	Widget.call(this, $container, 'ZERO', 'zero');
	/** store step target variable */
	this.val = undefined;
	this.max = undefined;
	this.min = undefined;
	this.loadVal = undefined;
	this.stepVal = undefined;
	this.angleVal = undefined;
	
	this.valueChanged = false;
	
}
ZeroCalControl.prototype = new Widget;

// initialization
ZeroCalControl.prototype.init = function() {
	this.val = undefined;
	this.max = undefined;
	this.min = undefined;
	this.loadVal = undefined;
	this.stepVal = undefined;
	this.angleVal = undefined;
	this.valueChanged = false;
	
   	this.$widget = this.generateBox('zerocal');
	
	var thiz = this;
	
	/* Button Events */
	// '<<' button
	$("#btn-rwd")
		.click(function() { thiz.handleStepButtonClick(-10); })
		.mousedown(function() { $(this).addClass("click-button-active"); })
	    .mouseup(function() { $(this).removeClass("click-button-active") ; })
		.keypress(function(e) {
	            if (e.keyCode == 13) thiz.handleStepButtonClick(-10);
	        });
	// '<' button
	$("#btn-bkwd")
		.click(function() { thiz.handleStepButtonClick(-1); })
		.mousedown(function() { $(this).addClass("click-button-active"); })
	    .mouseup(function() { $(this).removeClass("click-button-active") ; })
		.keypress(function(e) {
	            if (e.keyCode == 13) thiz.handleStepButtonClick(-1);
	        });
	// '>' button
	$("#btn-fwd")
		.click(function() { thiz.handleStepButtonClick(1); })
		.mousedown(function() { $(this).addClass("click-button-active"); })
	    .mouseup(function() { $(this).removeClass("click-button-active") ; })
		.keypress(function(e) {
	            if (e.keyCode == 13) thiz.handleStepButtonClick(1);
	        });
	// '>>' button
	$("#btn-ffwd")
		.click(function() { thiz.handleStepButtonClick(10); })
		.mousedown(function() { $(this).addClass("click-button-active"); })
	    .mouseup(function() { $(this).removeClass("click-button-active") ; })
		.keypress(function(e) {
	            if (e.keyCode == 13) thiz.handleStepButtonClick(10);
	        });
	// 'apply' button
	$("#cfm-send")
		.click(function() { thiz.handleApplyButtonClick(); })
		.mousedown(function() {
	            if (thiz.valueChanged) $(this).addClass("click-button-active");
	        })
	    .mouseup(function() { $(this).removeClass("click-button-active") ; })
		.keypress(function(e) {
	            if (e.keyCode == 13) thiz.handleApplyButtonClick();
	        });
	
};

// draw objects
ZeroCalControl.prototype.getHTML = function() {
	return(
		'<div id="zero-header-settings" class="saharaform">' +
			'<div>' + 
        		'<label for="zero-header-title">Zero Angle Calibration</label>' +
        	'</div>' +
			'<div>' + 
        		'<p align = "center" width = "100%">Use button at bottom to calibrate <br>position of zero load angle</p>' +
        	'</div>' +
			'<div>' + 
				'<hr>' +
			'</div>' +
		'</div>' +
		'<div id="zero-settings" class="saharaform">' +
			'<div>' +
				'<label for="curr-ang">Current Angle = </label>' + 
				'<label><span id="angval" class="zero-val-display">-</span> deg</label>' +
			'</div>' +
			'<div>' +
				'<label for="curr-load">Current Load = </label>' +
				'<label><span id="loadval" class="zero-val-display">-</span> N</label>' +
			'</div>' +
			'<div>' +
				'<label for="curr-step">Current Step = </label>' +
				'<label><span id="stepval" class="zero-val-display">-</span> </label>' +
			'</div>' +
			'<div>' +
				'<label for="tar-step">Target Step = </label>' +
				'<label><span id="tgtval" class="zero-val-display">-</span> </label>' +
			'</div>' +
			'<div>' +
				'<label for="max-step">Max Step = </label>' +
				'<label><span id="maxval" class="zero-val-display">-</span> </label>' +
			'</div>' +
			'<div>' +
				'<label for="min-step">Min Step = </label>' +
				'<label><span id="minval" class="zero-val-display">-</span> </label>' +
			'</div>' +
			'<div>' + 
				'<br><hr>' +
			'</div>' +
		'</div>' +
		'<a id="btn-rwd" class="click-button" tabindex="1" >&#171;</a>' +
		'<a id="btn-bkwd" class="click-button" tabindex="2" >&#60;</a>' +
		'<a id="btn-fwd" class="click-button" tabindex="3" >&#62;</a>' +
		'<a id="btn-ffwd" class="click-button" tabindex="4" >&#187;</a>' +
        '<a id="cfm-send" class="click-button click-button-disabled" tabindex="5" >Apply</a>' +
		'<br><br>' +
		'<p align = "center" width = "100%">Click "Apply" button after calibration</p>' +
		'<div class="data-blur"></div>' 
	);
};

// update data
ZeroCalControl.prototype.consume = function(data) {
	//lock when local override
	if (data['manovrd'] == 0) this.$widget.find(".data-blur").hide();
	else this.$widget.find(".data-blur").show();
	
	//update value

	if (!(data["tension"] == undefined || data["tension"] == this.loadVal)){
		this.loadVal = data["tension"];
		document.getElementById('loadval').innerHTML = this.loadVal.toPrecision(3);
	}
	if (!(data["angle"] == undefined || data["angle"] == this.angleval)){
		this.angleVal = data["angle"];
		document.getElementById('angval').innerHTML = this.angleVal.toPrecision(3);
	}
	if (!(data['step'] == undefined || data['step'] == this.stepVal)){
		this.stepVal = data['step'];
		document.getElementById('stepval').innerHTML = this.stepVal;
	}
	if (!(data['steptarget'] == undefined || data['steptarget'] == this.val)){
		this.val = data['steptarget'];
		document.getElementById('tgtval').innerHTML = this.val;
	}
	if (!(data['stepmax'] == undefined || data['stepmax'] == this.max)){
		this.max = data['stepmax'];
		document.getElementById('maxval').innerHTML = this.max;
	}
	if (!(data['stepmin'] == undefined || data['stepmin'] == this.min)){
		this.min = data['stepmin'];
		document.getElementById('minval').innerHTML = this.min;
	}
};

// aux functions
ZeroCalControl.prototype.handleStepButtonClick = function(size){
	var thiz = this, params = {};
	params['stepsize'] = size;
	this.postControl('setStep', params,
        function(data) {
            thiz.valueChanged = true;
			$("#cfm-send").removeClass("click-button-disabled");
        }
    );
}

ZeroCalControl.prototype.handleApplyButtonClick = function(size){
	var thiz = this, params = {}; 
	this.postControl('setRecal', params,
        function(data) {
            thiz.valueChanged = false;
			$("#cfm-send").addClass("click-button-disabled");
        }
    );
}

/* ============================================================================
 * == Strain Gauge Calibration Widget	                                     ==
 * ============================================================================ */
function SGCalControl($container){
	Widget.call(this, $container, 'CALI', 'sgcal');
	
	/** Strain Gauge Calibration variables. */
	this.val = [];
	this.isChanged = [];
   
	this.valueChanged = false;
}
SGCalControl.prototype = new Widget;

// initialization
SGCalControl.prototype.init = function() {
    var thiz = this, i = 0, j =0;
    
    /* Reset values. */
    for (i= 0; i<20;i++){
		this.val[i] = undefined;
		this.isChanged = false;
	}
	this.valueChanged = false;
    
	this.$widget = this.generateBox('sgcal');
	
	//entry box event handling
	for (j = 0; j<10; j++){
		$("#sg-scale" + (j+1))
			.focusin(formFocusIn)
			.focusout(formFocusOut)
			.change(function() { thiz.handleTextBoxChange($(this).attr("id").substr(8),$(this).val(),0); });
		$("#sg-bias" + (j+1))
			.focusin(formFocusIn)
			.focusout(formFocusOut)
			.change(function() { thiz.handleTextBoxChange($(this).attr("id").substr(7),$(this).val(),1); });
	}
	// 'apply' button event handling
	$("#cfm-send")
		.click(function() { thiz.handleApplyButtonClick(); })
		.mousedown(function() {
	            if (thiz.valueChanged) $(this).addClass("click-button-active");
	        })
	    .mouseup(function() { $(this).removeClass("click-button-active") ; })
		.keypress(function(e) {
	            if (e.keyCode == 13) thiz.handleApplyButtonClick();
	        });
	
};

// draw objects
SGCalControl.prototype.getHTML = function() {
	return(
		'<div id="SGCal-header-settings" class="saharaform">' +
			'<div>' + 
        		'<label for="sg-scale-header">Scale</label>' +
				'<label for="sg-bias-header">Bias</label>' +
        	'</div>' +
		'</div>' +
		'<div id="SGCal-settings" class="saharaform">' +
            '<div class="SGCal-scale1-div">' + 
        		'<label for="sg1">Gauge1</label>' +
        		'<input id="sg-scale1" class="sg-input-scale1" type="text" name="scale1" tabindex="1" />' +
				'<input id="sg-bias1" class="sg-input-bias1" type="text" name="bias1" tabindex="2" />' +
        	'</div>' +
			'<div class="SGCal-scale2-div">' + 
        		'<label for="sg2">Gauge2</label>' +
        		'<input id="sg-scale2" class="sg-input-scale2" type="text" name="scale2" tabindex="3" />' +
				'<input id="sg-bias2" class="sg-input-bias2" type="text" name="bias2" tabindex="4" />' +
        	'</div>' +
			'<div class="SGCal-scale3-div">' + 
        		'<label for="sg3">Gauge3</label>' +
        		'<input id="sg-scale3" class="sg-input-scale3" type="text" name="scale3" tabindex="5" />' +
				'<input id="sg-bias3" class="sg-input-bias3" type="text" name="bias3" tabindex="6" />' +
        	'</div>' +
			'<div class="SGCal-scale4-div">' + 
        		'<label for="sg4">Gauge4</label>' +
        		'<input id="sg-scale4" class="sg-input-scale4" type="text" name="scale4" tabindex="7" />' +
				'<input id="sg-bias4" class="sg-input-bias4" type="text" name="bias4" tabindex="8" />' +
        	'</div>' +
			'<div class="SGCal-scale5-div">' + 
        		'<label for="sg5">Gauge5</label>' +
        		'<input id="sg-scale5" class="sg-input-scale5" type="text" name="scale5" tabindex="9" />' +
				'<input id="sg-bias5" class="sg-input-bias5" type="text" name="bias5" tabindex="10" />' +
        	'</div>' +
			'<div class="SGCal-scale6-div">' + 
        		'<label for="sg6">Gauge6</label>' +
        		'<input id="sg-scale6" class="sg-input-scale6" type="text" name="scale6" tabindex="11" />' +
				'<input id="sg-bias6" class="sg-input-bias6" type="text" name="bias6" tabindex="12" />' +
        	'</div>' +
			'<div class="SGCal-scale7-div">' + 
        		'<label for="sg7">Gauge7</label>' +
        		'<input id="sg-scale7" class="sg-input-scale7" type="text" name="scale7" tabindex="13" />' +
				'<input id="sg-bias7" class="sg-input-bias7" type="text" name="bias7" tabindex="14" />' +
        	'</div>' +
			'<div class="SGCal-scale8-div">' + 
        		'<label for="sg8">Gauge8</label>' +
        		'<input id="sg-scale8" class="sg-input-scale8" type="text" name="scale8" tabindex="15" />' +
				'<input id="sg-bias8" class="sg-input-bias8" type="text" name="bias8" tabindex="16" />' +
        	'</div>' +
			'<div class="SGCal-scale9-div">' + 
        		'<label for="sg9">Gauge9</label>' +
        		'<input id="sg-scale9" class="sg-input-scale9" type="text" name="scale9" tabindex="17" />' +
				'<input id="sg-bias9" class="sg-input-bias9" type="text" name="bias9" tabindex="18" />' +
        	'</div>' +
			'<div class="SGCal-scale10-div">' + 
        		'<label for="sg10">Gauge10</label>' +
        		'<input id="sg-scale10" class="sg-input-scale10" type="text" name="scale10" tabindex="19" />' +
				'<input id="sg-bias10" class="sg-input-bias10" type="text" name="bias10" tabindex="20" />' +
        	'</div>' +
        '</div>' +
        '<a id="cfm-send" class="click-button click-button-disabled" tabindex="5" >Apply</a>'
	);
};

// update data
SGCalControl.prototype.consume = function(data) {
	var i;
	for (i = 0; i < 10; i++) {
		if (!(data["StrainScale"+(i+1)] == undefined || data["StrainScale"+(i+1)] == this.val[i] || this.isChanged[i])){
			this.val[i] = data["StrainScale"+(i+1)];
			document.getElementById('sg-scale' + (i+1)).value = this.val[i].toPrecision(4);
		}
		if (!(data["StrainBias"+(i+1)] == undefined || data["StrainBias"+(i+1)] == this.val[i+10]|| this.isChanged[i+10])){
			this.val[i+10] = data["StrainBias"+(i+1)];
			document.getElementById('sg-bias' + (i+1)).value = this.val[i+10].toPrecision(4);
		}
	}	
};

// aux functions
SGCalControl.prototype.handleTextBoxChange = function(pVar,val,type) {
	
	var index = parseInt(pVar);
	var positionX = 10 + 70 + type * (10+60),
		positionY = 25 + (index - 1)*35; 
	
    var ttLeft = positionX + 55,
        ttTop  = positionY +8;
	var target = '';
	if (type == 0) target = 'Scale';
	else target = 'Bias';
    
	this.isChanged[index -1 +type*10] = true;
    this.removeMessages();
    if (!val.match(/^-?\d+\.?\d*$/))
    {
        this.addMessage("Calibration-validation-" + target + pVar, "Value must be a number.", "error", ttLeft, ttTop, "left");
        return;
    }
    
    var n = parseFloat(val);
 	if (type == 0){
		this.val[index -1] = n;
		this.sendScale(index);
	}
	else if(type == 1){
		this.val[index +9] = n;
		this.sendBias(index);
	}      
};
SGCalControl.prototype.sendScale = function(id){
	var thiz = this, params = { };
    params['newscale'] = this.val[id-1];
	params['scaleindex'] = (id);
    this.postControl('setScale', params,
        function(data) {
            thiz.valueChanged = true;
			$("#cfm-send").removeClass("click-button-disabled");
			thiz.isChanged[id] = false;
        }
    );
}
SGCalControl.prototype.sendBias = function(id){
	var thiz = this, params = { };
    params['newbias'] = this.val[id+9];
	params['biasindex'] = (id);
    this.postControl('setBias', params,
        function(data) {
            thiz.valueChanged = true;
			$("#cfm-send").removeClass("click-button-disabled");
			thiz.isChanged[id+10] = false;
        }
    );
}

SGCalControl.prototype.handleApplyButtonClick = function(size){
	var thiz = this, params = {}; 
	this.postControl('setCali', params,
        function(data) {
            thiz.valueChanged = false;
			$("#cfm-send").addClass("click-button-disabled");
        }
    );
}

/* ============================================================================
 * == Base widget                                                            ==
 * ============================================================================ */

/**
 * Base class widgets that comprise the interface.
 * It provides declarations of a widgets required functionality
 * and implementations of common functionality.
 * 
 * @param $container a jQuery object that is the base where the widget is \ 
 *                                 appended to
 * @param title the widgets title
 * @param icon the widgets box icon 
 */
function Widget($container, title, icon) 
{
        /** The jQuery object of the container the widget is attached to. */
        this.$container = $container;
        
        /** State manager of this widget. This may be null if no parent widget is 
         *  directly managing the state of this widget. */
        this.parentManager = undefined;

        /** The page title. */
        this.title = title;

        /** The page icon. */
        this.icon = icon;

        /** The jQuery object of the outermost element of this widget. 
         *  This is not initialised until the 'init' method has been called. */
        this.$widget = null;
        
        /** Window management properties. */
        this.window = {
            shown:    undefined, // Whether the widget is being shown
            width:    undefined, // The width of this window
            height:   undefined, // The height of this window
            left:     undefined, // Left position of this window
            top:      undefined, // Top position of this window
            zin:      undefined, // Z-Index of this window 
            shaded:   undefined, // Whether this window is shaded
            expanded: undefined // Whether this window is expanded
        };
};

/* ----- WIDGET LIFE CYCLE ---------------------------------------------------- */

/** 
 * Adds the widget to the page and sets up any widgets event handlers.
 */
Widget.prototype.init = function() {
    throw "Widget init not defined.";
};

/** 
 * Method which is provided with data from the server. The data object is the 
 * return from /data operation and is a map of the response keys and objects. 
 * 
 * @param data data object
 */
Widget.prototype.consume = function(data) { };

/** 
 * Removes the widget from the page and cleans up all registered
 * events handlers. 
 */
Widget.prototype.destroy = function() {     
    if (this.$widget) this.$widget.remove();
    $(document).unbind("keypress.widget-" + this.id);
};

/* ----- WIDGET EVENT CALLBACKS ----------------------------------------------- */

/**
 * Event callback if an error has occurred and the widget should provide
 * a view that indicates something is amiss. An example of a possible error
 * is an error was received in server data polling.
 */
Widget.prototype.blur = function() { };

/**
 * Event callback to notify a previous blur can be cleared.
 */
Widget.prototype.unblur = function() { };

/** 
 * Event callback that is invoked when the widget is resized. This is called 
 * multiple times during resizing should be a speedy operation.
 * 
 * @param width the new widget width
 * @param height the new widget height
 */
Widget.prototype.resized = function(width, height) { };

/**
 * Event callback that is invoked when the widget has finished resizing. 
 * 
 * @param width the final widget width
 * @param height the final widget height
 */
Widget.prototype.resizeStopped = function(width, height) { };

/**
 * Event callback that is invoked when the widget has been dragged. 
 * 
 * @param xpos the new x coordinate from its enclosing container
 * @param ypos the new y coordinate from its enclosing container
 */
Widget.prototype.dragged = function(xpos, ypos) { };

/* ----- WIDGET COMMON BEHAVIOURS AND DISPLAY GENERATION ---------------------- */

/** 
 * Adds a message to the page. 
 * 
 * @param msgId ID of the message
 * @param message the message to display
 * @param type the message type, 'error', 'info', 'backing'
 * @param left left absolute coordinate
 * @param top top absolute coordinate
 * @param pos the arrow position, 'left', 'right', 'right-bottom', 'top-left', 'top-center'
 */
Widget.prototype.addMessage = function(msgId, message, type, left, top, pos) {
        var $box, i, aniIn, bs = 1, up = true, html = 
                "<div id='" + msgId + "' class='message-box message-box-" + type + " message-box-in1' style='left:" + left + "px; top:" + top + "px'>" +
                        "<div class='message-box-text'>" + message + "</div>" +
                        "<div class='message-box-arrow message-box-arrow-" + pos + "'>";

        for (i = 0; i < 8; i++)
        {
                html += "<div class='message-box-arrow-line message-box-arrow-line" + i + "'></div>";
        }

        html += "</div>" +
                "</div>";

        $box = this.$widget.append(html).children(':last');

        /* Throb box shadow around message box. */
        aniIn = setInterval(function() {
                if (bs == 0 || bs == 12) up = !up;
                $box.css("box-shadow", "0 0 " + (up ? bs++ : bs--) + "px #AAAAAA");
        }, 120);

        /* Remove box on click. */
        $box.click(function() {
                clearInterval(aniIn);
                $box.remove();
        });
};

/**
 * Removes messages from the page.
 */
Widget.prototype.removeMessages = function() {
        this.$widget.find(".message-box").remove();
};

/**
 * Generates the common styled widget box.
 * 
 * @param boxId ID of the box
 * @param title the title of the widget
 * @return jQuery node of the generated box that has been appended to the page
 */
Widget.prototype.generateBox = function(boxId) {
    var $w = this.$container.append(
      "<div class='window-wrapper' id='" + boxId + "'>" +
          "<div class='window-header'>" +
              "<span class='window-icon icon_"+ this.icon + "'></span>" +
              "<span class='window-title'>" + this.title + "</span>" +
              "<span class='window-close ui-icon ui-icon-close'></span>" +
              "<span class='window-shade ui-icon ui-icon-minus'></span>" + 
              "<span class='window-expand ui-icon ui-icon-arrow-4-diag'></span>" +             
          "</div>" +
          "<div class='window-content'>" + 
                    this.getHTML() +
          "</div>" +
      "</div>"
    ).children().last(), thiz = this;
    
    $w.find(".window-expand").click(function() { thiz.toggleWindowExpand(); });
    $w.find(".window-shade").click(function() { thiz.toggleWindowShade(); });
    $w.find(".window-header").dblclick(function() { thiz.toggleWindowShade(); });
    $w.find(".window-close").click(function() {  
        if   (thiz.parentManager) thiz.parentManager.toggleWidget(thiz.title);
        else thiz.destroy();
    });
    
    $(document).bind("keypress.widget-" + this.id, function(e) {
       switch (e.keyCode) 
       {
           case 27:
               if (thiz.isExpanded) thiz.toggleWindowExpand();
               break;
       }
    });
    
    return $w;
};
/**
 * Shades the widget which hides the widget contents only showing the title.
 *
 * @param shadeCallback runs a callback function after the shade animation has completed
 */
Widget.prototype.toggleWindowShade = function(shadeCallback) {
        if (shadeCallback && typeof(shadeCallback) === "function") {
            this.$widget.find(".window-content").slideToggle('fast');
            this.$widget.find(".window-header").toggleClass("window-header-shade", "slide",function(){
            shadeCallback();
            });
            this.$widget.css("width", this.$widget.width());
    }
    else
    {
            this.$widget.find(".window-content").slideToggle('fast');
            this.$widget.find(".window-header").toggleClass("window-header-shade", "slide");
        this.$widget.css("width", this.$widget.width());
    }

    if (this.window.shaded != true)
    {
            this.$widget.css("height", 'auto');
            
            /* Changing shaded icon */
        this.$widget.find(".window-shade").toggleClass('ui-icon-minus ui-icon-triangle-1-s');

        /* Disable resizing when shaded */
        this.$widget.find('.ui-resizable-handle').css('display', 'none');
    }
    else
    {
            /* Changing shaded icon */
        this.$widget.find(".window-shade").toggleClass('ui-icon-minus ui-icon-triangle-1-s');

        /* Enable resizing */
        this.$widget.find('.ui-resizable-handle').css('display', 'block');
    }

    this.window.shaded = !this.window.shaded;
    this.storeState();
};

/** The expanded width of an expanded, resizable widget. */
Widget.EXPANDED_WIDTH = 800;

/** The maximum expanded height of an expanded, resizable widget. */
Widget.MAX_EXPANDED_HEIGHT = 500;

/**
 * Toggles the window expand state which makes the widget take a prominent 
 * position on the interface. 
 */
Widget.prototype.toggleWindowExpand = function() {
    var thiz = this;
    /* Prevents expanding of a shaded widget */
    if (this.window.shaded === true) {
        this.toggleWindowShade(function() {
            thiz.toggleWindowExpand();
        });
    }
    else
    {
        if (this.window.expanded)
        {
            if (this.$widget.hasClass("ui-resizable"))
            {
                this.$widget.width(this.window.width);
                this.$widget.height(this.window.height);
                this.resized(this.window.width, this.window.height);
                this.resizeStopped(this.window.width, this.window.height);
            }

            /* Moving the widget back to its original position. */
            this.$widget.css({
                left: this.window.left,
                top:  this.window.top,
                zIndex: this.window.zin
            });        

            /* Changing expanded icon */
            this.$widget.find(".window-expand").toggleClass('ui-icon-arrow-4-diag ui-icon-newwin'); 
        }
        else
        {
            var width = this.window.width = this.$widget.width(),
                height = this.window.height = this.$widget.height(),
                p = this.$widget.position(),
                zin = this.window.zin = this.$widget.zIndex();

            this.window.left = p.left;
            this.window.top = p.top;

            if (this.$widget.hasClass("ui-resizable"))
            {
                /* We can resize the widget so we will make it larger. */
                height = Widget.EXPANDED_WIDTH / width * height;
                width = Widget.EXPANDED_WIDTH;

                /* If the height is larger than the width, we want to scale the 
                * widget so it first better. */
                if (height > Widget.MAX_EXPANDED_HEIGHT)
                {
                    height = Widget.MAX_EXPANDED_HEIGHT;
                    width = Widget.MAX_EXPANDED_HEIGHT / this.window.height * this.window.width;
                }

                this.$widget.width(width);
                this.$widget.height(height);
                this.resized(width, height);
                this.resizeStopped(width, height);
            }

            /* We want the expanded widget to have the highest z-Index. */
            this.$container.find(".window-wrapper").each(function(i) {if ($(this).zIndex() > zin) zin = $(this).zIndex(); });

            /* Move the widget to a central position. */
            this.$widget.css({
                left: this.$container.width() / 2 - width / 2 - 60,
                top: 100,
                zIndex: zin + 100
            });

            /* Changing expanded icon */
            this.$widget.find(".window-expand").toggleClass('ui-icon-arrow-4-diag ui-icon-newwin');
        }

        this.$widget.toggleClass("window-expanded");
        this.window.expanded = !this.window.expanded;
        this.storeState();
    }
};

/**
 * Generates the HTML content for the widget box.
 */
Widget.prototype.getHTML = function() {        };

/** Whether the z-index fix has been applied. */
Widget.hasZIndexFix = false;

/**
 * Enables this widget to be draggable.
 */
Widget.prototype.enableDraggable = function() {
                
    /* Adds the CSS for the draggable widgets */
    this.$widget.addClass('draggable');
    this.$widget.find('.window-header').addClass('draggable-header');
   
    if (this.window.left && this.window.top && this.window.zin) 
    {
        /* We have stored previously, dragged state so we will restore it. */
        this.$widget
                .css({
                    left: this.window.left, 
                    top: this.window.top,
                    zIndex: this.window.zin
                });
        this.dragged(this.window.left, this.window.top);
    }
    
        /* Enables dragging on the widgets 'window-wrapper' class */
    var thiz = this;
        this.$widget.draggable({
        snap: true,
        snapTolerance: 5,
        stack: '.window-wrapper, .tab-wrapper',
        increaseZindexOnmousedown: true,
        distance: 10,
        handle: '.draggable-header',
        stop: function() {
            var p = $(this).position();
                thiz.window.left = p.left;
                thiz.window.top = p.top;
                thiz.window.zin = $(this).zIndex();
                thiz.storeState();
                
                /* Invoke event handler. */
                thiz.dragged(p.left, p.top);
        }
    });

        if (!Widget.hasZIndexFix)
        {
                /* Enables increase Z-index on mouse down. */         
            $.ui.plugin.add('draggable', 'increaseZindexOnmousedown', {
                create: function() {
                    this.mousedown(function(e) {
                        var inst = $(this).data('draggable');
                        inst._mouseStart(e);
                        inst._trigger('start', e);
                        inst._clear();
                    });
                }
            });
            
            Widget.hasZIndexFix = true;
        }
};

/**
 * Enables this widget to be resizable. 
 * 
 * @param minWidth the minimum width the widget can be resized to (optional)
 * @param minHeight the minimum height the widget can be resized to (optional)
 * @param preserveAspectRatio whether to preserve the widgets aspect ratio, default to not preserve 
 */
Widget.prototype.enableResizable = function(minWidth, minHeight, preserveAspectRatio) {
    var thiz = this;
        this.$widget.resizable({
         minWidth: minWidth,
         minHeight: minHeight,
         aspectRatio: preserveAspectRatio,
         distance: 10,
         resize: function(e, ui) { thiz.resized(ui.size.width, ui.size.height); },
             stop: function(e, ui) {
                 /* Store sizing information. */
                 thiz.window.width = ui.size.width;
                 thiz.window.height = ui.size.height;
                 thiz.storeState();
                 
                 /* Fire event. */
                 thiz.resizeStopped(ui.size.width, ui.size.height); 
             }
        });
        
        if (this.window.width && this.window.height)
        {
            this.$widget.css({
                width: this.window.width,
                height: this.window.height
            });
            
            this.resized(this.window.width, this.window.height);
            this.resizeStopped(this.window.width, this.window.height);
        }
};

/** 
 * Posts data to the server.
 * 
 * @param action the name of the action called from the Rig Client
 * @param params data object of POST variables
 * @param responseCallback function to be invoked with the response of POST
 * @param errorCallback function to be invoked if an error occurs
 */
Widget.prototype.postControl = function(action, params, responseCallback, errorCallback) {
    var thiz = this;
	$.ajax({
        url: "/primitive/mapjson/pc/RedundantTrussRigController/pa/" + action,
        data: params,
        success: function(data) {
            if (responseCallback != null) responseCallback(data);
        },
        
		error: function(data) {
            if (errorCallabck != null) errorCallback(data);
        }
		
    });
};

/**
 * Stores the state of this widget in a cookie.
 */
Widget.prototype.storeState = function() {
    var json;
    
    if (JSON.stringify)
    {
        /* Built JSON serialization. */
        json = JSON.stringify(this.window);
    }
    else
    {
        /* Legacy browser, no built in JSON. */
        var i = 0;
        json = "{";
        for (i in this.window) if (typeof this.window[i] != "undefined") json += '"' + i + '":' + this.window[i] + ",";
        json = json.substring(0, json.length - 1);
        json += "}";
    }
    
    setCookie(this.id + '-win', json);
};

/**
 * Loads the stored state from a store cookie.
 */
Widget.prototype.loadState = function() {
    var state = getCookie(this.id + '-win');
    
    if (state && state.match(/^{.*}$/))
    {
        try
        {
            this.window = $.parseJSON(state);
        }
        catch (e) { /* Invalid JSON, not restoring layout. */ alert(e); }
    }
};

/* ============================================================================
 * == Display Manager.                                                       ==
 * ============================================================================ */

/**
 * Controls which widgets are active a which point.
 */
function DisplayManager($container, title, widgets) 
{        
    Widget.call(this, $container, title, 'toggle');

    /** Identifier of the display manager box. */
    this.id = 'display-manager';

    /** Widgets that are toggle able by this widget. */
    this.widgets = widgets;
    
    /** The states of each of the widgets. */
    this.states = [ ];
    
    /** Whether the displayed in is blurred state. */
    this.isBlurred = false;
}
DisplayManager.prototype = new Widget;

DisplayManager.prototype.init = function() {
    var thiz = this, i = 0;
    
    /* Enable all the other widgets. */
    for (i in this.widgets) 
    {            
        this.widgets[i].parentManager = this; 
        this.widgets[i].loadState();
    
        if (this.widgets[i].window.shown = this.states[i] = !(this.widgets[i].window.shown === false))
        {
            this.widgets[i].init();
            
            /* Restore other states. */
            if (this.widgets[i].window.expanded)
            {
                this.widgets[i].window.expanded = false;
                this.widgets[i].toggleWindowExpand();
            }
            
            if (this.widgets[i].window.shaded)
            {
                this.widgets[i].window.shaded = false;
                this.widgets[i].toggleWindowShade();
            }
        }
    }

    /* Generate our UI. */
        this.$widget = this.generateBox('display-manager');
    this.$widget.find(".window-close").hide();

        /* Enable dragging. */
        this.enableDraggable();

    /* Shade the display manager if shaded cookie is undefined */
    if (this.window.shaded === undefined) this.toggleWindowShade();

    this.$widget.find('.toggle').click(function() {    
            thiz.toggleWidget($(this).find("span").html(), this);
    });
    
    this.$widget.find('.reset-button').click(function() {    
            var i = 0;
            for (i in thiz.widgets)
            {
            if (thiz.widgets[i].window.shown === false)
            {
                    thiz.widgets[i].parentManager.toggleWidget(thiz.widgets[i].title);
                }
                
            delete thiz.widgets[i].boxHeight;
            thiz.widgets[i].window = { };
            thiz.widgets[i].storeState();
            thiz.widgets[i].destroy();
            thiz.widgets[i].init();
            }
            
            thiz.$widget.find(".button .animated")
            .removeClass("off")
            .addClass("on");
            
        thiz.$widget.css({
            'top': 155,
            'left': -194
        });

        thiz.toggleWindowShade();
    });
    
    if (this.window.shaded === undefined) this.toggleWindowShade();
};

DisplayManager.prototype.getHTML = function() {        
        var i = 0, html =
                '<div class="buttonwrapper">';
        
        for (i in this.widgets)
        {
                /* We should be adding this to be widgets that can be removed. */
                if (this.widgets[i] == this) continue;

                html += '<div class="button toggle">' +
                                        (this.icon != undefined ? '<div class="window-icon icon_' + this.widgets[i].icon + '"></div>' : '') +  
                                        '<span class="display-manager-title">' + this.widgets[i].title + '</span>' +
                                '<div class="switch">' +
                                        '<div class="animated slide ' + (this.widgets[i].window.shown === false? "off" : "on") + '"></div>' +
                                '</div>' +
                        '</div>';
        }

    html += '<div class="button reset-button">Reset</div>' +
        '</div>';

        return html;
};

/**
 * Toggles a widget from either displaying or being invisible. 
 * 
 * @param title the title of the widget to toggle
 * @param node switch node to toggle classes (optional)
 */
Widget.prototype.toggleWidget = function(title, node) {
        var i = 0;

        for (i in this.widgets)
        {
                if (this.widgets[i].title == title)
                {
                        if (this.states[i])
                        {
                                this.widgets[i].destroy();
                    }
                        else 
                        {
                                this.widgets[i].init();
                                if (this.isBlurred) this.widgets[i].blur();
                        }
                        
                        this.widgets[i].window.shown = this.states[i] = !this.states[i];
                        this.widgets[i].storeState();
                }
        }
        
        $node = node ? $(node) : this.$widget.find(".button:has(span:contains(" + title + "))");
        $node.find('.switch .slide').toggleClass("on off");
};

DisplayManager.prototype.consume = function(data) {
        var i = 0;
        for (i in this.widgets) if (this.states[i]) this.widgets[i].consume(data);
};


DisplayManager.prototype.blur = function() {
        var i = 0;
        this.isBlurred = true;
        for (i in this.widgets) if (this.states[i]) this.widgets[i].blur();
};

DisplayManager.prototype.unblur = function() {
        var i = 0;
        this.isBlurred = false;
        for (i in this.widgets) if (this.states[i]) this.widgets[i].unblur();
};

/* ============================================================================
 * == Tabbed Container Widget                                                ==
 * ============================================================================ */

/**
 * The 'tabbed' widget provides a container that holds other widgets within 
 * its tabs. Only one widget is visible at a time 
 */
function TabbedWidget($container, title, widgets, modeVar, modeAction) 
{
   DisplayManager.call(this, $container, title, widgets);
   
   /** Identifer of this widget. */
   this.id = title.toLowerCase().replace(' ', '-') + '-tabs';
   
   /** Tab idenfitiers. */
   this.tabIds = [ ];
   
   /** Tab contents container. */
   this.$tabContainer = undefined;
   
   /** Tools tips of the tab. */
   this.toolTips = undefined;
   
   /** Width of the tab box. If this is undefined, the box takes the width
    *  of its currently displayed contents. */
   this.width = undefined;
   
   /** Height of the box. If this is undefinde, the box takes the height of
    *  its currently displayed contents. */
   this.height = undefined;
   
   /** Server mode variable the controls which tab is currently active. */ 
   this.modeVar = modeVar;
   
   /** Action to post the mode change to. */
   this.modeAction = modeAction;
   
   /** Current mode. */
   this.currentMode = undefined;
   
   /** If a tab has been clicked to change current tab. */
   this.tabChanged = false;
   
   /** Tool tips hover states. */
   this.toolTipsHovers = { };

   /* Initialise the tab indentifiers. */
   var i = 0;
   for (i in this.widgets) this.tabIds[i] = "tab-" + this.widgets[i].title.toLowerCase().replace(' ', '-');
}
TabbedWidget.prototype = new DisplayManager;

TabbedWidget.prototype.init = function() {
    /* Reset. */
    this.currentMode = undefined;
    
    /* Render the content box. */
        this.$widget = this.generateBox(this.id);
        this.$tabContainer = this.$widget.find(".tab-content");
        
        var i = 0;
        for (i in this.widgets)
        {
            /* Replace default boxing with tab containment. */
            this.widgets[i].$container = this.$tabContainer;
            this.widgets[i].generateBox = function(boxId, icon) {
               return this.$container.append(
                   "<div id='" + boxId + "' class='tab-containment'>" +
                       this.getHTML() +
                   "</div>"
               ).children().last();
            };
            this.widgets[i].enableDraggable = function() { /* No-op. */ };   
            this.states[i] = false;
        }
        
        var thiz = this;
        this.$widget.find(".tab-title")
            .click(function() { thiz.tabClicked($(this).attr("id")); })
            .mouseenter(function() {
                var id = $(this).attr("id");
                thiz.toolTipsHovers[id] = true;
                setTimeout(function() {
                    if (thiz.toolTipsHovers[id]) thiz.showToolTip(id);
                }, 2000);
            })
            .mouseleave(function() {
                thiz.toolTipsHovers[$(this).attr("id")] = false;
            });
        
        this.$widget.find(".window-close").click(function() {
            if   (thiz.parentManager) thiz.parentManager.toggleWidget(thiz.title);
        else  thiz.destroy();
        });

        /* Enable dragging. */
        this.enableDraggable();
};

TabbedWidget.prototype.generateBox = function(boxId) {
    var i = 0, html = 
      "<div class='tab-wrapper' id='" + boxId + "'>" +
          "<div class='tab-wrapper-controls draggable-header'>" +
              "<span class='window-close ui-icon ui-icon-close'></span>" +    
              "<div class='tab-wrapper-height'></div>" +
          "</div>" +
         "<div class='tab-header' style='width:" + (this.widgets.length * 92) + "px'>";

    for (i in this.widgets)
    {
        html += 
				"<div id='" + this.tabIds[i] + "' class='tab-title'>" +
                  "<span class='window-icon icon_"+ this.widgets[i].icon + "'></span>" +
                  "<span class='window-title'>" + this.widgets[i].title + "</span>" +
              "</div>";
    }

    html += 
         "</div>" + 
         "<div class='tab-content' style='width:" + (this.width ? this.width + "px" : "inherit") + 
                         ";height:" + (this.height ? this.height + "px" : "inherit") + "'></div>" +
      "</div>";

    return this.$container.append(html).children().last();
};

TabbedWidget.prototype.consume = function(data) {
    if (!this.tabChanged && data[this.modeVar] != undefined && data[this.modeVar] != this.currentMode)
    {
        /* Server state is different from the displayed state. */
        this.currentMode = data[this.modeVar];
        this.switchTab();
    }
    
    DisplayManager.prototype.consume.call(this, data);
};

/**
 * Handle a tab being clicked.
 * 
 * @param id identifer of clicked tab
 */

TabbedWidget.prototype.tabClicked = function(id) {
    if (!$('#' + id).hasClass('tab-active')){
        this.tabChanged = true;

        this.destroyCurrentTab();
    
        var thiz = this, params = { }, i;
    
        /* Seach for the new tab index. */
        for (i = 0; i < this.tabIds.length; i++) if (this.tabIds[i] == id) break; 
    
        /* Post the change to the server. */
        params[this.modeVar] = i;
        this.postControl(this.modeAction, params, function(data) {
            thiz.tabChanged = false;
            thiz.consume(data);
        });
    }
};

/**
 * Switches tab.
 */
TabbedWidget.prototype.switchTab = function() {
    this.destroyCurrentTab();
    this.states[this.currentMode] = true;
    this.widgets[this.currentMode].init();
    
    this.$widget.find(".tab-active").removeClass("tab-active");
    $("#" + this.tabIds[this.currentMode]).addClass("tab-active");
};

/**
 * Removes the current tab.
 */
TabbedWidget.prototype.destroyCurrentTab = function() {
    var i = 0;
    
    /* Remove the displayed widget. */
    for (i in this.states) 
    {
        if (this.states[i]) 
        {
            this.widgets[i].destroy();
            this.states[i] = false;
            break;
        }
    }    
};

/**
 * Shows a tooltip of a tab.
 * 
 * @param {string} id ID of a tab to show
 */
TabbedWidget.prototype.showToolTip = function(id) {
    if ($("#" + id + "-tooltip").size() == 0)
    {
        this.removeMessages();
        
        var message = "", i = 0;
        for (i in this.tabIds) if (this.tabIds[i] == id) message = this.toolTips[i];
        this.addMessage(id + "-tooltip", message, "info", $("#" + id).position().left - 10, -3, "top-left");
    }
};

/**
 * Sets the tool tips of the tabs of this container. These tooltips are 
 * displayed when hovering over a tab.
 * 
 * @param toolTips list of tool tips
 */
TabbedWidget.prototype.setToolTips = function(toolTips) {
    this.toolTips = toolTips;
};

/**
 * Sets the dimension of the box. If the width and height are undefined,
 * the box size is determined by its displayed contents.
 * 
 * @param width width of the box in pixels
 * @param height height of the box in pixels
 */
TabbedWidget.prototype.setDimensions = function(width, height) {
    this.width = width;
    this.height = height;
};


/* ============================================================================
 * == Camera Widget                                                          ==
 * ============================================================================ */

/**
 * The camera widget displays a single camera stream which may have one or more
 * formats.  
 * 
 * @param $container the container to add this camera to
 * @param title the camera box title
 * @param suf data attribute suffix to load this cameras information
 */
function CameraWidget($container, title, mjpegurl, suf) 
{
    Widget.call(this, $container, title, 'video');
    
        /** Identifier of the camera box. */
        this.id = title.toLowerCase().replace(' ', '-');

        /** The list of address for the each of the camera formats. */
        this.urls = {
                swf:   undefined, // Flash format
                mjpeg: mjpegurl  // MJPEG format
        };  
        
        /** The camera format data suffix. */
        this.suf = suf;
        
        /** Whether the camera is deployed. */
        this.isDeployed = false;
        
        /** Current format. */
        this.currentFormat = 'mjpeg';
        
        /** Width of the video. */
        this.videoWidth = 320;
        
		/** Preset */
		this.preset = 1;
		this.dataVar = "preset";
		
        /** Height of the video. */
        this.videoHeight = 240;
        
        /** SWF timer. */
        this.swfTimer = undefined;
};
CameraWidget.prototype = new Widget;

/** Cookie which stores the users chosen camera format. */
CameraWidget.SELECTED_FORMAT_COOKIE = "camera-format";

CameraWidget.prototype.init = function() {
        var thiz = this;
        
		
		
    /* Reset. */
    this.isDeployed = false;
    this.videoWidth = 320;
    this.videoHeight = 240;
    
        this.$widget = this.generateBox('camera-coupled-tanks');

        /* Enable dragging. */
        this.enableDraggable();

        this.$widget.find('.format-select').find('select').change(function() {
            thiz.undeploy();
        thiz.deploy($(this).val());
    });
        
        /* Loads Metro help window */
        this.$widget.find(".metro-check").click(function() {
            $('.metro-container').fadeToggle();
        });
        
        this.enableResizable(185.5, 175, true);
        
        /* Restore current format after reinit. */
        if (this.currentFormat) this.deploy(this.currentFormat);
		
};

CameraWidget.prototype.consume = function(data) {
    /* Camera streams don't change. */
	/*
    if (this.urls.mjpeg && this.urls.swf) return;
    
    if (data['camera-swf' + this.suf] != undefined)
    {
        this.urls.swf = decodeURIComponent(data['camera-swf']);
    }
    
    if (data['camera-mjpeg' + this.suf] != undefined)
    {
        this.urls.mjpeg = decodeURIComponent(data['camera-mjpeg']);
    }
    
    if (this.urls.swf || this.urls.mjpeg) 
    {
        this.restoreDeploy();
    }
	*/
    // this.urls.mjpeg = decodeURIComponent(data['camera-mjpeg']);
};

/**
 * Restores a stored user chosen format choice, otherwise uses platform deploy
 * to load the most appropriate choice. 
 */
CameraWidget.prototype.restoreDeploy = function() {
    var storedChoice = getCookie(CameraWidget.SELECTED_FORMAT_COOKIE);
    
    if (storedChoice && this.urls[storedChoice])
    {
        this.deploy(storedChoice);
    }
    else
    {
        this.platformDeploy();
    }
};

/**
 * Deploys a format most appropriate to the platform.
 */
CameraWidget.prototype.platformDeploy = function() {
    this.deploy(/Mobile|mobi|Android|android/i.test(navigator.userAgent) ? 'mjpeg' : 'swf');  
};

/**
 * Deploys the specified camera format. 
 * 
 * @param format format to deploy
 */
CameraWidget.prototype.deploy = function(format) {
    var html;
    
    switch (format)
    {
    case 'swf':
        html = this.getSwfHtml();
        break;
        
    case 'mjpeg':
        html = this.getMjpegHtml();
        break;
        
    default:
        this.platformDeploy();
        return;
    }
    
    this.isDeployed = true;
    this.$widget.find(".video-player").html(html);
    this.$widget.find("#video-player-select").children(":selected").removeAttr("selected");
    this.$widget.find("#video-player-select > option[value='" + format + "']").attr("selected", "selected");
    setCookie(CameraWidget.SELECTED_FORMAT_COOKIE, this.currentFormat = format);
    
    if (this.currentFormat == 'swf')
    {
        var thiz = this;
        this.swfTimer = setTimeout(function() {
            if (thiz.currentFormat == 'swf') thiz.deploy(thiz.currentFormat);
        }, 360000);
    }
};

CameraWidget.prototype.undeploy = function() {
    if (this.currentFormat == 'mjpeg')
    {
        /* Reports in the wild indicate Firefox may continue to the download 
         * the stream unless the source attribute is cleared. */
        this.$widget.find(".video-player > img").attr("src", "#");
    }

    this.$widget.find(".video-player").empty();
    
    if (this.swfTimer)
    {
        clearTimeout(this.swfTimer);
        this.swfTimer = undefined;
    }
    
    this.isDeployed = false;
};

CameraWidget.prototype.getHTML = function() {
        return (
                '<div class="video-player" style="height:' + this.videoHeight + 'px;width:' + this.videoWidth + 'px">' +
                    '<div class="video-placeholder">Please wait...</div>' +
                '</div>' +
                '<div class="metro-container">' +
                    'Please click the settings icon found at the bottom right corner of your browser window.' + 
                    '<p>(This menu can be accessed by right clicking in the browser window).</p>' +
                    '<div class="metro-image metro-image-settings"></div>' +
                    '<br /><br />Then select the "View on the desktop" option.' +
                    '<div class="metro-image metro-image-desktop"></div>' +
                '</div>' +
                ($.browser.msie && $.browser.version >= 10 && !window.screenTop && !window.screenY ? 
                    '<div class="metro-check">' +
                '<img class="metro-icon" src="/uts/coupledtanksnew/images/ie10-icon.png" alt="Using Metro?" />' +
                'Using Metro?' +
            '</div>' : '' ) +
			'<div class="preset-select">' +
			'<div class="button presetOne">Arduino</div>' +
			'</div>' +
            '<div class="format-select">' +   
            '<select id="video-player-select" class="gradient">' +
                    '<option selected="selected" value=" ">Select Format</option>' +
                '<option value="swf">SWF</option>' +
                '<option value="mjpeg">M-JPEG</option>' +
            '</select>' +
        '</div>'
        );
};

/**
 * Gets the HTML to deploy a SWF stream format. 
 */
CameraWidget.prototype.getSwfHtml = function() {
        return (!$.browser.msie ? // Firefox, Chrome, ...
                        '<object type="application/x-shockwave-flash" data="' + this.urls.swf + '" ' +
                                         'width="' +  this.videoWidth  + '" height="' + this.videoHeight + '">' +
                        '<param name="movie" value="' + 'this.urls.swf' + '"/>' +
                        '<param name="wmode" value="opaque" />' +
                        '<div class="no-flash-container">' +
                    '<div class="no-flash-button">' +
                                '<a href="http://www.adobe.com/go/getflash">' +
                                        '<img class="no-flash-image" src="/uts/coupledtanksnew/images/flash-icon.png"' +
                                                    'alt="Get Adobe Flash player"/>' +
                                                '<span class="no-flash-button-text">Video requires Adobe Flash Player</span>' +
                                '</a>' +
                    '</div>' +
                    '<p class="no-flash-substring">If you do not wish to install Adobe flash player ' +
                        'you can try another video format using the drop down box below.</p>' +
                        '</div>' +
                    '</object>'
                :                  // Internet Explorer
                        '<object classid="clsid:d27cdb6e-ae6d-11cf-96b8-444553540000"  width="' + this.videoWidth + 
                                '" height="' + this.videoHeight + '"  id="camera-swf-movie">' +
                                '<param name="movie" value="' + this.urls.swf + '" />' +
                                '<param name="wmode" value="opaque" />' +
                        '<div class="no-flash-container">' +
                    '<div class="no-flash-button">' +
                                '<a href="http://www.adobe.com/go/getflash">' +
                                        '<img class="no-flash-image" src="/uts/coupledtanksnew/images/flash-icon.png"' +
                                                    'alt="Get Adobe Flash player"/>' +
                                                '<span class="no-flash-button-text">Video requires Adobe Flash Player</span>' +
                                '</a>' +
                    '</div>' +
                    '<p class="no-flash-substring">If you do not wish to install Adobe flash player ' +
                        'you can try another video format using the drop down box below.</p>' +
                        '</div>' +
                        '</object>'
                );
};

/**
 * Gets the HTML to deploy a MJPEG stream.
 */
CameraWidget.prototype.getMjpegHtml = function() {
        return (!$.browser.msie ? // Firefox, Chrome, ...
                         '<img style="width:' + this.videoWidth + 'px;height:' + this.videoHeight + 'px" ' +
                                                'src="' + this.urls.mjpeg + '?' + new Date().getTime() + ' alt="&nbsp;" />'
                 :                 // Internet Explorer
                         '<applet code="com.charliemouse.cambozola.Viewer" archive="/applets/cambozola.jar" ' + 
                                        'width="' + this.videoWidth + '" height="' + this.videoHeight + '">' +
                                '<param name="url" value="' + this.urls.mjpeg + '"/>' +
                                '<param name="accessories" value="none"/>' +
                        '</applet>'
        );
};

/** Difference between widget width and video width. */
CameraWidget.VID_WIDTH_DIFF = 8;

/** Difference between widget height and video height. */
CameraWidget.VID_HEIGHT_DIFF = 72;

CameraWidget.prototype.resized = function(width, height) {
    if (this.isDeployed) this.undeploy();
    
    this.$widget.find(".video-player").css({
       width: width - CameraWidget.VID_WIDTH_DIFF,
       height: height - CameraWidget.VID_HEIGHT_DIFF
    });
    this.$widget.css("padding-bottom","0.8%");
};

CameraWidget.prototype.resizeStopped = function(width, height) {
    this.videoWidth = width - CameraWidget.VID_WIDTH_DIFF;
    this.videoHeight = height - CameraWidget.VID_HEIGHT_DIFF;
    
    this.deploy(this.currentFormat);
};

CameraWidget.prototype.destroy = function() {
    this.undeploy();
    Widget.prototype.destroy.call(this);
};

/**
 * Shades the Camera widget which hides the widget contents only showing the title.
 *
 * @param shadeCallback runs a callback function after the shade animation has completed
 */
CameraWidget.prototype.toggleWindowShade = function(shadeCallback) {
        if (shadeCallback && typeof(shadeCallback) === "function") {
            this.$widget.find(".window-content").slideToggle('fast');
            this.$widget.find(".window-header").toggleClass("window-header-shade", "slide",function(){
            shadeCallback();
            });
            this.$widget.css("width", this.$widget.width());
    }
    else
    {
            this.$widget.find(".window-content").slideToggle('fast');
        this.$widget.css("width", this.$widget.width());

        /* Changing shaded icon */
            this.$widget.find(".window-header").toggleClass("window-header-shade", "slide");
    }
    this.window.shaded = !this.window.shaded;
    this.storeState();
    
    if (this.window.shaded === true)
    {
            this.$widget.css("height", 'auto');
        
        /* Changing shaded icon */
        this.$widget.find(".window-shade").toggleClass('ui-icon-minus ui-icon-triangle-1-s');
        
        /* Disable resizing when shaded */
        this.$widget.find('.ui-resizable-handle').css('display', 'none');
    }
    else
    {
        /* Changing shaded icon */
        this.$widget.find(".window-shade").toggleClass('ui-icon-minus ui-icon-triangle-1-s');

        /* Enable resizing */
        this.$widget.find('.ui-resizable-handle').css('display', 'block');
    }
};

CameraWidget.prototype.send = function() {
};


/* ============================================================================
 * == Data Val Widget                                                     ==
 * ============================================================================ */

/**
 * Information displaying widget.
 */
function DataValWidget($container, title, icon, message, dataVar)
{
    Widget.call(this, $container, title, icon);
    
    /** Identifier of this widget. */
    this.id = "DataVal-" + title.toLowerCase().replace(' ', '-');
	this.dataid = "dataVal-" + title.toLowerCase().replace(' ', '-');
    
    /** Message that is displayed by this widget. */
    this.message = message;
    
    /** What data variable to show */
    this.message = message;
	this.dataVar = dataVar;
}

DataValWidget.prototype = new Widget;

DataValWidget.prototype.init = function() {
    this.$widget = this.generateBox(this.id);
	this.enableDraggable();
};

DataValWidget.prototype.consume = function(data) {
    valToShow = data[this.dataVar];
	document.getElementById(this.dataid).innerHTML = valToShow.toPrecision(6);
};


DataValWidget.prototype.getHTML = function() {
    var html = '<div class="place-holder place-holder-res">';
	html += '<p>' + this.message + '<span id="' + this.dataid + '" class="place-holder-message">-</span></p>';
    html += '</div>';
    return html;
};

/* ============================================================================
 * == Info View Widget                                                     ==
 * ============================================================================ */

/**
 * Non-numeric Information displaying widget.
 * Use to display dynamic data in non-numeric format, such as boolean or strings
 */
function InfoViewWidget($container, title, icon, message, dataVar)
{
    Widget.call(this, $container, title, icon);
    
    /** Identifier of this widget. */
    this.id = "InfoView" + title.toLowerCase().replace(' ', '-');
	this.dataid = "infoView-" + title.toLowerCase().replace(' ', '-');
    
    /** Message that is displayed by this widget. */
    this.message = message;
    
    /** What data variable to show */
    this.message = message;
	this.dataVar = dataVar;
}

InfoViewWidget.prototype = new Widget;

InfoViewWidget.prototype.init = function() {
    this.$widget = this.generateBox(this.id);
	this.enableDraggable();
};

InfoViewWidget.prototype.consume = function(data) {
    valToShow = data[this.dataVar];
	document.getElementById(this.dataid).innerHTML = valToShow;
};


InfoViewWidget.prototype.getHTML = function() {
    var html = '<div class="place-holder place-holder-res">';
	html += '<p>' + this.message + '<span id="' + this.dataid + '" class="place-holder-message">-</span></p>';
    html += '</div>';
    return html;
};

/* ============================================================================
 * == Sensor Val Widget                                                     ==
 * ============================================================================ */

/**
 * Information displaying widget for set of sensors
 */
function SensorValWidget($container, title, icon, message, dataVarPrefix)
{
    Widget.call(this, $container, title, icon);
    
    /** Identifier of this widget. */
    this.id = "SensorVal-" + title.toLowerCase().replace(' ', '-');

	var sensorids = [];
	for (var i  = 0; i < 11; i++){
		sensorids[i] = "sensorVal-" + title.toLowerCase().replace(' ', '-')+i;
	}
    this.dataid=sensorids;

    /** Message that is displayed by this widget. */
    this.message = message;
    
    /** What data variable to show */
    this.message = message;
	this.dataVarPrefix = dataVarPrefix;
}

SensorValWidget.prototype = new Widget;

SensorValWidget.prototype.init = function() {
    this.$widget = this.generateBox(this.id);
	this.enableDraggable();
};

SensorValWidget.prototype.consume = function(data) {
	var dataids = this.dataid;
	for(var i = 0; i < 11; i++){
		label = this.dataVarPrefix + i;
		ValToShow = data[label];
		if (typeof(ValToShow) != 'undefined' && ValToShow != null) {
			document.getElementById(this.dataid[i]).innerHTML = ValToShow.toPrecision(6);
		}
		else {
			document.getElementById(this.dataid[i]).innerHTML = 'undef';
		}
		//temp=temp*20;
	}
};


SensorValWidget.prototype.getHTML = function() {
    var html = '<div class="place-holder place-holder-res">';
	for ( var i = 0; i < 11; i++){
		html += '<p>' + this.message + (i) + '= <span id="' + this.dataid[i] + '" class="place-holder-message">-</span></p>';
	}
    html += '</div>';
    return html;
};


/* ============================================================================
 * == Information Widget                                                     ==
 * ============================================================================ */

/**
 * Information displaying widget. The information can be of type 'info' which
 * shows an informational guiadance message, 'error' which shows an error message,
 * '
 * 
 * @param 
 */
function PlaceHolderWidget($container, title, icon, message, type)
{
    Widget.call(this, $container, title, icon);
    
    /** Identifer of this widget. */
    this.id = "place-holder-" + title.toLowerCase().replace(' ', '-');
    
    /** Message that is displayed by this widget. */
    this.message = message;
    
    /** The information type of this widget; either 'info', 'error', or 
     * 'loading'. */
    this.type = type;
}

PlaceHolderWidget.prototype = new Widget;

PlaceHolderWidget.prototype.init = function() {
    this.$widget = this.generateBox(this.id);
	
	this.enableDraggable();
};

PlaceHolderWidget.prototype.getHTML = function() {
    var html = '<div class="place-holder place-holder-' + this.type + '">';
    
    switch (this.type)
    {
    case 'info':
        html += '<p>Guidance: <span class="place-holder-message">' + this.message + '</span></p>';
        break;
        
    case 'error':
        html += '<p>Error: <span class="place-holder-message">' + this.message + '</span></p>';
        break;
        
    case 'loading':
        html += '<img src="/uts/coupledtanksnew/images/loading.gif" alt=" " />' +
                '<p>Please wait: <span class="place-holder-message">' + this.message + '</span></p>';
        break;
	
	case 'res':
		html += '<p>Result: <span id="res-to-change" class="place-holder-message">' + this.message + '</span></p>';
		break
    }
    
    html +=    '</div>';
    return html;
};


/* ============================================================================
 * == Slider Widget                                                          ==
 * ============================================================================ */

/**
 * Slider widget that displays a slider that allows that provides a slidable
 * scale over the specified range.
 * 
 * @param $container the container to add this widget to
 * @param title the title of this widget
 * @param icon the icon to display for the sliders box
 * @param dataVar the data variable that this slider is manipulating
 * @param postAction the action to post to
 */

 function SliderWidget($container, title, icon, dataVar, postAction) 
{
    Widget.call(this, $container, title, icon);
    
    /** The identifer of this slider. */
    this.id = "slider-" + title.toLowerCase().replace(' ', '-');
    
    /** The minimum value of this slider. */
    this.min = -10;
    
    /** The maximum value of this slider. */
    this.max = 10;
    
    /** Whether this widget is vertically or horizontally oriented. */
    this.isVertical = true;
    
    /** Dimension of the slider, either height or width value depending 
     *  on orientation in pixels. */
    this.dimension = 250;
    
    /** Label for slider. */
    this.label = '';
    
    /** Units for the display. */
    this.units = '';
    
    /** The data variable this slider is manipulating. */
    this.dataVar = dataVar;
    
    /** The location to post data to. */
    this.postAction = postAction;
    
    /** The current value of the data variable. */
    this.val = undefined;
    
    /** Whether the value has changed due to user interaction. */
    this.valueChanged = false;
    
    /** Knob holder. */
    this.$knob = undefined;
    
    /** Value box. */
    this.$input = undefined;
    
    /** Whether we are sliding. */
    this.isSliding = false;
    
    /** Last coordinate in sliding orientation. */
    this.lastCoordinate = undefined;
}
SliderWidget.prototype = new Widget;

/** The number of displayed scales. */
SliderWidget.NUM_SCALES = 10;

SliderWidget.prototype.init = function() {
    /* Reset values. */
    this.val = undefined;
    this.valueChanged = false;
    
    this.$widget = this.generateBox(this.id);
	this.enableDraggable();
    
    var thiz = this;
    
    /* Slider events. */
    this.$knob = this.$widget.find(".slider-knob")
        .mousedown(function(e) { thiz.slideStart(e.pageX, e.pageY); });
    
    /* Slider position click. */
    this.$widget.find(".slider-outer").bind("click." + this.id, function(e) { thiz.sliderClicked(e.pageX, e.pageY); });
    
    /* Value box events. */
    this.$input = this.$widget.find(".slider-text input")
        .focusin(formFocusIn)
        .focusout(formFocusOut)
        .change(function() { thiz.handleTextBoxChange($(this).val()); });    
};

/**
 * Handles a slider position click.
 * 
 * @param x coordinate of mouse
 * @param y coordiante of mouse
 */
SliderWidget.prototype.sliderClicked = function(x, y) {
    if (this.isSliding) return;
    
    var off = this.$widget.find(".slider-outer").offset(),
        p = this.isVertical ? y - off.top - 7 : x - off.left - 7;
    
    /* Value scaling. */
    this.valueChanged = true;
    // this.val = p * (this.max - this.min) / this.dimension;
    this.val = this.min + (this.max - this.min) * p / this.dimension;
    // document.getElementById("counterdebug").innerHTML = p + ' : ' + this.max + ' : ' + this.min + ' : ' + this.dimension + ' : ' + this.val;
   
    /* Range check. */
    if (this.val < this.min) this.val = this.min;
    if (this.val > this.max) this.val = this.max;
    
    /* Vertical sliders have the scale inverse to positioning. */
    if (this.isVertical) this.val = this.max - this.val;
    
    /* Update display. */
    this.moveTo();
    this.$input.val(zeroPad(this.val, 1));
    
    /* Send results. */
    this.send();
};

/**
 * Handles slider start.
 * 
 * @param x x coordinate of mouse
 * @param y y coordinate of mouse
 */
SliderWidget.prototype.slideStart = function(x, y) {
    /* State management. */
    this.isSliding = true;
    this.valueChanged = true;
    
    /* Position tracking. */
    this.lastCoordinate = (this.isVertical ? y : x);
    
    /* Event handlings. */
    var thiz = this;
    $(document)
        .bind('mousemove.' + this.id, function(e) { thiz.slideMove (e.pageX, e.pageY); })
        .bind('mouseup.' + this.id,   function(e) { thiz.slideStop (e.pageX, e.pageY); });
    
    /* Stop double handling. */
    this.$widget.find(".slider-outer").unbind("click." + this.id);
};

/**
 * Handles slider move.
 *  
 * @param x x coordinate of mouse
 * @param y y coordinate of mouse
 */
SliderWidget.prototype.slideMove = function(x, y) {
    if (!this.isSliding) return;
    
    /* Scaling to value. */
    var dist = (this.isVertical ? y : x) - this.lastCoordinate;
    this.val += (this.min + (this.max - this.min) * dist / this.dimension) * (this.isVertical ? -1 : 1);
    
    
    /* Range check. */
    if (this.val < this.min) this.val = this.min;
    if (this.val > this.max) this.val = this.max;
    
    /* Display update. */
    this.$input.val(zeroPad(this.val, 1));
    this.moveTo();
    
    /* Position tracking. */
    this.lastCoordinate = (this.isVertical ? y : x);
};

/**
 * Handles slide stop.
 * 
 * @param x x coordinate of mouse
 * @param y y coordinate of mouse
 */
SliderWidget.prototype.slideStop = function(x, y) {
    if (!this.isSliding) return;
    
    $(document)
        .unbind('mousemove.' + this.id)
        .unbind('mouseup.' + this.id);
    
    this.isSliding = false;
    this.send();
    
    var thiz = this;
    this.$widget.find(".slider-outer").bind("click." + this.id, function(e) { thiz.sliderClicked(e.pageX, e.pageY); });
};
/**
 * Moves the slider to the specified value 
 */
SliderWidget.prototype.moveTo = function() {
    var p = (this.val - this.min) / (this.max - this.min) * this.dimension;
    this.$knob.css(this.isVertical ? "top" : "left", this.isVertical ? this.dimension - p : p);
};

/**
 * Handles a value text box change.
 * 
 * @param val new value
 */
SliderWidget.prototype.handleTextBoxChange = function(val) {
    var ttLeft = this.isVertical ? 60 : this.dimension + 17,
        ttTop  = this.isVertical ? this.dimension + 82 : 75, n;
    
    this.removeMessages();
    if (!val.match(/^-?\d+\.?\d*$/))
    {
        this.addMessage("slider-validation-" + this.id, "Value must be a number.", "error", ttLeft, ttTop, "left");
        return;
    }
    
    n = parseFloat(val);
    if (n < this.min || n > this.max)
    {
        this.addMessage("slider-validation-" + this.id, "Value out of range.", "error", ttLeft, ttTop, "left");
        return;
    }
    
    this.valueChanged = true;
    this.val = n;
    this.moveTo();
    this.send();  
};

SliderWidget.prototype.getHTML = function() {
    var i, s = (Math.floor((this.max - this.min) / SliderWidget.NUM_SCALES)),
        html = 
        "<div class='slider-outer' style='" + (this.isVertical ? "height" : "width") + ":" + this.dimension + "px'>";
            
    /* Slider scale. */
    html += "<div class='slider-scales slider-scales-" + (this.isVertical ? "vertical" : "horizontal") + "'>";
    for (i = 0; i <= SliderWidget.NUM_SCALES; i++)
    {
        html += "<div class='slider-scale' style='" + (this.isVertical ? "top" : "left") + ":" + 
                        (this.dimension / SliderWidget.NUM_SCALES * i) + "px'>" +
                    "<span class='ui-icon ui-icon-arrowthick-1-" + (this.isVertical ? "w" : "n") + "'></span>" +
                    "<span class='slider-scale-value'>" + (this.isVertical ? this.max - s * i : this.min + s * i) + "</span>" +
                "</div>";
    }
    html += "</div>";
    
    /* Slider post. */
    html += "<div class='slider-post slider-post-" + (this.isVertical ? "vertical" : "horizontal") + "'></div>";
    
    /* Slider knob. */
    html += "<div class='slider-knob slider-knob-" + (this.isVertical ? "vertical" : "horizontal" ) + "'>" +
                "<div class='slider-knob-slice slider-knob-back'></div>";
    
    for (i = 0; i < 9; i++)
    {
        html +=     "<div class='slider-knob-slice slider-knob-slice-" + i + "'></div>";
    }
    
    html += "</div>";
    
    html += 
        "</div>";
    
    /* Text box with numeric value. */
    html +=
        "<div class='slider-text slider-text-" + (this.isVertical ? "vertical" : "horizontal") +
                " saharaform' style='margin-" + (this.isVertical ? "top" : "left") + ":" +
                (this.dimension + (this.isVertical ? 20 : -90)) + "px'>" +                
                "<label for='" + this.id + "-text' class='slider-text-label'>" + this.label + ":</label>" +
            "<input id='" + this.id + "-text' type='text' /> " +
            "<span>" + this.units + "</span>" +
        "</div>";
    
    return html;
};

/** 
 * Sends the updated value to the server.
 */
SliderWidget.prototype.send = function() {
    var thiz = this, params = { };
    params[this.dataVar] = this.val;
    this.postControl(this.postAction, params,
        function(data) {
            thiz.valueChanged = false;
        }
    );
};

SliderWidget.prototype.consume = function(data) {
    if (!(data[this.dataVar] == undefined || data[this.dataVar] == this.val || this.valueChanged))
    {
        this.val = data[this.dataVar];
        this.moveTo();
        this.$input.val(zeroPad(this.val, 1));
    }
};

/**
 * Sets the range of values this sliders scale has. The default range is 
 * between 0 and 100.
 * 
 * @param min minimum value
 * @param max maximum value
 */
SliderWidget.prototype.setRange = function(min, max) {
    this.min = min;
    this.max = max;
};

/**
 * Sets the orientation of this slider, which is either vertical or 
 * horizontal. The default orientation is vertical.
 * 
 * @param vertical true if vertical, false if horizontal
 */
SliderWidget.prototype.setOrientation = function(vertical) {
    this.isVertical = vertical;
};

/**
 * Sets the dimension of the slider which is either the height or width of the
 * slider depending on the sliders orientation. The default dimension is 250px.  
 * 
 * @param dimension dimension of the slider in pixels
 */
SliderWidget.prototype.setDimension = function(dimension) {
    this.dimension = dimension;
};

/**
 * Sets the labels for graphed variables.
 * 
 * @param label label for value text box
 * @param units units units of the sliders value 
 */
SliderWidget.prototype.setLabels = function(label, units) {
    this.label = label;
    this.units = units;
};


/* ============================================================================
 * == Button Widget                                                          ==
 * ============================================================================ */
function ButtonWidget($container, title, icon, postAction) {
	Widget.call(this, $container, title, icon);
	
	this.id = "button-manager";
	
	this.name = name;
	
	this.icon = icon
	
	this.postAction = postAction;
	
}

ButtonWidget.prototype = new Widget;

ButtonWidget.prototype.init = function() {
    this.$widget = this.generateBox(this.id);
	
	this.enableDraggable();
	
	var thiz = this;
	
	this.$widget.find(".calc").click(function() { thiz.handleButtonClick(); }); 

};

ButtonWidget.prototype.getHTML = function() {
	html = '<div class ="buttonwrapper">';

	html += '<div class="button reset-button">' +
                                        (this.icon != undefined ? '<div class="window-icon icon_' + this.icon + '"></div>' : '') +  
                                        '<span class="display-manager-title">' + this.title + '</span>' +
                        '</div>';
	
	return html;
}

ButtonWidget.prototype.handleButtonClick = function() {
    this.send();  
};

ButtonWidget.prototype.send = function() {
    var thiz = this, params = {};
    this.postControl(this.postAction, params,
        function(data) {
			for (i in data)
				$("#res-to-change").html(data[i]);
        }
    );
};

/* ============================================================================
 * == Global Error Widget                                                    ==
 * ============================================================================ */

/**
 * Display an error overlay on the page.
 * 
 * @param $container page container
 */
function GlobalError($container) 
{
        Widget.call(this, $container, 'Global Error', 'settings');
        
        /** Displayed error message. */
        this.error = '';
};

GlobalError.prototype = new Widget;

GlobalError.prototype.init = function() {        
    this.$widget = this.$container.append(
            "<div id='global-error' class='global-error-overlay'>" +
            "<div class='global-error-container'>" +
                        "<span class='ui-icon ui-icon-alert global-error-icon'></span>" +
                        "<span class='global-error-heading'>Alert!</span>" +
                        "<span class='window-close ui-icon ui-icon-close global-error-close'></span>" +
                "<p class='global-error-message'>This web page has encountered an error. This may be " +
                "because you are no longer connected to the internet. To resolve this error, first " +
                "check your internet connection, then refresh this page.<br/><br/>" +
                "If further assistance is required, please use the 'Contact Support' button to the " +
                "right of the page.</p>" +
                "<p class='global-error-log'>" + this.error + "</p>" +
            "</div>" +
        "</div>"
    ).children().last();

    /* Add a error class to widget boxes. */
    this.$container.find(".window-wrapper, .tab-wrapper").addClass("global-error-blur");
    
    var thiz = this;
    this.$widget.find(".window-close").click(function() { thiz.destroy(); });
    
    $(document).bind("keydown.global-error", function(e) {
        if (e.keyCode == 27) thiz.destroy();
    });
};

GlobalError.prototype.destroy = function() {
    $(document).unbind("keydown.global-error");
    this.$container.find(".window-wrapper, .tab-wrapper").removeClass("global-error-blur");
    Widget.prototype.destroy.call(this);
};

/* ============================================================================
 * == Utility functions                                                      ==
 * ============================================================================ */

/** @define {String} The prefix for Coupled Tanks cookies. */
var COOKIE_PREFIX = "ct-";

/**
 * Gets the value of the specified cookie. 
 * 
 * @param {String} cookie the cookie to find the value of
 * @return {mixed} cookies value or false if not found
 */
function getCookie(cookie)
{
    /* All cookies for the Coupled Tanks are prefixed. This is to differenate 
     * with rig interfaces that may have the same identifiers but different layouts. */
    cookie = COOKIE_PREFIX + cookie;
    
    var pos = document.cookie.indexOf(cookie), end = document.cookie.indexOf(';', pos + 1);
    if (end < 0) end = document.cookie.length;
    return pos >= 0 ? document.cookie.substring(pos + cookie.length + 1, end) : false;
}

/**
 * Sets a cookie for the Coupled Tanks interface.
 * 
 * @param {String} cookie name of cookie to set
 * @param {String} value value of cookie to set
 */
function setCookie(cookie, value)
{
    document.cookie = COOKIE_PREFIX + cookie + '=' + value + ';path=/;max-age=' + (60 * 60 * 24 * 365);
}

/**
 * Gets a canvas element with an appropriate fallback for IE6 to IE8 which do
 * not natively support canvas.
 * 
 * @param id the ID of the element
 * @param width the width of the canvas element
 * @param height the height of the canvas element
 * @return canvas element or appropriate fallback
 */
function getCanvas(id, width, height)
{
        var canvas = document.createElement("canvas");
        canvas.setAttribute("id", id);
        canvas.setAttribute("width", width);
        canvas.setAttribute("height", height);

        if (typeof G_vmlCanvasManager != "undefined")
        {
                /* Hack to get canvas setup on IE6 to 8 which don't support canvas
                 * natively. */
                G_vmlCanvasManager.initElement(canvas);
        }

        return canvas;
}

/**
 * Rounds of a number to a specified number of significant figures.
 * 
 * @param {number} num number to round
 * @param {int} places significant figures
 * @returns {number} number to return
 */
function mathRound(num, places) 
{
        return Math.round(num * Math.pow(10, places)) / Math.pow(10, places);
}

/**
 * Adds '0' characters to a number so it correctly displays the specified 
 * decimal point characters.
 * 
 * @param {number} num number to pad
 * @param {int} places significant figures
 * @returns {string}
 */
function zeroPad(num, places)
{
        var r = '' + mathRound(num, places);

        if (places > 0)
        {
                if (r.indexOf('.') == -1) r += '.';
                while (r.length - r.indexOf('.') < places + 1) r += '0';
        }

        return r;
}

/**
 * Trims leading and trailing whitespace from a string.
 * 
 * @param {string} s the string to trim
 * @return {string} the trimmed string
 */
function trim(s)
{
    return s.trim ? s.trim() : s.replace(/^\s+|\s+$/g);
}