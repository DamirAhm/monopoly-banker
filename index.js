let app = require( "./app" );
let config = require( "./config" );
let Game = require( "./Models/game_schema" );

app.listen( config.PORT, () => console.log( `app listening on port ${config.PORT}` ) );
