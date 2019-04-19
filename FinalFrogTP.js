// Github: https://gist.github.com/finalfrog/124f67ad84204546caf16fffd84115e4
//
// =Inspired by=
//			MapChange by TheWhiteWolves (https://github.com/TheWhiteWolves/MapChange.git)
//			Teleporter Without Movement Tracker by DarokinB (https://gist.github.com/DarokinB/5806230)
// =Author=
//			FinalFrog
// =Contact=
//			https://app.roll20.net/users/585874/finalfrog
//
// GENERAL RULES FOR CREATING AND USING TELEPORTERS:
//
// * Teleporters are defined by Tokens on the GM layer.
//
// * Tokens for Teleports must end in two digits followed by a letter between A and L.
//		Example: "TeleportToken02A"
//
// * Teleporters will only teleport tokens which meet the following requriements:
//     1. Token represents a character controlled by a player.
//     2. Token is on the object layer.
//     3. Token with the same name exists on the page being teleported to.
//
// * The string preceeding the two digits and letters defines a unique teleport chain and all
//	 teleporters in a chain must have the same two digits.
//		Example: "TeleportToken02A" and "TeleportToken02B" are both members of the "TeleportToken" chain
//
// * The two digits shared by all members of a chain define how many teleporters the chain will expect to find
//	 before looping back to the first.
//		Example: "TeleportToken02A" will take you to "TeleportToken02B" which will take you back to "TeleportToken02A" 
//
// * If an expected link in the teleporter chain does not exist then the teleport will break on the last
//	 existing expected teleporter in the chain.
//		Example: If only "TeleportToken04A", "TeleportToken04B", and "TeleportToken04D" exist, then "TeleportToken04B" will teleport anywhere. 
// 
// EXAMPLE OF HOW TO CREATE AND USE AN SIMPLE TWO-WAY INTRA-MAP TELEPORTER PAIR:
//
// 1. Create a token on the GM layer named "Teleport02A" 
// 2. Create a token on the GM layer named "Teleport02B"
// 3. Create a token on the Object layer named "Traveler"
// 4. When you move "Traveler" into the same space as "Teleport02A" it should jump to "Teleport02B" and vis versa.
// 5. You can change this to a one-way teleporter pair by naming the teleporters "Teleport03A" and "Teleport03B".
//
// EXAMPLE OF HOW TO CREATE AND USE AN SIMPLE TWO-WAY INTER-MAP TELEPORTER PAIR:
// 1. Create a map named "MAP 1"
// 2. Create a map named "MAP 2"
// 3. Create a token on the GM layer in "MAP 1" named "Teleport02A"
// 4. Create a token on the GM layer in "MAP 2" named "Teleport02B"
// 5. Create a character controlled only by a player (Eg. Jeanie).
// 6. Create a token on the Object layer in "MAP 1" named Jeanie and set it to represent the above character
// 7. Create a token on the Object layer in "MAP 2" named Jeanie and set it to represent the above character
// 8. When you move the Jeanie token on "MAP 1" onto the same space as "Teleport02A", the player (Jeanie) will be
//    moved on their own to "MAP 2" and their token on "MAP 2" will jump to the location of "Teleport02B", and the
//    Jeanie token on "MAP 1" is now moved to the GM layer
// 9. Moving the token off of "Teleport02B" and back will reverse the process and take the player (Jeanie)
//	  back to "Map 1", move the "MAP 2" token to the GM layer, and move the "MAP 1" token to the Object layer.


