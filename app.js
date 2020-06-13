const express = require( "express" ),
    bodyParser = require( "body-parser" ),
    http = require( "http" ),
    expressWs = require( "express-ws" ),
    mongoose = require( "mongoose" ),
    Player = require( "./Models/player_schema" ),
    Game = require( "./Models/game_schema" ),
    config = require( "./config" );

mongoose.connect( config.MONGO_URL, { useFindAndModify: false, useNewUrlParser: true }, err => {
    if ( err ) {
        console.error( err );
    }
    console.log( "Successfully connected to: " + config.MONGO_URL );
} );

Player.find( {}, ( err, players ) => {
    for ( const player of players ) {
        player.isPicked = false;
        player.save();
    }
} )

let pickersConnections = [];
let playerConnections = new Map();

let app = express();
app.use( bodyParser.json() );
app.use( "/public", express.static( "public" ) );
app.set( "view engine", "pug" );
app.set( "views", "./views" );

let server = http.createServer( app );
let wss = expressWs( app, server );

const closeRoom = ( gameId, data ) => {
    Game.findByIdAndDelete( gameId, async ( err, game ) => {
        if ( err ) {
            console.error( err );
            toAll( wss.getWss().clients, el => el.send( JSON.stringify( { error: err } ) ) );
        };
        try {
            const { players } = await game.populate( "players" ).execPopulate();
            const winners = findWinner( players );
            for ( const player of players ) {
                await player.deleteOne();
            }
            toAll( wss.getWss().clients, el => el.send( JSON.stringify( { ...data, winners } ) ) );
        }
        catch ( err ) {
            console.error( err );
            toAll( wss.getWss().clients, el => el.send( JSON.stringify( { error: err, type: "error" } ) ) );
        }
    } );
    toAll( wss.getWss().clients, el => el.send( JSON.stringify( data ) ) );
}

let pickPlayer = async ( id ) => {
    return await Player.findById( id, ( err, player ) => {
        if ( err ) {
            console.log( "Error while finding player in pick-player" );
        }
        if ( player ) {
            if ( player.isPicked ) {
                return "Player is already picked";
            } else {
                player.isPicked = true;
                return player.save( err => {
                    if ( err ) {
                        console.log( "Error while saving player in pick-player" );
                        return err;
                    }
                    toAll( wss.getWss().clients, el => el.send( JSON.stringify( {
                        type: "pick-player",
                        id
                    } ) ) )
                    return null;
                } );
            }
        } else {
            return "Can't find player";
        }
    } );
};
let unpickPlayer = async ( id ) => {
    return await Player.findById( id, ( err, player ) => {
        if ( err ) {
            console.log( "Error while finding player in unpick player" );
        }
        if ( player ) {
            if ( !player.isPicked ) {
                return "Player isn`t picked";
            } else {
                player.isPicked = false;
                return player.save( err => {
                    if ( err ) {
                        console.log( "Error while saving player in unpick player" );
                        return err;
                    }
                    toAll( wss.getWss().clients, el => el.send( JSON.stringify( {
                        type: "unpick-player",
                        player
                    } ) ) )
                    return null
                } );
            }
        }
    } );
};

const toAll = ( sockets, cb ) => {
    for ( const socket of sockets ) {
        cb( socket );
    }
}

let findNextGoing = ( players, goingId ) => {
    if ( players.length === 0 ) return null;

    const goingPlayerIndex = players.findIndex( player => player._id.toString() === goingId );
    let nextPlayer = players.slice( goingPlayerIndex + 1 ).find( player => !player.isLost );

    if ( nextPlayer === undefined ) {
        nextPlayer = players.slice( 0, goingPlayerIndex ).find( player => !player.isLost );
    }

    return nextPlayer?._id;
};
let findWinner = ( players ) => {
    let max = -1;
    let winners = [];

    if ( players.filter( player => !player.isLost ).length === 1 ) {
        return [ players.find( player => !player.isLost ) ];
    }

    for ( const player of players ) {
        if ( player.money > max && !player.isLost ) {
            max = player.money;
            winners = [ player ];
        } else if ( player.money === max ) {
            winners.push( player );
        }
    }

    return winners;
}

