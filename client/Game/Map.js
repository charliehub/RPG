
RPG.Map = new Class({

    rowOffset : 0,
    colOffset : 0,
    mapZoom : 48,

    rows : 1,
    cols : 1,

    game : {},

    initialize : function(game) {
	this.game = game;

	this.mapDiv = new Element('div',{
	    id : 'GameMap',
	    styles : {
		overflow : 'none'
	    },
	    events : {
		'mousewheel:relay(.M_tileHolder)' : function(event) {
		    this.paintingRows = false;
		    this.paintingColumns = false;
		    this.paintingTiles = false;
		    if (event.wheel > 0) {
			this.mapZoom += 8;
			this.refreshMap();
		    } else if (event.wheel < 0) {
			this.mapZoom -= 8;
			this.refreshMap();
		    }
		    event.preventDefault();
		}.bind(this),
		'mousedown:relay(.M_tileHolder)' : function(event) {
		    this.draggingMap = true;
		    this.dragMapStart = {
			x : event.event.pageX,
			y : event.event.pageY
		    };
		    event.preventDefault();
		}.bind(this),
		'mouseup:relay(.M_tileHolder)' : function(event) {
		    event.preventDefault();
		//drag mouse up handled below in document events
		}.bind(this)
	    }
	});
	$('pnlMainContent').setStyle('overflow-x','hidden');
	$('pnlMainContent').setStyle('overflow-y','hidden');

	document.body.addEvents({
	    mouseup : function(event) {
		if (this.draggingMap) {
		    this.draggingMap = false;
		    this.dragMapStart = null;
		}
	    }.bind(this),
	    mousemove : function(event) {
		if (this.draggingMap) {
		    var newRowOffset = (Math.floor(Math.abs(this.dragMapStart.y - event.event.pageY) / (this.mapZoom/1.25))*(this.dragMapStart.y < event.event.pageY?-1:1)) + this.rowOffset;
		    var newColOffset = (Math.floor(Math.abs(this.dragMapStart.x - event.event.pageX) / (this.mapZoom/1.25))*(this.dragMapStart.x < event.event.pageX?-1:1)) + this.colOffset;

		    if (newRowOffset != this.rowOffset || newColOffset != this.colOffset) {
			this.rowOffset = newRowOffset;
			this.colOffset = newColOffset;
			this.refreshMap();
			this.dragMapStart.x = event.event.pageX;
			this.dragMapStart.y = event.event.pageY;
		    }
		    newRowOffset = null;
		    newColOffset = null;

		}
	    }.bind(this)
	});

	this.mapCanvas = new Element('canvas',{
	    styles : {
		position : 'absolute'
	    },
	    events : {
		click : function(event) {
		    if (event && event.event.layerX > 0 && event.event.layerY && !this.miniMapDragging) {
			this.rowOffset = Math.floor((event.event.layerX / this.mapZoom)  - (this.rows/2));
			this.colOffset = Math.floor((event.event.layerY / this.mapZoom) - (this.cols/2));
			this.refreshMap();
		    }
		}.bind(this),
		mousewheel : function(event) {
		    if (event.wheel > 0) {
			this.mapZoom += 1;
		    } else {
			this.mapZoom -= 1;
		    }
		    this.refreshMap();
		}.bind(this)
	    }
	});

	[window,$('leftColumn').retrieve('instance'),$('rightColumn').retrieve('instance')].each(function(elm) {
	    elm.addEvents({
		'resize' : function(){
		    setTimeout(this.refreshMap.bind(this),1);
		}.bind(this)
	    });
	}.bind(this));
	[$('leftColumn').retrieve('instance'),$('rightColumn').retrieve('instance')].each(function(elm) {
	    elm.addEvent('collapse',function(){
		this.refreshMap();
	    }.bind(this));
	    elm.addEvent('expand',function(){
		this.refreshMap();
	    }.bind(this))
	}.bind(this));


	var keyEvents = {};

	//Move North
	keyEvents['keydown:'+RPG.AppUser.options.settings.keyboard.up] = function(event) {
	    this.moveCharacter('n');
	    event.preventDefault();
	}.bind(this);

	//Move South
	keyEvents['keydown:'+RPG.AppUser.options.settings.keyboard.down] = function(event) {
	    this.moveCharacter('s');
	    event.preventDefault();
	}.bind(this);

	//Move West
	keyEvents['keydown:'+RPG.AppUser.options.settings.keyboard.left] = function(event) {
	    this.moveCharacter('w');
	    event.preventDefault();
	}.bind(this);

	//Move East
	keyEvents['keydown:'+RPG.AppUser.options.settings.keyboard.right] = function(event) {
	    this.moveCharacter('e');
	    event.preventDefault();
	}.bind(this);

	//Activate
	keyEvents['keydown:'+RPG.AppUser.options.settings.keyboard.activate] = function(event) {
	    this.activateTile();
	    event.preventDefault();
	}.bind(this);

	this.keyUpEvents = new Keyboard({
	    events: keyEvents
	}).activate();
    },
    toElement : function() {
	return this.mapDiv;
    },

    calcCols : function() {
	return Math.floor(($('pnlMainContent').getSize().x+(this.mapZoom*2)) / this.mapZoom);
    },
    calcRows : function() {
	return Math.floor(($('pnlMainContent').getSize().y+ (this.mapZoom*2)) / this.mapZoom);
    },

    refreshMap : function() {

	if (this.refreshingMap) return;
	this.refreshingMap = true;
	var c = 0;
	var r = 0;
	/**
	 * calculate the max columns and rows based on the this.mapZoom and panel size
	 */
	if (this.mapZoom < 8) {
	    this.mapZoom = 8;
	}
	var newCols = this.calcCols();
	var newRows = this.calcRows();

	this.game.Character.toElement().setStyle('height',this.mapZoom);
	this.game.Character.toElement().setStyle('width',this.mapZoom);
	this.game.Character.changeDirection(this.game.character.location.dir);

	var map = this.game.universe.maps[this.game.character.location.mapName];
	$$('#GameMap .teleportToLabel').each(function(elm) {
	    elm.hide();
	});
	if (newCols == this.cols && newRows == this.rows) {

	    if (!this.draggingMap) {
		this.rowOffset = this.game.character.location.point[0] - Math.floor(this.rows/2);
		this.colOffset = this.game.character.location.point[1] - Math.floor(this.cols/2);
	    }

	    var tileHolders = $$('#GameMap td.M_tileHolder');
	    tileHolders.each(function(elm){
		var row = Number.from(elm.get('row'));
		var col = Number.from(elm.get('col'));
		var styles = RPG.getMapTileStyles({
		    map : map,
		    row : row,
		    col : col,
		    rowOffset :  this.rowOffset,
		    colOffset :  this.colOffset,
		    zoom : this.mapZoom
		});

		if (styles['background-image'] != 'none') {
		    elm.style.backgroundImage = styles['background-image'];
		    elm.style.backgroundPosition = styles['background-position'];
		    elm.style.backgroundSize = styles['background-size'];
		    elm.style.backgroundRepeat = styles['background-repeat'];
		} else {
		    elm.style.backgroundImage = 'none';
		}
		if (this.game.character.location.point[0] == (row + this.rowOffset) && this.game.character.location.point[1] == (col + this.colOffset)) {
		    elm.empty().adopt(this.game.Character.toElement());
		} else {
		    elm.empty();
		}
	    }.bind(this));
	    $('GameTable').setPosition({
		x : -this.mapZoom,
		y : -this.mapZoom
	    });
	    this.updateLabels();
	    this.refreshingMap = false;
	    row = map = c = r = newCols = newRows = null;
	    return;
	} else {
	    this.cols = newCols;
	    this.rows = newRows;
	}

	this.rowOffset = this.game.character.location.point[0] - Math.floor(this.rows/2);
	this.colOffset = this.game.character.location.point[1] - Math.floor(this.cols/2);

	if (this.mapTable) {
	    $(this.mapTable).getElements('div').destroy();
	    $(this.mapTable).getElements('br').destroy();
	    $(this.mapTable).getElements('a').destroy();
	    $(this.mapTable).getElements('td').destroy();
	    $(this.mapTable).getElements('th').destroy();
	    $(this.mapTable).getElements('tbody').destroy();
	    $(this.mapTable).getElements('tfoot').destroy();
	    $(this.mapTable).getElements('thead').destroy();
	    $(this.mapTable).destroy();
	}

	this.mapTable = new HtmlTable({
	    zebra : false,
	    useKeyboard : false,
	    sortable : false,
	    selectable : false,
	    properties : {
		id : 'GameTable',
		cellpadding : 0,
		cellspacing : 0,
		styles : {
		    position : 'absolute',
		    top : -this.mapZoom,
		    left : -this.mapZoom,
		    width : (this.mapZoom * this.cols),
		    height : (this.mapZoom * this.rows)
		}
	    },
	    rows : [[]]
	});

	var row = null;

	for (r = 0; r<this.rows; r++) {
	    row = [];
	    for (c = 0; c<this.cols; c++) {
		row.push(this.getMapCell({
		    map : map,
		    row : r,
		    col : c,
		    rowOffset : this.rowOffset,
		    colOffset : this.colOffset,
		    zoom : this.mapZoom
		}));
	    }
	    this.mapTable.push(row);
	}
	row = map = c = r = newCols = newRows = null;
	this.mapDiv.adopt(this.mapTable);
	this.updateLabels();
	this.refreshingMap = false;
    },


    getMapCell : function(options) {
	var styles = RPG.getMapTileStyles(options);
	var cell = {
	    properties : {
		id : 'mR'+(options.row)+'mC'+(options.col),
		'class' : 'M_tileHolder',
		styles : styles,
		row : options.row,
		col : options.col
	    },
	    content : this.game.character.location.point[0] == (options.row + options.rowOffset) && this.game.character.location.point[1] == (options.col + options.colOffset) ? this.game.Character.toElement() : '&nbsp;'
	};
	styles = null;
	return cell;
    },

    updateLabels : function() {
	var map = this.game.universe.maps[this.game.character.location.mapName];
	var zoom = this.mapZoom;
	var rowOffset = this.rowOffset;
	var colOffset = this.colOffset;
	var mapDiv = this.mapDiv;

	$$('.teleportToLabel').hide();
	var tileHolders = $$('#GameMap td.M_tileHolder');
	tileHolders.each(function(elm){
	    var row = Number.from(elm.get('row')) + rowOffset;
	    var col = Number.from(elm.get('col')) + colOffset;
	    if (map.tiles[row] && map.tiles[row][col]) {
		map.tiles[row][col].each(function(path){
		    var tile = Object.getFromPath(map.cache,path);
		    if (!tile) return;
		    if (tile.options.teleportTo) {
			var div = $('teleportTo_'+path.toMD5());
			if (!div) {
			    div = new Element('div',{
				id : 'teleportTo_'+path.toMD5(),
				'class' : 'teleportToLabel NoWrap Button CancelButton',
				html : tile.options.teleportTo.mapName || tile.options.property.tileName,
				styles : {
				    position : 'absolute',
				    'z-index' : 1
				}
			    });
			    mapDiv.adopt(div);
			}
			div.show();
			div.setPosition({
			    x : elm.getPosition($('GameMap')).x - ($(div).getSize().x/2) + (zoom/2),
			    y : elm.getPosition($('GameMap')).y - $(div).getSize().y
			});
			div = null;
		    }
		    tile = null;
		});
	    }
	    row = null;
	    col = null;
	});

    },

    moveCharacter : function(dir) {
	if (this.gameWaiting) return;

	this.game.moveTo = RPG[dir](this.game.character.location.point,1),
	this.game.dir = dir;

	this.gameWaiting = true;
	RPG.moveCharacterToTile(this.game, function(moveEvents){
	    this.game.events = moveEvents;
	    if (moveEvents.error) {
		RPG.Error.notify(moveEvents.error);
		this.gameWaiting = false;
		return;
	    } else {
		this.getServerEvents(this.game,'/index.njs?xhr=true&a=Play&m=MoveCharacter&characterID='+this.game.character.database.characterID+'&dir='+this.game.dir,
		    function(results){
			//check to see if a successful move occured
			if (results && results.events && results.events.onBeforeEnter && results.events.onBeforeEnter.traverse) {
			    this.animateEvents(results,function(){

				//now that we have finished animating we can merge the universe and
				Object.merge(this.game,results);
				this.refreshMap();
				this.gameWaiting = false;
			    }.bind(this));
			} else {
			    Object.merge(this.game,results);
			    this.refreshMap();
			    this.gameWaiting = false;
			}
		    }.bind(this));
	    }
	}.bind(this));
    },

    activateTile : function() {
	if (this.gameWaiting) return;

	this.game.moveTo =  this.game.character.location.point;

	this.gameWaiting = true;
	RPG.activateTile(this.game, function(activateEvents){
	    this.game.events = activateEvents;
	    if (activateEvents.error) {
		RPG.Error.notify(activateEvents.error);
		this.gameWaiting = false;
		return;
	    } else {
		if (Object.keys(activateEvents.activate).length == 0 && Object.keys(activateEvents.activateComplete).length == 0) {
		    //no event data to send.. ignore
		    RPG.Error.notify('Nothing Happened.');
		    this.gameWaiting = false;
		    return;
		}

		this.getServerEvents(this.game,'/index.njs?xhr=true&a=Play&m=ActivateTile&characterID='+this.game.character.database.characterID,
		    function(results){

			Object.merge(this.game,results);
			this.refreshMap();
			this.gameWaiting = false;
		    }.bind(this));
	    }
	}.bind(this));
    },

    /**
     * Send a request to the server with the results of the client side execution of events
     * The server will respond with an and updated 'game' object and results of the server side 'events'
     */
    getServerEvents : function(game,url,callback) {
	new Request.JSON({
	    url : url,
	    onFailure : function(results) {
		RPG.Error.notify(results);
		if (results.responseText) {
		    var resp = JSON.decode(results.responseText,true);
		    if (resp) {
			game.events = resp.events;//make sure this isn't merged
		    }
		    callback(resp);
		} else {
		    callback();
		}
	    },
	    onSuccess : function(results) {
		if (results && results.events && results.events.error) {
		    RPG.Error.show(results.events.error);
		}
		game.events = results.events;//make sure this isn't merged
		callback(results);
	    }
	}).post(JSON.encode(game.events));//send the results of the clientside events to the server for validation
    },

    animateEvents : function (results,callback) {

	var charPoint = this.game.character.location.point;
	var moveTo = this.game.moveTo;

	var animations = [];
	var aniLeft = 0;
	var complete = function() {
	    aniLeft--;
	    if (aniLeft <= 0) {
		callback();
	    }
	};

	if (!RPG.pointsEqual(charPoint,moveTo)) {
	    var charDiv = this.game.Character.toElement();
	    var charTD = charDiv.getParent();
	    var zoom = this.mapZoom;
	    var dir = this.game.dir;

	    charDiv.setStyle('position','absolute');
	    charDiv.setStyle('top',charTD.getPosition($('GameMap')).y+this.mapZoom);
	    charDiv.setStyle('left',charTD.getPosition($('GameMap')).x+this.mapZoom);

	    this.game.Character.changeDirection(this.game.dir);
	    var transition = Fx.Transitions.linear;
	    animations.push(function() {
		(new Fx.Tween($('GameTable'),{
		    duration : 150,
		    fps : 30,
		    transition : transition,
		    property : (dir == 's' || dir=='n'?'top':'left'),
		    onComplete : function(){
			complete();
		    }
		})).start(
		    Number.from($('GameTable').getStyle(dir == 's'||dir=='n'?'top':'left')),
		    Number.from($('GameTable').getStyle(dir == 's'||dir=='n'?'top':'left')) - (zoom * (dir == 's'|| dir=='e'?1:-1))
		    );
	    });

	    animations.push(function() {

		(new Fx.Tween(charDiv,{
		    duration : 150,
		    fps : 30,
		    transition : transition,
		    property : (dir == 's' || dir=='n'?'top':'left'),
		    onComplete : function(){
			charDiv.setStyle('position',null).setStyle('top',null).setStyle('left',null);
			complete();
		    }
		})).start(
		    Number.from(charDiv.getStyle(dir == 's'||dir=='n'?'top':'left')),
		    Number.from(charDiv.getStyle(dir == 's'||dir=='n'?'top':'left')) - (zoom * (dir == 's'|| dir=='e'?-1:1))
		    );
	    });

	    $$('.teleportToLabel').each(function(label){
		animations.push(function() {

		    (new Fx.Tween(label,{
			duration : 150,
			fps : 30,
			transition : transition,
			property : (dir == 's' || dir=='n'?'top':'left'),
			onComplete : function(){
			    complete();
			}
		    })).start(
			Number.from(label.getStyle(dir == 's'||dir=='n'?'top':'left')),
			Number.from(label.getStyle(dir == 's'||dir=='n'?'top':'left')) - (zoom * (dir == 's'|| dir=='e'?1:-1))
			);
		});
	    });
	}

	aniLeft = animations.length;
	if (aniLeft <= 0) {
	    callback();
	} else {
	    animations.each(function(fn){
		fn && fn();
	    });
	}

    }
});