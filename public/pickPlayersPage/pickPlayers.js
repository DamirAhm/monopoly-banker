//* elements
const players = document.getElementsByClassName( "player" );
const urlSpan = document.getElementById( "url" );

const wsProtocol = document.location.protocol === "https:" ? "wss:" : "ws:";
const ws = new WebSocket( concatURL( `${wsProtocol}//`, document.location.host, document.location.pathname ) );

ws.onopen = () => {
    ws.send( JSON.stringify( {
        type: "connect"
    } ) )
}

let onPlayerPick = ( e ) => {
    let { id } = e.target;
    if ( id ) {
        axios.get( concatURL( document.location.origin, document.location.pathname, "players", `?id=${id}` ) )
            .then( res => {
                if ( !res.data.error ) {
                    if ( res.data.isPicked ) {
                        e.preventDefault();
                        appendNotification( "This player is already picked" );
                    } else {
                        document.location = concatURL( document.location.origin, document.location.pathname, id );
                    }
                } else {
                    appendNotification( res.data.error );
                }
            } )
    }
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

//* give event listeners
urlSpan.addEventListener( "click", ( e ) => {
    e.target.classList.add( "blink" );
    setTimeout( () => e.target.classList.remove( "blink" ), 1000 )
    copy( document.location.href )
} );
for ( const player of players ) {
    player.addEventListener( "click", onPlayerPick )
}


ws.onmessage = ( msg ) => {
    const data = JSON.parse( msg.data );
    switch ( data.type ) {
        case "pick-player": {
            const { id } = data;
            removePlayer( id );
            break;
        }
        case "unpick-player": {
            const { player } = data;
            if ( player ) {
                addPlayer( player );
            }
        }
    }
}

const removePlayer = ( id ) => {
    if ( id ) {
        for ( const player of players ) {
            if ( player.id === id ) {
                player.remove();
            }
        }
    }
}
const addPlayer = ( playerData ) => {
    let player = document.createElement( "div" );
    player.classList.add( "player", "center" );
    player.innerText = playerData.name;
    player.addEventListener( "click", ( e ) => {
        onPlayerPick( e );
    } );

    document.getElementById( "playersCont" ).appendChild( player );
};
