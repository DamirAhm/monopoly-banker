const express = require( "express" ),
    bodyParser = require( "body-parser" ),
    http = require( "http" ),
    expressWs = require( "express-ws" ),
    mongoose = require( "mongoose" ),
    Player = require( "./Models/player_schema" ),
    Game = require( "./Models/game_schema" ),
    config = require( "./config" );

mongoose.connect( config.MONGO_URL, { useFindAndModify: false, useNewUrlParser: true }, err => {
    if ( err )
        throw err;
    console.log( "Successfully connected to: " + config.MONGO_URL );
} );

let connections = new Map();

let app = express();
app.use( bodyParser.json() );
app.use( "/public", express.static( "public" ) );
app.set( "view engine", "pug" );
app.set( "views", "./views" );

let server = http.createServer( app );
let wss = expressWs( app, server );

let pickPlayer = ( id ) => {
    Player.findById( id, ( err, player ) => {
        if ( err ) {
            console.log( "Error while finding player in pick-player" );
        }
        if ( player.isPicked ) {
            return "Player is already picked";
        } else {
            player.isPicked = true;
            player.save( err => {
                if ( err ) {
                    console.log( "Error while saving player in pick-player" );
                    return err;
                }
                return null;
            } );
        }
    } );
};
let unpickPlayer = ( id ) => {
    Player.findById( id, ( err, player ) => {
        if ( err ) {
            console.log( "Error while finding player in unpick player" );
        }
        if ( player ) {
            if ( !player.isPicked ) {
                return "Player isn`t picked";
            } else {
                player.isPicked = false;
                player.save( err => {
                    if ( err ) {
                        console.log( "Error while saving player in unpick player" );
                        return err;
                    }
                    return null
                } );
            }
        }
    } );
};

app.get( "/", ( req, res ) => {
    res.render( "starterPage" );
} ); //return starterPage
app.post( "/", ( req, res ) => {
    let newGame = new Game( {
        _id: new mongoose.Types.ObjectId()
    } );
    newGame.save( err => {
        if ( err ) {
            res.json( { error: err } );
            throw err
        }
        res.json( newGame._id );
    } );
} ); //create new room

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
                startSettings: game.startSettings
            } );
        } else {
            res.render( "404" );
        }
    } );
} ); //return game room starter settings
app.get( "/:gameId/starter-settings/change-name/:_id", ( req, res ) => {
    Player.findByIdAndUpdate( req.params._id, { name: req.query.name }, err => {
        if ( err ) {
            console.log( "Error while updating player in change name" );
        }
        res.end();
    } );
} ); //change player name by _id
app.get( "/:gameId/starter-settings/new-player", ( req, res ) => {
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
app.get( "/:gameId/starter-settings/delete-player", ( req, res ) => {
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
            res.end();
        } );
    } );
} ); //delete player by _id
app.post( "/:gameId/starter-settings", ( req, res ) => {
    Game.findById( req.params.gameId, ( err, game ) => {
        if ( err ) {
            console.log( "Error while finding the game in post starter-settings" );

        }
        Player.find( { gameId: game._id }, ( err, players ) => {
            if ( err ) {
                console.log( "Error while finding players in post starter-settings" );

            }
            for ( let i = 0; i < players.length; i++ ) {
                players[ i ].money = req.body.startMoney;
                players[ i ].turnsBeforeNewCircle = req.body.minTurnsForCircle;
                players[ i ].save( err => {
                    if ( err ) {
                        console.log( "Error while saving player in post starter-settings" );
                    }
                } );
            }
        } );
        Player.findById( req.body.bankerId, ( err, player ) => {
            if ( err ) {
                console.log( "Error while finding the player there" );
            };
            game.startSettings = {
                ...req.body,
                bankerId: player._id
            };
            game.isStartSettingsDone = true;
            game.save( err => {
                if ( err ) {
                    console.log( "Error while saving the game" );
                }
            } );
            res.end();
        } );
        Player.findByIdAndUpdate( game.players[ 0 ], { isGoing: true }, err => {
            if ( err ) {
                console.log( "Error while updating " );
            }
        } );
    } );
} );//Posts starter settings for game

app.get( "/:gameId/players", ( req, res ) => {
    Game.findById( req.params.gameId, ( err, game ) => {
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
            Player.find( { gameId: game._id }, ( err, players ) => {
                if ( err ) {
                    console.log( "Error while finding game in players" );

                }
                if ( players.length === game.players.length ) {
                    players.sort( ( a, b ) => game.players.indexOf( a._id ) - game.players.indexOf( b._id ) );
                    res.json( players );
                } else {
                    res.json( { error: "Error in players count" } );
                    throw new Error( "Error in players count" );
                }
            } );
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
            throw new Error( "Error in players count" );
        }
    } );
} ); //change game room player sequence
app.get( "/:gameId/pick-player", ( req, res ) => {
    Game.findById( req.params.gameId, ( err, game ) => {
        if ( err ) {
            console.log( "Error while finding game in pick-player" );

        }
        Player.findById( req.query.id, ( err, player ) => {
            if ( err ) {
                console.log( "Error while finding player in pick-player" );

            }
            if ( player.isPicked ) {
                res.json( { error: "Player is already picked" } );
            } else {
                player.isPicked = true;
                player.save( err => {
                    if ( err ) {
                        console.log( "Error while saving player in pick-player" );
                    }
                    res.end();
                } );
            }
        } );
    } );
} );//change isPicked parameter of player to true
app.get( "/:gameId/unpick-player", ( req, res ) => {
    Game.findById( req.params.gameId, ( err, game ) => {
        if ( err ) {
            console.log( "Error while finding game in unpick player" );
        }
        let error = unpickPlayer( req.query.id );
        if ( error !== null ) {
            res.send( { error: error } );
        }
        res.send( { error: "" } )
    } );
} );//change isPicked parameter of player to false

