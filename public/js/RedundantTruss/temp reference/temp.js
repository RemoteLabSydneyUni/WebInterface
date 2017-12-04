/* ============================================================================
 * == Status Panel Widget                                              ==
 * ============================================================================ */
function STSPanel($container){
	Widget.call(this, $container, 'Status', 'sts');
}
STSPanel.prototype = new Widget;

// initialization
STSPanel.prototype.init = function() {
	this.$widget = this.generateBox('id-status');
	this.enableDraggable();
};

// draw objects
STSPanel.prototype.getHTML = function() {
	return(
		'<div id="sts-panel>'+
			'<div>'+
				'<label for="Comm-sts">Communication</label>' +
			'</div>'+
			'<div>'+
				'<label for="ti-sts">Load Measurement</label>' +
			'</div>'+
			'<div>'+
				'<label for="Comm-sts">Local Manual Override</label>' +
			'</div>'+
		'</div>'
	);
};


// aux functions



/* ============================================================================
 * == Experiment Control Widget                                              ==
 * ============================================================================ */
function ExperimentControl($container){
	Widget.call(this, $container, 'Experiment', 'exp');
}
ExperimentControl.prototype = new Widget;

// initialization
ExperimentControl.prototype.init = function() {
};

// draw objects
ExperimentControl.prototype.getHTML = function() {
	var sangle = (this.anglemax - this.anglemin) / 10,
		sload = (this.loadmax - this.loadmin)/10;
	var html = "<div class='slider-outer' style='height:250px'>" +
			"<div class='slider-scales slider-scales-vertical'>";
			
		for (var i = 0; i <= 10; i++)
		{
		html +=	"<div class='slider-scale' style='top:'" + 25 * i + "px'>" + 
                    "<span class='ui-icon ui-icon-arrowthick-1-w'></span>" +
                    "<span class='slider-scale-value'>" + this.anglemax - sangle * i + "</span>" +
                "</div>";
		}
	html +="</div>";
		/* Slider post. */
    html += "<div class='slider-post slider-post-vertical'></div>";
	/* Slider knob. */
    html += "<div class='slider-knob slider-knob-vertical"'>" +
                "<div class='slider-knob-slice slider-knob-back'></div>";
	for (var i = 0; i < 9; i++)
    {
        html +=     "<div class='slider-knob-slice slider-knob-slice-" + i + "'></div>";
    }
		html +=
		"</div>";
		
		/* Text box with numeric value. */
    html +=
        "<div class='slider-text slider-text-vertical saharaform' style='margin-top:" +
                270 + "px'>" +                
                "<label for='angle-text' class='slider-text-label'>Load Angle:</label>" +
            "<input id='angle-text' type='text' /> " +
            "<span>deg</span>" +
        "</div>";
	return html;
};

// update data
ExperimentControl.prototype.consume = function(data) {

};




/* ============================================================================
 * == Zero Calibration Widget	                                             ==
 * ============================================================================ */
function ZeroCalControl($container){
	Widget.call(this, $container, 'ZERO', 'zero');
}
ZeroCalControl.prototype = new Widget;

// initialization
ZeroCalControl.prototype.init = function() {
	var thiz = this, i = 0;
    
	this.$widget = this.generateBox('zerocal');
};

