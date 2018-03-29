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
	
		/* Add status panel*/
		stsWidget = new STSPanel(this.$container, 'Status','sts');
		this.widgets.push(stsWidget);
		
		/* Add Mimic panel */
		this.widgets.push(new MimicPanel(this.$container, 'MimicPanel','mimic'));
		
		/* Add Maintenance panel */
		this.widgets.push(new MaintWidget(this.$container, 'Maintenance','maint',""));
		
		/* Add camera to page. */
        this.widgets.push(new CameraWidget(this.$container, 'Camera', 'http://10.66.31.110/videostream.cgi?user=admin&pwd=passwd&resolution=32&rate=0', ''));
		
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
	
	this.$anglebox = undefined;
	this.$loadbox = undefined;
	this.angleChanged = false;
	this.loadChanged = false;
	
	this.angleTarget = undefined;
	this.loadTarget = undefined;
	
	this.$zeroBtn = undefined;
	
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
	
	this.angleTarget = undefined;
	this.loadTarget = undefined;
	
	this.enableDraggable();
	this.enableResizable(595,400,false);
	var thiz = this;
	
	this.$anglebox = $("#mimic-anglebox")
		.focusin(formFocusIn)
		.focusout(formFocusOut)
		.change(function() { thiz.handleTextBoxChange($(this).val(), 0); });
	this.$loadbox = $("#mimic-loadbox")
		.focusin(formFocusIn)
		.focusout(formFocusOut)
		.change(function() { thiz.handleTextBoxChange($(this).val(), 1); });
	this.$zeroBtn = $("#"+this.id+"-btn-zero") 
		.click(function() { thiz.handleButtonClick(); })
		.mousedown(function() { $(this).addClass("click-button-active");   })
		.mouseup(function() { $(this).removeClass("click-button-active") ; })
		.keypress(function(e) {
				if (e.keyCode == 13) thiz.handleButtonClick();
			});
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
					'<span id = "valuelabel8" class  = "mimic-unittext">\u2468 : </span>'+
					'<span id = "'+this.dataId[8]+'" class = "mimic-valuetext">-----</span>'+
					'<span id = "'+this.unitId[8]+'" class = "mimic-unittext">--</span>'+
				'</label>'+	
			'</div>' +
			'<div style = "top:'+ (70+(this.window.height - 57)/2 +55) +'px;left:'+ 28 +'px">' + 
				'<label for ="sg-support-fix-roll">'+
					'<span id = "valuelabel9" class  = "mimic-unittext">\u2469 : </span>'+
					'<span id = "'+this.dataId[9]+'" class = "mimic-valuetext">-----</span>'+
					'<span id = "'+this.unitId[9]+'" class = "mimic-unittext">--</span>'+
				'</label>'+	
			'</div>' +
			'<div style = "top:'+(70-8)+'px;left:'+ (25 + (this.window.width - 32)/12)+'px">' + 
				'<label for ="sg-left-top">'+
					'<span id = "valuelabel0" class  = "mimic-unittext">\u2460 : </span>'+
					'<span id = "'+this.dataId[0]+'" class = "mimic-valuetext">8888888</span>'+
					'<span id = "'+this.unitId[0]+'" class = "mimic-unittext">uu</span>'+
				'</label>'+	
			'</div>' +
			'<div style = "top:'+(70-8 + (this.window.height - 57)/2)+'px;left:'+ (25 + (this.window.width - 32)/12)+'px">' + 
				'<label for ="sg-left-btm">'+
					'<span id = "valuelabel3" class  = "mimic-unittext">\u2463 : </span>'+
					'<span id = "'+this.dataId[3]+'" class = "mimic-valuetext">8888888</span>'+
					'<span id = "'+this.unitId[3]+'" class = "mimic-unittext">uu</span>'+
				'</label>'+	
			'</div>' +
			'<div style = "top:'+(70-8 + (this.window.height - 57)/4)+'px;left:'+ 12 +'px">' + 
				'<label for ="sg-left-left">'+
					'<span id = "valuelabel4" class  = "mimic-unittext">\u2464 : </span>'+
					'<span id = "'+this.dataId[4]+'" class = "mimic-valuetext">8888888</span>'+
					'<span id = "'+this.unitId[4]+'" class = "mimic-unittext">uu</span>'+
				'</label>'+	
			'</div>' +
			'<div style = "top:'+(70-8 + (this.window.height - 57)/4)+'px;left:'+ (12 + (this.window.width - 32)/3) +'px">' + 
				'<label for ="sg-lef-right">'+
					'<span id = "valuelabel1" class  = "mimic-unittext">\u2461 : </span>'+
					'<span id = "'+this.dataId[1]+'" class = "mimic-valuetext">8888888</span>'+
					'<span id = "'+this.unitId[1]+'" class = "mimic-unittext">uu</span>'+
				'</label>'+	
			'</div>' +
			'<div style = "top:'+(70-8 + (this.window.height - 57)/8)+'px;left:'+ (25 + (this.window.width - 32)/24)+'px">' + 
				'<label for ="sg-left-topleft-btmright">'+
					'<span id = "valuelabel7" class  = "mimic-unittext">\u2467 : </span>'+
					'<span id = "'+this.dataId[7]+'" class = "mimic-valuetext">8888888</span>'+
					'<span id = "'+this.unitId[7]+'" class = "mimic-unittext">uu</span>'+
				'</label>'+	
			'</div>' +
			'<div style = "top:'+(70-8 + 3*(this.window.height - 57)/8)+'px;left:'+ (25 + (this.window.width - 32)/24)+'px">' + 
				'<label for ="sg-left-btmleft-topright">'+
					'<span id = "valuelabel5" class  = "mimic-unittext">\u2465 : </span>'+
					'<span id = "'+this.dataId[5]+'" class = "mimic-valuetext">8888888</span>'+
					'<span id = "'+this.unitId[5]+'" class = "mimic-unittext">uu</span>'+
				'</label>'+	
			'</div>' +
			'<div style = "top:'+(70-8 + (this.window.height - 57)/2)+'px;left:'+ (25 + 5*(this.window.width - 32)/12)+'px">' + 
				'<label for ="sg-right-btm">'+
					'<span id = "valuelabel2" class  = "mimic-unittext">\u2462 : </span>'+
					'<span id = "'+this.dataId[2]+'" class = "mimic-valuetext">8888888</span>'+
					'<span id = "'+this.unitId[2]+'" class = "mimic-unittext">uu</span>'+
				'</label>'+	
			'</div>' +
			'<div style = "top:'+(70-8 + 3*(this.window.height - 57)/8)+'px;left:'+ (25 + (this.window.width - 32)/2)+'px">' + 
				'<label for ="sg-right-slope">'+
					'<span id = "valuelabel6" class  = "mimic-unittext">\u2466 : </span>'+
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
			'<div style = "top:' + 45 +'px;left:'+ ((this.window.width - 32) - 150)+'px">' +
				'<label for ="load-sts">Load Ctrl: '+
					'<span id = "data-loadsts" class = "mimic-valuetext">8888888</span>'+
				'</label>'+
			'</div>'+
			'<div style = "top:' + ((this.window.height - 57) - 155) +'px;left:'+ ((this.window.width - 32) - 150)+'px">' +
				'<label for ="angle-sts">Angle Ctrl: '+
					'<span id = "data-anglests" class = "mimic-valuetext">8888888</span>'+
				'</label>'+
			'</div>'+
			'<div>' +
				'<canvas id="arrow-drawing" width = "'+(this.window.width - 32)+'px" height = "'+(this.window.height - 57)+'px "></canvas>' +
			'</div>' +
			'<div style = "top:' + 65 +'px;left:'+ ((this.window.width - 32) - 150)+'px">' +
				'<label for ="load-tgt">Load Target: </label>'+
				'<input id="mimic-loadbox" class="mimic-input" type="text" tabindex="1"/>' +
			'</div>'+
			'<div style = "top:' + ((this.window.height - 57) - 135) +'px;left:'+ ((this.window.width - 32) - 150)+'px">' +
				'<label for ="angle-tgt">Angle Target: </label>'+
				'<input id="mimic-anglebox" class="mimic-input" type="text" tabindex="2"/>' +
			'</div>'+
			'<div style = "top:'+((this.window.height - 57) - 45)+'px;left:'+ 120+'px">' +
				'<a id="'+this.id+'-btn-zero" class="click-button click-button-disabled maint-btn-serv" tabindex="1" >Zero Gauges</a>' +
			'</div>'+
		'</div>'
	);
};
// update data
MimicPanel.prototype.consume = function(data) {
	for (var i = 0; i< 8; i++){
		if (this.dataVal[i] == undefined || this.dataVal[i] != data['StrainValue'+(i+1)]){
			this.dataVal[i] = data['StrainValue'+(i+1)];
			if (typeof(this.dataVal[i]) != 'undefined' && this.dataVal[i] != null && this.dataVal[i] != "NaN") {
				document.getElementById(this.dataId[i]).innerHTML = this.dataVal[i].toFixed(0);
			}
			else if (this.dataVal[i] == "NaN"){
				document.getElementById(this.dataId[i]).innerHTML = 'Nan';
			}else{
				document.getElementById(this.dataId[i]).innerHTML = 'undef';
			}
		}
		document.getElementById(this.unitId[i]).innerHTML = '\u03BC\u03B5';
	}
	if (data['daqlinksts'] == 0){
		this.$zeroBtn.removeClass("click-button-disabled");
	}else{
		this.$zeroBtn.addClass("click-button-disabled");
	}
	if (this.loadVal == undefined || this.loadVal != data['load']){
			this.loadVal = data['load'];
			document.getElementById('data-load').innerHTML = this.loadVal.toPrecision(5);
	}
	if (this.angleVal == undefined || this.angleVal != data['angle']){
			this.angleVal = data['angle'];
			document.getElementById('data-angle').innerHTML = this.angleVal.toPrecision(3);
	}
	if ((data['loadmode'] == 1)&&(data['ctrllinksts'] == 0)&&(data['ctrlmode']>=20)){
		document.getElementById('data-loadsts').innerHTML = 'Maint';
		document.getElementById('data-loadsts').style.color = '#FFBB00';
		document.getElementById('mimic-loadbox').disabled = true;
	}else if ((data['loadmode'] == 0)&&(data['ctrllinksts'] == 0)&&(data['ctrlmode']>=20)){
		document.getElementById('data-loadsts').innerHTML = 'Service';
		document.getElementById('data-loadsts').style.color = '#7CBB00';
		document.getElementById('mimic-loadbox').disabled = false;
	}else{
		document.getElementById('data-loadsts').innerHTML = 'Wait..';
		document.getElementById('data-loadsts').style.color = '#000000';
		document.getElementById('mimic-loadbox').disabled = true;
	}
	if ((data['anglemode'] == 1)&&(data['ctrllinksts'] == 0)&&(data['ctrlmode']>=20)){
		document.getElementById('data-anglests').innerHTML = 'Maint';
		document.getElementById('data-anglests').style.color = '#FFBB00';
		document.getElementById('mimic-anglebox').disabled = true;
	}else if ((data['anglemode'] == 0)&&(data['ctrllinksts'] == 0)&&(data['ctrlmode']>=20)){
		document.getElementById('data-anglests').innerHTML = 'Service';
		document.getElementById('data-anglests').style.color = '#7CBB00';
		document.getElementById('mimic-anglebox').disabled = false;
	}else{
		document.getElementById('data-anglests').innerHTML = 'Wait..';
		document.getElementById('data-anglests').style.color = '#000000';
		document.getElementById('mimic-anglebox').disabled = true;
	}
	if (!(data['angletarget'] == undefined || data['angletarget'] == this.angleTarget || this.angleChanged)){
		this.angleTarget = data['angletarget'];
		if (typeof(this.angleTarget) != 'undefined' && this.angleTarget != null) {
			document.getElementById('mimic-anglebox').value = this.angleTarget;
		}
		else {
			document.getElementById('mimic-anglebox').value = 'undef';
		}
	}
	if (!(data['loadtarget'] == undefined || data['loadtarget'] == this.loadTarget || this.loadChanged)){
		this.loadTarget = data['loadtarget'];
		if (typeof(this.loadTarget) != 'undefined' && this.loadTarget != null) {
			document.getElementById('mimic-loadbox').value = this.loadTarget;
		}
		else {
			document.getElementById('mimic-loadbox').value = 'undef';
		}
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

MimicPanel.prototype.handleTextBoxChange = function(val, tgt) {
	
	
    var ttLeft = 164,
		ttTop  = 244;
	
    this.removeMessages();
    if (!val.match(/^-?\d+\.?\d*$/))
    {
        this.addMessage('Validation - ' + type, "Value must be a value.", "error", ttLeft, ttTop, "left");
        return;
    }
    
    var n = parseFloat(val);
	if (tgt == 0){ //angle
		if ((n > 40)||(n < -40)){
			this.addMessage('Validation - ' + type, "Value out of range.", "error", ttLeft, ttTop, "left");
			return;
		}
	}
	else if (tgt == 1){ // load
		if ((n > 300)||(n < 0)){
			this.addMessage('Validation - ' + type, "Value out of range.", "error", ttLeft, ttTop, "left");
			return;
		}
	}
	
	this.sendValue(n,tgt);	
};

MimicPanel.prototype.sendValue = function(val,tgt){
	var thiz = this, params = { };
	if (tgt == 0){
		var newAction = 'setAngle' ;
		params['targetAngle'] = val;
	}else if (tgt == 1){
		var newAction = 'setTgtLoad' ;
		params['targetLoad'] = val;
	}
    this.postControl(newAction, params,
        function(data) {
			thiz.stepChanged = false;
		}
    );
};

MimicPanel.prototype.handleButtonClick = function(){
	var thiz = this, params = {};
	var newAction = undefined;

	newAction = 'zeroStrainGauge';
	this.postControl(newAction, params,
        function(data) {}
    );
}; 

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
	this.enableResizable(250,165,false);
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
			'<div>'+
				'<canvas id="man-led2" width="20px" height="20px"></canvas>'+
				'<label for="Man-sts2" class ="sts-panel-content-label">Angle Sensor</label>' +
			'</div>'+
		'</div>'
	);
};
// update data
STSPanel.prototype.consume = function(data) {
	var styleFill1,styleFill2,styleFill3,styleFill4,styleStr1,styleStr2,styleStr3,styleStr4;
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
		if (data['anglehealth'] == 0){
			styleFill4 = '#00cc00';
			styleStr4 = '#99ff99';
		}
		else if (data['anglehealth'] == 1){
			styleFill4 = '#FF0000';
			styleStr4 = '#ff9999';
		}
		else{
			styleFill4 = '#000000';
			styleStr4 = '#999999';
		}
	} 
	else{
		styleFill3 = '#000000';
		styleStr3 = '#999999';
		styleFill4 = '#000000';
		styleStr4 = '#999999';
	}

	this.drawLED(styleFill1,styleStr1,styleFill2,styleStr2,styleFill3,styleStr3,styleFill4,styleStr4);
};
STSPanel.prototype.drawLED = function(color1,highlight1,color2,hightlight2,color3,highlight3,color4,highlight4){
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
	var canvas4 = document.getElementById('man-led2');
	var context4 = canvas4.getContext('2d');
	
	// initialize the canvas
	context1.clearRect(0,0,20,20);
	context2.clearRect(0,0,20,20);
	context3.clearRect(0,0,20,20);
	context4.clearRect(0,0,20,20);
	
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
	
	// draw Manual override LED 2
	context4.beginPath();
	context4.arc(centerX,centerY,radius,0,2*Math.PI,false);
	context4.fillStyle = color4;
	context4.fill();
	context4.lineWidth = 2;
	context4.strokeStyle = '#A0A0A0';
	context4.stroke();
	context4.beginPath();
	context4.arc(centerX,centerY,radius-3,0.1*Math.PI,1.55*Math.PI,true);
	context4.lineWidth = 2;
	context4.strokeStyle = highlight4;
	context4.stroke();
}

