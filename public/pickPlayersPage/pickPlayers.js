let playersCont = document.getElementById( "players-cont" );

let ids = [];

let newPlayer = ( playerData ) => {
    let player = document.createElement( "div" );
    player.classList.add( "player" );
    player.classList.add( "center" );
    ids.push( playerData._id );
    player.innerText = playerData.name;
    player.addEventListener( "click", ( e ) => {
        onPlayerPick( e );
    } );
    playersCont.appendChild( player );
};

if ( playersCont ) {
    axios.get( `${document.location.origin + document.location.pathname}/players` ).then( res => {
        res.data.forEach( player => {
            if ( !player.isPicked ) {
                newPlayer( player );
            }
        } );
    } );
}

let onPlayerPick = ( e ) => {
    let id = null;
    let players = document.getElementsByClassName( "player" );
    for ( let i = 0; i < players.length; i++ ) {
        if ( players[ i ] === e.target ) {
            id = ids[ i ];
        }
    }
    axios.get( `${document.location.origin + document.location.pathname}/players?id=${id}` ).then( res => {
        if ( !res.data.error ) {
            if ( res.data.isPicked ) {
                e.preventDefault();
                alert( "This player is already picked" );
            } else {
                axios.get( `${document.location.origin + document.location.pathname}/pick-player?id=${id}` )
                    .then( () => {
                        document.location.replace( `?playerId=${id}` );
                    } )
            }
        } else {
            alert( res.data.error );
        }
    } )
};

const urlSpan = document.getElementById( "url" );
urlSpan.addEventListener( "click", () => {
    navigator.clipboard.writeText( document.location.href )
} )