//* Pages
app.get( "/", ( req, res ) => {
    res.render( "starterPage" );
} ); //return starterPage
app.get( "/:gameId", ( req, res ) => {
    if ( req.params.gameId !== "favicon.ico" ) {
        Game.findById( req.params.gameId, async ( err, game ) => {
            if ( err ) {
                console.log( "Error while finding the game in render game", err );
            }
            if ( game ) {
                const players = await game.populate( "players" )
                    .execPopulate()
                    .then( ( { players } ) => players.filter( player => !player.isPicked ) )
                if ( game.isStartSettingsDone ) {
                    res.render( "pickPlayersPage", {
                        allPicked: players.length === 0,
                        players,
                        bankerId: game.startSettings.bankerId
                    } );
                } else {
                    res.send( "Confirm your starter settings" );
                }
            } else {
                res.render( "404" );
            }
        } );
    }
} );//return player pick page
app.get( "/:gameId/:playerId", ( req, res, next ) => {
    const { playerId, gameId } = req.params;
    if ( mongoose.Types.ObjectId.isValid( playerId ) ) {
        Game.findById( gameId, async ( err, game ) => {
            if ( err ) {
                console.log( err );
                res.send( { error: err } );
                return;
            };
            if ( game ) {
                const { players } = await game.populate( "players" ).execPopulate();

                const player = players.find( player => player._id.toString() === playerId );
                if ( player ) {
                    let bankerId = game.startSettings.bankerId;
                    res.render( "playerPage", {
                        user: player,
                        players,
                        isBanker: player._id.toString() === bankerId.toString(),
                        gameId: player.gameId,
                        isGoing: player.isGoing,
                        startSettings: { ...game.startSettings, createdAt: game.createdAt },
                        turnsBeforeCircle: player.turnsBeforeNewCircle
                    } );
                } else {
                    res.render( "404" );
                }
            } else {
                res.render( "404" );
            }
        } )
    } else {
        next();
    }
} )//return player page
app.get( "/:gameId/starter-settings", ( req, res ) => {
    Game.findById( req.params.gameId, async ( err, game ) => {
        if ( err ) {
            console.log( "Error while finding the game in starter-settings" );
            res.send( "404 Game not found" );

        }
        if ( game ) {
            const { players } = await game.populate( "players" ).execPopulate();
            res.render( "starterSettings", {
                players: players.length ? players : null,
                isStartSettingsDone: game.isStartSettingsDone,
                maxPlayers: players.length >= 6,
                startSettings: game.startSettings,
                gameId: game._id
            } );
        } else {
            res.render( "404" );
        }
    } );
} ); //return game room starter settings

//* Creations (room, start settings)
app.post( "/", ( req, res ) => {
    let newGame = new Game( {
        _id: new mongoose.Types.ObjectId()
    } );
    newGame.save( err => {
        if ( err ) {
            res.json( { error: err } );
            console.log( err );
            return;
        }
        res.json( newGame._id );
    } );
} ); //create new room
app.post( "/:gameId/starter-settings", ( req, res ) => {
    Game.findById( req.params.gameId, ( err, game ) => {
        if ( err ) {
            console.log( "Error while finding the game in post starter-settings" );
        }
        if ( req.body ) {
            Player.find( { gameId: game._id }, async ( err, players ) => {
                try {
                    if ( err ) {
                        console.log( "Error while finding players in post starter-settings" );
                        res.send( { error: err } )
                        return;
                    }
                    for ( let i = 0; i < players.length; i++ ) {
                        if ( i === 0 ) {
                            players[ i ].isGoing = true;
                        }
                        players[ i ].money = req.body.startMoney;
                        players[ i ].turnsBeforeNewCircle = req.body.minTurnsForCircle;
                        await players[ i ].save( err => {
                            if ( err ) {
                                console.log( "Error while saving player in post starter-settings" );
                                res.send( { error: err } )
                                return;
                            }
                        } );
                    }
                    game.startSettings = {
                        ...req.body,
                        maxTime: ( req.body.maxTime * 1000 * 60 ) || 0
                    };
                    game.isStartSettingsDone = true;
                    await game.save( err => {
                        if ( err ) {
                            console.log( "Error while saving the game" );
                            res.send( { error: err } )
                            return;
                        }
                    } );
                    res.send( { error: "" } );
                } catch ( err ) {
                    console.error( err );
                    res.send( { err } );
                }
            } );
        } else {
            res.send( { error: "Post of start setting must contain body" } )
        }
    } );
} );//Posts starter settings for game