/* ============================================================================
 * == Maintenance Widget	                                	             ==
 * ============================================================================ */
function MaintWidget($container, title, icon, message)
{
	Widget.call(this, $container, title, icon, message);
	this.id = "RedTruss-Maintenance-Panel";
	this.stepChanged = false;
	
	// Data Variables
	this.step = undefined;
	this.stepsize = undefined;
	this.angleMode = undefined;
	this.loadMode = undefined;
	
	this.message = message;
	
	this.$anglebox = undefined;
	this.$loadbox = undefined;
	
	this.$servBtnA = undefined;
	this.$maintBtnA = undefined;
	this.$leftBtnA = undefined;
	this.$rightBtnA = undefined;
	this.$caliBtnA = undefined;
	
	this.$servBtnL = undefined;
	this.$maintBtnL = undefined;
	this.$leftBtnL = undefined;
	this.$rightBtnL = undefined;
	this.$caliBtnL = undefined;
}
MaintWidget.prototype = new Widget;

MaintWidget.prototype.init = function() {
    this.$widget = this.generateBox(this.id);
	this.enableDraggable();
	this.enableResizable(250,418,false);
	var thiz = this;
	
	this.step = undefined;
	this.stepsize = undefined;
	this.angleMode = undefined;
	this.loadMode = undefined;
	
	this.$leftBtnA = $("#"+this.id+"-btn-leftA") 
		.click(function() { thiz.handleButtonClick(0,2); })
		.mousedown(function() { $(this).addClass("click-button-active");   })
		.mouseup(function() { $(this).removeClass("click-button-active") ; })
		.keypress(function(e) {
				if (e.keyCode == 13) thiz.handleButtonClick(0,2);
			});
	this.$rightBtnA = $("#"+this.id+"-btn-rightA") 
		.click(function() { thiz.handleButtonClick(0,3); })
		.mousedown(function() { $(this).addClass("click-button-active");   })
		.mouseup(function() { $(this).removeClass("click-button-active") ; })
		.keypress(function(e) {
				if (e.keyCode == 13) thiz.handleButtonClick(0,3);
			});		
	this.$caliBtnA = $("#"+this.id+"-btn-caliA") 
		.click(function() { thiz.handleButtonClick(0,4); })
		.mousedown(function() { $(this).addClass("click-button-active");   })
		.mouseup(function() { $(this).removeClass("click-button-active") ; })
		.keypress(function(e) {
				if (e.keyCode == 13) thiz.handleButtonClick(0,4);
			});		
	this.$leftBtnL = $("#"+this.id+"-btn-leftL") 
		.click(function() { thiz.handleButtonClick(1,2); })
		.mousedown(function() { $(this).addClass("click-button-active");   })
		.mouseup(function() { $(this).removeClass("click-button-active") ; })
		.keypress(function(e) {
				if (e.keyCode == 13) thiz.handleButtonClick(1,2);
			});
	this.$rightBtnL = $("#"+this.id+"-btn-rightL") 
		.click(function() { thiz.handleButtonClick(1,3); })
		.mousedown(function() { $(this).addClass("click-button-active");   })
		.mouseup(function() { $(this).removeClass("click-button-active") ; })
		.keypress(function(e) {
				if (e.keyCode == 13) thiz.handleButtonClick(1,3);
			});		
	this.$anglebox = $("#" + this.id + "-anglebox")
		.focusin(formFocusIn)
		.focusout(formFocusOut)
		.change(function() { thiz.handleTextBoxChange($(this).val()); });
	this.$loadbox = $("#" + this.id + "-loadbox")
		.focusin(formFocusIn)
		.focusout(formFocusOut)
		.change(function() { thiz.handleTextBoxChange($(this).val()); });	
};

