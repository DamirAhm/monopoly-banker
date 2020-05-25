let app = require( "./app" );
let config = require( "./config" );
let Game = require( "./Models/game_schema" );

const checkTimeouted = () => {
    Game.find( {}, ( err, games ) => {
        for ( const game of games ) {
            if ( Date.now() - game.createdAt >= 24 * 60 * 60 * 1000 ) {
                game.deleteOne();
            }
        }
    } )
}

setInterval( checkTimeouted, 24 * 60 * 60 * 1000 );

app.listen( config.PORT, () => console.log( `app listening on port ${config.PORT}` ) );