var MapTeleporters = MapTeleporters || (function() {
	'use strict';

	// Special thanks to The Aaron for this function
	var findContains = function(obj,layer){
	    "use strict";
	    var cx = obj.get('left'),
	        cy = obj.get('top');

	    if(obj) {
	        layer = layer || 'gmlayer';
	        return _.chain(findObjs({
	            _pageid: obj.get('pageid'),
	            _type: "graphic",
	            layer: layer 
	        }))
	            .reduce(function(m,o){
	                var l=o.get('left'),
	                    t=o.get('top'),
	                    w=o.get('width'),
	                    h=o.get('height'),
	                    ol=l-(w/2),
	                    or=l+(w/2),
	                    ot=t-(h/2),
	                    ob=t+(h/2);
	                    
	                if(    ol <= cx && cx <= or 
	                    && ot <= cy && cy <= ob && o.get('name') != ""
	                ){
	                    m.push(o);
	                }
	                return m;
	            },[])
	            .value();
	    }
	    return [];
	 }; 

	var handleGraphicChange = function(obj) {
		
		if (obj.get("layer") !== "objects") {
		    return; // Only teleport tokens on the object layer
		}
	 
    	 // Check for token controlled by only one player
		var characterId = obj.get("represents");
		var characters = findObjs({
			_type: "character",
			_id: characterId,
		});
		
		if (characters.length == 0) {
			// No characters found
			return;
		}
		
		// Handle first matching representing character
		var character = characters[0];
		
		var controllers = character.get("controlledby");
		if (controllers == "") {
			return;
		} 
	    
		/*  To use this system, you need to name two Teleportation locations the same
		*   with only an A and B distinction. For instance Teleport01A and Teleport01B 
		*   will be linked together. When a token gets on one location, it will be
		*   Teleported to the other automatically */
		
		// Find any teleporters in the same location as moved token
		var sourceTeleporters = findContains(obj,"gmlayer");
		
		if (sourceTeleporters.length == 0) {
			// No source teleporters found
			return;
		} else {
			// Handle first matching source teleporter
			var sourceTeleporter = sourceTeleporters[0];
			
			var sourceOffsetX = sourceTeleporter.get("left") - obj.get("left");
			var sourceOffsetY = sourceTeleporter.get("top") - obj.get("top");
		
			// Store the page of the source teleporter
			var sourcePage = sourceTeleporter.get("_pageid");
			
			// Get name of current teleporter
			var CurrName = sourceTeleporter.get("name");
			var Letters = new Array("A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L");
			
			// Number of doors in the cycle (second to last character)
			var doorCount = CurrName.substr(CurrName.length - 2, 1);

			// Current Letter of the Door
			var currDoor = CurrName.substr(CurrName.length - 1, 1);
			
			// Finds the pair location and moves target to that location
			var i = Letters.indexOf(currDoor);
			if (i == doorCount - 1) {
				i = 0;
			}
			else {
				i = i + 1;
			}
			
			var NewName = CurrName.substr(0,CurrName.length - 2) + doorCount + Letters[i];

			var destTeleporters = findObjs({
				_type: "graphic",
				layer: "gmlayer", //target location MUST be on GM layer
				name: NewName,
			});
			
			if (destTeleporters.length == 0) {
				// No destination teleporters found
				return;
			} else {
				// Handle first matching destination teleporter
				var destTeleporter = destTeleporters[0];
				
				// Coordinates of destination teleporter
				var NewX = destTeleporter.get("left") - sourceOffsetX;
				var NewY = destTeleporter.get("top") - sourceOffsetY;
				
				// Page of destination teleporter
				var destPage = destTeleporter.get("_pageid");
				
				if (destPage == sourcePage) {
					// Handle intra-page teleports by just changing position of
					// original token.
					obj.set("left", NewX);
					obj.set("top", NewY);
				} else {
					// Handle inter-page teleports by searching for graphic token
					// on destination page with same name as teleporting token
					var teleportedTokens = findObjs({
						_pageid: destPage,
						_type: "graphic",
						name: obj.get("name"),
					});
					
					if (teleportedTokens.length == 0) {
						// No tokens with the same name as teleporting token found
						return;
					} else {
						// Handle first matching teleported token
						var teleportedToken = teleportedTokens[0];

						// Update teleported token on new page with coordinates of
						// destination teleporter
						teleportedToken.set("left", NewX);
						teleportedToken.set("top", NewY);
						
						// Show teleported token if it is hidden
						teleportedToken.set("layer", "objects");
						
						var controllerArray = controllers.split();
						if (controllerArray.length == 1) {
							// Teleport player to the page with the destination
							// teleporter
							teleport(controllerArray[0], destPage);

							// NOTE: sendPing moveAll argument currently broken (See https://wiki.roll20.net/Talk:API:Utility_Functions)
							sendPing(NewX, NewY, destPage, null, true);
							
							// Hide original token if player has moved to new map
							obj.set("layer", "gmlayer");
							obj.set("left", 0);
                            obj.set("top", 0);
						}
					}
				}
			}
		}
	};
	
	var teleport = function(playerId, pageId) {
		var playerPages = Campaign().get("playerspecificpages");
		
		if (playerPages === false) {
			playerPages = {};
		}
		
		if (playerId == "all") {
			// Move the whole group to the target page
			Campaign().set("playerspecificpages", false);
			Campaign().set("playerpageid", pageId);
		}
		
		// Remove player from playerPages
		if (playerId in playerPages) {
			delete playerPages[playerId];
		}
		
		// Update playerPages with player on target page
		playerPages[playerId] = pageId;
			
		Campaign().set("playerspecificpages", false);
		Campaign().set("playerspecificpages", playerPages);
	};
	
	var registerEventHandlers = function() {
		on('change:graphic:left', handleGraphicChange);
		on('change:graphic:top', handleGraphicChange);		
	};

	return {
		RegisterEventHandlers: registerEventHandlers,
	};
}());

on("ready", function() {
	'use strict';
	MapTeleporters.RegisterEventHandlers();
});