MaintWidget.prototype.getHTML = function() {
	return(
		'<div id="maint-header" class="maint-header-div">' +
        	'<label for="maint-header-msg" class="maint-header-msg">'+'Angle Control' + '</label>' +
		'</div>' +
		'<div class="maint-spacer-div">' +
			'<hr>'+
		'</div>'+
		'<div class="maint-body-div">' +
			'<label for="maint-status-A" class="maint-label">Status:</label>'+
			'<span id="'+this.id+'-status-A" class="maint-status">XXXXXXXXXXX</span>'+
		'</div>'+	
		'<div class="maint-body-div">' +
			'<label for="maint-step-A" class="maint-label">Raw D:</label>'+
			'<span id="'+this.id+'-step-A" class="maint-status">nnnn</span>'+
		'</div>'+
		'<div class="maint-body-div">' +
			'<label for="maint-ref-A" class="maint-label">Ref D:</label>'+
			'<span id="'+this.id+'-ref-A" class="maint-status">nnnn</span>'+
		'</div>'+			
		'<div class="maint-button-div">' +
			'<a id="'+this.id+'-btn-leftA" class="click-button click-button-disabled maint-btn-left" tabindex="3" >&#x21E6;</a>' +
			'<input id="'+this.id+'-anglebox" class="maint-input" type="text" tabindex="4"/>' +
			'<a id="'+this.id+'-btn-rightA" class="click-button click-button-disabled maint-btn-right" tabindex="5" >&#x21E8;</a>' +
		'</div>'+	
		'<div class="maint-button-div">' +
			'<a id="'+this.id+'-btn-caliA" class="click-button click-button-disabled maint-btn-cali" tabindex="6" >CALIBRATE</a>' +
		'</div>'+
		'<div class="maint-spacer-div">' +
			'<hr>'+
		'</div>'+
		'<div class="maint-spacer-div">' +
			'<hr>'+
		'</div>'+
		'<div id="maint-header" class="maint-header-div">' +
        	'<label for="maint-header-msg" class="maint-header-msg">'+'Load Control' + '</label>' +
		'</div>' +
		'<div class="maint-spacer-div">' +
			'<hr>'+
		'</div>'+
		'<div class="maint-body-div">' +
			'<label for="maint-status-L" class="maint-label">Status:</label>'+
			'<span id="'+this.id+'-status-L" class="maint-status">XXXXXXXXXXX</span>'+
		'</div>'+	
		'<div class="maint-button-div">' +
			'<a id="'+this.id+'-btn-leftL" class="click-button click-button-disabled maint-btn-left" tabindex="9" >&#x21E9;</a>' +
			'<input id="'+this.id+'-loadbox" class="maint-input" type="text" tabindex="10"/>' +
			'<a id="'+this.id+'-btn-rightL" class="click-button click-button-disabled maint-btn-right" tabindex="11" >&#x21E7;</a>' +
		'</div>'	
	);
}