//* Info
app.get( "/:gameId/players", ( req, res ) => {
    Game.findById( req.params.gameId, async ( err, game ) => {
        if ( err ) {
            console.log( "Error while finding game in players" );
        }
        if ( req.query.id ) {
            Player.findById( req.query.id, ( err, player ) => {
                if ( err ) {
                    console.log( "Error while finding game in players" );
                }
                res.json( player );
            } );
        } else {
            try {
                const { players } = await game.populate( "players" ).execPopulate();
                if ( players ) {
                    res.json( { players } );
                } else {
                    console.error( "Can`t get players" );
                    res.send( { error: "Can`t get players" } );
                }
            } catch ( error ) {
                console.error( error );
                res.send( { error } )
            }
        }
    } );
} ); //return game room players
app.get( "/:gameId/movesLeft", ( req, res ) => {
    Game.findById( req.params.gameId, ( err ) => {
        if ( err ) {
            console.log( "Error while finding the game in movesLeft" );

        }
        if ( req.query.playerId ) {
            Player.findById( req.query.playerId, ( err, player ) => {
                if ( err ) {
                    console.log( "Error while finding the player in movesLeft" );
                }
                res.send( player.moves.length.toString() );
            } );
        } else {
            res.json( { error: "Player not Found" } );
        }
    } );
} );

//* End points for start settings
app.post( "/:gameId/players/change-sequence", ( req, res ) => {
    Game.findById( req.params.gameId, ( err, game ) => {
        if ( err ) {
            console.log( "Error while finding game in change sequence" );

        }
        if ( game.players.length === req.body.length ) {
            let newPlayerList = [];
            let promise = new Promise( ( res ) => {
                for ( let i = 0; i < req.body.length; i++ ) {
                    Player.findById( req.body[ i ].id, ( err, player ) => {
                        if ( err ) {
                            console.log( "Error while finding player in change sequence" );

                        }
                        newPlayerList[ i ] = player._id;
                        if ( i === req.body.length - 1 ) {
                            res( newPlayerList );
                        }
                    } );
                }
            } );
            promise.then( newPlayerList => {
                game.players = newPlayerList;
                game.save( err => {
                    if ( err ) {
                        console.log( "Error while saving game in change sequence" );
                    }
                    res.send( { error: "" } );
                } );
            } );
        } else {
            res.send( { error: "Error in players count" } );
            console.error( "Error in players count" );
        }
    } );
} ); //change game room player sequence
app.get( "/:gameId/players/change-name/:_id", ( req, res ) => {
    Player.findByIdAndUpdate( req.params._id, { name: req.query.name }, err => {
        if ( err ) {
            console.log( "Error while updating player in change name" );
        }
        res.end();
    } );
} ); //change player name by _id
app.get( "/:gameId/players/new-player", ( req, res ) => {
    Game.findById( req.params.gameId, ( err, game ) => {
        if ( err ) {
            console.log( "Error while finding game in new player" );

        }
        let newPlayer = new Player( {
            _id: new mongoose.Types.ObjectId(),
            name: req.query.name,
            gameId: game._id
        } );
        game.players.push( newPlayer._id );
        newPlayer.save( err => {
            if ( err ) {
                res.json( { error: "Error while saving player in new player" } );
            }
            res.send( newPlayer._id );
        } );
        game.save( err => {
            if ( err ) {
                console.log( err.message );
            }
        } );
    } );
} ); //create new player
app.get( "/:gameId/players/delete-player", ( req, res ) => {
    Game.findById( req.params.gameId, ( err, game ) => {
        if ( err ) {
            console.log( "Error while find game in delete player", err );
        }
        game.players = game.players.filter( player => player._id.toString() !== req.query.id.toString() );
        game.save( err => {
            if ( err ) {
                console.log( "Error while saving game in delete", err );
            }
        } );
        Player.findByIdAndDelete( req.query.id, err => {
            if ( err ) {
                console.log( "Error while deleting player", err );
            }
            if ( game.isStartSettingsDone ) {
                toAll( wss.getWss().clients, el => el.send( JSON.stringify( {
                    type: "deletePlayer",
                    id: playerId
                } ) ) )
            }
            res.end();
        } );
    } );
} ); //delete player by _id

//* Pick actions
app.get( "/:gameId/pick-player", ( req, res ) => {
    Game.findById( req.params.gameId, async ( err, game ) => {
        if ( err ) {
            console.log( "Error while finding game in pick-player" );
        }
        const error = await pickPlayer( req.query.id );
        if ( err ) {
            console.log( err );
            res.send( { error } );
        } else {
            res.send( { error: "" } );
        }
    } );
} );//change isPicked parameter of player to true
app.get( "/:gameId/unpick-player", ( req, res ) => {
    Game.findById( req.params.gameId, async ( err, game ) => {
        if ( err ) {
            console.log( "Error while finding game in unpick player" );
        }
        let error = await unpickPlayer( req.query.id );
        if ( error !== null ) {
            console.log( error );
            res.send( { error } );
        }
        else {
            res.send( { error: "" } );
        }
    } );
} );//change isPicked parameter of player to false