// draw objects
ZeroCalControl.prototype.getHTML = function() {
	return(
		'<div id="zero-header-settings" class="saharaform">' +
			'<div>' + 
        		'<label for="zero-header-title">Zero Angle Calibration</label>' +
        	'</div>' +
		'</div>' +
		'<div id="zero-settings" class="saharaform">' +
			'<div>' + 
        		'<p>Use button at bottom to calibrate <br>position of zero load angle</p>' +
        	'</div>' +
			'<div>' + 
				'<hr>' +
			'</div>' +
		'</div>' +
		'<div class="data-blur"></div>' +
		'<div id="zero-settings" class="saharaform">' +
			'<div>' +
				'<label for="curr-ang">Current Angle = </label>' +
				'<span id="angval">-</span>' +
			'</div>' +
			'<div>' +
				'<label for="curr-load">Current Load = </label>' +
				'<span id="loadval">-</span>' +
			'</div>' +
		'</div>' +
		'<div class="data-blur"></div>' +
		'<a id="btn-rwd" class="click-button click-button-disabled" tabindex="1" >&#171;</a>' +
		'<a id="btn-bkwd" class="click-button click-button-disabled" tabindex="2" >&#60;</a>' +
		'<a id="btn-fwd" class="click-button click-button-disabled" tabindex="3" >&#62;</a>' +
		'<a id="btn-ffwd" class="click-button click-button-disabled" tabindex="4" >&#187;</a>' +
        '<a id="cfm-send" class="click-button click-button-disabled" tabindex="5" >Apply</a>' 
	);
};

// update data
ZeroCalControl.prototype.consume = function(data) {
	var loadval = data["tension"], angleval = data["angle"];
	document.getElementById('angval').innerHTML = angleval.toPrecision(6);
	document.getElementById('loadval').innerHTML = loadval.toPrecision(6);
};

// aux functions


/* ============================================================================
 * == Strain Gauge Calibration Widget	                                     ==
 * ============================================================================ */
function SGCalControl($container){
	Widget.call(this, $container, 'SGCali', 'sgcal');
	
	/** Strain Gauge Calibration variables. */
	this.val = {
		scale1: undefined,  	// Scale for SG1
		scale2: undefined,  	// Scale for SG2
		scale3: undefined,  	// Scale for SG3
		scale4: undefined,  	// Scale for SG4
		scale5: undefined,  	// Scale for SG5
		scale6: undefined,  	// Scale for SG6
		scale7: undefined,  	// Scale for SG7
		scale8: undefined,  	// Scale for SG8
		scale9: undefined,  	// Scale for SG9
		scale10: undefined,  // Scale for SG10
		bias1: undefined,  	// bias for SG1
		bias2: undefined,  	// bias for SG2
		bias3: undefined,  	// bias for SG3
		bias4: undefined,  	// bias for SG4
		bias5: undefined,  	// bias for SG5
		bias6: undefined,  	// bias for SG6
		bias7: undefined,  	// bias for SG7
		bias8: undefined,  	// bias for SG8
		bias9: undefined,  	// bias for SG9
		bias10: undefined,  	// bias for SG10
	};
   
	/** Input Change Flags. */
	this.isChanged = {
		false,false,false,false,false,
		false,false,false,false,false,
		false,false,false,false,false,
		false,false,false,false,false
	}
   
}
SGCalControl.prototype = new Widget;

// initialization
SGCalControl.prototype.init = function() {
    var thiz = this, i = 0;
    
    /* Reset values. */
    for (i in this.val) this.val[i] = undefined;
    
	this.$widget = this.generateBox('sgcal');
	
	/* Enable dragging. */
	this.enableDraggable();
};