MaintWidget.prototype.handleButtonClick = function(target,cmd){
	var thiz = this, params = {};
	var newAction = undefined;
	if (target == 0){ //angle stepping
		if (cmd == 2){
			newAction = 'decAngleStep';
		}else if (cmd == 3){
			newAction = 'incAngleStep';
		}else if (cmd == 4){
			newAction = 'caliScrew';
		}
	}else if (target == 1){ //load stepping
		if (cmd == 2){
			newAction = 'decLoadStep';
		}else if (cmd == 3){
			newAction = 'incLoadStep';
		}
	}
	this.postControl(newAction, params,
        function(data) {}
    );
}

MaintWidget.prototype.handleTextBoxChange = function(val) {
	
	
    var ttLeft = 164,
		ttTop  = 244;
	
    this.removeMessages();
    if (!val.match(/^-?\d+\.?\d*$/))
    {
        this.addMessage('Validation - ' + type, "Value must be a integer.", "error", ttLeft, ttTop, "left");
        return;
    }
    
    var n = parseInt(val);
	if ((n > 100000)||(n < 0)){
		this.addMessage('Validation - ' + type, "Value out of range.", "error", ttLeft, ttTop, "left");
		return;
	}
	
	this.sendValue(n);	
};

MaintWidget.prototype.sendValue = function(val){
	var thiz = this, params = { };
	var newAction = 'setStepSize' ;
    params['tgtStepsize'] = val;
    this.postControl(newAction, params,
        function(data) {
			thiz.stepChanged = false;
		}
    );
};

