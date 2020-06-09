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
            res.data.forEach( player => {
                if ( !player.isPicked ) {
                    newPlayer( player );
                }
            } );
        } );
}

let onPlayerPick = ( e ) => {
    let id = "";
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
                    appendNotification( "This player is already picked" );
                } else {
                    document.location = `./${id}`;
                }
            } else {
                appendNotification( res.data.error );
            }
        } )
};

const copy = ( str ) => {
    let tmp = document.createElement( 'INPUT' ); // Создаём новый текстовой input
    let focus = document.activeElement; // Получаем ссылку на элемент в фокусе (чтобы не терять фокус)

    tmp.value = str; // Временному input вставляем текст для копирования

    document.body.appendChild( tmp ); // Вставляем input в DOM
    tmp.select(); // Выделяем весь текст в input
    document.execCommand( 'copy' ); // Магия! Копирует в буфер выделенный текст (см. команду выше)
    document.body.removeChild( tmp ); // Удаляем временный input
    focus.focus(); // Возвращаем фокус туда, где был
}

const urlSpan = document.getElementById( "url" );
urlSpan.addEventListener( "click", ( e ) => {
    e.target.classList.add( "blink" );
    setTimeout( () => e.target.classList.remove( "blink" ), 1000 )
    copy( document.location.href )
} )

ws.onmessage = ( msg ) => {
    const data = JSON.parse( msg.data );
    switch ( data.type ) {
        case "pick-player": {
            const { id } = data;
            if ( id ) {
                const index = ids.indexOf( id );
                ids = ids.filter( e => e !== id );

                let players = document.getElementsByClassName( "player" );
                for ( let i = 0; i < players.length; i++ ) {
                    if ( i === index ) {
                        players[ i ].remove();
                    }
                }
            }
            break;
        }
        case "unpick-player": {
            const { player } = data;
            if ( player ) {
                newPlayer( player );
            }
        }
    }
}