//* Player actions
app.get( "/:gameId/giveTurn", ( req, res ) => {
    Game.findById( req.params.gameId, ( err, game ) => {
        if ( err ) {
            console.log( "Error while finding the game in give turn" );

        }
        Player.findOne( { isGoing: true }, ( err, player ) => {
            if ( err ) {
                console.log( "Error while updating player in give turn" );
            }
            if ( player.isGoing ) {
                player.isGoing = false;
                player.turnsBeforeNewCircle = Math.max( 0, player.turnsBeforeNewCircle - 1 );
                player.save( async err => {
                    if ( err ) {
                        console.log( "Error while updating player in give turn" );
                        res.send( { error: err } );
                        return;
                    }
                    const { players } = await game.populate( "players" ).execPopulate();
                    const nextGoing = findNextGoing( players, req.query.playerId );

                    if ( nextGoing ) {
                        Player.findByIdAndUpdate( nextGoing, { isGoing: true }, ( error ) => {
                            if ( error ) {
                                console.log( "Error while updating player in give turn" );
                                res.send( { error } );
                                return;
                            }
                            res.send( { turns: player.turnsBeforeNewCircle, nextGoing } );
                        } );
                    } else {
                        res.send( { error: "Can't find going player" } );
                    }
                } );
            } else {
                res.end();
            }
        } );
    } );
} );//give turn to next player
app.put( "/:gameId/moneyActions", ( req, res ) => {
    Game.findById( req.params.gameId, ( err, game ) => {
        if ( err ) {
            console.log( "Error while finding the game in money actions" );

        }
        Player.findById( req.body.from, ( err, player ) => {
            if ( err ) {
                console.log( "Error while finding the player in money actions" );

            }
            if ( player.isGoing || req.body.redo || req.body.bankerMove ) {
                switch ( req.body.type ) {
                    case "giveMoney": {
                        if ( !req.body.redo ) {
                            if ( !req.body.bankerMove ) {
                                player.moves.push( req.body );
                                player.money -= +req.body.total;
                            }
                            if ( req.body.for !== "bank" ) {
                                Player.findById( req.body.for, ( err, receiver ) => {
                                    if ( err ) {
                                        console.log( "Error while finding the receiver" );

                                    }
                                    receiver.money += +req.body.total;
                                    receiver.save( err => {
                                        if ( err ) {
                                            console.log( "Error while saving the player" );

                                        }
                                        player.save( err => {
                                            if ( err ) {
                                                console.log( "Error while saving the player" );

                                            }
                                            res.send( player.money.toString() );
                                        } );
                                    } );
                                } );
                            } else {
                                player.save( err => {
                                    if ( err ) {
                                        console.log( "Error while saving the player" );

                                    }
                                    res.send( player.money.toString() );
                                } );
                            }
                        } else {
                            player.moves.splice( player.moves.length - 1, 1 );
                            player.money += req.body.total;
                            if ( req.body.for !== "bank" ) {
                                Player.findById( req.body.for, ( err, receiver ) => {
                                    if ( err ) {
                                        console.log( "Error while finding the receiver" );

                                    }
                                    receiver.money -= +req.body.total;
                                    receiver.save( err => {
                                        if ( err ) {
                                            console.log( "Error while saving the player" );
                                        }
                                    } );
                                } );
                            }
                            player.save( err => {
                                if ( err ) {
                                    console.log( "Error while saving the player" );
                                }
                            } );
                            if ( player.moves.length === 0 ) {
                                res.json( { type: "Filler type" } );
                            } else {
                                res.json( player.moves[ player.moves.length - 1 ] );
                            }
                        }
                        break;
                    }
                    case "gotCircle": {
                        if ( req.body.redo ) {
                            player.moves.splice( player.moves.length - 1, 1 );
                            player.money -= +game.startSettings.moneyForCircle;
                            player.turnsBeforeNewCircle = 0;
                            player.save( err => {
                                if ( err ) {
                                    console.log( "Error while saving the player in money actions" );

                                }
                                res.json( player.moves[ player.moves.length - 1 ] );
                            } );
                        } else {
                            if ( player.turnsBeforeNewCircle === 0 ) {
                                player.moves.push( req.body );
                                player.money += +game.startSettings.moneyForCircle;
                                player.turnsBeforeNewCircle = game.startSettings.minTurnsForCircle;
                                player.save( err => {
                                    if ( err ) {
                                        console.log( "Error while saving the player in money actions" );

                                    }
                                    res.send( player.money.toString() );
                                } );
                            } else {
                                res.json( { error: "Dont do it so often" } );
                            }
                        }
                        break;
                    }
                    case "receive": {
                        Player.findById( req.body.for, ( err, receiver ) => {
                            if ( err ) {
                                console.log( "Error while finding the receiver" );

                            }
                            receiver.money += +req.body.total;
                            receiver.save( err => {
                                if ( err ) {
                                    console.log( "Error while saving the player" );

                                }
                            } );
                        } );
                        break;
                    }
                    default: {
                        Player.findById( req.query.playerId, ( err, player ) => {
                            if ( err ) {
                                console.log( "Error while finding the player in money actions" );

                            }
                            res.send( player.money.toString() );
                        } );
                    }
                }
            } else {
                res.json( { error: "It`s not your turn" } );
            }
        }
        );
    } );
} );//operations with money
app.put( "/:gameId/players/lost", ( req, res ) => {
    const { playerId } = req.query;
    const { gameId } = req.params;

    if ( playerId ) {
        Game.findById( gameId, async ( err, game ) => {
            if ( err ) {
                console.error( err );
                res.send( { error: err.message } );
                return;
            }
            const { players } = await game.populate( "players" ).execPopulate();
            if ( players ) {
                const player = players.find( player => player._id.toString() === playerId );
                if ( player ) {
                    player.isLost = true;
                    player.save( error => {
                        if ( error ) {
                            console.error( error );
                            res.send( { error } );
                            return;
                        }
                        if ( players.filter( player => !player.isLost ).length <= 1 ) {
                            closeRoom( gameId, {
                                gameId: gameId,
                                type: "closeRoom"
                            } );
                        }
                        toAll( wss.getWss().clients, el => el.send( JSON.stringify( {
                            type: "deletePlayer",
                            id: playerId
                        } ) ) )
                        res.send( { error: "" } );
                    } )
                } else {
                    res.send( { error: "Can`t get player" } )
                }
            } else {
                res.send( { error: "Can`t get players" } )
            }
        } )
    } else {
        res.send( { error: "You must specify player id" } );
    }
} )