MaintWidget.prototype.consume = function(data) {
	var dataStep = 'rawdistance';
	var dataStepsize = 'stepsize';
	var dataAngleMode = 'anglemode';
	var dataLoadMode = 'loadmode';
	var dataComm = 'ctrllinksts';
	
	// update static text
	document.getElementById(this.id+'-step-A').innerHTML = data[dataStep];
	document.getElementById(this.id+'-ref-A').innerHTML = data['refdistance'];
	if ((data[dataAngleMode] == 1)&&(data[dataComm] == 0)&&(data['ctrlmode']>=20)){
		document.getElementById(this.id+'-status-A').innerHTML = 'Maintenance';
		document.getElementById(this.id+'-status-A').style.color = '#FFBB00';
	}else if ((data[dataAngleMode] == 0)&&(data[dataComm] == 0)&&(data['ctrlmode']>=20)){
		document.getElementById(this.id+'-status-A').innerHTML = 'Service';
		document.getElementById(this.id+'-status-A').style.color = '#7CBB00';
	}else{
		document.getElementById(this.id+'-status-A').innerHTML = 'Wait..';
		document.getElementById(this.id+'-status-A').style.color = '#000000';
	}
	if ((data[dataLoadMode] == 1)&&(data[dataComm] == 0)&&(data['ctrlmode']>=20)){
		document.getElementById(this.id+'-status-L').innerHTML = 'Maintenance';
		document.getElementById(this.id+'-status-L').style.color = '#FFBB00';
	}else if ((data[dataLoadMode] == 0)&&(data[dataComm] == 0)&&(data['ctrlmode']>=20)){
		document.getElementById(this.id+'-status-L').innerHTML = 'Service';
		document.getElementById(this.id+'-status-L').style.color = '#7CBB00';
	}else{
		document.getElementById(this.id+'-status-L').innerHTML = 'Wait..';
		document.getElementById(this.id+'-status-L').style.color = '#000000';
	}
	
	// update input box
	if (!(data[dataStepsize] == undefined || data[dataStepsize] == this.stepsize || this.stepChanged)){
		this.stepsize = data[dataStepsize];
		if (typeof(this.stepsize) != 'undefined' && this.stepsize != null) {
			document.getElementById(this.id+'-anglebox').value = this.stepsize;
			document.getElementById(this.id+'-loadbox').value = this.stepsize;
		}
		else {
			document.getElementById(this.id+'-anglebox').value = 'undef';
			document.getElementById(this.id+'-loadbox').value = 'undef';
		}
	}
	
	// interlock
	if ((data[dataAngleMode] == 1)&&(data[dataComm] == 0)&&(data['ctrlmode']>=20)){
		document.getElementById(this.id+'-anglebox').disabled = false;
		this.$leftBtnA.removeClass("click-button-disabled");
		this.$rightBtnA.removeClass("click-button-disabled");
		this.$caliBtnA.removeClass("click-button-disabled");
	}
	else if ((data[dataAngleMode] == 0)&&(data[dataComm] == 0)&&(data['ctrlmode']>=20)){
		document.getElementById(this.id+'-anglebox').disabled = true;
		this.$leftBtnA.addClass("click-button-disabled");
		this.$rightBtnA.addClass("click-button-disabled");
		this.$caliBtnA.addClass("click-button-disabled");		
	}else{
		document.getElementById(this.id+'-anglebox').disabled = true;
		this.$leftBtnA.addClass("click-button-disabled");
		this.$rightBtnA.addClass("click-button-disabled");
		this.$caliBtnA.addClass("click-button-disabled");	
	}
	
	if ((data[dataLoadMode] == 1)&&(data[dataComm] == 0)&&(data['ctrlmode']>=20)){
		document.getElementById(this.id+'-loadbox').disabled = false;
		this.$leftBtnL.removeClass("click-button-disabled");
		this.$rightBtnL.removeClass("click-button-disabled");
	}
	else if ((data[dataLoadMode] == 0)&&(data[dataComm] == 0)&&(data['ctrlmode']>=20)){
		document.getElementById(this.id+'-loadbox').disabled = true;
		this.$leftBtnL.addClass("click-button-disabled");
		this.$rightBtnL.addClass("click-button-disabled");
	}else{
		document.getElementById(this.id+'-loadbox').disabled = true;
		this.$leftBtnL.addClass("click-button-disabled");
		this.$rightBtnL.addClass("click-button-disabled");
	}

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
        
        this.enableResizable(320, 360, true);
        
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

/** Minimum height to leave for SWF/M-JPEG selector in pixels */
CameraWidget.VID_CONTROLS_BUFFER = 100;

/** Difference between widget height and window height in pixels */
CameraWidget.VID_HEIGHT_DIFF = 40;

CameraWidget.prototype.resized = function(width, height) {
    if (this.isDeployed) this.undeploy();

    
	if (height < width*0.75) {
		this.$widget.find(".video-player").css({
			width: height * 1.333,
			height: height
		});
	} else {
		this.$widget.find(".video-player").css({
			width: width,
			height: width*0.75
		});
	}
	
    this.$widget.find(".window-content").css({
		height: height - CameraWidget.VID_HEIGHT_DIFF
	});
	
    this.$widget.css("padding-bottom","0.8%");
};

CameraWidget.prototype.resizeStopped = function(width, height) {
	vidWidth = width;
	vidHeight = height - CameraWidget.VID_HEIGHT_DIFF;
	
	if (vidHeight - CameraWidget.VID_CONTROLS_BUFFER < vidWidth*0.75) {
		this.videoWidth = (vidHeight * 1.333) - CameraWidget.VID_CONTROLS_BUFFER;
		this.videoHeight = this.videoWidth * 0.75;
	} else {
		this.videoWidth = vidWidth;
		this.videoHeight = this.videoWidth *0.75;
	}
   
    this.$widget.find(".window-content").css({
		height: height - CameraWidget.VID_HEIGHT_DIFF
	});
	
	this.$widget.find(".video-player").css({
			width: this.videoWidth,
			height: this.videoHeight
		});
	
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