// draw objects
SGCalControl.prototype.getHTML = function() {
	return(

			'<div>' + 
        		'<label for="sg2">StrainGauge2</label>' +
        		'<input id="sg-scale2" class="sg-input-scale2" type="text" name="scale2" tabindex="3" />' +
				'<input id="sg-bias2" class="sg-input-bias2" type="text" name="bias2" tabindex="4" />' +
        	'</div>' +
			'<div>' + 
        		'<label for="sg3">StrainGauge3</label>' +
        		'<input id="sg-scale3" class="sg-input-scale3" type="text" name="scale3" tabindex="5" />' +
				'<input id="sg-bias3" class="sg-input-bias3" type="text" name="bias3" tabindex="6" />' +
        	'</div>' +
			'<div>' + 
        		'<label for="sg4">StrainGauge4</label>' +
        		'<input id="sg-scale4" class="sg-input-scale4" type="text" name="scale4" tabindex="7" />' +
				'<input id="sg-bias4" class="sg-input-bias4" type="text" name="bias4" tabindex="8" />' +
        	'</div>' +
			'<div>' + 
        		'<label for="sg5">StrainGauge5</label>' +
        		'<input id="sg-scale5" class="sg-input-scale5" type="text" name="scale5" tabindex="9" />' +
				'<input id="sg-bias5" class="sg-input-bias5" type="text" name="bias5" tabindex="10" />' +
        	'</div>' +
			'<div>' + 
        		'<label for="sg6">StrainGauge6</label>' +
        		'<input id="sg-scale6" class="sg-input-scale6" type="text" name="scale6" tabindex="11" />' +
				'<input id="sg-bias6" class="sg-input-bias6" type="text" name="bias6" tabindex="12" />' +
        	'</div>' +
			'<div>' + 
        		'<label for="sg7">StrainGauge7</label>' +
        		'<input id="sg-scale7" class="sg-input-scale7" type="text" name="scale7" tabindex="13" />' +
				'<input id="sg-bias7" class="sg-input-bias7" type="text" name="bias7" tabindex="14" />' +
        	'</div>' +
			'<div>' + 
        		'<label for="sg8">StrainGauge8</label>' +
        		'<input id="sg-scale8" class="sg-input-scale8" type="text" name="scale8" tabindex="15" />' +
				'<input id="sg-bias8" class="sg-input-bias8" type="text" name="bias8" tabindex="16" />' +
        	'</div>' +
			'<div>' + 
        		'<label for="sg9">StrainGauge9</label>' +
        		'<input id="sg-scale9" class="sg-input-scale9" type="text" name="scale9" tabindex="17" />' +
				'<input id="sg-bias9" class="sg-input-bias9" type="text" name="bias9" tabindex="18" />' +
        	'</div>' +
			'<div>' + 
        		'<label for="sg10">StrainGauge10</label>' +
        		'<input id="sg-scale10" class="sg-input-scale10" type="text" name="scale10" tabindex="19" />' +
				'<input id="sg-bias10" class="sg-input-bias10" type="text" name="bias10" tabindex="20" />' +
        	'</div>' +
        '</div>' +
        '<a id="cfm-send" class="click-button click-button-disabled" tabindex="5" >Apply</a>' +
        '<div class="data-blur"></div>'
	);
};

// update data
SGCalControl.prototype.consume = function(data) {
	var i;
	for (i = 0; i < 10; i++) {
		if (!(data["StrainScale"+(i+1)] == undefined || data["StrainScale"+(i+1)].toPrecision(4) == this.val[i+10] || this.isChanged[i+10])){
			this.val[i] = data["StrainScale"+(i+1)].toPrecision(4);
			document.getElementById('sg-scale' + (i+1)).value = this.val[i+10];
		}
		if (!(data["StrainBias"+(i+1)] == undefined || data["StrainBias"+(i+1)].toPrecision(4) == this.val[i+10] || this.isChanged[i+10])){
			this.val[i+10] = data["StrainBias"+(i+1)].toPrecision(4);
			document.getElementById('sg-bias' + (i+1)).value = this.val[i+10];
		}
	}	
};

// aux functions
// New value entered to input boxes
SGCalControl.prototype.valEntered = function(id){
}

SGCalControl.prototype.applyClick = function(){
}

SGCalControl.prototype.handleTextBoxChange = function(val) {
    var ttLeft = 30,
        ttTop  = 360;
    
    this.removeMessages();
    if (!val.match(/^-?\d+\.?\d*$/))
    {
        this.addMessage("sgcal-validation-" + this.id, "Value must be a number.", "error", ttLeft, ttTop, "left");
        return;
    }
    
    n = parseFloat(val);
    if (n < this.min || n > this.max)
    {
        this.addMessage("sgcal-validation-" + this.id, "Value out of range.", "error", ttLeft, ttTop, "left");
        return;
    }
    
    this.valueChanged = true;
    this.val = n;
    this.moveTo();
    this.send();  
};