app.ws( "/*/*", ws => {
    ws.on( "message", msg => {
        let data = JSON.parse( msg );
        if ( data ) {
            switch ( data.type ) {
                case "giveTurn": {
                    toAll( wss.getWss().clients, el => el.send( JSON.stringify( data ) ) )
                    break;
                }
                case "giveMoney": {
                    toAll( wss.getWss().clients, el => el.send( JSON.stringify( data ) ) );
                    break;
                }
                case "gotCircle": {
                    toAll( wss.getWss().clients, el => el.send( JSON.stringify( data ) ) )
                    break;
                }
                case "sendId": {
                    if ( Object.values( playerConnections ).find( con => con && con.id === data.id ) === undefined ) {
                        playerConnections[ ws ] = data;
                        pickPlayer( data.id )
                            .then( () => {
                                ws.send( JSON.stringify( {
                                    type: "confirmPick"
                                } ) );
                            } )
                    }
                    break;
                }
                case "closeRoom": {
                    if ( playerConnections[ ws ] !== undefined && playerConnections[ ws ].gameId ) {
                        const { gameId } = playerConnections[ ws ];
                        if ( gameId )
                            closeRoom( gameId, data );
                    }
                    break;
                }
            }
        }
    } );
    ws.on( "close", () => {
        if ( playerConnections[ ws ] !== undefined ) {
            unpickPlayer( playerConnections[ ws ].id );
            delete playerConnections[ ws ];
        }
    } );
    ws.on( "error", err => {
        console.error( "ERROR", err );
    } );
} );
app.ws( "/:gameId", ws => {
    pickersConnections.push( ws );
    ws.on( "error", err => console.log( err ) );
} )


const checkTimeouted = () => {
    Game.find( {}, async ( err, games ) => {
        try {
            for ( const game of games ) {
                const isMaxTimeGone = game.startSettings.isMaxTimeOn && ( Date.now() - game.createdAt ) >= game.startSettings.maxTime;
                if ( Date.now() - game.createdAt >= 24 * 60 * 60 * 1000 || game.isGameOver || isMaxTimeGone ) {
                    closeRoom( game._id, {
                        gameId: game._id.toString(),
                        type: "closeRoom"
                    } );
                }
            }
        } catch ( err ) {
            console.log( err );
        }
    } )
}

checkTimeouted();
setInterval( checkTimeouted, 60 * 1000 );


module.exports = server;