app.get( "/:gameId", ( req, res ) => {
    if ( req.params.gameId !== "favicon.ico" ) {
        Game.findById( req.params.gameId, ( err, game ) => {
            if ( err ) {
                console.log( "Error while finding the game in render game", err );
            }
            if ( game ) {
                if ( game.isStartSettingsDone ) {
                    res.render( "pickPlayersPage", {
                        allPicked: game.players.every( e => e.isPicked )
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
        Game.findById( gameId, ( err, game ) => {
            if ( err ) throw err;
            if ( game ) {
                Player.findById( playerId, ( err, player ) => {
                    if ( err ) throw err;
                    if ( player && game.players.includes( player._id ) ) {
                        let bankerId = game.startSettings.bankerId;
                        res.render( "playerPage", {
                            user: player,
                            isBanker: player._id.toString() === bankerId.toString(),
                            gameId: player.gameId,
                            isGoing: player.isGoing,
                            moneyPerCircle: game.startSettings.moneyForCircle,
                            turnsBeforeCircle: player.turnsBeforeNewCircle
                        } );
                    } else {
                        res.render( "404" );
                    }
                } )
            } else {
                res.render( "404" );
            }
        } )
    } else {
        next();
    }
} )//return player page
app.get( "/:gameId/giveTurn", ( req, res ) => {
    Game.findById( req.params.gameId, ( err, game ) => {
        if ( err ) {
            console.log( "Error while finding the game in give turn" );

        }
        Player.findById( req.query.playerId, ( err, player ) => {
            if ( err ) {
                console.log( "Error while updating player in give turn" );
            }
            player.isGoing = false;
            player.turnsBeforeNewCircle = Math.max( 0, player.turnsBeforeNewCircle - 1 );
            player.save( err => {
                if ( err ) { throw err };
                if ( game.players.indexOf( player._id ) === game.players.length - 1 ) {
                    Player.findByIdAndUpdate( game.players[ 0 ]._id, { isGoing: true }, ( err, nextPlayer ) => {
                        if ( err ) {
                            console.log( "Error while updating player in give turn" );
                        }
                        res.send( { turns: player.turnsBeforeNewCircle } );
                    } );

                } else {
                    Player.findByIdAndUpdate( game.players[ game.players.indexOf( player._id ) + 1 ]._id, { isGoing: true }, ( err, nextPlayer ) => {
                        if ( err ) {
                            console.log( "Error while updating player in give turn" );
                        }
                        res.send( { turns: player.turnsBeforeNewCircle } );
                    } );
                }
            } );
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

const toAll = ( sockets, cb ) => {
    for ( const socket of sockets ) {
        cb( socket );
    }
}

app.ws( "/:gameId", ws => {
    ws.on( "message", msg => {
        let data = JSON.parse( msg );
        if ( data ) {
            switch ( data.type ) {
                case "giveTurn": {
                    Player.findOne( { isGoing: true }, ( err, player ) => {
                        if ( err ) throw err;
                        toAll( wss.getWss().clients, el => {
                            let action = {
                                type: "giveTurn",
                                id: player._id,
                            };
                            el.send( JSON.stringify( action ) );
                        } )
                    } )
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
                    connections[ ws ] = data;
                    ws.send( JSON.stringify( {
                        type: "confirmPick"
                    } ) );
                    break;
                }
                case "closeRoom": {
                    if ( connections[ ws ] !== undefined ) {
                        const { gameId } = connections[ ws ];
                        Game.findByIdAndDelete( gameId, async ( err, game ) => {
                            if ( err ) {
                                console.error( err );
                                throw err
                            };
                            try {
                                const { players } = await game.populate( "players" ).execPopulate();
                                for ( const player of players ) {
                                    await player.deleteOne();
                                }
                                toAll( wss.getWss().clients, el => el.send( JSON.stringify( data ) ) );
                            } catch ( err ) {
                                throw err;
                            }
                        } )
                        toAll( wss.getWss().clients, el => el.send( JSON.stringify( data ) ) );
                    }
                    break;
                }
            }
        }
    } );
    ws.on( "close", () => {
        console.log( connections[ ws ] );
        if ( connections[ ws ] !== undefined ) {
            unpickPlayer( connections[ ws ].id );
        }
    } );
    ws.on( "error", err => {
        console.error( err );
    } );
} );


module.exports = server;






























