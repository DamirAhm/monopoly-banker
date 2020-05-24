let playersCont = document.getElementById( "players-cont" );

const wsProtocol = document.location.protocol === "https:" ? "wss:" : "ws:";
const ws = new WebSocket( concatURL( `${wsProtocol}//`, document.location.host, document.location.pathname ) );

ws.onopen = () => {
    ws.send( JSON.stringify( {
        type: "connect"
    } ) )
}

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
    axios.get( concatURL( document.location.origin, document.location.pathname, "players" ) )
        .then( res => {
            console.log( res.data );
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
    axios.get( concatURL( document.location.origin, document.location.pathname, "players", `?id=${id}` ) )
        .then( res => {
            if ( !res.data.error ) {
                if ( res.data.isPicked ) {
                    e.preventDefault();
                    alert( "This player is already picked" );
                } else {
                    document.location.replace( concatURL( document.location.origin, document.location.pathname, `./${id}` ) );
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